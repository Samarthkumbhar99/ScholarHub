import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  PersonalDetails,
  AcademicDetails,
  PreferencesDetails,
  ReservationCategory,
  SpecialCategory,
  StudyPreference,
} from '../../../types/registration';
import { UserProfile } from '../../../types/user';
import {
  validatePersonalDetails,
  validateAcademicDetails,
  validatePreferencesDetails,
} from '../../../utils/profileUtils';
import { PrimaryButton, OutlineButton } from '../../../components/buttons';
import {
  AppTextInput,
  DateInput,
  SelectInput,
} from '../../../components/inputs';
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
} from '../../registration/constants';

export type SectionType = 'personal' | 'academic' | 'category' | 'preferences';

interface EditSectionModalProps {
  visible: boolean;
  section: SectionType | null;
  user: UserProfile | null;
  onClose: () => void;
  onSavePersonal: (data: PersonalDetails) => void;
  onSaveAcademic: (data: AcademicDetails) => void;
  onSavePreferences: (data: PreferencesDetails) => void;
}

export const EditSectionModal: React.FC<EditSectionModalProps> = ({
  visible,
  section,
  user,
  onClose,
  onSavePersonal,
  onSaveAcademic,
  onSavePreferences,
}) => {
  // Local form states
  const [personalState, setPersonalState] = useState<PersonalDetails>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    mobile: '',
  });

  const [academicState, setAcademicState] = useState<AcademicDetails>({
    country: 'India',
    state: '',
    district: '',
    city: '',
    course: '',
    branch: '',
    currentYear: '',
    university: '',
    college: '',
    cgpa: '',
    previousPercentage: '',
  });

  const [preferencesState, setPreferencesState] = useState<PreferencesDetails>({
    reservationCategory: 'General',
    specialCategories: ['None'],
    familyIncome: '',
    studyPreference: 'India',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate initial values when section/user changes
  useEffect(() => {
    if (user && visible) {
      if (user.personal) {
        setPersonalState({ ...user.personal });
      }
      if (user.academic) {
        setAcademicState({ ...user.academic });
      }
      if (user.preferences) {
        setPreferencesState({
          reservationCategory: user.preferences.reservationCategory || 'General',
          specialCategories: user.preferences.specialCategories?.length
            ? [...user.preferences.specialCategories]
            : ['None'],
          familyIncome: user.preferences.familyIncome || '',
          studyPreference: user.preferences.studyPreference || 'India',
        });
      }
      setErrors({});
    }
  }, [user, visible, section]);

  if (!section) return null;

  const sectionTitles: Record<SectionType, { title: string; subtitle: string; icon: string }> = {
    personal: {
      title: 'Edit Personal Information',
      subtitle: 'Update your official name, contact and identity info',
      icon: '👤',
    },
    academic: {
      title: 'Edit Academic & Location',
      subtitle: 'Update course, university, CGPA and location',
      icon: '🎓',
    },
    category: {
      title: 'Edit Category & Financial',
      subtitle: 'Update reservation quota and annual family income',
      icon: '📜',
    },
    preferences: {
      title: 'Edit Study Preferences',
      subtitle: 'Update domestic and international study interests',
      icon: '🌍',
    },
  };

  const meta = sectionTitles[section];

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

  // Save validation and dispatch
  const handleSave = () => {
    if (section === 'personal') {
      const errs = validatePersonalDetails(personalState);
      if (Object.keys(errs).length > 0) {
        setErrors(errs as Record<string, string>);
        return;
      }
      onSavePersonal(personalState);
      onClose();
    } else if (section === 'academic') {
      const errs = validateAcademicDetails(academicState);
      if (Object.keys(errs).length > 0) {
        setErrors(errs as Record<string, string>);
        return;
      }
      onSaveAcademic(academicState);
      onClose();
    } else if (section === 'category' || section === 'preferences') {
      const errs = validatePreferencesDetails(preferencesState);
      if (Object.keys(errs).length > 0) {
        setErrors(errs as Record<string, string>);
        return;
      }
      onSavePreferences(preferencesState);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/60 justify-end"
      >
        <View className="bg-white rounded-t-3xl p-5 max-h-[90%] shadow-2xl border-t border-slate-200">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <View className="flex-row items-center gap-2 flex-1 mr-2">
              <View className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 items-center justify-center">
                <Text className="text-base">{meta.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-extrabold text-slate-900" numberOfLines={1}>
                  {meta.title}
                </Text>
                <Text className="text-xs text-slate-500 font-medium">
                  {meta.subtitle}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="h-8 w-8 rounded-full bg-slate-100 items-center justify-center"
              accessibilityLabel="Close edit form"
            >
              <Text className="text-sm font-bold text-slate-600">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <ScrollView showsVerticalScrollIndicator={false} className="my-2">
            {/* 1. PERSONAL INFORMATION */}
            {section === 'personal' && (
              <View className="gap-3.5">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <AppTextInput
                      label="First Name"
                      placeholder="e.g. Rahul"
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
                      placeholder="e.g. Sharma"
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
                  placeholder="Select gender"
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
                  placeholder="name@university.edu"
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
                  placeholder="10-digit phone number"
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

            {/* 2. ACADEMIC & LOCATION */}
            {section === 'academic' && (
              <View className="gap-3.5">
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
                      placeholder="e.g. Pune"
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
                      placeholder="e.g. Pune"
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
                  label="Branch / Major"
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
                  label="University / Board Name"
                  placeholder="e.g. Savitribai Phule Pune University"
                  value={academicState.university}
                  onChangeText={(val) => {
                    setAcademicState((a) => ({ ...a, university: val }));
                    setErrors((e) => ({ ...e, university: '' }));
                  }}
                  error={errors.university}
                  required
                />

                <AppTextInput
                  label="College / Institute Name"
                  placeholder="e.g. College of Engineering Pune (COEP)"
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
                      placeholder="e.g. 8.70"
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
                      placeholder="e.g. 88.5"
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

            {/* 3. CATEGORY & FINANCIAL */}
            {section === 'category' && (
              <View className="gap-3.5">
                <Text className="text-xs font-bold text-slate-700">
                  Reservation Category <Text className="text-red-500">*</Text>
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
                  placeholder="e.g. 450000"
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

            {/* 4. PREFERENCES */}
            {section === 'preferences' && (
              <View className="gap-3.5">
                <Text className="text-xs font-bold text-slate-700">
                  Study Location Preference <Text className="text-red-500">*</Text>
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
          </ScrollView>

          {/* Action Buttons */}
          <View className="pt-3 border-t border-slate-100 flex-row gap-3">
            <View className="flex-1">
              <OutlineButton
                title="Cancel"
                size="md"
                onPress={onClose}
              />
            </View>
            <View className="flex-1">
              <PrimaryButton
                title="Save Changes ✓"
                size="md"
                onPress={handleSave}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditSectionModal;
