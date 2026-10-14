import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  ApplicationItem,
  ApplicationStatus,
  getNextStatus,
} from '../../types/application';
import {
  applicationService,
  ListApplicationsParams,
  ApplicationCreatePayload,
} from '../../services/applicationService';
import { mapBackendApplicationToFrontend } from '../../utils/adapters';

export type ApplicationFilterTab = 'all' | 'active' | 'completed';

export interface ApplicationState {
  items: ApplicationItem[];
  filterTab: ApplicationFilterTab;
  isLoading: boolean;
  error: string | null;
  total: number;
}

const initialState: ApplicationState = {
  items: [],
  filterTab: 'all',
  isLoading: false,
  error: null,
  total: 0,
};

// ==============================================================================
// ASYNC THUNKS
// ==============================================================================

export const fetchApplicationsThunk = createAsyncThunk(
  'applications/fetchApplications',
  async (params: ListApplicationsParams | undefined, { rejectWithValue }) => {
    try {
      const response = await applicationService.listApplications(params);
      const items = (response.data.items || []).map((app) =>
        mapBackendApplicationToFrontend(app)
      );
      return {
        items,
        total: response.data.total,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch applications');
    }
  }
);

export const createApplicationThunk = createAsyncThunk(
  'applications/createApplication',
  async (payload: ApplicationCreatePayload, { rejectWithValue }) => {
    try {
      const response = await applicationService.createApplication(payload);
      return mapBackendApplicationToFrontend(response.data);
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to start application');
    }
  }
);

export const updateApplicationStatusThunk = createAsyncThunk(
  'applications/updateApplicationStatus',
  async (
    payload: { applicationId: string; status: ApplicationStatus },
    { rejectWithValue }
  ) => {
    try {
      const response = await applicationService.updateApplicationStatus(
        payload.applicationId,
        { status: payload.status }
      );
      return mapBackendApplicationToFrontend(response.data);
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to update application status');
    }
  }
);

export const deleteApplicationThunk = createAsyncThunk(
  'applications/deleteApplication',
  async (applicationId: string, { rejectWithValue }) => {
    try {
      await applicationService.deleteApplication(applicationId);
      return applicationId;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to delete application');
    }
  }
);

export const applicationSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    setApplications: (state, action: PayloadAction<ApplicationItem[]>) => {
      state.items = action.payload;
      state.total = action.payload.length;
      state.isLoading = false;
      state.error = null;
    },
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
        const generatedId = id || (scholarshipId.startsWith('sch_')
          ? `app_${scholarshipId.slice(4)}`
          : `app_${scholarshipId}`);

        const newApp: ApplicationItem = {
          id: generatedId,
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
        state.total += 1;
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
      state.total = state.items.length;
    },
  },
  extraReducers: (builder) => {
    // List
    builder
      .addCase(fetchApplicationsThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchApplicationsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.error = null;
      })
      .addCase(fetchApplicationsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create
    builder.addCase(createApplicationThunk.fulfilled, (state, action) => {
      const existingIdx = state.items.findIndex((a) => a.id === action.payload.id || a.scholarshipId === action.payload.scholarshipId);
      if (existingIdx >= 0) {
        state.items[existingIdx] = action.payload;
      } else {
        state.items.unshift(action.payload);
        state.total += 1;
      }
    });

    // Update status
    builder.addCase(updateApplicationStatusThunk.fulfilled, (state, action) => {
      const index = state.items.findIndex((a) => a.id === action.payload.id);
      if (index >= 0) {
        state.items[index] = action.payload;
      }
    });

    // Delete
    builder.addCase(deleteApplicationThunk.fulfilled, (state, action) => {
      state.items = state.items.filter((a) => a.id !== action.payload);
      state.total = state.items.length;
    });
  },
});

export const {
  setApplications,
  createOrGetApplication,
  advanceApplicationStatus,
  resetApplicationStatus,
  setFilterTab,
  deleteApplication,
} = applicationSlice.actions;

export default applicationSlice.reducer;
