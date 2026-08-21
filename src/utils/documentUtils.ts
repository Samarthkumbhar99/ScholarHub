/**
 * Document Utilities & Readiness Evaluation Engine
 * ScholarHub Document Repository System
 */

import {
  DocumentItem,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_MB,
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
} from '../types/document';

/**
 * Format bytes into human-readable file size string (e.g. "1.4 MB", "420 KB")
 */
export const formatFileSizeBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) {
    return '0 KB';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  if (i === 0) {
    return `${bytes} Bytes`;
  }

  const value = bytes / Math.pow(k, i);
  return `${parseFloat(value.toFixed(value >= 10 ? 1 : 2))} ${sizes[i]}`;
};

/**
 * Result structure for file validation
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a selected file against supported types and maximum size limit
 */
export const validateDocumentFile = (file: {
  name?: string;
  size?: number;
  mimeType?: string;
}): FileValidationResult => {
  if (!file || !file.name) {
    return {
      valid: false,
      error: 'Invalid file selected. Please try selecting the file again.',
    };
  }

  const fileName = file.name.toLowerCase();
  const mimeType = (file.mimeType || '').toLowerCase();

  // Check extension
  const hasSupportedExtension = SUPPORTED_FILE_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );

  // Check mime type if available
  const hasSupportedMime =
    mimeType.length === 0 ||
    SUPPORTED_MIME_TYPES.some((mime) => mimeType.includes(mime)) ||
    mimeType.startsWith('image/jpeg') ||
    mimeType.startsWith('image/png') ||
    mimeType.startsWith('image/jpg') ||
    mimeType.startsWith('application/pdf');

  if (!hasSupportedExtension && !hasSupportedMime) {
    return {
      valid: false,
      error: 'Unsupported file type. Please select PDF, JPG, JPEG, or PNG.',
    };
  }

  // Check file size
  if (file.size && file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large. Please choose a file smaller than ${MAX_DOCUMENT_FILE_SIZE_MB} MB.`,
    };
  }

  return { valid: true };
};

/**
 * Match a scholarship required document requirement string to a student document
 */
export const matchRequiredDocument = (
  reqDocString: string,
  studentDocs: DocumentItem[]
): DocumentItem | undefined => {
  if (!reqDocString || studentDocs.length === 0) return undefined;

  const normalized = reqDocString.toLowerCase();

  // 1. Aadhaar Card
  if (normalized.includes('aadhaar') || normalized.includes('aadhar')) {
    return studentDocs.find((d) => d.type === 'aadhaar');
  }

  // 2. Passport
  if (normalized.includes('passport') && !normalized.includes('photo')) {
    return studentDocs.find((d) => d.type === 'passport');
  }

  // 3. PAN
  if (normalized.includes('pan card') || normalized.includes('pan proof')) {
    return studentDocs.find((d) => d.type === 'pan');
  }

  // 4. Marksheet / Academic Transcripts / Grade Card
  if (
    normalized.includes('marksheet') ||
    normalized.includes('transcript') ||
    normalized.includes('cgpa') ||
    normalized.includes('grade card') ||
    normalized.includes('class 12') ||
    normalized.includes('class 10') ||
    normalized.includes('scorecard') ||
    normalized.includes('semester')
  ) {
    return studentDocs.find((d) => d.type === 'marksheet');
  }

  // 5. Bonafide / College Enrollment
  if (
    normalized.includes('bonafide') ||
    normalized.includes('enrollment') ||
    normalized.includes('admission') ||
    normalized.includes('fee receipt') ||
    normalized.includes('college verification')
  ) {
    return studentDocs.find((d) => d.type === 'bonafide_certificate');
  }

  // 6. Income Certificate / Financial Proof
  if (
    normalized.includes('income') ||
    normalized.includes('itr') ||
    normalized.includes('tehsildar') ||
    normalized.includes('salary') ||
    normalized.includes('financial proof') ||
    normalized.includes('family income')
  ) {
    return studentDocs.find((d) => d.type === 'income_certificate');
  }

  // 7. Caste Certificate / Category
  if (
    normalized.includes('caste') ||
    normalized.includes('category certificate') ||
    normalized.includes('tribal') ||
    normalized.includes('obc') ||
    normalized.includes('sc/st') ||
    normalized.includes('quota')
  ) {
    return studentDocs.find((d) => d.type === 'caste_certificate');
  }

  // 8. Bank Passbook / DBT Account
  if (
    normalized.includes('bank') ||
    normalized.includes('passbook') ||
    normalized.includes('cheque') ||
    normalized.includes('account statement')
  ) {
    return studentDocs.find((d) => d.type === 'bank_passbook');
  }

  // 9. Photograph
  if (
    normalized.includes('photograph') ||
    normalized.includes('photo id') ||
    normalized.includes('passport size photo') ||
    normalized.includes('student photo')
  ) {
    return studentDocs.find((d) => d.type === 'photograph') || studentDocs.find((d) => d.type === 'aadhaar');
  }

  // 10. Digital Signature
  if (normalized.includes('signature') || normalized.includes('sign specimen')) {
    return studentDocs.find((d) => d.type === 'signature');
  }

  // 11. Statement of Purpose (SOP)
  if (
    normalized.includes('sop') ||
    normalized.includes('purpose') ||
    normalized.includes('essay') ||
    normalized.includes('statement')
  ) {
    return studentDocs.find((d) => d.type === 'sop');
  }

  // 12. Recommendation Letter (LOR)
  if (
    normalized.includes('recommendation') ||
    normalized.includes('lor') ||
    normalized.includes('reference') ||
    normalized.includes('professor') ||
    normalized.includes('dean')
  ) {
    return studentDocs.find((d) => d.type === 'recommendation_letter');
  }

  // General fallback: match by document name containment
  return studentDocs.find((d) => {
    const docName = d.name.toLowerCase();
    return normalized.includes(docName) || docName.includes(normalized);
  });
};

/**
 * Application Document Checklist Evaluation Item
 */
export interface ChecklistEvaluationItem {
  name: string;
  isUploaded: boolean;
  matchedDoc?: DocumentItem;
}

/**
 * Application Readiness Evaluation Summary
 */
export interface ApplicationReadinessResult {
  totalRequired: number;
  uploadedCount: number;
  missingCount: number;
  isAllReady: boolean;
  readinessPercentage: number;
  statusSummary: string;
  items: ChecklistEvaluationItem[];
}

/**
 * Evaluates whether all required documents for an application are uploaded in the Document Center
 */
export const checkApplicationDocumentReadiness = (
  requiredDocs: string[] = [],
  studentDocs: DocumentItem[] = []
): ApplicationReadinessResult => {
  if (!requiredDocs || requiredDocs.length === 0) {
    return {
      totalRequired: 0,
      uploadedCount: 0,
      missingCount: 0,
      isAllReady: true,
      readinessPercentage: 100,
      statusSummary: 'No documents required',
      items: [],
    };
  }

  const items: ChecklistEvaluationItem[] = requiredDocs.map((reqDoc) => {
    const matched = matchRequiredDocument(reqDoc, studentDocs);
    const isUploaded = matched ? matched.status === 'UPLOADED' : false;

    return {
      name: reqDoc,
      isUploaded,
      matchedDoc: matched,
    };
  });

  const totalRequired = items.length;
  const uploadedCount = items.filter((item) => item.isUploaded).length;
  const missingCount = totalRequired - uploadedCount;
  const isAllReady = uploadedCount === totalRequired;
  const readinessPercentage = totalRequired > 0 ? Math.round((uploadedCount / totalRequired) * 100) : 100;

  const statusSummary = isAllReady
    ? 'Application documents ready'
    : missingCount === 1
    ? '1 document missing'
    : `${missingCount} documents missing`;

  return {
    totalRequired,
    uploadedCount,
    missingCount,
    isAllReady,
    readinessPercentage,
    statusSummary,
    items,
  };
};
