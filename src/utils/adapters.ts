import {
  Scholarship,
  ScholarshipCategory,
  FundingType,
} from '../types/scholarship';
import {
  ApplicationItem,
  ApplicationStatus,
} from '../types/application';
import {
  DocumentItem,
  DocumentCategory,
  DocumentType,
} from '../types/document';
import {
  NotificationItem,
  NotificationType,
} from '../types/notification';
import {
  UserProfile,
  UserRole,
  PersonalDetails,
  AcademicDetails,
  PreferencesDetails,
} from '../types';
import { formatFileSizeBytes } from './documentUtils';

// ==============================================================================
// 1. SCHOLARSHIP ADAPTER
// ==============================================================================
export interface BackendScholarship {
  id: string;
  name: string;
  provider: string;
  amount: number | string;
  deadline: string;
  description: string;
  eligibility?: string;
  education_level?: string;
  created_at?: string;
  updated_at?: string;
}

export const calculateDaysLeft = (deadlineStr: string): number => {
  if (!deadlineStr) return 0;
  const deadlineDate = new Date(deadlineStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const formatAwardAmount = (amountNum: number): string => {
  if (amountNum >= 100000) {
    const inLakhs = amountNum / 100000;
    return inLakhs % 1 === 0
      ? `₹${inLakhs} Lakhs`
      : `₹${inLakhs.toFixed(1)} Lakhs`;
  }
  return `₹${amountNum.toLocaleString('en-IN')}`;
};

export const mapBackendScholarshipToFrontend = (
  raw: BackendScholarship,
  matchScore: number = 90
): Scholarship => {
  const numericAmount =
    typeof raw.amount === 'number'
      ? raw.amount
      : parseFloat(String(raw.amount)) || 50000;

  const daysLeft = calculateDaysLeft(raw.deadline);
  const status: 'open' | 'closing_soon' | 'closed' =
    daysLeft === 0 ? 'closed' : daysLeft <= 7 ? 'closing_soon' : 'open';

  // Determine type heuristics
  let type: 'government' | 'private' | 'international' = 'government';
  const providerLower = (raw.provider || '').toLowerCase();
  const nameLower = (raw.name || '').toLowerCase();

  if (
    providerLower.includes('foundation') ||
    providerLower.includes('trust') ||
    providerLower.includes('tata') ||
    providerLower.includes('reliance') ||
    providerLower.includes('corporate')
  ) {
    type = 'private';
  } else if (
    providerLower.includes('oxford') ||
    providerLower.includes('international') ||
    providerLower.includes('global') ||
    providerLower.includes('fulbright') ||
    providerLower.includes('chevening') ||
    providerLower.includes('daad')
  ) {
    type = 'international';
  }

  const tags: string[] = [];
  if (type === 'government') tags.push('Government');
  if (type === 'private') tags.push('Private Trust');
  if (type === 'international') tags.push('Study Abroad');
  if (numericAmount >= 100000) tags.push('High Value');

  return {
    id: raw.id,
    title: raw.name,
    name: raw.name,
    provider: raw.provider,
    description: raw.description || '',
    awardAmount: formatAwardAmount(numericAmount),
    numericAmount,
    amount: numericAmount,
    currency: 'INR',
    deadline: raw.deadline ? raw.deadline.split('T')[0] : '2026-12-31',
    daysLeft,
    type,
    category: 'merit',
    fundingType: 'fully_funded',
    fieldsOfStudy: ['Engineering', 'Computer Science', 'Science', 'All Fields'],
    eligibleCourses: ['B.Tech', 'B.Sc', 'M.Tech', 'All Accredited Courses'],
    eligibleCategories: ['General', 'OBC', 'SC', 'ST', 'EWS'],
    eligibleStates: ['All Indian States & UTs'],
    minimumCGPA: 7.5,
    maximumFamilyIncome: 800000,
    status,
    matchScore,
    tags: tags.length ? tags : ['Merit-Based', 'STEM'],
    featured: numericAmount >= 100000,
    benefits: [
      `Direct financial grant of ${formatAwardAmount(numericAmount)} per academic year`,
      'Tuition fee reimbursement and academic allowance',
      'Direct Benefit Transfer (DBT) disbursement into student bank account',
    ],
    requiredDocuments: [
      'Valid Government Photo ID (Aadhaar Card)',
      'Official marksheets of previous qualifying examination (Min 7.5 CGPA)',
      'Income Certificate issued by competent Revenue Authority',
      'College Bonafide and Enrollment Certificate',
      'Student Bank Passbook / Cancelled Cheque with IFSC code',
    ],
    selectionProcess: [
      'Online application submission and document upload',
      'Preliminary screening and academic merit ranking',
      'Socio-economic verification by committee',
      'Final award announcement and Direct Benefit Transfer disbursement',
    ],
    officialWebsite: 'https://scholarships.gov.in',
  };
};

// ==============================================================================
// 2. APPLICATION ADAPTER
// ==============================================================================
export interface BackendApplication {
  id: string;
  user_id: string;
  scholarship_id: string;
  status: ApplicationStatus;
  applied_at?: string;
  created_at: string;
  updated_at: string;
  scholarship?: BackendScholarship;
}

export const mapBackendApplicationToFrontend = (
  raw: BackendApplication
): ApplicationItem => {
  const sch = raw.scholarship;
  const schTitle = sch?.name || 'Scholarship Application';
  const provider = sch?.provider || 'Scholarship Organization';
  const numericAmount = sch?.amount ? (typeof sch.amount === 'number' ? sch.amount : parseFloat(String(sch.amount)) || 50000) : 50000;
  const awardAmount = formatAwardAmount(numericAmount);
  const deadline = sch?.deadline ? sch.deadline.split('T')[0] : '2026-12-31';

  return {
    id: raw.id,
    scholarshipId: raw.scholarship_id,
    scholarshipTitle: schTitle,
    provider,
    awardAmount,
    deadline,
    status: raw.status,
    matchScore: 92,
    appliedDate: raw.applied_at ? raw.applied_at.split('T')[0] : undefined,
    lastUpdatedDate: raw.updated_at ? raw.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
    requiredDocuments: [
      'Valid Government Photo ID (Aadhaar Card)',
      'Official marksheets of previous semester',
      'Annual Income Certificate',
      'College Bonafide Student Certificate',
    ],
    notes: 'Application tracked in ScholarHub 7-Stage Official Lifecycle.',
  };
};

// ==============================================================================
// 3. DOCUMENT ADAPTER
// ==============================================================================
export interface BackendDocument {
  id: string;
  user_id: string;
  type: string;
  category: string;
  file_name: string;
  file_size_bytes?: number;
  file_url: string;
  mime_type?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

const DOCUMENT_NAMES: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  passport: 'Passport',
  pan: 'PAN Card',
  marksheet: 'Class 10/12 Marksheet & Transcripts',
  bonafide_certificate: 'Bonafide Certificate',
  income_certificate: 'Income Certificate',
  caste_certificate: 'Caste Certificate',
  bank_passbook: 'Bank Passbook / Cancelled Cheque',
  photograph: 'Passport Size Photograph',
  signature: 'Digital Signature',
  sop: 'Statement of Purpose (SOP)',
  recommendation_letter: 'Letter of Recommendation (LOR)',
};

const STANDARD_DOCUMENT_SLOTS: Array<{
  type: DocumentType;
  category: DocumentCategory;
  name: string;
  description: string;
}> = [
  {
    type: 'aadhaar',
    category: 'Identity',
    name: 'Aadhaar Card',
    description: 'Government UIDAI official biometric identity card',
  },
  {
    type: 'passport',
    category: 'Identity',
    name: 'Passport',
    description: 'Valid Indian Republic International Travel Passport',
  },
  {
    type: 'pan',
    category: 'Identity',
    name: 'PAN Card',
    description: 'Income Tax Department Permanent Account Number card',
  },
  {
    type: 'marksheet',
    category: 'Academic',
    name: 'Class 10/12 Marksheet & Transcripts',
    description: 'Official institutional marksheets and consolidated GPA scorecard',
  },
  {
    type: 'bonafide_certificate',
    category: 'Academic',
    name: 'Bonafide Certificate',
    description: 'Current semester college enrollment verification certificate',
  },
  {
    type: 'income_certificate',
    category: 'Financial',
    name: 'Income Certificate',
    description: 'Revenue Department / Tehsildar issued annual family income certificate',
  },
  {
    type: 'caste_certificate',
    category: 'Category',
    name: 'Caste Certificate',
    description: 'Competent authority social welfare category verification certificate',
  },
  {
    type: 'bank_passbook',
    category: 'Banking',
    name: 'Bank Passbook / Cancelled Cheque',
    description: 'Student bank account passbook with IFSC and DBT seeding',
  },
  {
    type: 'photograph',
    category: 'Personal',
    name: 'Passport Size Photograph',
    description: 'Recent white background passport photograph (biometric)',
  },
  {
    type: 'signature',
    category: 'Personal',
    name: 'Digital Signature',
    description: 'Clear black ink signature specimen on white paper',
  },
  {
    type: 'sop',
    category: 'Application',
    name: 'Statement of Purpose (SOP)',
    description: 'Personal academic statement and scholarship motivation essay',
  },
  {
    type: 'recommendation_letter',
    category: 'Application',
    name: 'Letter of Recommendation (LOR)',
    description: 'Faculty Dean / Department Head signed recommendation',
  },
];

export const mapBackendDocumentsToSlots = (
  backendDocs: BackendDocument[]
): DocumentItem[] => {
  const backendMap = new Map<string, BackendDocument>();
  backendDocs.forEach((doc) => {
    backendMap.set(doc.type.toLowerCase(), doc);
  });

  return STANDARD_DOCUMENT_SLOTS.map((slot) => {
    const uploaded = backendMap.get(slot.type.toLowerCase());
    if (uploaded) {
      return {
        id: uploaded.id,
        type: slot.type,
        name: slot.name,
        category: slot.category,
        status: 'UPLOADED',
        fileName: uploaded.file_name,
        fileSize: formatFileSizeBytes(uploaded.file_size_bytes),
        fileSizeBytes: uploaded.file_size_bytes,
        uploadedAt: uploaded.created_at,
        expiryDate: uploaded.expiry_date,
        fileUrl: uploaded.file_url,
        mimeType: uploaded.mime_type,
        description: slot.description,
      };
    }

    return {
      id: `slot_${slot.type}`,
      type: slot.type,
      name: slot.name,
      category: slot.category,
      status: 'MISSING',
      description: slot.description,
    };
  });
};

// ==============================================================================
// 4. NOTIFICATION ADAPTER
// ==============================================================================
export interface BackendNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  scholarship_id?: string;
  application_id?: string;
  created_at: string;
}

export const mapBackendNotificationToFrontend = (
  raw: BackendNotification
): NotificationItem => {
  return {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    message: raw.message,
    createdAt: raw.created_at,
    isRead: raw.is_read,
    scholarshipId: raw.scholarship_id || undefined,
    applicationId: raw.application_id || undefined,
    priority: raw.type === 'DEADLINE_REMINDER' || raw.type === 'MISSING_DOCUMENT' ? 'high' : 'normal',
  };
};

// ==============================================================================
// 5. PROFILE ADAPTER
// ==============================================================================
export interface BackendCombinedProfile {
  personal?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    gender?: string;
    mobile?: string;
    country?: string;
    state?: string;
    district?: string;
    city?: string;
    created_at?: string;
    updated_at?: string;
  } | null;
  academic?: {
    id?: string;
    course?: string;
    branch?: string;
    current_year?: string;
    university?: string;
    college?: string;
    cgpa?: number | string;
    previous_percentage?: number | string;
    created_at?: string;
    updated_at?: string;
  } | null;
  preferences?: {
    id?: string;
    reservation_category?: string;
    special_categories?: string[];
    family_income?: number | string;
    study_preference?: string;
    created_at?: string;
    updated_at?: string;
  } | null;
}

export const mapBackendProfileToFrontend = (
  userEmail: string,
  userId: string,
  raw: BackendCombinedProfile,
  backendRole?: string,
  rawProviderProfile?: any
): UserProfile => {
  const p = raw.personal;
  const a = raw.academic;
  const pref = raw.preferences;

  const firstName = p?.first_name || '';
  const lastName = p?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || (backendRole === 'PROVIDER' ? 'Provider' : 'Student');

  let role: UserRole = 'student';
  if (backendRole) {
    const lower = backendRole.toLowerCase();
    if (lower === 'admin') role = 'admin';
    else if (lower === 'provider') role = 'provider';
    else role = 'student';
  }

  const providerProfile = rawProviderProfile
    ? {
        id: rawProviderProfile.id,
        organizationName: rawProviderProfile.organization_name || 'Organization',
        contactPerson: rawProviderProfile.contact_person,
        website: rawProviderProfile.website,
        phone: rawProviderProfile.phone,
        description: rawProviderProfile.description,
        isApproved: rawProviderProfile.is_approved ?? true,
      }
    : undefined;

  const personal: PersonalDetails = {
    firstName,
    lastName,
    dateOfBirth: p?.date_of_birth ? p.date_of_birth.split('T')[0] : '',
    gender: p?.gender || '',
    email: userEmail,
    mobile: p?.mobile || '',
  };

  const academic: AcademicDetails = {
    country: p?.country || 'India',
    state: p?.state || '',
    district: p?.district || '',
    city: p?.city || '',
    course: a?.course || '',
    branch: a?.branch || '',
    currentYear: a?.current_year || '',
    university: a?.university || '',
    college: a?.college || '',
    cgpa: a?.cgpa !== undefined && a?.cgpa !== null ? String(a.cgpa) : '',
    previousPercentage:
      a?.previous_percentage !== undefined && a?.previous_percentage !== null
        ? String(a.previous_percentage)
        : '',
  };

  const preferences: PreferencesDetails = {
    reservationCategory: (pref?.reservation_category as any) || 'General',
    specialCategories: (pref?.special_categories as any) || ['None'],
    familyIncome: pref?.family_income !== undefined && pref?.family_income !== null ? String(pref.family_income) : '',
    studyPreference: (pref?.study_preference as any) || 'India',
  };

  const cgpaNum = a?.cgpa ? parseFloat(String(a.cgpa)) : undefined;

  return {
    id: userId,
    email: userEmail,
    firstName,
    lastName,
    name: fullName,
    role,
    providerProfile,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    educationLevel: 'undergraduate',
    major: a?.branch || undefined,
    gpa: cgpaNum,
    country: p?.country || 'India',
    isProfileComplete: Boolean(firstName && lastName && a?.course && pref?.reservation_category),
    isVerified: true,
    personal,
    academic,
    preferences,
    settings: {
      notificationsEnabled: true,
      deadlineRemindersEnabled: true,
      emailAlertsEnabled: true,
      language: 'English (US)',
    },
    createdAt: p?.created_at || new Date().toISOString(),
    updatedAt: p?.updated_at || new Date().toISOString(),
  };
};
