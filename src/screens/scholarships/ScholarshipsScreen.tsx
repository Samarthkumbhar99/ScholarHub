import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StudentTabParamList, RootStackParamList, StudentTabScreenNavigationProp } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  toggleSaveScholarshipThunk,
  toggleCompareScholarship,
  fetchScholarshipsThunk,
  fetchSavedScholarshipsThunk,
} from '../../store/slices/scholarshipSlice';
import { createApplicationThunk } from '../../store/slices/applicationSlice';
import {
  ScreenContainer,
  Header,
  Badge,
  EmptyState,
} from '../../components/common';
import { SearchInput } from '../../components/inputs';
import { ScholarshipFilterState, ScholarshipItem, SortOption } from './types';
import {
  filterScholarships,
  deduplicateScholarships,
  countActiveFilters,
  initialFilterState,
} from './utils/filterScholarships';
import { ScholarshipCard } from './components/ScholarshipCard';
import { FilterModal } from './components/FilterModal';
import { ActiveFilterChips } from './components/ActiveFilterChips';
import { SortSelector } from './components/SortSelector';
import { CompareSelectionBar } from './components/CompareSelectionBar';

type ScholarshipsNavProp = StudentTabScreenNavigationProp<'Scholarships'>;

/**
 * ScholarshipsScreen
 * Enhanced Scholarship Discovery & Smart Filter Hub
 */
export const ScholarshipsScreen: React.FC = () => {
  const navigation = useNavigation<ScholarshipsNavProp>();
  const dispatch = useAppDispatch();
  const { savedScholarshipIds, comparedScholarshipIds, items: reduxScholarships, isLoading, error } = useAppSelector(
    (state) => state.scholarships
  );
  const { items: applicationItems } = useAppSelector((state) => state.applications);

  // Sync scholarships and saved on mount
  useEffect(() => {
    dispatch(fetchScholarshipsThunk());
    dispatch(fetchSavedScholarshipsThunk());
  }, [dispatch]);

  // Source list of scholarships: backend data with duplicate prevention
  const sourceScholarships = useMemo(() => {
    return deduplicateScholarships(reduxScholarships || []);
  }, [reduxScholarships]);

  // Filter & Search State
  const [filterState, setFilterState] = useState<ScholarshipFilterState>(initialFilterState);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Quick Category shortcuts on main screen
  const [quickCategory, setQuickCategory] = useState<string>('all');

  const quickCategories = [
    { key: 'all', label: 'All Grants' },
    { key: 'stem', label: 'STEM' },
    { key: 'merit', label: 'Merit' },
    { key: 'abroad', label: 'Study Abroad' },
    { key: 'gov', label: 'Govt. Schemes' },
  ];

  // Apply quick category preset
  const handleSelectQuickCategory = (key: string) => {
    setQuickCategory(key);
    if (key === 'all') {
      setFilterState((prev) => ({ ...prev, type: 'all', fieldOfStudy: 'all' }));
    } else if (key === 'stem') {
      setFilterState((prev) => ({ ...prev, fieldOfStudy: 'Engineering' }));
    } else if (key === 'merit') {
      setFilterState((prev) => ({ ...prev, minCGPA: 8.0 }));
    } else if (key === 'abroad') {
      setFilterState((prev) => ({ ...prev, type: 'international' }));
    } else if (key === 'gov') {
      setFilterState((prev) => ({ ...prev, type: 'government' }));
    }
  };

  // Filter & Sort computation
  const filteredScholarships = useMemo(() => {
    return filterScholarships(sourceScholarships, filterState);
  }, [sourceScholarships, filterState]);

  const activeFilterCount = useMemo(() => {
    return countActiveFilters(filterState);
  }, [filterState]);

  // Actions
  const handleToggleSave = (id: string) => {
    dispatch(toggleSaveScholarshipThunk(id));
  };

  const handleToggleCompare = (id: string) => {
    if (!comparedScholarshipIds.includes(id) && comparedScholarshipIds.length >= 3) {
      Alert.alert(
        'Comparison Limit Reached',
        'You can compare up to 3 scholarships at a time. Please remove an existing selection to add another.'
      );
      return;
    }
    dispatch(toggleCompareScholarship(id));
  };

  const handleApply = async (scholarship: ScholarshipItem) => {
    const existingApp = applicationItems.find((app) => app.scholarshipId === scholarship.id);
    if (existingApp) {
      navigation.navigate('ApplicationDetails', {
        applicationId: existingApp.id,
      });
      return;
    }

    try {
      const createdApp = await dispatch(
        createApplicationThunk({
          scholarship_id: scholarship.id,
          status: 'SAVED',
        })
      ).unwrap();

      navigation.navigate('ApplicationDetails', {
        applicationId: createdApp.id,
      });
    } catch {
      const fallbackAppId = scholarship.id.startsWith('sch_')
        ? `app_${scholarship.id.slice(4)}`
        : `app_${scholarship.id}`;
      navigation.navigate('ApplicationDetails', {
        applicationId: fallbackAppId,
      });
    }
  };

  const handleDetails = (scholarship: ScholarshipItem) => {
    navigation.navigate('ScholarshipDetails', { scholarshipId: scholarship.id });
  };

  const handleSearchChange = (query: string) => {
    setFilterState((prev) => ({ ...prev, searchQuery: query }));
  };

  const handleSortChange = (sortBy: SortOption) => {
    setFilterState((prev) => ({ ...prev, sortBy }));
  };

  const handleRemoveSingleFilter = (key: keyof ScholarshipFilterState) => {
    setFilterState((prev) => ({
      ...prev,
      [key]: key === 'type' || key === 'status' || key === 'funding' || key === 'fieldOfStudy' ? 'all' : undefined,
    }));
  };

  const handleClearAllFilters = () => {
    setFilterState(initialFilterState);
    setQuickCategory('all');
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-24">
        {/* Header */}
        <Header
          title="Scholarship Directory"
          subtitle={`${filteredScholarships.length} available opportunities`}
          rightAction={
            <Badge
              variant="primary"
              size="sm"
              label={`${filteredScholarships.length} Available`}
            />
          }
        />

        {/* Search & Filter Bar Row */}
        <View className="flex-row items-center gap-2.5 mb-2">
          <View className="flex-1">
            <SearchInput
              placeholder="Search scholarships by name, provider, course..."
              value={filterState.searchQuery}
              onChangeText={handleSearchChange}
              clearable
              containerClassName="mb-0"
            />
          </View>

          {/* Filter Modal Trigger Button */}
          <TouchableOpacity
            onPress={() => setIsFilterModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Open smart filters. ${activeFilterCount} active filters.`}
            className={`h-12 px-3.5 rounded-xl border flex-row items-center justify-center ${
              activeFilterCount > 0
                ? 'bg-blue-50 border-primary-600 ring-2 ring-primary-100'
                : 'bg-white border-slate-300 active:bg-slate-50'
            }`}
          >
            <Text className="text-base mr-1">⚙️</Text>
            <Text
              className={`text-xs font-bold ${
                activeFilterCount > 0 ? 'text-primary-700' : 'text-slate-700'
              }`}
            >
              Filters
            </Text>
            {activeFilterCount > 0 && (
              <View className="ml-1.5 bg-primary-600 h-5 min-w-[20px] px-1 rounded-full items-center justify-center">
                <Text className="text-[10px] font-extrabold text-white">
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Category Presets Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3 -mx-4 px-4"
        >
          <View className="flex-row gap-2 py-1">
            {quickCategories.map((cat) => {
              const isSelected = quickCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => handleSelectQuickCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-xl border ${
                    isSelected
                      ? 'bg-primary-600 border-primary-600 shadow-sm'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Active Filter Chips with 1-tap removal */}
        <ActiveFilterChips
          filter={filterState}
          onRemoveFilter={handleRemoveSingleFilter}
          onClearAll={handleClearAllFilters}
        />

        {/* Sort Option Pills */}
        <SortSelector
          currentSort={filterState.sortBy}
          onSelectSort={handleSortChange}
        />

        {/* Scholarships List / Loading / Error / Empty States */}
        {error && sourceScholarships.length === 0 ? (
          <EmptyState
            title="Unable to Load Scholarships"
            description={error || "Failed to retrieve scholarship opportunities from the server. Please check your network connection and retry."}
            actionTitle="↻ Retry Loading"
            onActionPress={() => dispatch(fetchScholarshipsThunk())}
          />
        ) : filteredScholarships.length === 0 ? (
          <EmptyState
            title={isLoading ? "Loading Scholarships..." : "No Scholarships Found"}
            description={
              isLoading
                ? "Fetching available scholarship grants from the server..."
                : "No scholarships matched your current search query and smart filters. Try loosening your criteria."
            }
            actionTitle={isLoading ? undefined : "Clear All Filters"}
            onActionPress={isLoading ? undefined : handleClearAllFilters}
          />
        ) : (
          <View className="pb-6">
            {filteredScholarships.map((sch) => (
              <ScholarshipCard
                key={sch.id}
                scholarship={sch}
                isSaved={savedScholarshipIds.includes(sch.id)}
                isCompared={comparedScholarshipIds.includes(sch.id)}
                onToggleSave={handleToggleSave}
                onToggleCompare={handleToggleCompare}
                onDetails={handleDetails}
                onApply={handleApply}
              />
            ))}
          </View>
        )}

        {/* Smart Filter Modal */}
        <FilterModal
          visible={isFilterModalOpen}
          filter={filterState}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={(newFilter) => setFilterState(newFilter)}
          onReset={handleClearAllFilters}
        />
      </ScreenContainer>

      {/* Sticky Bottom Compare Bar */}
      <CompareSelectionBar bottomOffset={0} />
    </View>
  );
};

export default ScholarshipsScreen;
