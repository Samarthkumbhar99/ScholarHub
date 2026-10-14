from app.models.application import Application, ApplicationStatus
from app.models.discovery import (
    CollectionJobStatus,
    ScholarshipCollectionJob,
    ScholarshipSource,
    ScholarshipSourceType,
)
from app.models.document import StudentDocument
from app.models.notification import Notification, NotificationType
from app.models.profile import (
    AcademicProfile,
    FinancialPreference,
    ProviderProfile,
    StudentProfile,
    StudyPreference,
)
from app.models.scholarship import (
    SavedScholarship,
    Scholarship,
    ScholarshipRequirement,
    ScholarshipReviewStatus,
)
from app.models.study_abroad import (
    Country,
    Course,
    University,
    UniversityScholarship,
)
from app.models.user import User, UserRole, UserSettings

__all__ = [
    # User & Settings
    "User",
    "UserRole",
    "UserSettings",
    # Profiles & Preferences
    "StudentProfile",
    "AcademicProfile",
    "FinancialPreference",
    "ProviderProfile",
    "StudyPreference",
    # Scholarships & Requirements
    "Scholarship",
    "ScholarshipRequirement",
    "SavedScholarship",
    "ScholarshipReviewStatus",
    # Discovery & Provenance
    "ScholarshipSource",
    "ScholarshipCollectionJob",
    "ScholarshipSourceType",
    "CollectionJobStatus",
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

