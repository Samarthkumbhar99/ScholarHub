/**
 * Document Domain Types & Constants
 * ScholarHub Official Document Repository & Verification Architecture
 */

/**
 * 7 Official Document Categories
 */
export type DocumentCategory =
  | 'Identity'
  | 'Academic'
  | 'Financial'
  | 'Category'
  | 'Banking'
  | 'Personal'
  | 'Application';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Identity',
  'Academic',
  'Financial',
  'Category',
  'Banking',
  'Personal',
  'Application',
];

/**
 * 12 Standard Document Types defined by ScholarHub
 */
export type DocumentType =
  // Identity
  | 'aadhaar'
  | 'passport'
  | 'pan'
  // Financial / Category
  | 'income_certificate'
  | 'caste_certificate'
  // Academic
  | 'marksheet'
  | 'bonafide_certificate'
  // Banking
  | 'bank_passbook'
  // Personal
  | 'photograph'
  | 'signature'
  // Application
  | 'sop'
  | 'recommendation_letter';

/**
 * Document Status (Frontend Stage)
 */
export type DocumentStatus = 'UPLOADED' | 'MISSING';

/**
 * Strongly Typed Document Item Model
 */
export interface DocumentItem {
  id: string;
  type: DocumentType;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  fileName?: string;
  fileSize?: string;
  fileSizeBytes?: number;
  uploadedAt?: string;
  expiryDate?: string;
  fileUrl?: string;
  mimeType?: string;
  description?: string;
}

/**
 * Category Metadata for UI rendering
 */
export interface CategoryMetadata {
  category: DocumentCategory;
  icon: string;
  description: string;
}

export const CATEGORY_METADATA: Record<DocumentCategory, CategoryMetadata> = {
  Identity: {
    category: 'Identity',
    icon: '🪪',
    description: 'Government issued identity proofs & citizenships',
  },
  Academic: {
    category: 'Academic',
    icon: '🎓',
    description: 'Grade cards, transcripts & institutional bonafides',
  },
  Financial: {
    category: 'Financial',
    icon: '💵',
    description: 'Income certificates & socio-economic declarations',
  },
  Category: {
    category: 'Category',
    icon: '📜',
    description: 'Affirmative action & quota verification certificates',
  },
  Banking: {
    category: 'Banking',
    icon: '🏦',
    description: 'Bank passbook & cancelled cheques for Direct Benefit Transfer',
  },
  Personal: {
    category: 'Personal',
    icon: '👤',
    description: 'Biometric photograph & signature specimens',
  },
  Application: {
    category: 'Application',
    icon: '📝',
    description: 'Essays, Statements of Purpose & Recommendation Letters',
  },
};

/**
 * File Validation Constants
 */
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes
export const MAX_DOCUMENT_FILE_SIZE_MB = 10;

export const SUPPORTED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const;

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;
