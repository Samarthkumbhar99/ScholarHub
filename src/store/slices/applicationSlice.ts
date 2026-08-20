import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ApplicationItem,
  ApplicationStatus,
  getNextStatus,
} from '../../types/application';

export type ApplicationFilterTab = 'all' | 'active' | 'completed';

export interface ApplicationState {
  items: ApplicationItem[];
  filterTab: ApplicationFilterTab;
}

const initialApplications: ApplicationItem[] = [
  {
    id: 'app_stem_01',
    scholarshipId: 'sch_stem_01',
    scholarshipTitle: 'National STEM Fellowship',
    provider: 'Department of Science & Higher Education',
    awardAmount: '₹120,000 / year',
    deadline: '2026-09-30',
    status: 'UNDER_REVIEW',
    matchScore: 98,
    appliedDate: '2026-08-10',
    lastUpdatedDate: '2026-08-15',
    requiredDocuments: [
      'Valid Government Photo ID (Aadhaar Card)',
      'Official marksheets of previous semester (Min 8.0 CGPA)',
      'Income Certificate (Below ₹6.0 Lakhs)',
      'College Enrollment Verification Certificate',
      'Bonafide student certificate',
    ],
    notes: 'Document verification cleared by State Nodal Officer. Under evaluation by academic committee.',
  },
  {
    id: 'app_reliance_02',
    scholarshipId: 'sch_reliance_02',
    scholarshipTitle: 'Reliance Foundation Undergraduate Scholarship',
    provider: 'Reliance Foundation Trust',
    awardAmount: '₹200,000 / year',
    deadline: '2026-10-15',
    status: 'PREPARING_DOCUMENTS',
    matchScore: 94,
    appliedDate: '2026-08-14',
    lastUpdatedDate: '2026-08-18',
    requiredDocuments: [
      'Aadhaar Card of student and parent/guardian',
      'Class 12th Board Marksheet & Entrance scorecard',
      'Family Income Proof (ITR / Tehsildar Certificate)',
      'College Fee Receipt & Admission Confirmation Letter',
      'Bank passbook / cancelled cheque',
    ],
    notes: 'Upload your verified family income certificate before final submission.',
  },
  {
    id: 'app_oxford_03',
    scholarshipId: 'sch_oxford_03',
    scholarshipTitle: 'Oxford Global Scholars Exchange Fellowship',
    provider: 'Oxford International Foundation',
    awardAmount: '£15,000 + Airfare',
    deadline: '2026-11-01',
    status: 'INTERVIEW',
    matchScore: 91,
    appliedDate: '2026-08-01',
    lastUpdatedDate: '2026-08-19',
    requiredDocuments: [
      'Passport (min 18 months validity)',
      'Official English Academic Transcripts (Min CGPA 8.5)',
      'Statement of Purpose (800 words)',
      '2 Letters of Recommendation from Professors',
      'IELTS 7.0+ / TOEFL 100+ Scorecard',
    ],
    notes: 'Virtual panel interview scheduled for upcoming week.',
  },
];

const initialState: ApplicationState = {
  items: initialApplications,
  filterTab: 'all',
};

export const applicationSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    createOrGetApplication: (
      state,
      action: PayloadAction<{
        id?: string;
        scholarshipId: string;
        scholarshipTitle: string;
        provider: string;
        awardAmount: string;
        deadline: string;
        matchScore?: number;
        requiredDocuments?: string[];
      }>
    ) => {
      const { id, scholarshipId, scholarshipTitle, provider, awardAmount, deadline, matchScore, requiredDocuments } =
        action.payload;

      const existing = state.items.find((item) => item.scholarshipId === scholarshipId);
      if (!existing) {
        const todayStr = new Date().toISOString().split('T')[0];
        const newApp: ApplicationItem = {
          id: id || `app_${scholarshipId}`,
          scholarshipId,
          scholarshipTitle,
          provider,
          awardAmount,
          deadline,
          status: 'SAVED',
          matchScore,
          lastUpdatedDate: todayStr,
          requiredDocuments: requiredDocuments || [
            'Government Photo ID (Aadhaar)',
            'Official Academic Transcripts',
            'Family Income Certificate',
            'College Bonafide Certificate',
          ],
          notes: 'Application started. Gather required documents to move to next stage.',
        };
        state.items.unshift(newApp);
      }
    },
    advanceApplicationStatus: (state, action: PayloadAction<string>) => {
      const applicationId = action.payload;
      const app = state.items.find((item) => item.id === applicationId);
      if (app) {
        const next = getNextStatus(app.status);
        if (next) {
          app.status = next;
          app.lastUpdatedDate = new Date().toISOString().split('T')[0];
          if (next === 'APPLIED' && !app.appliedDate) {
            app.appliedDate = app.lastUpdatedDate;
          }
        }
      }
    },
    resetApplicationStatus: (state, action: PayloadAction<string>) => {
      const applicationId = action.payload;
      const app = state.items.find((item) => item.id === applicationId);
      if (app) {
        app.status = 'SAVED';
        app.lastUpdatedDate = new Date().toISOString().split('T')[0];
      }
    },
    setFilterTab: (state, action: PayloadAction<ApplicationFilterTab>) => {
      state.filterTab = action.payload;
    },
    deleteApplication: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
  },
});

export const {
  createOrGetApplication,
  advanceApplicationStatus,
  resetApplicationStatus,
  setFilterTab,
  deleteApplication,
} = applicationSlice.actions;

export default applicationSlice.reducer;
