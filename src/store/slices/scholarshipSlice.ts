import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Scholarship, ScholarshipFilter } from '../../types';

export interface ScholarshipState {
  items: Scholarship[];
  selectedScholarship: Scholarship | null;
  savedScholarshipIds: string[];
  filter: ScholarshipFilter;
  isLoading: boolean;
  error: string | null;
}

const initialState: ScholarshipState = {
  items: [],
  selectedScholarship: null,
  savedScholarshipIds: [],
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
  setFilter,
  resetFilter,
  setScholarshipLoading,
  setScholarshipError,
} = scholarshipSlice.actions;

export default scholarshipSlice.reducer;
