/**
 * Application & Document Domain Types
 */
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'accepted'
  | 'rejected';

export interface ScholarshipApplication {
  id: string;
  scholarshipId: string;
  scholarshipTitle: string;
  userId: string;
  status: ApplicationStatus;
  submissionDate?: string;
  feedback?: string;
  requiredDocuments: string[];
  submittedDocuments: string[];
  createdAt: string;
  updatedAt: string;
}

export type DocumentType =
  | 'transcript'
  | 'resume'
  | 'recommendation_letter'
  | 'essay'
  | 'financial_proof'
  | 'id_card';

export interface StudentDocument {
  id: string;
  userId: string;
  name: string;
  fileUrl: string;
  documentType: DocumentType;
  fileSizeBytes: number;
  uploadedAt: string;
  isVerified: boolean;
}
