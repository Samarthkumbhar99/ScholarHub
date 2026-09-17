"""Tests for ScholarHub AI Matching & Recommendation Engine (Step 26).

Tests cover:
- Privacy & data sanitization in prompt building
- Gemini client isolation, configuration, and failure handling
- Deterministic eligibility & score bounds
- Single scholarship match endpoint
- Recommendations endpoint & ranking
- Cross-user isolation and security
- Mocked offline execution without live API keys
"""

from datetime import date, timedelta
from decimal import Decimal
import json
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import delete

from app.models.profile import AcademicProfile, FinancialPreference, StudentProfile, StudyPreference
from app.models.scholarship import Scholarship, ScholarshipRequirement
from app.models.user import User
from app.schemas.matching import MatchLevel, ScholarshipMatchResponse
from app.services.ai.gemini_client import GeminiClient
from app.services.ai.matching_service import ScholarshipMatchingService
from app.services.ai.prompt_builder import PromptBuilder
from tests.conftest import TestAsyncSessionLocal


async def create_and_auth_user(async_client: AsyncClient, prefix: str = "ai_user") -> tuple[dict, dict[str, str], uuid.UUID]:
    """Helper to register, login, and return (user_dict, headers, user_id)."""
    email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecurePassword123!"

    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_resp.status_code == 201
    user_id = uuid.UUID(reg_resp.json()["id"])

    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return reg_resp.json(), headers, user_id


# ==============================================================================
# 1. PROMPT BUILDER & PRIVACY SANITIZATION TESTS
# ==============================================================================
def test_prompt_builder_sanitization_and_privacy() -> None:
    """Verify PromptBuilder strictly excludes passwords, tokens, emails, and database UUIDs."""
    user_id = uuid.uuid4()
    profile = StudentProfile(
        id=uuid.uuid4(),
        user_id=user_id,
        first_name="Aarav",
        last_name="Sharma",
        gender="Male",
        mobile="+919876543210",
        country="India",
        state="Maharashtra",
        district="Pune",
        city="Pune",
    )
    academic = AcademicProfile(
        id=uuid.uuid4(),
        user_id=user_id,
        course="B.Tech Computer Science",
        branch="Computer Science",
        current_year="3rd Year",
        university="SPPU",
        college="COEP Technological University",
        cgpa=Decimal("9.20"),
        previous_percentage=Decimal("91.50"),
    )
    financial = FinancialPreference(
        id=uuid.uuid4(),
        user_id=user_id,
        reservation_category="OBC",
        special_categories=["Minority"],
        family_income=Decimal("250000.00"),
        study_preference=StudyPreference.BOTH,
    )

    scholarship = Scholarship(
        id=uuid.uuid4(),
        name="Global Tech Scholars Award",
        provider="Tech Foundation",
        description="Empowering meritorious students in computing disciplines.",
        amount=Decimal("150000.00"),
        deadline=date.today() + timedelta(days=60),
        eligibility="Undergraduate CS/IT students with CGPA > 8.5",
        benefits=["Tuition grant", "Mentorship program"],
        selection_process=["Resume Screening", "Technical Interview"],
        official_website="https://techfoundation.example.org",
    )

    student_data = PromptBuilder.sanitize_student_data(profile, academic, financial)
    sch_data = PromptBuilder.sanitize_scholarship_data(scholarship)
    prompt = PromptBuilder.build_single_match_prompt(student_data, sch_data)

    # Privacy assertions: Sensitive attributes must NEVER appear in the prompt text
    assert str(user_id) not in prompt
    assert "+919876543210" not in prompt
    assert "password" not in prompt.lower()
    assert "token" not in prompt.lower()
    assert "@" not in prompt  # No email address in prompt

    # Whitelisted academic/financial criteria must be present
    assert "Aarav" in prompt
    assert "B.Tech Computer Science" in prompt
    assert "9.2" in prompt
    assert "OBC" in prompt
    assert "250000.0" in prompt
    assert "Global Tech Scholars Award" in prompt


def test_prompt_builder_handles_none_profiles() -> None:
    """Verify PromptBuilder produces well-formed prompt even with missing profile sections."""
    student_data = PromptBuilder.sanitize_student_data(None, None, None)
    scholarship = Scholarship(
        id=uuid.uuid4(),
        name="General Merit Scholarship",
        provider="Govt of India",
        description="Merit scholarship for all students.",
        amount=Decimal("50000.00"),
        deadline=date.today() + timedelta(days=30),
    )
    sch_data = PromptBuilder.sanitize_scholarship_data(scholarship)
    prompt = PromptBuilder.build_single_match_prompt(student_data, sch_data)

    assert "General Merit Scholarship" in prompt
    assert "Not specified" in prompt


# ==============================================================================
# 2. GEMINI CLIENT ISOLATION & FAILURE HANDLING TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_gemini_client_unconfigured_returns_none() -> None:
    """When API key is None or placeholder, GeminiClient returns None safely."""
    client = GeminiClient(api_key=None)
    assert not client.is_configured
    result = await client.generate_structured_json("system", "prompt")
    assert result is None

    placeholder_client = GeminiClient(api_key="your_gemini_api_key_here")
    assert not placeholder_client.is_configured
    res_placeholder = await placeholder_client.generate_structured_json("system", "prompt")
    assert res_placeholder is None


@pytest.mark.anyio
async def test_gemini_client_success_mocked() -> None:
    """GeminiClient parses valid JSON response from GenAI client mock."""
    client = GeminiClient(api_key="valid_test_api_key_mock")
    assert client.is_configured

    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "match_score": 88,
        "match_level": "EXCELLENT_MATCH",
        "summary": "Outstanding academic alignment with computing requirements.",
        "matched_criteria": ["CGPA > 8.5 satisfied", "Computer Science branch match"],
        "potential_issues": [],
        "recommendations": ["Submit letter of recommendation early"],
    })

    with patch("google.genai.Client") as mock_genai_class:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_response
        mock_genai_class.return_value = mock_instance

        parsed = await client.generate_structured_json("system", "prompt")
        assert parsed is not None
        assert parsed["match_score"] == 88
        assert parsed["match_level"] == "EXCELLENT_MATCH"
        assert len(parsed["matched_criteria"]) == 2


@pytest.mark.anyio
async def test_gemini_client_malformed_json_fallback() -> None:
    """GeminiClient handles non-JSON response safely without raising exceptions."""
    client = GeminiClient(api_key="valid_test_api_key_mock")

    mock_response = MagicMock()
    mock_response.text = "This is not valid JSON at all: { broken json"

    with patch("google.genai.Client") as mock_genai_class:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_response
        mock_genai_class.return_value = mock_instance

        parsed = await client.generate_structured_json("system", "prompt")
        assert parsed is None


@pytest.mark.anyio
async def test_gemini_client_api_exception_fallback() -> None:
    """GeminiClient catches API/network errors and returns None safely."""
    client = GeminiClient(api_key="valid_test_api_key_mock")

    with patch("google.genai.Client") as mock_genai_class:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.side_effect = RuntimeError("Gemini API connection timeout")
        mock_genai_class.return_value = mock_instance

        parsed = await client.generate_structured_json("system", "prompt")
        assert parsed is None


# ==============================================================================
# 3. MATCHING SERVICE DETERMINISTIC & AI EVALUATION TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_matching_service_with_mocked_ai() -> None:
    """ScholarshipMatchingService processes valid AI response with is_ai_generated=True."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured = True
    mock_client.generate_structured_json = AsyncMock(return_value={
        "match_score": 92,
        "match_level": "EXCELLENT_MATCH",
        "summary": "Student matches all eligibility criteria with high distinction.",
        "matched_criteria": ["B.Tech CS enrolled", "CGPA 9.20 satisfies criteria"],
        "potential_issues": [],
        "recommendations": ["Prepare official transcripts"],
    })

    service = ScholarshipMatchingService(gemini_client=mock_client)

    sch = Scholarship(
        id=uuid.uuid4(),
        name="National STEM Fellowship",
        provider="Science Trust",
        description="Fellowship for engineering scholars",
        amount=Decimal("120000.00"),
        deadline=date.today() + timedelta(days=45),
        eligibility="Engineering students",
    )
    academic = AcademicProfile(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        course="B.Tech Computer Science",
        cgpa=Decimal("9.20"),
    )

    result = await service.evaluate_single_match(
        scholarship=sch,
        academic_profile=academic,
    )

    assert result.scholarship_id == sch.id
    assert result.match_score == 92
    assert result.match_level == MatchLevel.EXCELLENT_MATCH
    assert result.is_ai_generated is True
    assert "Student matches all eligibility" in result.summary


@pytest.mark.anyio
async def test_matching_service_deterministic_fallback_when_unconfigured() -> None:
    """ScholarshipMatchingService falls back gracefully to deterministic scoring."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured = False

    service = ScholarshipMatchingService(gemini_client=mock_client)

    sch = Scholarship(
        id=uuid.uuid4(),
        name="Merit Scholarship for Engineers",
        provider="Govt Board",
        description="Need and merit aid for engineering degree students",
        amount=Decimal("80000.00"),
        deadline=date.today() + timedelta(days=20),
    )
    academic = AcademicProfile(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        course="B.Tech Computer Science",
        cgpa=Decimal("8.80"),
    )
    financial = FinancialPreference(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        reservation_category="OBC",
        family_income=Decimal("200000.00"),
    )

    result = await service.evaluate_single_match(
        scholarship=sch,
        academic_profile=academic,
        financial_preference=financial,
    )

    assert result.scholarship_id == sch.id
    assert 0 <= result.match_score <= 100
    assert result.is_ai_generated is False
    assert len(result.matched_criteria) > 0


@pytest.mark.anyio
async def test_matching_service_score_clamping() -> None:
    """Verify match score is strictly clamped to [0, 100]."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured = True
    # Return out-of-range score
    mock_client.generate_structured_json = AsyncMock(return_value={
        "match_score": 185,
        "match_level": "EXCELLENT_MATCH",
        "summary": "Overqualified student",
    })

    service = ScholarshipMatchingService(gemini_client=mock_client)
    sch = Scholarship(
        id=uuid.uuid4(),
        name="Sample Award",
        provider="Trust",
        description="Desc",
        amount=Decimal("10000.00"),
        deadline=date.today() + timedelta(days=10),
    )
    academic = AcademicProfile(id=uuid.uuid4(), user_id=uuid.uuid4(), cgpa=Decimal("9.0"))

    result = await service.evaluate_single_match(scholarship=sch, academic_profile=academic)
    assert result.match_score == 100

    # Negative score clamp test
    mock_client.generate_structured_json = AsyncMock(return_value={
        "match_score": -45,
        "match_level": "NOT_ELIGIBLE",
        "summary": "Disqualified",
    })
    result_neg = await service.evaluate_single_match(scholarship=sch, academic_profile=academic)
    assert result_neg.match_score == 0


@pytest.mark.anyio
async def test_matching_service_deadline_expired_handling() -> None:
    """Verify expired deadlines are penalized and flagged in potential_issues."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured = False

    service = ScholarshipMatchingService(gemini_client=mock_client)
    past_date = date.today() - timedelta(days=10)
    sch = Scholarship(
        id=uuid.uuid4(),
        name="Expired Scholarship",
        provider="Trust",
        description="Closed program",
        amount=Decimal("10000.00"),
        deadline=past_date,
    )
    academic = AcademicProfile(id=uuid.uuid4(), user_id=uuid.uuid4(), cgpa=Decimal("9.0"))

    result = await service.evaluate_single_match(scholarship=sch, academic_profile=academic)
    assert any("deadline passed" in issue.lower() for issue in result.potential_issues)


@pytest.mark.anyio
async def test_matching_service_empty_profile_handling() -> None:
    """When user has no profile sections, returns match score 0 with UNKNOWN level."""
    service = ScholarshipMatchingService()
    sch = Scholarship(
        id=uuid.uuid4(),
        name="General Grant",
        provider="Trust",
        description="Desc",
        amount=Decimal("10000.00"),
        deadline=date.today() + timedelta(days=10),
    )

    result = await service.evaluate_single_match(
        scholarship=sch,
        personal_profile=None,
        academic_profile=None,
        financial_preference=None,
    )

    assert result.match_score == 0
    assert result.match_level == MatchLevel.UNKNOWN
    assert result.is_ai_generated is False
    assert "Incomplete" in result.summary or "incomplete" in result.summary


# ==============================================================================
# 4. SINGLE SCHOLARSHIP MATCH ENDPOINT HTTP TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_single_scholarship_match_endpoint_authenticated(async_client: AsyncClient) -> None:
    """GET /api/v1/scholarships/{id}/match returns 200 with structured match schema."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="match_test")

    # Set up user profiles
    async with TestAsyncSessionLocal() as session:
        prof = StudentProfile(
            id=uuid.uuid4(),
            user_id=user_id,
            first_name="Priya",
            last_name="Patil",
            gender="Female",
            country="India",
            state="Karnataka",
            city="Bengaluru",
        )
        acad = AcademicProfile(
            id=uuid.uuid4(),
            user_id=user_id,
            course="B.E. Information Technology",
            cgpa=Decimal("8.90"),
        )
        fin = FinancialPreference(
            id=uuid.uuid4(),
            user_id=user_id,
            reservation_category="General",
            family_income=Decimal("400000.00"),
            study_preference=StudyPreference.INDIA,
        )
        sch = Scholarship(
            id=uuid.uuid4(),
            name="Women in Tech Excellence Award",
            provider="Bengaluru Tech Council",
            description="Empowering female technology students across Karnataka.",
            amount=Decimal("100000.00"),
            deadline=date.today() + timedelta(days=40),
            eligibility="Female engineering and IT students with minimum 8.0 CGPA",
        )
        session.add_all([prof, acad, fin, sch])
        await session.commit()
        sch_id = sch.id

    try:
        resp = await async_client.get(
            f"/api/v1/scholarships/{sch_id}/match",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data["scholarship_id"] == str(sch_id)
        assert data["scholarship_name"] == "Women in Tech Excellence Award"
        assert 0 <= data["match_score"] <= 100
        assert data["match_level"] in [lvl.value for lvl in MatchLevel]
        assert isinstance(data["summary"], str) and len(data["summary"]) > 0
        assert isinstance(data["matched_criteria"], list)
        assert isinstance(data["potential_issues"], list)
        assert isinstance(data["recommendations"], list)
        assert isinstance(data["is_ai_generated"], bool)
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Scholarship).where(Scholarship.id == sch_id))
            await session.execute(delete(StudentProfile).where(StudentProfile.user_id == user_id))
            await session.execute(delete(AcademicProfile).where(AcademicProfile.user_id == user_id))
            await session.execute(delete(FinancialPreference).where(FinancialPreference.user_id == user_id))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


@pytest.mark.anyio
async def test_single_scholarship_match_unauthenticated_returns_401(async_client: AsyncClient) -> None:
    """GET /api/v1/scholarships/{id}/match without JWT token returns 401."""
    random_id = uuid.uuid4()
    resp = await async_client.get(f"/api/v1/scholarships/{random_id}/match")
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_single_scholarship_match_not_found_returns_404(async_client: AsyncClient) -> None:
    """GET /api/v1/scholarships/{id}/match with non-existent scholarship UUID returns 404."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="notfound_test")
    random_id = uuid.uuid4()

    try:
        resp = await async_client.get(
            f"/api/v1/scholarships/{random_id}/match",
            headers=headers,
        )
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Scholarship not found"
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


# ==============================================================================
# 5. RECOMMENDATIONS ENDPOINT HTTP TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_recommendations_endpoint_authenticated(async_client: AsyncClient) -> None:
    """GET /api/v1/scholarships/recommendations returns ranked recommendations."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="recs_test")
    sch_ids = [uuid.uuid4() for _ in range(3)]

    async with TestAsyncSessionLocal() as session:
        prof = StudentProfile(
            id=uuid.uuid4(),
            user_id=user_id,
            first_name="Rohan",
            last_name="Verma",
        )
        acad = AcademicProfile(
            id=uuid.uuid4(),
            user_id=user_id,
            course="B.Tech Computer Science",
            cgpa=Decimal("9.40"),
        )
        fin = FinancialPreference(
            id=uuid.uuid4(),
            user_id=user_id,
            reservation_category="OBC",
            family_income=Decimal("180000.00"),
        )
        sch1 = Scholarship(
            id=sch_ids[0],
            name="Top Engineering Fellowships",
            provider="National Science Foundation",
            description="Prestigious computer science award",
            amount=Decimal("200000.00"),
            deadline=date.today() + timedelta(days=30),
        )
        sch2 = Scholarship(
            id=sch_ids[1],
            name="General Opportunity Grant",
            provider="State Education Dept",
            description="Need based award",
            amount=Decimal("50000.00"),
            deadline=date.today() + timedelta(days=15),
        )
        sch3 = Scholarship(
            id=sch_ids[2],
            name="Arts & Design Fellowship",
            provider="Arts Council",
            description="Fine arts scholarship",
            amount=Decimal("60000.00"),
            deadline=date.today() + timedelta(days=60),
        )
        session.add_all([prof, acad, fin, sch1, sch2, sch3])
        await session.commit()

    try:
        resp = await async_client.get(
            "/api/v1/scholarships/recommendations?page=1&page_size=10",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()

        assert "items" in data
        assert "total" in data
        assert data["total"] >= 3
        assert len(data["items"]) >= 3

        # Assert ranking order: match scores should be sorted descending
        scores = [item["match"]["match_score"] for item in data["items"]]
        assert scores == sorted(scores, reverse=True)
    finally:
        async with TestAsyncSessionLocal() as session:
            for s_id in sch_ids:
                await session.execute(delete(Scholarship).where(Scholarship.id == s_id))
            await session.execute(delete(StudentProfile).where(StudentProfile.user_id == user_id))
            await session.execute(delete(AcademicProfile).where(AcademicProfile.user_id == user_id))
            await session.execute(delete(FinancialPreference).where(FinancialPreference.user_id == user_id))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


@pytest.mark.anyio
async def test_recommendations_endpoint_min_score_filter(async_client: AsyncClient) -> None:
    """GET /api/v1/scholarships/recommendations?min_score=70 filters low matches."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="filter_test")

    try:
        resp = await async_client.get(
            "/api/v1/scholarships/recommendations?min_score=70",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        for item in data["items"]:
            assert item["match"]["match_score"] >= 70
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()


# ==============================================================================
# 6. CROSS-USER ISOLATION & PRIVACY TESTS
# ==============================================================================
@pytest.mark.anyio
async def test_matching_cross_user_isolation(async_client: AsyncClient) -> None:
    """Student A and Student B receive distinct match assessments for the same scholarship."""
    _, headers_a, user_a_id = await create_and_auth_user(async_client, prefix="student_a")
    _, headers_b, user_b_id = await create_and_auth_user(async_client, prefix="student_b")

    sch_id = uuid.uuid4()

    async with TestAsyncSessionLocal() as session:
        # Student A: High CGPA, Computer Science
        acad_a = AcademicProfile(
            id=uuid.uuid4(),
            user_id=user_a_id,
            course="B.Tech Computer Science",
            cgpa=Decimal("9.80"),
        )
        # Student B: No academic profile, Arts focus
        acad_b = AcademicProfile(
            id=uuid.uuid4(),
            user_id=user_b_id,
            course="Bachelor of Fine Arts",
            cgpa=Decimal("6.20"),
        )
        sch = Scholarship(
            id=sch_id,
            name="Advanced Computer Science Excellence Fellowship",
            provider="Tech University",
            description="Fellowship for top percentile computer science engineering students.",
            amount=Decimal("100000.00"),
            deadline=date.today() + timedelta(days=25),
        )
        session.add_all([acad_a, acad_b, sch])
        await session.commit()

    try:
        resp_a = await async_client.get(f"/api/v1/scholarships/{sch_id}/match", headers=headers_a)
        resp_b = await async_client.get(f"/api/v1/scholarships/{sch_id}/match", headers=headers_b)

        assert resp_a.status_code == 200
        assert resp_b.status_code == 200

        data_a = resp_a.json()
        data_b = resp_b.json()

        # Student A should have a higher match score than Student B
        assert data_a["match_score"] > data_b["match_score"]
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Scholarship).where(Scholarship.id == sch_id))
            await session.execute(delete(AcademicProfile).where(AcademicProfile.user_id.in_([user_a_id, user_b_id])))
            await session.execute(delete(User).where(User.id.in_([user_a_id, user_b_id])))
            await session.commit()


@pytest.mark.anyio
async def test_no_secrets_in_api_responses(async_client: AsyncClient) -> None:
    """Verify responses never leak API keys, password hashes, or internal tokens."""
    _, headers, user_id = await create_and_auth_user(async_client, prefix="leak_test")
    sch_id = uuid.uuid4()

    async with TestAsyncSessionLocal() as session:
        sch = Scholarship(
            id=sch_id,
            name="Audit Scholarship",
            provider="Audit Board",
            description="Checking for secret leakage in responses.",
            amount=Decimal("50000.00"),
            deadline=date.today() + timedelta(days=30),
        )
        session.add(sch)
        await session.commit()

    try:
        resp = await async_client.get(f"/api/v1/scholarships/{sch_id}/match", headers=headers)
        assert resp.status_code == 200
        raw_text = resp.text.lower()

        assert "password_hash" not in raw_text
        assert "argon2" not in raw_text
        assert "gemini_api_key" not in raw_text
        assert "jwt_secret" not in raw_text
    finally:
        async with TestAsyncSessionLocal() as session:
            await session.execute(delete(Scholarship).where(Scholarship.id == sch_id))
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()
