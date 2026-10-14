import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DocumentItem } from '../../types/document';
import { documentService, UploadDocumentParams } from '../../services/documentService';
import { mapBackendDocumentsToSlots } from '../../utils/adapters';

export interface DocumentState {
  items: DocumentItem[];
  isLoading: boolean;
  error: string | null;
}

// Initial state initializes with standard document category slots in MISSING state
const initialState: DocumentState = {
  items: mapBackendDocumentsToSlots([]),
  isLoading: false,
  error: null,
};

// ==============================================================================
// ASYNC THUNKS
// ==============================================================================

export const fetchDocumentsThunk = createAsyncThunk(
  'documents/fetchDocuments',
  async (category: string | undefined, { rejectWithValue }) => {
    try {
      const response = await documentService.listDocuments(category, 1, 100);
      return mapBackendDocumentsToSlots(response.data.items || []);
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch documents');
    }
  }
);

export const uploadDocumentThunk = createAsyncThunk(
  'documents/uploadDocument',
  async (params: UploadDocumentParams, { dispatch, rejectWithValue }) => {
    try {
      await documentService.uploadDocument(params);
      dispatch(fetchDocumentsThunk(undefined));
      return params;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to upload document');
    }
  }
);

export const replaceDocumentThunk = createAsyncThunk(
  'documents/replaceDocument',
  async (
    payload: { documentId: string; params: UploadDocumentParams },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await documentService.replaceDocument(payload.documentId, payload.params);
      dispatch(fetchDocumentsThunk(undefined));
      return payload;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to replace document');
    }
  }
);

export const deleteDocumentThunk = createAsyncThunk(
  'documents/deleteDocument',
  async (documentId: string, { dispatch, rejectWithValue }) => {
    try {
      await documentService.deleteDocument(documentId);
      dispatch(fetchDocumentsThunk(undefined));
      return documentId;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to delete document');
    }
  }
);

export const documentSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setDocuments: (state, action: PayloadAction<DocumentItem[]>) => {
      state.items = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    uploadDocument: (
      state,
      action: PayloadAction<{
        type: string;
        fileName: string;
        fileSize: string;
        fileSizeBytes?: number;
        mimeType?: string;
        fileUrl?: string;
      }>
    ) => {
      const { type, fileName, fileSize, fileSizeBytes, mimeType, fileUrl } = action.payload;
      const doc = state.items.find((item) => item.type === type);
      if (doc) {
        doc.status = 'UPLOADED';
        doc.fileName = fileName;
        doc.fileSize = fileSize;
        doc.fileSizeBytes = fileSizeBytes;
        doc.uploadedAt = new Date().toISOString();
        doc.fileUrl = fileUrl;
        doc.mimeType = mimeType;
      }
    },
    replaceDocument: (
      state,
      action: PayloadAction<{
        id: string;
        fileName: string;
        fileSize: string;
        fileSizeBytes?: number;
        mimeType?: string;
        fileUrl?: string;
      }>
    ) => {
      const { id, fileName, fileSize, fileSizeBytes, mimeType, fileUrl } = action.payload;
      const doc = state.items.find((item) => item.id === id);
      if (doc) {
        doc.status = 'UPLOADED';
        doc.fileName = fileName;
        doc.fileSize = fileSize;
        doc.fileSizeBytes = fileSizeBytes;
        doc.uploadedAt = new Date().toISOString();
        doc.fileUrl = fileUrl;
        doc.mimeType = mimeType;
      }
    },
    removeDocument: (state, action: PayloadAction<string>) => {
      const docId = action.payload;
      const doc = state.items.find((item) => item.id === docId || item.type === docId);
      if (doc) {
        doc.status = 'MISSING';
        doc.fileName = undefined;
        doc.fileSize = undefined;
        doc.fileSizeBytes = undefined;
        doc.uploadedAt = undefined;
        doc.fileUrl = undefined;
        doc.mimeType = undefined;
      }
    },
    resetDocuments: (state) => {
      state.items = mapBackendDocumentsToSlots([]);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocumentsThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDocumentsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchDocumentsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setDocuments,
  uploadDocument,
  replaceDocument,
  removeDocument,
  resetDocuments,
} = documentSlice.actions;

export default documentSlice.reducer;
