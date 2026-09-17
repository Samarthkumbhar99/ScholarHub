"""Scholarship Matching & Recommendation Service.

Orchestrates deterministic eligibility checks and semantic Gemini AI matching.
Completely isolated from database operations.
"""

from datetime import date, datetime, timezone
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.models.profile import AcademicProfile, FinancialPreference, StudentProfile
from app.models.scholarship import Scholarship, ScholarshipRequirement
from app.schemas.matching import (
    MatchLevel,
    ScholarshipMatchResponse,
    ScholarshipRecommendationItem,
)
from app.schemas.scholarship import ScholarshipListItem
from app.services.ai.gemini_client import GeminiClient
from app.services.ai.prompt_builder import PromptBuilder

logger = logging.getLogger(__name__)


class ScholarshipMatchingService:
    """Service for computing scholarship match scores and recommendation rankings."""

    def __init__(
        self,
        gemini_client: Optional[GeminiClient] = None,
        prompt_builder: Optional[PromptBuilder] = None,
    ) -> None:
        self.gemini_client = gemini_client or GeminiClient()
        self.prompt_builder = prompt_builder or PromptBuilder()

    @staticmethod
    def resolve_match_level(level_str: Optional[str], score: int) -> MatchLevel:
        """Map score or raw AI string to standard MatchLevel enum."""
        if level_str:
            clean_str = level_str.strip().upper()
            try:
                return MatchLevel(clean_str)
            except ValueError:
                pass

        if score >= 85:
            return MatchLevel.EXCELLENT_MATCH
        elif score >= 70:
            return MatchLevel.GOOD_MATCH
        elif score >= 50:
            return MatchLevel.MODERATE_MATCH
        elif score >= 30:
            return MatchLevel.LOW_MATCH
        else:
            return MatchLevel.NOT_ELIGIBLE

    def compute_deterministic_fallback(
        self,
        scholarship: Scholarship,
        requirements: Optional[List[ScholarshipRequirement]] = None,
        personal_profile: Optional[StudentProfile] = None,
        academic_profile: Optional[AcademicProfile] = None,
        financial_preference: Optional[FinancialPreference] = None,
        deadline_passed: bool = False,
    ) -> ScholarshipMatchResponse:
        """Calculate a safe, deterministic baseline match assessment without AI fabrication."""
        score = 50  # Baseline neutral score
        matched_criteria: List[str] = []
        potential_issues: List[str] = []
        recommendations: List[str] = []

        if deadline_passed:
            potential_issues.append(f"Scholarship application deadline passed on {scholarship.deadline}")
            score -= 30

        # Academic criteria
        if academic_profile and academic_profile.cgpa is not None:
            cgpa_val = float(academic_profile.cgpa)
            if cgpa_val >= 8.5:
                matched_criteria.append(f"Strong academic record with CGPA {cgpa_val:.2f}/10.0")
                score += 15
            elif cgpa_val >= 7.0:
                matched_criteria.append(f"Satisfactory academic standing with CGPA {cgpa_val:.2f}/10.0")
                score += 8
            else:
                potential_issues.append(f"CGPA {cgpa_val:.2f}/10.0 may be below competitive thresholds")
                score -= 10
        elif not academic_profile or academic_profile.cgpa is None:
            potential_issues.append("Academic GPA / CGPA is not specified in profile")

        # Academic course check against text
        if academic_profile and academic_profile.course:
            course_lower = academic_profile.course.lower()
            text_corpus = f"{scholarship.name} {scholarship.description} {scholarship.eligibility or ''}".lower()
            if any(term in text_corpus for term in [course_lower, "student", "undergraduate", "postgraduate", "engineering", "degree"]):
                matched_criteria.append(f"Course '{academic_profile.course}' aligns with scholarship domain")
                score += 10

        # Financial & Category criteria
        if financial_preference:
            if financial_preference.reservation_category and financial_preference.reservation_category != "General":
                matched_criteria.append(f"Eligible for reservation quota category: {financial_preference.reservation_category}")
                score += 10
            if financial_preference.family_income is not None:
                income_val = float(financial_preference.family_income)
                if income_val <= 300000:
                    matched_criteria.append("Qualifies under low-income / need-based eligibility threshold")
                    score += 10

        # Requirements check
        if requirements:
            required_docs = [r.name for r in requirements if r.required]
            if required_docs:
                recommendations.append(f"Prepare mandatory documents: {', '.join(required_docs[:3])}")

        recommendations.append("Ensure full application details are submitted before the deadline")

        final_score = max(0, min(100, score))
        match_level = self.resolve_match_level(None, final_score)

        summary = (
            f"Deterministic eligibility evaluation for '{scholarship.name}'. "
            f"Evaluated academic standings, socio-economic preferences, and deadline status."
        )

        return ScholarshipMatchResponse(
            scholarship_id=scholarship.id,
            scholarship_name=scholarship.name,
            match_score=final_score,
            match_level=match_level,
            summary=summary,
            matched_criteria=matched_criteria,
            potential_issues=potential_issues,
            recommendations=recommendations,
            is_ai_generated=False,
        )

    async def evaluate_single_match(
        self,
        scholarship: Scholarship,
        requirements: Optional[List[ScholarshipRequirement]] = None,
        personal_profile: Optional[StudentProfile] = None,
        academic_profile: Optional[AcademicProfile] = None,
        financial_preference: Optional[FinancialPreference] = None,
    ) -> ScholarshipMatchResponse:
        """Evaluate match score and criteria for a single scholarship."""
        # 1. Check if student has no profile populated at all
        if personal_profile is None and academic_profile is None and financial_preference is None:
            return ScholarshipMatchResponse(
                scholarship_id=scholarship.id,
                scholarship_name=scholarship.name,
                match_score=0,
                match_level=MatchLevel.UNKNOWN,
                summary="Student profile is incomplete. Please fill in your personal, academic, and financial preferences to receive personalized match scores.",
                matched_criteria=[],
                potential_issues=["No student profile found for authenticated user"],
                recommendations=["Complete your profile in the Profile section to enable AI scholarship matching"],
                is_ai_generated=False,
            )

        # 2. Deterministic checks (e.g. deadline expired)
        deadline_passed = False
        today_date = date.today()
        if scholarship.deadline and scholarship.deadline < today_date:
            deadline_passed = True

        # 3. If Gemini is configured, run AI matching
        if self.gemini_client.is_configured:
            student_data = self.prompt_builder.sanitize_student_data(
                personal_profile=personal_profile,
                academic_profile=academic_profile,
                financial_preference=financial_preference,
            )
            scholarship_data = self.prompt_builder.sanitize_scholarship_data(
                scholarship=scholarship,
                requirements=requirements,
            )

            system_instruction = self.prompt_builder.build_system_instruction()
            prompt = self.prompt_builder.build_single_match_prompt(student_data, scholarship_data)

            ai_result = await self.gemini_client.generate_structured_json(
                system_instruction=system_instruction,
                prompt=prompt,
            )

            if ai_result and isinstance(ai_result, dict):
                try:
                    raw_score = ai_result.get("match_score", 50)
                    score = int(round(float(raw_score)))
                    score = max(0, min(100, score))

                    raw_level = ai_result.get("match_level")
                    match_level = self.resolve_match_level(raw_level, score)

                    summary = str(ai_result.get("summary", "AI match evaluation completed."))
                    matched_criteria = [str(c) for c in ai_result.get("matched_criteria", []) if c]
                    potential_issues = [str(i) for i in ai_result.get("potential_issues", []) if i]
                    recommendations = [str(r) for r in ai_result.get("recommendations", []) if r]

                    # Enforce deterministic deadline check
                    if deadline_passed:
                        if not any("deadline" in issue.lower() for issue in potential_issues):
                            potential_issues.append(f"Scholarship application deadline passed on {scholarship.deadline}")
                        if score > 30:
                            score = max(10, score - 40)
                            match_level = self.resolve_match_level("NOT_ELIGIBLE", score)

                    return ScholarshipMatchResponse(
                        scholarship_id=scholarship.id,
                        scholarship_name=scholarship.name,
                        match_score=score,
                        match_level=match_level,
                        summary=summary,
                        matched_criteria=matched_criteria,
                        potential_issues=potential_issues,
                        recommendations=recommendations,
                        is_ai_generated=True,
                    )
                except Exception as exc:
                    logger.warning(f"Error validating Gemini AI response format: {exc}; falling back to deterministic.")

        # 4. Fallback deterministic computation
        return self.compute_deterministic_fallback(
            scholarship=scholarship,
            requirements=requirements,
            personal_profile=personal_profile,
            academic_profile=academic_profile,
            financial_preference=financial_preference,
            deadline_passed=deadline_passed,
        )

    async def recommend_scholarships(
        self,
        scholarships: List[Scholarship],
        personal_profile: Optional[StudentProfile] = None,
        academic_profile: Optional[AcademicProfile] = None,
        financial_preference: Optional[FinancialPreference] = None,
    ) -> List[ScholarshipRecommendationItem]:
        """Rank and return scholarship recommendations for the given student."""
        recommendations: List[ScholarshipRecommendationItem] = []

        for scholarship in scholarships:
            match_res = await self.evaluate_single_match(
                scholarship=scholarship,
                requirements=None,
                personal_profile=personal_profile,
                academic_profile=academic_profile,
                financial_preference=financial_preference,
            )
            item = ScholarshipRecommendationItem(
                scholarship=ScholarshipListItem.model_validate(scholarship),
                match=match_res,
            )
            recommendations.append(item)

        # Sort recommendations descending by match score, tie-broken by earliest deadline
        recommendations.sort(
            key=lambda rec: (
                rec.match.match_score,
                -(rec.scholarship.deadline.toordinal() if rec.scholarship.deadline else 0),
            ),
            reverse=True,
        )

        return recommendations
