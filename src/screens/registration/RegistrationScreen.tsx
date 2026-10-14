import React, { useState } from 'react';
import {
  View,
  Text,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, RootStackParamList } from '../../types/navigation';
import {
  RegistrationFormState,
  RegistrationErrors,
  RegistrationStep,
  PersonalDetails,
  AcademicDetails,
  PreferencesDetails,
} from '../../types';
import { useAppDispatch } from '../../hooks';
import { registerUserThunk, registerProviderThunk } from '../../store/slices/authSlice';
import {
  ScreenContainer,
  Header,
  Card,
} from '../../components/common';
import {
  PrimaryButton,
  OutlineButton,
  TextButton,
} from '../../components/buttons';
import {
  TextInput,
  PasswordInput,
} from '../../components/inputs';
import { StepIndicator } from './components/StepIndicator';
import { Step1PersonalDetails } from './components/Step1PersonalDetails';
import { Step2AcademicDetails } from './components/Step2AcademicDetails';
import { Step3Preferences } from './components/Step3Preferences';

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;
type RegisterRouteProp = RouteProp<AuthStackParamList, 'Register'>;

const initialFormState: RegistrationFormState = {
  personal: {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    mobile: '',
  },
  academic: {
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
  },
  preferences: {
    reservationCategory: '',
    specialCategories: ['None'],
    familyIncome: '',
    studyPreference: '',
  },
};

const initialErrors: RegistrationErrors = {
  personal: {},
  academic: {},
  preferences: {},
};

/**
 * RegistrationScreen
 * Multi-role registration supporting:
 * 1. 3-Step Student Registration Flow
 * 2. Dedicated Provider Organization Registration Flow
 */
export const RegistrationScreen: React.FC = () => {
  const navigation = useNavigation<RegisterNavProp>();
  const route = useRoute<RegisterRouteProp>();
  const parentNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();

  // Active registration role: 'student' | 'provider'
  const [roleMode, setRoleMode] = useState<'student' | 'provider'>(
    route.params?.initialRole === 'provider' ? 'provider' : 'student'
  );

  // Student Multi-step & Form state
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1);
  const [formState, setFormState] = useState<RegistrationFormState>(initialFormState);
  const [errors, setErrors] = useState<RegistrationErrors>(initialErrors);

  // Provider Form State
  const [providerOrgName, setProviderOrgName] = useState('');
  const [providerContactPerson, setProviderContactPerson] = useState('');
  const [providerEmail, setProviderEmail] = useState('');
  const [providerPassword, setProviderPassword] = useState('');
  const [providerConfirmPassword, setProviderConfirmPassword] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [providerWebsite, setProviderWebsite] = useState('');
  const [providerDescription, setProviderDescription] = useState('');
  const [providerErrors, setProviderErrors] = useState<{
    orgName?: string;
    contactPerson?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Submission & API state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Email format validation helper
  const isValidEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr.trim());
  };

  // Mobile number validation helper (minimum 10 digits)
  const isValidMobile = (mobileStr: string): boolean => {
    const cleaned = mobileStr.replace(/[\s\-\+]/g, '');
    return cleaned.length >= 10 && /^\d+$/.test(cleaned);
  };

  // ============================================================================
  // STUDENT STEP 1: Handlers & Validation
  // ============================================================================
  const updatePersonal = <K extends keyof PersonalDetails>(
    field: K,
    value: PersonalDetails[K]
  ) => {
    setFormState((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: value },
    }));
  };

  const clearPersonalError = (field: keyof PersonalDetails) => {
    setErrors((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: undefined },
    }));
  };

  const validateStep1 = (): boolean => {
    const { firstName, lastName, dateOfBirth, gender, email, mobile } = formState.personal;
    const stepErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      stepErrors.firstName = 'First name is required';
    } else if (firstName.trim().length < 2) {
      stepErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!lastName.trim()) {
      stepErrors.lastName = 'Last name is required';
    } else if (lastName.trim().length < 2) {
      stepErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (!dateOfBirth) {
      stepErrors.dateOfBirth = 'Date of birth is required';
    }

    if (!gender) {
      stepErrors.gender = 'Gender is required';
    }

    if (!email.trim()) {
      stepErrors.email = 'Email address is required';
    } else if (!isValidEmail(email)) {
      stepErrors.email = 'Please enter a valid email address';
    }

    if (!mobile.trim()) {
      stepErrors.mobile = 'Mobile number is required';
    } else if (!isValidMobile(mobile)) {
      stepErrors.mobile = 'Please enter a valid 10-digit mobile number';
    }

    setErrors((prev) => ({ ...prev, personal: stepErrors }));
    return Object.keys(stepErrors).length === 0;
  };

  // ============================================================================
  // STUDENT STEP 2: Handlers & Validation
  // ============================================================================
  const updateAcademic = <K extends keyof AcademicDetails>(
    field: K,
    value: AcademicDetails[K]
  ) => {
    setFormState((prev) => ({
      ...prev,
      academic: { ...prev.academic, [field]: value },
    }));
  };

  const clearAcademicError = (field: keyof AcademicDetails) => {
    setErrors((prev) => ({
      ...prev,
      academic: { ...prev.academic, [field]: undefined },
    }));
  };

  const validateStep2 = (): boolean => {
    const { country, state, district, city, course, branch, currentYear, university, college, cgpa, previousPercentage } = formState.academic;
    const stepErrors: Record<string, string> = {};

    if (!country.trim()) stepErrors.country = 'Country is required';
    if (!state.trim()) stepErrors.state = 'State is required';
    if (!district.trim()) stepErrors.district = 'District is required';
    if (!city.trim()) stepErrors.city = 'City is required';
    if (!course.trim()) stepErrors.course = 'Degree/Course is required';
    if (!branch.trim()) stepErrors.branch = 'Branch/Major is required';
    if (!currentYear.trim()) stepErrors.currentYear = 'Current academic year is required';
    if (!university.trim()) stepErrors.university = 'University name is required';
    if (!college.trim()) stepErrors.college = 'College/Institute name is required';

    if (!cgpa.trim()) {
      stepErrors.cgpa = 'CGPA is required';
    } else {
      const numCgpa = parseFloat(cgpa);
      if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
        stepErrors.cgpa = 'CGPA must be a valid number between 0.0 and 10.0';
      }
    }

    if (!previousPercentage.trim()) {
      stepErrors.previousPercentage = 'Percentage is required';
    } else {
      const numPct = parseFloat(previousPercentage);
      if (isNaN(numPct) || numPct < 0 || numPct > 100) {
        stepErrors.previousPercentage = 'Percentage must be between 0.0% and 100.0%';
      }
    }

    setErrors((prev) => ({ ...prev, academic: stepErrors }));
    return Object.keys(stepErrors).length === 0;
  };

  // ============================================================================
  // STUDENT STEP 3: Handlers & Validation
  // ============================================================================
  const updatePreferences = <K extends keyof PreferencesDetails>(
    field: K,
    value: PreferencesDetails[K]
  ) => {
    setFormState((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, [field]: value },
    }));
  };

  const clearPreferencesError = (field: keyof PreferencesDetails) => {
    setErrors((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, [field]: undefined },
    }));
  };

  const validateStep3 = (): boolean => {
    const { reservationCategory, specialCategories, familyIncome, studyPreference } = formState.preferences;
    const stepErrors: Record<string, string> = {};

    if (!reservationCategory) {
      stepErrors.reservationCategory = 'Reservation category is required';
    }
    if (!specialCategories || specialCategories.length === 0) {
      stepErrors.specialCategories = "Please select at least one option or 'None'";
    }
    if (!familyIncome.trim()) {
      stepErrors.familyIncome = 'Annual family income is required';
    } else {
      const numIncome = parseFloat(familyIncome.replace(/,/g, ''));
      if (isNaN(numIncome) || numIncome < 0) {
        stepErrors.familyIncome = 'Please enter a valid numeric income amount';
      }
    }
    if (!studyPreference) {
      stepErrors.studyPreference = 'Please select your study preference';
    }

    setErrors((prev) => ({ ...prev, preferences: stepErrors }));
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    Keyboard.dismiss();
    setApiError(null);
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    setApiError(null);
    if (roleMode === 'provider') {
      navigation.goBack();
      return;
    }
    if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 1) {
      navigation.goBack();
    }
  };

  // Final Submission: Student
  const handleCompleteStudentRegistration = async () => {
    Keyboard.dismiss();
    setApiError(null);
    if (!validateStep3()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const registrationPassword = 'Password@123';
      await dispatch(
        registerUserThunk({
          email: formState.personal.email.trim(),
          password: registrationPassword,
          personal: formState.personal,
          academic: formState.academic,
          preferences: formState.preferences,
        })
      ).unwrap();

      setIsSubmitting(false);
      if (parentNavigation) {
        parentNavigation.replace('Student');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setApiError(
        typeof err === 'string' ? err : err?.message || 'Registration failed. Please try again.'
      );
    }
  };

  // ============================================================================
  // PROVIDER REGISTRATION: Handlers & Validation
  // ============================================================================
  const validateProviderForm = (): boolean => {
    const errs: typeof providerErrors = {};

    if (!providerOrgName.trim()) {
      errs.orgName = 'Organization / Foundation name is required';
    } else if (providerOrgName.trim().length < 2) {
      errs.orgName = 'Organization name must be at least 2 characters';
    }

    if (!providerContactPerson.trim()) {
      errs.contactPerson = 'Primary contact person name is required';
    }

    if (!providerEmail.trim()) {
      errs.email = 'Official organization email is required';
    } else if (!isValidEmail(providerEmail)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!providerPassword) {
      errs.password = 'Password is required';
    } else if (providerPassword.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    if (!providerConfirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (providerConfirmPassword !== providerPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setProviderErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProviderRegister = async () => {
    Keyboard.dismiss();
    setApiError(null);
    if (!validateProviderForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(
        registerProviderThunk({
          email: providerEmail.trim().toLowerCase(),
          password: providerPassword,
          organization_name: providerOrgName.trim(),
          contact_person: providerContactPerson.trim(),
          phone: providerPhone.trim() || undefined,
          website: providerWebsite.trim() || undefined,
          description: providerDescription.trim() || undefined,
        })
      ).unwrap();

      setIsSubmitting(false);
      if (parentNavigation) {
        parentNavigation.replace('ProviderDashboard');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setApiError(
        typeof err === 'string'
          ? err
          : err?.message || 'Provider registration failed. Please check your details and try again.'
      );
    }
  };

  return (
    <ScreenContainer scrollable withSafeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Header with back control */}
        <Header
          title={roleMode === 'student' ? 'Student Registration' : 'Provider Registration'}
          subtitle={
            roleMode === 'student'
              ? 'Create your official ScholarHub profile'
              : 'Register your organization to publish and manage scholarships'
          }
          showBack
          onBackPress={handleBack}
        />

        {/* Visible Role Switcher Tabs */}
        <View className="flex-row bg-slate-200/80 p-1 rounded-2xl mb-5">
          <TouchableOpacity
            onPress={() => {
              setRoleMode('student');
              setApiError(null);
            }}
            accessibilityRole="tab"
            accessibilityLabel="Register as Student"
            accessibilityState={{ selected: roleMode === 'student' }}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
              roleMode === 'student' ? 'bg-white shadow-sm' : 'bg-transparent'
            }`}
          >
            <Text className="mr-1.5 text-sm">🎓</Text>
            <Text
              className={`text-xs font-bold ${
                roleMode === 'student' ? 'text-primary-700' : 'text-slate-600'
              }`}
            >
              Student Account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setRoleMode('provider');
              setApiError(null);
            }}
            accessibilityRole="tab"
            accessibilityLabel="Register as Provider"
            accessibilityState={{ selected: roleMode === 'provider' }}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
              roleMode === 'provider' ? 'bg-white shadow-sm' : 'bg-transparent'
            }`}
          >
            <Text className="mr-1.5 text-sm">🏢</Text>
            <Text
              className={`text-xs font-bold ${
                roleMode === 'provider' ? 'text-amber-800' : 'text-slate-600'
              }`}
            >
              Provider Organization
            </Text>
          </TouchableOpacity>
        </View>

        {/* API Error Banner */}
        {apiError && (
          <View className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex-row items-center justify-between">
            <Text className="text-xs text-red-600 font-semibold flex-1 mr-2">
              ⚠️ {apiError}
            </Text>
            <TouchableOpacity onPress={() => setApiError(null)}>
              <Text className="text-xs font-bold text-red-400">✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================================================================= */}
        {/* STUDENT REGISTRATION VIEW                                         */}
        {/* ================================================================= */}
        {roleMode === 'student' && (
          <>
            {/* Direct Link to Provider Option */}
            {currentStep === 1 && (
              <TouchableOpacity
                onPress={() => {
                  setRoleMode('provider');
                  setApiError(null);
                }}
                className="mb-4 p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <Text className="text-base mr-2">🏢</Text>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-amber-900">
                      Are you a Scholarship Provider?
                    </Text>
                    <Text className="text-[11px] text-amber-700 mt-0.5">
                      Foundations, trusts & universities can register to publish awards.
                    </Text>
                  </View>
                </View>
                <Text className="text-xs font-bold text-amber-800">
                  Register as Provider →
                </Text>
              </TouchableOpacity>
            )}

            {/* Multi-step progress indicator */}
            <StepIndicator currentStep={currentStep} />

            {/* Step-Specific Form View */}
            {currentStep === 1 && (
              <Step1PersonalDetails
                data={formState.personal}
                errors={errors.personal}
                onChange={updatePersonal}
                onClearError={clearPersonalError}
              />
            )}

            {currentStep === 2 && (
              <Step2AcademicDetails
                data={formState.academic}
                errors={errors.academic}
                onChange={updateAcademic}
                onClearError={clearAcademicError}
              />
            )}

            {currentStep === 3 && (
              <Step3Preferences
                data={formState.preferences}
                errors={errors.preferences}
                onChange={updatePreferences}
                onClearError={clearPreferencesError}
              />
            )}

            {/* Student Navigation Action Buttons Bar */}
            <View className="mt-2 mb-6">
              {currentStep === 1 && (
                <PrimaryButton
                  title="Next: Address & Academic →"
                  fullWidth
                  size="lg"
                  onPress={handleNext}
                />
              )}

              {currentStep === 2 && (
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <OutlineButton
                      title="← Back"
                      size="lg"
                      onPress={handleBack}
                    />
                  </View>
                  <View className="flex-1">
                    <PrimaryButton
                      title="Next: Preferences →"
                      size="lg"
                      onPress={handleNext}
                    />
                  </View>
                </View>
              )}

              {currentStep === 3 && (
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <OutlineButton
                      title="← Back"
                      size="lg"
                      disabled={isSubmitting}
                      onPress={handleBack}
                    />
                  </View>
                  <View className="flex-1">
                    <PrimaryButton
                      title="Complete Registration 🎓"
                      size="lg"
                      isLoading={isSubmitting}
                      loadingText="Setting up profile..."
                      onPress={handleCompleteStudentRegistration}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Switch to Sign In Prompt (Shown on Step 1) */}
            {currentStep === 1 && (
              <Card variant="outlined" className="items-center py-4 mb-6">
                <Text className="text-xs text-slate-500 mb-2">
                  Already have an existing ScholarHub account?
                </Text>
                <TextButton
                  title="← Back to Sign In"
                  textClassName="text-sm font-bold text-primary-600"
                  onPress={() => navigation.navigate('Login', { initialRole: 'student' })}
                />
              </Card>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* PROVIDER ORGANIZATION REGISTRATION VIEW                           */}
        {/* ================================================================= */}
        {roleMode === 'provider' && (
          <>
            <Card variant="elevated" className="p-5 mb-5">
              <View className="mb-4 pb-3 border-b border-slate-100">
                <View className="flex-row items-center mb-1">
                  <View className="h-8 w-8 rounded-lg bg-amber-100 items-center justify-center mr-2">
                    <Text className="text-base">🏢</Text>
                  </View>
                  <Text className="text-lg font-extrabold text-slate-900">
                    Organization Details
                  </Text>
                </View>
                <Text className="text-xs text-slate-500">
                  Register as a scholarship provider to list programs, define eligibility criteria, and manage student applications.
                </Text>
              </View>

              {/* Organization Name */}
              <TextInput
                label="Organization / Foundation Name"
                placeholder="e.g. Azim Premji Foundation, Tata Trusts"
                value={providerOrgName}
                onChangeText={(text) => {
                  setProviderOrgName(text);
                  if (providerErrors.orgName) {
                    setProviderErrors((prev) => ({ ...prev, orgName: undefined }));
                  }
                }}
                error={providerErrors.orgName}
                required
              />

              {/* Contact Person Name */}
              <TextInput
                label="Primary Contact Person Name"
                placeholder="e.g. Dr. Ramesh Patil"
                value={providerContactPerson}
                onChangeText={(text) => {
                  setProviderContactPerson(text);
                  if (providerErrors.contactPerson) {
                    setProviderErrors((prev) => ({ ...prev, contactPerson: undefined }));
                  }
                }}
                error={providerContactPerson ? undefined : providerErrors.contactPerson}
                required
              />

              {/* Official Email */}
              <TextInput
                label="Official Organization Email"
                placeholder="contact@foundation.org"
                value={providerEmail}
                onChangeText={(text) => {
                  setProviderEmail(text);
                  if (providerErrors.email) {
                    setProviderErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={providerErrors.email}
                required
                helperText="Used for provider portal login and application communications"
              />

              {/* Password */}
              <PasswordInput
                label="Account Password"
                placeholder="Minimum 8 characters"
                value={providerPassword}
                onChangeText={(text) => {
                  setProviderPassword(text);
                  if (providerErrors.password) {
                    setProviderErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                error={providerErrors.password}
                required
              />

              {/* Confirm Password */}
              <PasswordInput
                label="Confirm Password"
                placeholder="Re-enter password"
                value={providerConfirmPassword}
                onChangeText={(text) => {
                  setProviderConfirmPassword(text);
                  if (providerErrors.confirmPassword) {
                    setProviderErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                error={providerErrors.confirmPassword}
                required
              />

              {/* Official Phone Number */}
              <TextInput
                label="Official Phone / Contact Number"
                placeholder="+91 22 1234 5678"
                value={providerPhone}
                onChangeText={setProviderPhone}
                keyboardType="phone-pad"
                helperText="Optional official contact number"
              />

              {/* Official Website URL */}
              <TextInput
                label="Official Website URL"
                placeholder="https://foundation.org"
                value={providerWebsite}
                onChangeText={setProviderWebsite}
                autoCapitalize="none"
                keyboardType="url"
                helperText="Optional public portal or foundation link"
              />

              {/* Description / Mission */}
              <TextInput
                label="Organization Mission / Background"
                placeholder="Brief description of your organization and scholarship programs..."
                value={providerDescription}
                onChangeText={setProviderDescription}
                multiline
                numberOfLines={3}
                helperText="Optional background info displayed on published listings"
              />

              {/* Security & Verification Notice */}
              <View className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                <Text className="text-[11px] text-slate-600 leading-relaxed">
                  🛡️ <Text className="font-bold text-slate-800">Editorial Safeguard:</Text> Provider accounts submit scholarships for review. Newly listed scholarships enter pending moderation before public student discovery.
                </Text>
              </View>

              {/* Register Action Button */}
              <PrimaryButton
                title="Register Provider Organization 🏢"
                fullWidth
                size="lg"
                isLoading={isSubmitting}
                loadingText="Registering provider organization..."
                onPress={handleProviderRegister}
              />
            </Card>

            {/* Back to Sign In Option */}
            <Card variant="outlined" className="items-center py-4 mb-6">
              <Text className="text-xs text-slate-500 mb-2">
                Already registered as a Scholarship Provider?
              </Text>
              <TextButton
                title="← Back to Provider Sign In"
                textClassName="text-sm font-bold text-amber-800"
                onPress={() => navigation.navigate('Login', { initialRole: 'provider' })}
              />
            </Card>
          </>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

export default RegistrationScreen;
