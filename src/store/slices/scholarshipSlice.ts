import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Scholarship, ScholarshipFilter } from '../../types';

export interface ScholarshipState {
  items: Scholarship[];
  selectedScholarship: Scholarship | null;
  savedScholarshipIds: string[];
  comparedScholarshipIds: string[];
  filter: ScholarshipFilter;
  isLoading: boolean;
  error: string | null;
}

const initialState: ScholarshipState = {
  items: [],
  selectedScholarship: null,
  savedScholarshipIds: [],
  comparedScholarshipIds: [],
  filter: {},
  isLoading: false,
  error: null,
};

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
