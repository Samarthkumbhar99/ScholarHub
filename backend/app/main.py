from typing import Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
def read_root() -> Dict[str, str]:
    """Root endpoint to verify the ScholarHub API service is running."""
    return {
        "service": settings.APP_NAME,
        "status": "running",
        "version": settings.VERSION,
        "docs_url": "/docs",
    }


@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
def get_health() -> Dict[str, str]:
    """Health check endpoint to verify backend operational readiness."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
    }
