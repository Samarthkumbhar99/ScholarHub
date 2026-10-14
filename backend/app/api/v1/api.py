from fastapi import APIRouter

from app.api.v1.routes import (
    admin,
    application,
    auth,
    document,
    notification,
    profile,
    provider,
    scholarship,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(scholarship.router)
api_router.include_router(application.router)
api_router.include_router(document.router)
api_router.include_router(notification.router)
api_router.include_router(provider.router)
api_router.include_router(admin.router)

