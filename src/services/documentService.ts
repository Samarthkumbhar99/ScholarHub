import { apiClient, ApiResponse } from './api';
import { API_ENDPOINTS } from '../constants';
import { BackendDocument } from '../utils/adapters';

export interface DocumentListResponseData {
  items: BackendDocument[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DocumentDeleteResponseData {
  message: string;
  document_id: string;
}

export interface UploadDocumentParams {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  type: string;
  category: string;
  expiryDate?: string;
}

/**
 * Student Document Center Service
 * Handles multipart file uploads and replacements to FastAPI & Cloudinary.
 */
export const documentService = {
  async listDocuments(category?: string, page: number = 1, pageSize: number = 50): Promise<ApiResponse<DocumentListResponseData>> {
    return apiClient.get<DocumentListResponseData>(API_ENDPOINTS.DOCUMENTS.LIST, {
      category,
      page,
      page_size: pageSize,
    });
  },

  async getDocument(id: string): Promise<ApiResponse<BackendDocument>> {
    return apiClient.get<BackendDocument>(API_ENDPOINTS.DOCUMENTS.DETAIL(id));
  },

  async uploadDocument(params: UploadDocumentParams): Promise<ApiResponse<BackendDocument>> {
    const formData = new FormData();

    // React Native multipart file representation
    formData.append('file', {
      uri: params.fileUri,
      name: params.fileName,
      type: params.mimeType || 'application/pdf',
    } as unknown as Blob);

    formData.append('type', params.type.trim().toLowerCase());
    formData.append('category', params.category.trim());

    if (params.expiryDate) {
      formData.append('expiry_date', params.expiryDate);
    }

    return apiClient.upload<BackendDocument>(API_ENDPOINTS.DOCUMENTS.UPLOAD, formData, 'POST');
  },

  async replaceDocument(id: string, params: UploadDocumentParams): Promise<ApiResponse<BackendDocument>> {
    const formData = new FormData();

    formData.append('file', {
      uri: params.fileUri,
      name: params.fileName,
      type: params.mimeType || 'application/pdf',
    } as unknown as Blob);

    formData.append('type', params.type.trim().toLowerCase());
    formData.append('category', params.category.trim());

    if (params.expiryDate) {
      formData.append('expiry_date', params.expiryDate);
    }

    return apiClient.upload<BackendDocument>(API_ENDPOINTS.DOCUMENTS.REPLACE(id), formData, 'PUT');
  },

  async deleteDocument(id: string): Promise<ApiResponse<DocumentDeleteResponseData>> {
    return apiClient.delete<DocumentDeleteResponseData>(API_ENDPOINTS.DOCUMENTS.DELETE(id));
  },
};

export default documentService;
