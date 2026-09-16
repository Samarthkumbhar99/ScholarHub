import uuid
from decimal import Decimal
import pytest
from sqlalchemy.orm import configure_mappers, class_mapper
from sqlalchemy.types import String, Numeric, Enum as SAEnum, Boolean, Date, DateTime

from app.core.database import Base
from app.models import (
    User,
    UserSettings,
    StudentProfile,
    AcademicProfile,
    FinancialPreference,
    StudyPreference,
    Scholarship,
    ScholarshipRequirement,
    SavedScholarship,
    Application,
    ApplicationStatus,
    StudentDocument,
    Notification,
    NotificationType,
    Country,
    University,
    Course,
    UniversityScholarship,
)


def test_models_import_and_registration():
    """Verify all domain models are registered with declarative Base metadata."""
    expected_tables = {
        "users",
        "user_settings",
        "student_profiles",
        "academic_profiles",
        "financial_preferences",
        "scholarships",
        "scholarship_requirements",
        "saved_scholarships",
        "applications",
        "student_documents",
        "notifications",
        "countries",
        "universities",
        "courses",
        "university_scholarships",
    }
    actual_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(actual_tables), f"Missing tables: {expected_tables - actual_tables}"


def test_sqlalchemy_mappers_compile():
    """Verify all mapper relationships, back_populates, and foreign keys compile without mapper errors."""
    try:
        configure_mappers()
    except Exception as e:
        pytest.fail(f"SQLAlchemy configure_mappers failed with error: {e}")


def test_user_relationships_and_properties():
    """Verify User model relationships and configuration."""
    mapper = class_mapper(User)
    
    assert "profile" in mapper.relationships
    assert "academic_profile" in mapper.relationships
    assert "financial_preference" in mapper.relationships
    assert "settings" in mapper.relationships
    assert "saved_scholarships" in mapper.relationships
    assert "applications" in mapper.relationships
    assert "documents" in mapper.relationships
    assert "notifications" in mapper.relationships

    # 1:1 checks
    assert mapper.relationships["profile"].uselist is False
    assert mapper.relationships["academic_profile"].uselist is False
    assert mapper.relationships["financial_preference"].uselist is False
    assert mapper.relationships["settings"].uselist is False

    # Cascades check
    assert mapper.relationships["profile"].cascade.delete_orphan is True
    assert mapper.relationships["profile"].cascade.delete is True
    assert mapper.relationships["saved_scholarships"].cascade.delete_orphan is True
    assert mapper.relationships["applications"].cascade.delete_orphan is True


def test_scholarship_model_and_requirements():
    """Verify Scholarship model structure and requirement relationship."""
    sch_mapper = class_mapper(Scholarship)
    req_mapper = class_mapper(ScholarshipRequirement)
    saved_mapper = class_mapper(SavedScholarship)

    assert "requirements" in sch_mapper.relationships
    assert "saved_by_users" in sch_mapper.relationships
    assert "applications" in sch_mapper.relationships
    assert "universities" in sch_mapper.relationships

    assert req_mapper.relationships["scholarship"].back_populates == "requirements"
    assert saved_mapper.relationships["scholarship"].back_populates == "saved_by_users"


def test_enums_and_values():
    """Verify Enum domain models have exact expected values matching frontend."""
    assert [e.value for e in StudyPreference] == ["INDIA", "ABROAD", "BOTH"]

    assert [e.value for e in ApplicationStatus] == [
        "SAVED",
        "PREPARING_DOCUMENTS",
        "APPLIED",
        "UNDER_REVIEW",
        "INTERVIEW",
        "SELECTED",
        "SCHOLARSHIP_RECEIVED",
    ]

    assert [e.value for e in NotificationType] == [
        "DEADLINE_REMINDER",
        "NEW_SCHOLARSHIP",
        "APPLICATION_CONFIRMATION",
        "MISSING_DOCUMENT",
        "RESULT",
        "INTERVIEW",
    ]


def test_unique_constraints_and_foreign_keys():
    """Verify key unique constraints and foreign key definitions."""
    # SavedScholarship unique (user_id, scholarship_id)
    saved_table = Base.metadata.tables["saved_scholarships"]
    saved_uq_names = [uq.name for uq in saved_table.constraints if hasattr(uq, "columns") and len(uq.columns) == 2]
    assert "uq_saved_scholarship_user_scholarship" in saved_uq_names

    # Application unique (user_id, scholarship_id)
    app_table = Base.metadata.tables["applications"]
    app_uq_names = [uq.name for uq in app_table.constraints if hasattr(uq, "columns") and len(uq.columns) == 2]
    assert "uq_application_user_scholarship" in app_uq_names

    # StudentDocument unique (user_id, type)
    doc_table = Base.metadata.tables["student_documents"]
    doc_uq_names = [uq.name for uq in doc_table.constraints if hasattr(uq, "columns") and len(uq.columns) == 2]
    assert "uq_student_document_user_type" in doc_uq_names

    # UniversityScholarship unique (university_id, scholarship_id)
    uni_sch_table = Base.metadata.tables["university_scholarships"]
    uni_sch_uq = [uq.name for uq in uni_sch_table.constraints if hasattr(uq, "columns") and len(uq.columns) == 2]
    assert "uq_university_scholarship" in uni_sch_uq


def test_study_abroad_hierarchy():
    """Verify Country -> University -> Course relationship hierarchy."""
    country_mapper = class_mapper(Country)
    uni_mapper = class_mapper(University)
    course_mapper = class_mapper(Course)

    assert "universities" in country_mapper.relationships
    assert "courses" in uni_mapper.relationships
    assert "scholarships" in uni_mapper.relationships
    assert "country" in uni_mapper.relationships
    assert "university" in course_mapper.relationships


def test_academic_and_financial_constraints():
    """Verify check constraints for academic scores and financial income."""
    academic_table = Base.metadata.tables["academic_profiles"]
    chk_names = [c.name for c in academic_table.constraints if hasattr(c, "sqltext")]
    assert "chk_academic_cgpa_range" in chk_names
    assert "chk_academic_percentage_range" in chk_names

    financial_table = Base.metadata.tables["financial_preferences"]
    fin_chk_names = [c.name for c in financial_table.constraints if hasattr(c, "sqltext")]
    assert "chk_financial_income_positive" in fin_chk_names


def test_model_instantiations():
    """Verify models instantiate properly in memory with expected types."""
    from datetime import date, datetime, timezone

    user = User(
        email="test@scholarhub.com",
        password_hash="$2b$12$e8xL...hashed",
    )
    assert user.email == "test@scholarhub.com"
    assert user.password_hash.startswith("$2b$12")

    profile = StudentProfile(
        user=user,
        first_name="Samarth",
        last_name="Kumbhar",
        gender="Male",
        mobile="+919876543210",
        country="India",
        state="Maharashtra",
        district="Pune",
        city="Pune",
        date_of_birth=date(2003, 5, 14),
    )
    assert profile.first_name == "Samarth"
    assert profile.user == user

    academic = AcademicProfile(
        user=user,
        course="B.Tech",
        branch="Computer Science & Engineering",
        current_year="Final Year",
        university="Savitribai Phule Pune University",
        college="Pune Institute of Computer Technology",
        cgpa=Decimal("9.15"),
        previous_percentage=Decimal("92.40"),
    )
    assert academic.cgpa == Decimal("9.15")

    fin = FinancialPreference(
        user=user,
        reservation_category="OBC",
        special_categories=["Minority"],
        family_income=Decimal("450000.00"),
        study_preference=StudyPreference.BOTH,
    )
    assert fin.study_preference == StudyPreference.BOTH

    settings = UserSettings(
        user=user,
        notifications_enabled=True,
        language="en",
    )
    assert settings.notifications_enabled is True

    sch = Scholarship(
        name="National Merit Scholarship",
        provider="Ministry of Education",
        description="Merit-based financial aid",
        amount=Decimal("50000.00"),
        deadline=date(2026, 12, 31),
        eligibility="Undergraduate students with CGPA > 8.0",
        benefits=["Full tuition coverage", "Annual book allowance"],
        selection_process=["Aptitude test", "Interview"],
        official_website="https://scholarships.gov.in",
    )
    assert sch.amount == Decimal("50000.00")

    req = ScholarshipRequirement(
        scholarship=sch,
        name="Income Certificate",
        document_type="income_certificate",
        required=True,
    )
    assert req.document_type == "income_certificate"
    assert req.scholarship == sch

    app = Application(
        user=user,
        scholarship=sch,
        status=ApplicationStatus.APPLIED,
        applied_at=datetime.now(timezone.utc),
    )
    assert app.status == ApplicationStatus.APPLIED

    doc = StudentDocument(
        user=user,
        type="aadhaar",
        category="Identity",
        file_name="aadhaar_card.pdf",
        file_size=1468006,
        file_url="https://res.cloudinary.com/scholarhub/image/upload/aadhaar.pdf",
        uploaded_at=datetime.now(timezone.utc),
    )
    assert doc.category == "Identity"
    assert doc.file_size == 1468006

    notif = Notification(
        user=user,
        type=NotificationType.DEADLINE_REMINDER,
        title="Application Deadline Approaching",
        message="Only 3 days left to complete your National Merit Scholarship application.",
        scholarship=sch,
        application=app,
        is_read=False,
    )
    assert notif.type == NotificationType.DEADLINE_REMINDER
    assert notif.is_read is False

    country = Country(
        name="Germany",
        code="DE",
        description="Tuition-free public universities",
        popular_courses=["Automotive Engineering", "Computer Science"],
        tuition_summary="€0 - €3,000 / year",
        living_cost_summary="€850 - €1,100 / month",
    )
    uni = University(
        country=country,
        name="Technical University of Munich (TUM)",
        description="Leading German technical university",
        official_website="https://www.tum.de",
    )
    course = Course(
        university=uni,
        name="M.Sc. Informatics",
        degree_level="Master",
        duration="2 Years",
        tuition="€0 / semester",
        description="Comprehensive master's in Computer Science",
    )
    uni_sch = UniversityScholarship(
        university=uni,
        scholarship=sch,
    )
    assert course.university == uni
    assert uni.country == country
    assert uni_sch.university == uni
    assert uni_sch.scholarship == sch

