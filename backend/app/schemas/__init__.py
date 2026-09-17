from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.profile import (
    AcademicProfileResponse,
    AcademicProfileUpdate,
    CombinedProfileResponse,
    FinancialPreferenceResponse,
    FinancialPreferenceUpdate,
    StudentProfileResponse,
    StudentProfileUpdate,
)
from app.schemas.application import (
    ApplicationCreateRequest,
    ApplicationDeleteResponse,
    ApplicationListItem,
    ApplicationListResponse,
    ApplicationResponse,
    ApplicationScholarshipInfo,
    ApplicationStatusUpdateRequest,
)
from app.schemas.matching import (
    MatchLevel,
    ScholarshipMatchResponse,
    ScholarshipRecommendationItem,
    ScholarshipRecommendationResponse,
)
from app.schemas.scholarship import (
    SavedStatusResponse,
    ScholarshipCompareResponse,
    ScholarshipListItem,
    ScholarshipListResponse,
    ScholarshipRequirementResponse,
    ScholarshipResponse,
    ScholarshipSortOption,
)

from app.schemas.document import (
    DocumentCategoryEnum,
    DocumentDeleteResponse,
    DocumentListResponse,
    DocumentResponse,
    DocumentTypeEnum,
)

__all__ = [
    # Auth
    "RegisterRequest",
    "LoginRequest",
    "TokenResponse",
    "UserResponse",
    # Profile
    "StudentProfileUpdate",
    "StudentProfileResponse",
    "AcademicProfileUpdate",
    "AcademicProfileResponse",
    "FinancialPreferenceUpdate",
    "FinancialPreferenceResponse",
    "CombinedProfileResponse",
    # Scholarship
    "ScholarshipSortOption",
    "ScholarshipRequirementResponse",
    "ScholarshipListItem",
    "ScholarshipResponse",
    "ScholarshipListResponse",
    "SavedStatusResponse",
    "ScholarshipCompareResponse",
    # Matching / AI
    "MatchLevel",
    "ScholarshipMatchResponse",
    "ScholarshipRecommendationItem",
    "ScholarshipRecommendationResponse",
    # Application
    "ApplicationScholarshipInfo",
    "ApplicationCreateRequest",
    "ApplicationStatusUpdateRequest",
    "ApplicationResponse",
    "ApplicationListItem",
    "ApplicationListResponse",
    "ApplicationDeleteResponse",
    # Document
    "DocumentTypeEnum",
    "DocumentCategoryEnum",
    "DocumentResponse",
    "DocumentListResponse",
    "DocumentDeleteResponse",
]
