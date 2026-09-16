from app.models.application import Application, ApplicationStatus
from app.models.document import StudentDocument
from app.models.notification import Notification, NotificationType
from app.models.profile import (
    AcademicProfile,
    FinancialPreference,
    StudentProfile,
    StudyPreference,
)
from app.models.scholarship import (
    SavedScholarship,
    Scholarship,
    ScholarshipRequirement,
)
from app.models.study_abroad import (
    Country,
    Course,
    University,
    UniversityScholarship,
)
from app.models.user import User, UserSettings

__all__ = [
    # User & Settings
    "User",
    "UserSettings",
    # Profiles & Preferences
    "StudentProfile",
    "AcademicProfile",
    "FinancialPreference",
    "StudyPreference",
    # Scholarships & Requirements
    "Scholarship",
    "ScholarshipRequirement",
    "SavedScholarship",
    # Applications
    "Application",
    "ApplicationStatus",
    # Documents
    "StudentDocument",
    # Notifications
    "Notification",
    "NotificationType",
    # Study Abroad & Higher Education
    "Country",
    "University",
    "Course",
    "UniversityScholarship",
]
