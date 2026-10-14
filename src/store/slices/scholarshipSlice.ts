import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Scholarship, ScholarshipFilter } from '../../types';
import {
  scholarshipService,
  ListScholarshipsParams,
  ScholarshipMatchData,
  MatchRecommendationItem,
} from '../../services/scholarshipService';
import { mapBackendScholarshipToFrontend } from '../../utils/adapters';

export interface ScholarshipState {
  items: Scholarship[];
  selectedScholarship: Scholarship | null;
  savedScholarshipIds: string[];
  comparedScholarshipIds: string[];
  recommendations: MatchRecommendationItem[];
  matchResults: Record<string, ScholarshipMatchData>;
  filter: ScholarshipFilter;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
}

const initialState: ScholarshipState = {
  items: [],
  selectedScholarship: null,
  savedScholarshipIds: [],
  comparedScholarshipIds: [],
  recommendations: [],
  matchResults: {},
  filter: {},
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
};

// ==============================================================================
// ASYNC THUNKS
// ==============================================================================

export const fetchScholarshipsThunk = createAsyncThunk(
  'scholarships/fetchScholarships',
  async (params: ListScholarshipsParams | undefined, { rejectWithValue }) => {
    try {
      const response = await scholarshipService.listScholarships(params);
      const rawItems = (response.data.items || []).map((s) =>
        mapBackendScholarshipToFrontend(s)
      );
      const seenIds = new Set<string>();
      const seenSignatures = new Set<string>();
      const items: Scholarship[] = [];
      for (const item of rawItems) {
        const sig = `${(item.title || '').trim().toLowerCase()}::${(item.provider || '').trim().toLowerCase()}`;
        if (!seenIds.has(item.id) && !seenSignatures.has(sig)) {
          seenIds.add(item.id);
          seenSignatures.add(sig);
          items.push(item);
        }
      }
      return {
        items,
        total: response.data.total,
        page: response.data.page,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch scholarships');
    }
  }
);

export const fetchScholarshipDetailsThunk = createAsyncThunk(
  'scholarships/fetchScholarshipDetails',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await scholarshipService.getScholarshipDetails(id);
      return mapBackendScholarshipToFrontend(response.data);
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch scholarship details');
    }
  }
);

export const fetchSavedScholarshipsThunk = createAsyncThunk(
  'scholarships/fetchSavedScholarships',
  async (_, { rejectWithValue }) => {
    try {
      const response = await scholarshipService.getSavedScholarships(1, 100);
      const items = (response.data.items || []).map((s) =>
        mapBackendScholarshipToFrontend(s)
      );
      const savedIds = items.map((s) => s.id);
      return { items, savedIds };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch saved scholarships');
    }
  }
);

export const toggleSaveScholarshipThunk = createAsyncThunk(
  'scholarships/toggleSaveScholarship',
  async (scholarshipId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { scholarships: ScholarshipState };
      const isAlreadySaved = state.scholarships.savedScholarshipIds.includes(scholarshipId);

      if (isAlreadySaved) {
        await scholarshipService.unsaveScholarship(scholarshipId);
        return { scholarshipId, isSaved: false };
      } else {
        await scholarshipService.saveScholarship(scholarshipId);
        return { scholarshipId, isSaved: true };
      }
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to update saved status');
    }
  }
);

export const fetchRecommendationsThunk = createAsyncThunk(
  'scholarships/fetchRecommendations',
  async (
    params: { page?: number; pageSize?: number; minScore?: number } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const response = await scholarshipService.getRecommendations(
        params?.page || 1,
        params?.pageSize || 10,
        params?.minScore
      );
      return response.data.items || [];
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch recommendations');
    }
  }
);

export const fetchMatchResultThunk = createAsyncThunk(
  'scholarships/fetchMatchResult',
  async (scholarshipId: string, { rejectWithValue }) => {
    try {
      const response = await scholarshipService.matchScholarship(scholarshipId);
      return { scholarshipId, matchData: response.data };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to evaluate AI match');
    }
  }
);

export const scholarshipSlice = createSlice({
  name: 'scholarships',
  initialState,
  reducers: {
    setScholarships: (state, action: PayloadAction<Scholarship[]>) => {
      state.items = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setSelectedScholarship: (state, action: PayloadAction<Scholarship | null>) => {
      state.selectedScholarship = action.payload;
    },
    toggleSaveScholarship: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.savedScholarshipIds.includes(id)) {
        state.savedScholarshipIds = state.savedScholarshipIds.filter((item) => item !== id);
      } else {
        state.savedScholarshipIds.push(id);
      }
    },
    saveScholarship: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (!state.savedScholarshipIds.includes(id)) {
        state.savedScholarshipIds.push(id);
      }
    },
    removeSavedScholarship: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.savedScholarshipIds = state.savedScholarshipIds.filter((item) => item !== id);
    },
    toggleCompareScholarship: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.comparedScholarshipIds.includes(id)) {
        state.comparedScholarshipIds = state.comparedScholarshipIds.filter((item) => item !== id);
      } else {
        if (state.comparedScholarshipIds.length < 3) {
          state.comparedScholarshipIds.push(id);
        }
      }
    },
    addToCompare: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (!state.comparedScholarshipIds.includes(id) && state.comparedScholarshipIds.length < 3) {
        state.comparedScholarshipIds.push(id);
      }
    },
    removeFromCompare: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.comparedScholarshipIds = state.comparedScholarshipIds.filter((item) => item !== id);
    },
    clearComparedScholarships: (state) => {
      state.comparedScholarshipIds = [];
    },
    setFilter: (state, action: PayloadAction<ScholarshipFilter>) => {
      state.filter = action.payload;
    },
    resetFilter: (state) => {
      state.filter = {};
    },
    setScholarshipLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setScholarshipError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    // List
    builder
      .addCase(fetchScholarshipsThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchScholarshipsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.error = null;
      })
      .addCase(fetchScholarshipsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Details
    builder.addCase(fetchScholarshipDetailsThunk.fulfilled, (state, action) => {
      state.selectedScholarship = action.payload;
      const index = state.items.findIndex((s) => s.id === action.payload.id);
      if (index >= 0) {
        state.items[index] = action.payload;
      }
    });

    // Saved list
    builder.addCase(fetchSavedScholarshipsThunk.fulfilled, (state, action) => {
      state.savedScholarshipIds = action.payload.savedIds;
    });

    // Toggle save
    builder.addCase(toggleSaveScholarshipThunk.fulfilled, (state, action) => {
      const { scholarshipId, isSaved } = action.payload;
      if (isSaved) {
        if (!state.savedScholarshipIds.includes(scholarshipId)) {
          state.savedScholarshipIds.push(scholarshipId);
        }
      } else {
        state.savedScholarshipIds = state.savedScholarshipIds.filter((id) => id !== scholarshipId);
      }
    });

    // Recommendations
    builder.addCase(fetchRecommendationsThunk.fulfilled, (state, action) => {
      state.recommendations = action.payload;
    });

    // Match evaluation
    builder.addCase(fetchMatchResultThunk.fulfilled, (state, action) => {
      state.matchResults[action.payload.scholarshipId] = action.payload.matchData;
    });
  },
});

export const {
  setScholarships,
  setSelectedScholarship,
  toggleSaveScholarship,
  saveScholarship,
  removeSavedScholarship,
  toggleCompareScholarship,
  addToCompare,
  removeFromCompare,
  clearComparedScholarships,
  setFilter,
  resetFilter,
  setScholarshipLoading,
  setScholarshipError,
} = scholarshipSlice.actions;

export default scholarshipSlice.reducer;
