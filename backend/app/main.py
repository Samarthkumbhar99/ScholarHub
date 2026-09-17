import logging
from typing import Dict
from fastapi import Depends, FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)

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

# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def read_root() -> Dict[str, str]:
    """Root endpoint to verify the ScholarHub API service is running."""
    return {
        "service": settings.APP_NAME,
        "status": "running",
        "version": settings.VERSION,
        "docs_url": "/docs",
    }


@app.get(
    f"{settings.API_V1_STR}/health",
    tags=["Health"],
    responses={
        200: {
            "description": "Backend service and database are fully operational",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "service": "ScholarHub API",
                        "version": "1.0.0",
                        "database": "connected",
                    }
                }
            },
        },
        503: {
            "description": "Backend service or database connection degraded",
            "content": {
                "application/json": {
                    "example": {
                        "status": "unhealthy",
                        "service": "ScholarHub API",
                        "version": "1.0.0",
                        "database": "disconnected",
                    }
                }
            },
        },
    },
)
async def get_health(
    response: Response, db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """Health check endpoint to verify backend operational readiness and PostgreSQL connectivity."""
    db_status = "disconnected"
    try:
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            db_status = "connected"
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}")
        db_status = "disconnected"

    if db_status == "connected":
        return {
            "status": "healthy",
            "service": settings.APP_NAME,
            "version": settings.VERSION,
            "database": "connected",
        }

    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "unhealthy",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "database": "disconnected",
    }
