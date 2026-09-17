from fastapi import APIRouter

from app.api.v1.routes import auth, profile, scholarship

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(scholarship.router)
