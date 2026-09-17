import math
import uuid
from datetime import date
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.document import (
    DocumentDeleteResponse,
    DocumentListResponse,
    DocumentResponse,
)
from app.services.document_service import document_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload or replace a student document",
    description="Uploads a document file to Cloudinary and persists metadata in PostgreSQL. Replaces if type already exists.",
)
async def upload_document(
    file: UploadFile = File(..., description="Document file (PDF, JPEG, JPG, PNG, max 10MB)"),
    type: str = Form(..., description="Document type (e.g. aadhaar, marksheet, income_certificate)"),
    category: str = Form(..., description="Document category (e.g. Identity, Academic, Financial)"),
    expiry_date: Optional[date] = Form(None, description="Optional document expiry date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentResponse:
    """Uploads a document to Cloudinary and registers metadata in PostgreSQL."""
    clean_type = type.strip().lower()
    clean_category = category.strip()

    if not clean_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document type cannot be empty.",
        )

    if not clean_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document category cannot be empty.",
        )

    doc_record = await document_service.upload_or_replace_document(
        db=db,
        user=current_user,
        file=file,
        doc_type=clean_type,
        category=clean_category,
        expiry_date=expiry_date,
    )

    return DocumentResponse.model_validate(doc_record)


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List student documents",
    description="Returns a paginated list of all documents uploaded by the authenticated student.",
)
async def list_documents(
    category: Optional[str] = Query(None, description="Filter documents by category"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentListResponse:
    """Retrieves all documents belonging to the authenticated student."""
    items, total = await document_service.list_user_documents(
        db=db,
        user=current_user,
        category=category,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return DocumentListResponse(
        items=[DocumentResponse.model_validate(doc) for doc in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get single document metadata",
    description="Retrieves metadata for a specific document owned by the student.",
)
async def get_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentResponse:
    """Retrieves metadata of a specific student document."""
    doc = await document_service.get_document_by_id(
        db=db,
        user=current_user,
        document_id=document_id,
    )
    return DocumentResponse.model_validate(doc)


@router.put(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Replace existing document file",
    description="Replaces an existing document file and optional metadata for a specific document ID.",
)
async def replace_document(
    document_id: uuid.UUID,
    file: UploadFile = File(..., description="Replacement document file"),
    type: Optional[str] = Form(None, description="Optional updated document type"),
    category: Optional[str] = Form(None, description="Optional updated document category"),
    expiry_date: Optional[date] = Form(None, description="Optional document expiry date"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentResponse:
    """Replaces a specific existing document file and metadata."""
    existing_doc = await document_service.get_document_by_id(
        db=db,
        user=current_user,
        document_id=document_id,
    )

    doc_type = type.strip().lower() if type else existing_doc.type
    doc_category = category.strip() if category else existing_doc.category

    doc_record = await document_service.upload_or_replace_document(
        db=db,
        user=current_user,
        file=file,
        doc_type=doc_type,
        category=doc_category,
        expiry_date=expiry_date if expiry_date is not None else existing_doc.expiry_date,
    )

    return DocumentResponse.model_validate(doc_record)


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
    summary="Delete a student document",
    description="Permanently deletes a student document from Cloudinary and PostgreSQL.",
)
async def delete_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentDeleteResponse:
    """Deletes a student document and its Cloudinary asset."""
    deleted_id = await document_service.delete_document(
        db=db,
        user=current_user,
        document_id=document_id,
    )

    return DocumentDeleteResponse(
        message="Document deleted successfully.",
        document_id=deleted_id,
    )
