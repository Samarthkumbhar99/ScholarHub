import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DocumentItem } from '../../types/document';
import { formatFileSizeBytes } from '../../utils/documentUtils';

export interface DocumentState {
  items: DocumentItem[];
}

export const initialDocuments: DocumentItem[] = [
  // 1. Identity
  {
    id: 'doc_aadhaar',
    type: 'aadhaar',
    name: 'Aadhaar Card',
    category: 'Identity',
    status: 'UPLOADED',
    fileName: 'aadhaar_card_verified.pdf',
    fileSize: '1.4 MB',
    fileSizeBytes: 1468006,
    uploadedAt: '2026-08-01T10:30:00.000Z',
    mimeType: 'application/pdf',
    description: 'Government UIDAI official biometric identity card',
  },
  {
    id: 'doc_passport',
    type: 'passport',
    name: 'Passport',
    category: 'Identity',
    status: 'UPLOADED',
    fileName: 'passport_front_back.pdf',
    fileSize: '2.1 MB',
    fileSizeBytes: 2202009,
    uploadedAt: '2026-07-28T14:15:00.000Z',
    mimeType: 'application/pdf',
    description: 'Valid Indian Republic International Travel Passport',
  },
  {
    id: 'doc_pan',
    type: 'pan',
    name: 'PAN Card',
    category: 'Identity',
    status: 'MISSING',
    description: 'Income Tax Department Permanent Account Number card',
  },

  // 2. Academic
  {
    id: 'doc_marksheet',
    type: 'marksheet',
    name: 'Class 10/12 Marksheet & Transcripts',
    category: 'Academic',
    status: 'UPLOADED',
    fileName: 'semester_transcript_gpa38.pdf',
    fileSize: '1.8 MB',
    fileSizeBytes: 1887436,
    uploadedAt: '2026-08-12T09:40:00.000Z',
    mimeType: 'application/pdf',
    description: 'Official institutional marksheets and consolidated GPA scorecard',
  },
  {
    id: 'doc_bonafide',
    type: 'bonafide_certificate',
    name: 'Bonafide Certificate',
    category: 'Academic',
    status: 'UPLOADED',
    fileName: 'college_bonafide_2026.pdf',
    fileSize: '820 KB',
    fileSizeBytes: 839680,
    uploadedAt: '2026-08-14T11:20:00.000Z',
    mimeType: 'application/pdf',
    description: 'Current semester college enrollment verification certificate',
  },

  // 3. Financial
  {
    id: 'doc_income',
    type: 'income_certificate',
    name: 'Income Certificate',
    category: 'Financial',
    status: 'MISSING',
    description: 'Revenue Department / Tehsildar issued annual family income certificate',
  },

  // 4. Category
  {
    id: 'doc_caste',
    type: 'caste_certificate',
    name: 'Caste Certificate',
    category: 'Category',
    status: 'UPLOADED',
    fileName: 'caste_validity_cert.pdf',
    fileSize: '950 KB',
    fileSizeBytes: 972800,
    uploadedAt: '2026-07-20T16:05:00.000Z',
    mimeType: 'application/pdf',
    description: 'Competent authority social welfare category verification certificate',
  },

  // 5. Banking
  {
    id: 'doc_passbook',
    type: 'bank_passbook',
    name: 'Bank Passbook / Cancelled Cheque',
    category: 'Banking',
    status: 'UPLOADED',
    fileName: 'sbi_passbook_frontpage.jpg',
    fileSize: '1.1 MB',
    fileSizeBytes: 1153433,
    uploadedAt: '2026-08-05T13:45:00.000Z',
    mimeType: 'image/jpeg',
    description: 'Student bank account passbook with IFSC and DBT seeding',
  },

  // 6. Personal
  {
    id: 'doc_photo',
    type: 'photograph',
    name: 'Passport Size Photograph',
    category: 'Personal',
    status: 'UPLOADED',
    fileName: 'student_passport_photo.png',
    fileSize: '450 KB',
    fileSizeBytes: 460800,
    uploadedAt: '2026-08-02T10:10:00.000Z',
    mimeType: 'image/png',
    description: 'Recent white background passport photograph (biometric)',
  },
  {
    id: 'doc_signature',
    type: 'signature',
    name: 'Digital Signature',
    category: 'Personal',
    status: 'MISSING',
    description: 'Clear black ink signature specimen on white paper',
  },

  // 7. Application
  {
    id: 'doc_sop',
    type: 'sop',
    name: 'Statement of Purpose (SOP)',
    category: 'Application',
    status: 'MISSING',
    description: 'Personal academic statement and scholarship motivation essay',
  },
  {
    id: 'doc_lor',
    type: 'recommendation_letter',
    name: 'Letter of Recommendation (LOR)',
    category: 'Application',
    status: 'UPLOADED',
    fileName: 'dean_recommendation_letter.pdf',
    fileSize: '780 KB',
    fileSizeBytes: 798720,
    uploadedAt: '2026-08-10T15:30:00.000Z',
    mimeType: 'application/pdf',
    description: 'Faculty Dean / Department Head signed recommendation',
  },
];

const initialState: DocumentState = {
  items: initialDocuments,
};

export interface UploadDocumentPayload {
  id: string;
  fileName: string;
  fileSizeBytes?: number;
  fileUrl?: string;
  mimeType?: string;
  uploadedAt?: string;
}

export const documentSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    uploadDocument: (state, action: PayloadAction<UploadDocumentPayload>) => {
      const { id, fileName, fileSizeBytes, fileUrl, mimeType, uploadedAt } = action.payload;
      const doc = state.items.find((item) => item.id === id);
      if (doc) {
        doc.status = 'UPLOADED';
        doc.fileName = fileName;
        doc.fileSizeBytes = fileSizeBytes;
        doc.fileSize = formatFileSizeBytes(fileSizeBytes);
        doc.fileUrl = fileUrl;
        doc.mimeType = mimeType;
        doc.uploadedAt = uploadedAt || new Date().toISOString();
      }
    },
    replaceDocument: (state, action: PayloadAction<UploadDocumentPayload>) => {
      const { id, fileName, fileSizeBytes, fileUrl, mimeType, uploadedAt } = action.payload;
      const doc = state.items.find((item) => item.id === id);
      if (doc) {
        doc.status = 'UPLOADED';
        doc.fileName = fileName;
        doc.fileSizeBytes = fileSizeBytes;
        doc.fileSize = formatFileSizeBytes(fileSizeBytes);
        doc.fileUrl = fileUrl;
        doc.mimeType = mimeType;
        doc.uploadedAt = uploadedAt || new Date().toISOString();
      }
    },
    removeDocument: (state, action: PayloadAction<string>) => {
      const docId = action.payload;
      const doc = state.items.find((item) => item.id === docId);
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
      state.items = initialDocuments;
    },
  },
});

export const {
  uploadDocument,
  replaceDocument,
  removeDocument,
  resetDocuments,
} = documentSlice.actions;

export default documentSlice.reducer;
