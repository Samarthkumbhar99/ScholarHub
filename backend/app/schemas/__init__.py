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
]
