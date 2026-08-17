import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
  Divider,
  EmptyState,
  LoadingState,
  ErrorState,
} from '../components/common';
import {
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  TextButton,
  LoadingButton,
} from '../components/buttons';
import {
  TextInput,
  PasswordInput,
  SearchInput,
  SelectInput,
  DateInput,
  SelectOption,
} from '../components/inputs';

type SectionTab = 'all' | 'buttons' | 'inputs' | 'cards' | 'badges' | 'states';

export const ShowcaseScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SectionTab>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Input states
  const [textValue, setTextValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | number>('merit');
  const [selectedDate, setSelectedDate] = useState('2026-09-30');

  // Loading button state
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  // States demo toggle
  const [stateView, setStateView] = useState<'loading' | 'error' | 'empty'>('empty');

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((current) => (current === msg ? null : current));
    }, 3000);
  };

  const handleLoadingButtonPress = () => {
    setIsButtonLoading(true);
    showFeedback('Asynchronous task initiated...');
    setTimeout(() => {
      setIsButtonLoading(false);
      showFeedback('Loading completed successfully!');
    }, 1500);
  };

  const categoryOptions: SelectOption[] = [
    { label: 'Merit-Based Scholarship', value: 'merit', description: 'Based on GPA and academic standing', badge: 'Popular' },
    { label: 'STEM Excellence Grant', value: 'stem', description: 'Science, Technology, Engineering & Math' },
    { label: 'Study Abroad Fellowship', value: 'abroad', description: 'International exchange programs' },
    { label: 'Need-Based Financial Aid', value: 'need', description: 'Based on household income criteria' },
    { label: 'Sports & Arts Fellowship', value: 'special', description: 'Athletic & creative achievements' },
  ];

  const tabs: { key: SectionTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'buttons', label: 'Buttons' },
    { key: 'inputs', label: 'Inputs' },
    { key: 'cards', label: 'Cards' },
    { key: 'badges', label: 'Badges' },
    { key: 'states', label: 'States' },
  ];

  const shouldShow = (tab: SectionTab) => activeTab === 'all' || activeTab === tab;

  return (
    <ScreenContainer scrollable withSafeArea>
      {/* Screen Header */}
      <Header
        title="UI Design System"
        subtitle="ScholarHub Reusable Components Showcase"
        rightAction={
          <Badge variant="primary" size="sm" showDot label="v1.0" />
        }
      />

      {/* Interactive Toast / Feedback Banner */}
      {feedbackMessage && (
        <View className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 flex-row items-center justify-between">
          <Text className="text-xs font-semibold text-primary-800 flex-1 mr-2">
            💡 {feedbackMessage}
          </Text>
          <TouchableOpacity onPress={() => setFeedbackMessage(null)}>
            <Text className="text-xs font-bold text-primary-600">✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category Navigation Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-5 -mx-4 px-4"
      >
        <View className="flex-row gap-2 py-1">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl border ${
                activeTab === tab.key
                  ? 'bg-primary-600 border-primary-600'
                  : 'bg-white border-slate-200 active:bg-slate-50'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeTab === tab.key ? 'text-white' : 'text-slate-700'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* 1. BUTTONS SECTION */}
      {/* ========================================================================= */}
      {shouldShow('buttons') && (
        <Card variant="elevated" className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-extrabold text-slate-900">
              1. Buttons Component Library
            </Text>
            <Badge variant="info" size="sm" label="5 Variants" />
          </View>
          <Text className="text-xs text-slate-500 mb-4">
            Standardized interactive buttons supporting primary, secondary, outline, text, and loading states.
          </Text>

          {/* Primary Buttons */}
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Primary & Secondary Buttons
          </Text>
          <View className="flex-row flex-wrap gap-2.5 mb-4">
            <PrimaryButton
              title="Primary Action"
              onPress={() => showFeedback('Primary button tapped')}
            />
            <SecondaryButton
              title="Secondary Action"
              onPress={() => showFeedback('Secondary button tapped')}
            />
          </View>

          {/* Outline & Text */}
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Outline, Text & Loading Buttons
          </Text>
          <View className="flex-row flex-wrap gap-2.5 mb-4">
            <OutlineButton
              title="Outline Button"
              onPress={() => showFeedback('Outline button tapped')}
            />
            <TextButton
              title="Text / Ghost"
              onPress={() => showFeedback('Text button tapped')}
            />
            <LoadingButton
              title="Tap for Async Load"
              isLoading={isButtonLoading}
              loadingText="Processing..."
              onPress={handleLoadingButtonPress}
            />
          </View>

          {/* Sizing Scale */}
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Button Sizing Scale (sm, md, lg)
          </Text>
          <View className="flex-row items-center gap-2 mb-4">
            <PrimaryButton
              size="sm"
              title="Small"
              onPress={() => showFeedback('Small size button')}
            />
            <PrimaryButton
              size="md"
              title="Medium"
              onPress={() => showFeedback('Medium size button')}
            />
            <PrimaryButton
              size="lg"
              title="Large"
              onPress={() => showFeedback('Large size button')}
            />
          </View>

          {/* Disabled & Full Width States */}
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            States (Disabled & Full Width)
          </Text>
          <View className="gap-2.5">
            <PrimaryButton title="Disabled Button" disabled />
            <PrimaryButton
              title="Full Width Primary Button"
              fullWidth
              onPress={() => showFeedback('Full width button tapped')}
            />
          </View>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2. INPUTS SECTION */}
      {/* ========================================================================= */}
      {shouldShow('inputs') && (
        <Card variant="elevated" className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-extrabold text-slate-900">
              2. Inputs Component Library
            </Text>
            <Badge variant="success" size="sm" label="5 Types" />
          </View>
          <Text className="text-xs text-slate-500 mb-4">
            Accessible form controls with focus rings, icon slots, validation messages, and modal pickers.
          </Text>

          {/* Standard TextInput */}
          <TextInput
            label="Full Name"
            placeholder="e.g. Sarah Jenkins"
            value={textValue}
            onChangeText={setTextValue}
            helperText="Enter your official student name as per academic records."
            required
            clearable
          />

          {/* TextInput with Error */}
          <TextInput
            label="Student Email Address"
            placeholder="student@university.edu"
            defaultValue="invalid-email-address"
            error="Please enter a valid institutional email address."
            required
          />

          {/* PasswordInput */}
          <PasswordInput
            label="Account Password"
            placeholder="Enter secure password"
            value={passwordValue}
            onChangeText={setPasswordValue}
            helperText="Features toggleable visibility button."
            required
          />

          {/* SearchInput */}
          <SearchInput
            label="Scholarship Search"
            placeholder="Search by keywords or university..."
            value={searchValue}
            onChangeText={setSearchValue}
            onSearch={(query) => showFeedback(`Searching for "${query}"`)}
            helperText="Instant clear and return-key submit action."
          />

          {/* SelectInput (Modal Dropdown) */}
          <SelectInput
            label="Scholarship Category"
            placeholder="Select a category..."
            value={selectedCategory}
            options={categoryOptions}
            onSelect={(val, opt) => {
              setSelectedCategory(val);
              showFeedback(`Selected category: ${opt.label}`);
            }}
            modalTitle="Choose Scholarship Category"
            searchable
            helperText="Interactive bottom-sheet modal picker with search filter."
            required
          />

          {/* DateInput */}
          <DateInput
            label="Application Deadline"
            value={selectedDate}
            onChangeDate={(date) => {
              setSelectedDate(date);
              showFeedback(`Selected deadline: ${date}`);
            }}
            helperText="Modal date picker with quick presets and ISO format validation."
            required
          />

          {/* Disabled Input */}
          <TextInput
            label="System Reference ID"
            value="SCH-2026-X99"
            disabled
            helperText="Read-only system assigned identifier."
          />
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. CARDS & COMMON SECTION */}
      {/* ========================================================================= */}
      {shouldShow('cards') && (
        <View className="mb-6 gap-4">
          <Text className="text-base font-extrabold text-slate-900">
            3. Cards & Common Containers
          </Text>

          {/* Elevated Card */}
          <Card variant="elevated">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-bold text-slate-900">
                Elevated Card Variant
              </Text>
              <Badge variant="primary" size="sm" label="Elevated" />
            </View>
            <Text className="text-xs text-slate-500 leading-relaxed">
              Standard white container with subtle shadow and border. Recommended for primary content blocks.
            </Text>
          </Card>

          {/* Outlined Card */}
          <Card variant="outlined">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-bold text-slate-900">
                Outlined Card Variant
              </Text>
              <Badge variant="outline" size="sm" label="Outlined" />
            </View>
            <Text className="text-xs text-slate-500 leading-relaxed">
              Crisp border without elevation shadow. Clean for secondary groupings or nested items.
            </Text>
          </Card>

          {/* Flat Card */}
          <Card variant="flat">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-bold text-slate-900">
                Flat Card Variant
              </Text>
              <Badge variant="neutral" size="sm" label="Flat" />
            </View>
            <Text className="text-xs text-slate-600 leading-relaxed">
              Subtle background tint with no borders. Great for callouts, notes, or highlighted metadata.
            </Text>
          </Card>

          {/* Interactive Clickable Card */}
          <Card
            variant="interactive"
            onPress={() => showFeedback('Interactive card clicked!')}
          >
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-sm font-bold text-primary-800">
                🎓 Global STEM Leadership Award
              </Text>
              <Badge variant="success" size="sm" showDot label="Active" />
            </View>
            <Text className="text-xs text-slate-500 mb-2">
              $15,000 / year • University of Oxford • Full Tuition
            </Text>
            <Text className="text-[11px] font-bold text-primary-600">
              Tap card to view details →
            </Text>
          </Card>

          {/* Dividers */}
          <Card variant="outlined">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Dividers (Standard & Labelled)
            </Text>
            <Text className="text-xs text-slate-600 mb-2">Standard Divider:</Text>
            <Divider spacing="sm" />
            <Text className="text-xs text-slate-600 mt-2 mb-2">Divider with Label:</Text>
            <Divider label="OR CONTINUE WITH" spacing="md" />
          </Card>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 4. BADGES SECTION */}
      {/* ========================================================================= */}
      {shouldShow('badges') && (
        <Card variant="elevated" className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-extrabold text-slate-900">
              4. Badges & Status Indicators
            </Text>
            <Badge variant="warning" size="sm" label="8 Variants" />
          </View>
          <Text className="text-xs text-slate-500 mb-4">
            Color-coded pill badges for scholarship tags, statuses, urgency, and categories.
          </Text>

          {/* Variant Badges */}
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Theme & Status Variants
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            <Badge variant="primary" label="Primary" />
            <Badge variant="secondary" label="Secondary" />
            <Badge variant="success" label="Approved" />
            <Badge variant="warning" label="Pending" />
            <Badge variant="error" label="Expired" />
            <Badge variant="info" label="New" />
            <Badge variant="neutral" label="Archived" />
            <Badge variant="outline" label="Outline" />
          </View>

          {/* With Indicator Dots */}
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Status Badges with Live Dot
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            <Badge variant="success" showDot label="Open for Applications" />
            <Badge variant="warning" showDot label="Closing Soon (3 Days)" />
            <Badge variant="error" showDot label="Deadline Passed" />
          </View>

          {/* Sizing Scale */}
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Badge Sizing Scale (sm, md, lg)
          </Text>
          <View className="flex-row items-center gap-2">
            <Badge size="sm" variant="primary" label="Small (sm)" />
            <Badge size="md" variant="primary" label="Medium (md)" />
            <Badge size="lg" variant="primary" label="Large (lg)" />
          </View>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5, 6, 7. STATES SECTION (Loading, Error, Empty) */}
      {/* ========================================================================= */}
      {shouldShow('states') && (
        <Card variant="elevated" className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-extrabold text-slate-900">
              5. States (Loading, Error, Empty)
            </Text>
            <Badge variant="secondary" size="sm" label="Interactive" />
          </View>
          <Text className="text-xs text-slate-500 mb-4">
            Unified UX screens for loading, network errors, and empty query results.
          </Text>

          {/* State Switcher Buttons */}
          <View className="flex-row gap-2 mb-4">
            <TouchableOpacity
              onPress={() => setStateView('loading')}
              className={`flex-1 py-2 rounded-xl items-center border ${
                stateView === 'loading'
                  ? 'bg-blue-50 border-primary-500'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  stateView === 'loading' ? 'text-primary-700' : 'text-slate-600'
                }`}
              >
                🔄 Loading State
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStateView('error')}
              className={`flex-1 py-2 rounded-xl items-center border ${
                stateView === 'error'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  stateView === 'error' ? 'text-red-700' : 'text-slate-600'
                }`}
              >
                ⚠️ Error State
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStateView('empty')}
              className={`flex-1 py-2 rounded-xl items-center border ${
                stateView === 'empty'
                  ? 'bg-emerald-50 border-emerald-500'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  stateView === 'empty' ? 'text-emerald-700' : 'text-slate-600'
                }`}
              >
                📂 Empty State
              </Text>
            </TouchableOpacity>
          </View>

          {/* State Display Window */}
          <View className="border border-slate-200 rounded-2xl bg-slate-50/50 p-2">
            {stateView === 'loading' && (
              <LoadingState
                message="Fetching Matching Scholarships..."
                subMessage="Searching verified national and university databases"
              />
            )}

            {stateView === 'error' && (
              <ErrorState
                title="Unable to Load Scholarships"
                message="Could not reach the server. Please verify your connection and try again."
                retryTitle="Try Again"
                onRetry={() => showFeedback('Retry request executed')}
                secondaryActionTitle="Check Settings"
                onSecondaryAction={() => showFeedback('Navigating to settings')}
              />
            )}

            {stateView === 'empty' && (
              <EmptyState
                title="No Scholarships Found"
                description="Try adjusting your search criteria, eligibility filters, or category selection."
                actionTitle="Reset Filters"
                onActionPress={() => {
                  setSearchValue('');
                  setSelectedCategory('merit');
                  showFeedback('Filters reset to defaults');
                }}
              />
            )}
          </View>
        </Card>
      )}

      {/* Footer Info Box */}
      <View className="p-4 rounded-2xl bg-blue-50 border border-blue-200 mb-8">
        <Text className="text-xs font-bold text-primary-900 mb-1">
          ScholarHub Design System Guidelines
        </Text>
        <Text className="text-xs text-primary-800 leading-relaxed">
          All future feature modules (Authentication, Scholarships Feed, Profile, Applications, Documents)
          will directly consume these reusable components and centralized theme tokens to maintain a consistent
          visual language.
        </Text>
      </View>
    </ScreenContainer>
  );
};

export default ShowcaseScreen;
