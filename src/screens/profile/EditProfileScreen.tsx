import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  updatePersonalDetails,
  updateAcademicDetails,
  updatePreferencesDetails,
} from '../../store/slices/authSlice';
import {
  PersonalDetails,
  AcademicDetails,
  PreferencesDetails,
  SpecialCategory,
} from '../../types/registration';
import {
  validatePersonalDetails,
  validateAcademicDetails,
  validatePreferencesDetails,
} from '../../utils/profileUtils';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
} from '../../components/common';
import { PrimaryButton, OutlineButton } from '../../components/buttons';
import { AppTextInput, DateInput, SelectInput } from '../../components/inputs';
import {
  GENDER_OPTIONS,
  COUNTRY_OPTIONS,
  STATE_OPTIONS,
  COURSE_OPTIONS,
  BRANCH_OPTIONS,
  CURRENT_YEAR_OPTIONS,
  RESERVATION_CATEGORIES,
  SPECIAL_CATEGORIES,
  STUDY_PREFERENCES,
} from '../registration/constants';

type EditProfileRouteProp = RouteProp<RootStackParamList, 'EditProfile'>;
type SectionTab = 'personal' | 'academic' | 'category' | 'preferences';

/**
 * EditProfileScreen
 * Full-page student profile editor organizing Personal, Academic, Category, and Preference sections.
 */
export const EditProfileScreen: React.FC = () => {
  const route = useRoute<EditProfileRouteProp>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const initialTab: SectionTab = route.params?.section || 'personal';
  const [activeTab, setActiveTab] = useState<SectionTab>(initialTab);

  // Form states initialized with canonical user profile
  const [personalState, setPersonalState] = useState<PersonalDetails>({
    firstName: user?.personal?.firstName || user?.firstName || '',
    lastName: user?.personal?.lastName || user?.lastName || '',
    dateOfBirth: user?.personal?.dateOfBirth || '',
    gender: user?.personal?.gender || '',
    email: user?.personal?.email || user?.email || '',
    mobile: user?.personal?.mobile || '',
  });

  const [academicState, setAcademicState] = useState<AcademicDetails>({
    country: user?.academic?.country || user?.country || 'India',
    state: user?.academic?.state || '',
    district: user?.academic?.district || '',
    city: user?.academic?.city || '',
    course: user?.academic?.course || '',
    branch: user?.academic?.branch || user?.major || '',
    currentYear: user?.academic?.currentYear || '',
    university: user?.academic?.university || '',
    college: user?.academic?.college || '',
    cgpa: user?.academic?.cgpa || (user?.gpa ? String(user.gpa) : ''),
    previousPercentage: user?.academic?.previousPercentage || '',
  });

  const [preferencesState, setPreferencesState] = useState<PreferencesDetails>({
    reservationCategory: user?.preferences?.reservationCategory || 'General',
    specialCategories: user?.preferences?.specialCategories?.length
      ? [...user.preferences.specialCategories]
      : ['None'],
    familyIncome: user?.preferences?.familyIncome || '',
    studyPreference: user?.preferences?.studyPreference || 'India',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  // Special Category Toggle Handler
  const handleSpecialCategoryToggle = (category: SpecialCategory) => {
    setPreferencesState((prev) => {
      let current = [...prev.specialCategories];
      if (category === 'None') {
        return { ...prev, specialCategories: ['None'] };
      }
      current = current.filter((c) => c !== 'None');
      if (current.includes(category)) {
        current = current.filter((c) => c !== category);
        if (current.length === 0) current = ['None'];
      } else {
        current.push(category);
      }
      return { ...prev, specialCategories: current };
    });
    setErrors((prev) => ({ ...prev, specialCategories: '' }));
  };

  // Section Save Handlers
  const handleSaveActiveSection = () => {
    if (activeTab === 'personal') {
      const errs = validatePersonalDetails(personalState);
      if (Object.keys(errs).length > 0) {
        setErrors(errs as Record<string, string>);
        return;
      }
      dispatch(updatePersonalDetails(personalState));
      setFeedback('Personal information updated successfully.');
      setTimeout(() => setFeedback(null), 3000);
    } else if (activeTab === 'academic') {
      const errs = validateAcademicDetails(academicState);
      if (Object.keys(errs).length > 0) {
        setErrors(errs as Record<string, string>);
        return;
      }
      dispatch(updateAcademicDetails(academicState));
      setFeedback('Academic credentials updated successfully.');
      setTimeout(() => setFeedback(null), 3000);
    } else if (activeTab === 'category' || activeTab === 'preferences') {
      const errs = validatePreferencesDetails(preferencesState);
      if (Object.keys(errs).length > 0) {
        setErrors(errs as Record<string, string>);
        return;
      }
      dispatch(updatePreferencesDetails(preferencesState));
      setFeedback('Category & study preferences updated successfully.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const tabs: { key: SectionTab; label: string; icon: string }[] = [
    { key: 'personal', label: 'Personal', icon: '👤' },
    { key: 'academic', label: 'Academic', icon: '🎓' },
    { key: 'category', label: 'Category', icon: '📜' },
    { key: 'preferences', label: 'Preferences', icon: '🌍' },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
        {/* Header */}
        <Header
          title="Edit Profile"
          subtitle="Update credentials and eligibility preferences"
          showBack
          onBackPress={() => navigation.goBack()}
        />

        {/* Action Feedback Banner */}
        {feedback ? (
          <View className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex-row items-center justify-between">
            <Text className="text-xs font-bold text-emerald-900">
              ✅ {feedback}
            </Text>
            <TouchableOpacity onPress={() => setFeedback(null)}>
              <Text className="text-xs font-bold text-emerald-600">✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Section Navigation Tabs */}
        <View className="flex-row gap-1.5 mb-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  setActiveTab(tab.key);
                  setErrors({});
                }}
                className={`flex-1 py-2 px-1 rounded-xl items-center justify-center flex-row gap-1 ${
                  isSelected ? 'bg-white shadow-xs' : 'bg-transparent'
                }`}
              >
                <Text className="text-xs">{tab.icon}</Text>
                <Text
                  className={`text-[11px] font-bold ${
                    isSelected ? 'text-primary-700' : 'text-slate-600'
                  }`}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Form Card */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          {/* Tab 1: Personal */}
          {activeTab === 'personal' && (
            <View className="gap-3.5">
              <Text className="text-sm font-black text-slate-900 mb-1">
                Personal & Identity Details
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AppTextInput
                    label="First Name"
                    value={personalState.firstName}
                    onChangeText={(val) => {
                      setPersonalState((p) => ({ ...p, firstName: val }));
                      setErrors((e) => ({ ...e, firstName: '' }));
                    }}
                    error={errors.firstName}
                    required
                  />
                </View>
                <View className="flex-1">
                  <AppTextInput
                    label="Last Name"
                    value={personalState.lastName}
                    onChangeText={(val) => {
                      setPersonalState((p) => ({ ...p, lastName: val }));
                      setErrors((e) => ({ ...e, lastName: '' }));
                    }}
                    error={errors.lastName}
                    required
                  />
                </View>
              </View>

              <DateInput
                label="Date of Birth"
                value={personalState.dateOfBirth}
                onChangeDate={(val) => {
                  setPersonalState((p) => ({ ...p, dateOfBirth: val }));
                  setErrors((e) => ({ ...e, dateOfBirth: '' }));
                }}
                error={errors.dateOfBirth}
                required
              />

              <SelectInput
                label="Gender"
                options={GENDER_OPTIONS}
                value={personalState.gender}
                onSelect={(val) => {
                  setPersonalState((p) => ({ ...p, gender: String(val) }));
                  setErrors((e) => ({ ...e, gender: '' }));
                }}
                error={errors.gender}
                required
              />

              <AppTextInput
                label="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={personalState.email}
                onChangeText={(val) => {
                  setPersonalState((p) => ({ ...p, email: val }));
                  setErrors((e) => ({ ...e, email: '' }));
                }}
                error={errors.email}
                required
              />

              <AppTextInput
                label="Mobile Number"
                keyboardType="phone-pad"
                value={personalState.mobile}
                onChangeText={(val) => {
                  setPersonalState((p) => ({ ...p, mobile: val }));
                  setErrors((e) => ({ ...e, mobile: '' }));
                }}
                error={errors.mobile}
                required
              />
            </View>
          )}

          {/* Tab 2: Academic */}
          {activeTab === 'academic' && (
            <View className="gap-3.5">
              <Text className="text-sm font-black text-slate-900 mb-1">
                Academic & Educational Details
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <SelectInput
                    label="Country"
                    options={COUNTRY_OPTIONS}
                    value={academicState.country}
                    onSelect={(val) => {
                      setAcademicState((a) => ({ ...a, country: String(val) }));
                      setErrors((e) => ({ ...e, country: '' }));
                    }}
                    error={errors.country}
                    required
                  />
                </View>
                <View className="flex-1">
                  <SelectInput
                    label="State"
                    options={STATE_OPTIONS}
                    value={academicState.state}
                    onSelect={(val) => {
                      setAcademicState((a) => ({ ...a, state: String(val) }));
                      setErrors((e) => ({ ...e, state: '' }));
                    }}
                    error={errors.state}
                    required
                  />
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AppTextInput
                    label="District"
                    value={academicState.district}
                    onChangeText={(val) => {
                      setAcademicState((a) => ({ ...a, district: val }));
                      setErrors((e) => ({ ...e, district: '' }));
                    }}
                    error={errors.district}
                    required
                  />
                </View>
                <View className="flex-1">
                  <AppTextInput
                    label="City / Town"
                    value={academicState.city}
                    onChangeText={(val) => {
                      setAcademicState((a) => ({ ...a, city: val }));
                      setErrors((e) => ({ ...e, city: '' }));
                    }}
                    error={errors.city}
                    required
                  />
                </View>
              </View>

              <SelectInput
                label="Course / Degree"
                options={COURSE_OPTIONS}
                value={academicState.course}
                onSelect={(val) => {
                  setAcademicState((a) => ({ ...a, course: String(val) }));
                  setErrors((e) => ({ ...e, course: '' }));
                }}
                error={errors.course}
                required
              />

              <SelectInput
                label="Branch / Specialization"
                options={BRANCH_OPTIONS}
                value={academicState.branch}
                onSelect={(val) => {
                  setAcademicState((a) => ({ ...a, branch: String(val) }));
                  setErrors((e) => ({ ...e, branch: '' }));
                }}
                error={errors.branch}
                required
              />

              <SelectInput
                label="Current Year"
                options={CURRENT_YEAR_OPTIONS}
                value={academicState.currentYear}
                onSelect={(val) => {
                  setAcademicState((a) => ({ ...a, currentYear: String(val) }));
                  setErrors((e) => ({ ...e, currentYear: '' }));
                }}
                error={errors.currentYear}
                required
              />


              <AppTextInput
                label="University / Board"
                value={academicState.university}
                onChangeText={(val) => {
                  setAcademicState((a) => ({ ...a, university: val }));
                  setErrors((e) => ({ ...e, university: '' }));
                }}
                error={errors.university}
                required
              />

              <AppTextInput
                label="College / Institute"
                value={academicState.college}
                onChangeText={(val) => {
                  setAcademicState((a) => ({ ...a, college: val }));
                  setErrors((e) => ({ ...e, college: '' }));
                }}
                error={errors.college}
                required
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AppTextInput
                    label="CGPA (out of 10.00)"
                    keyboardType="decimal-pad"
                    value={academicState.cgpa}
                    onChangeText={(val) => {
                      setAcademicState((a) => ({ ...a, cgpa: val }));
                      setErrors((e) => ({ ...e, cgpa: '' }));
                    }}
                    error={errors.cgpa}
                    required
                  />
                </View>
                <View className="flex-1">
                  <AppTextInput
                    label="Previous Marks (%)"
                    keyboardType="decimal-pad"
                    value={academicState.previousPercentage}
                    onChangeText={(val) => {
                      setAcademicState((a) => ({ ...a, previousPercentage: val }));
                      setErrors((e) => ({ ...e, previousPercentage: '' }));
                    }}
                    error={errors.previousPercentage}
                    required
                  />
                </View>
              </View>
            </View>
          )}

          {/* Tab 3: Category */}
          {activeTab === 'category' && (
            <View className="gap-3.5">
              <Text className="text-sm font-black text-slate-900 mb-1">
                Reservation & Category Details
              </Text>
              <View className="gap-2">
                {RESERVATION_CATEGORIES.map((cat) => {
                  const isSelected = preferencesState.reservationCategory === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      onPress={() => {
                        setPreferencesState((p) => ({ ...p, reservationCategory: cat.value }));
                        setErrors((e) => ({ ...e, reservationCategory: '' }));
                      }}
                      className={`p-3 rounded-xl border flex-row items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 border-primary-600'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <View>
                        <Text className={`text-xs font-bold ${isSelected ? 'text-primary-900' : 'text-slate-800'}`}>
                          {cat.label}
                        </Text>
                        <Text className="text-[10px] text-slate-500 mt-0.5">
                          {cat.description}
                        </Text>
                      </View>
                      <View className={`h-4 w-4 rounded-full border items-center justify-center ${isSelected ? 'border-primary-600 bg-primary-600' : 'border-slate-300'}`}>
                        {isSelected && <View className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-xs font-bold text-slate-700 mt-2">
                Special Categories (Multi-select)
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {SPECIAL_CATEGORIES.map((cat) => {
                  const isSelected = preferencesState.specialCategories.includes(cat.value);
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      onPress={() => handleSpecialCategoryToggle(cat.value)}
                      className={`py-2 px-3 rounded-xl border flex-row items-center gap-1.5 ${
                        isSelected
                          ? 'bg-primary-600 border-primary-600 shadow-2xs'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Text className="text-xs">{cat.icon}</Text>
                      <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppTextInput
                label="Annual Family Income (INR ₹)"
                keyboardType="numeric"
                value={preferencesState.familyIncome}
                onChangeText={(val) => {
                  setPreferencesState((p) => ({ ...p, familyIncome: val }));
                  setErrors((e) => ({ ...e, familyIncome: '' }));
                }}
                error={errors.familyIncome}
                required
              />
            </View>
          )}

          {/* Tab 4: Preferences */}
          {activeTab === 'preferences' && (
            <View className="gap-3.5">
              <Text className="text-sm font-black text-slate-900 mb-1">
                Study Location Preferences
              </Text>
              <View className="gap-2.5">
                {STUDY_PREFERENCES.map((pref) => {
                  const isSelected = preferencesState.studyPreference === pref.value;
                  return (
                    <TouchableOpacity
                      key={pref.value}
                      onPress={() => {
                        setPreferencesState((p) => ({ ...p, studyPreference: pref.value }));
                        setErrors((e) => ({ ...e, studyPreference: '' }));
                      }}
                      className={`p-3.5 rounded-2xl border flex-row items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 border-primary-600 shadow-2xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                        <Text className="text-xl">{pref.icon}</Text>
                        <View>
                          <Text className={`text-sm font-bold ${isSelected ? 'text-primary-900' : 'text-slate-800'}`}>
                            {pref.label}
                          </Text>
                          <Text className="text-xs text-slate-500">
                            {pref.description}
                          </Text>
                        </View>
                      </View>

                      <View className={`h-5 w-5 rounded-full border items-center justify-center ${isSelected ? 'border-primary-600 bg-primary-600' : 'border-slate-300'}`}>
                        {isSelected && <View className="h-2 w-2 rounded-full bg-white" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Save Action Button */}
          <View className="mt-4 pt-3 border-t border-slate-100">
            <PrimaryButton
              title="Save Changes ✓"
              size="md"
              onPress={handleSaveActiveSection}
            />
          </View>
        </Card>
      </ScreenContainer>
    </View>
  );
};

export default EditProfileScreen;
