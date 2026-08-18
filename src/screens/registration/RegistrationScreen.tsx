import React, { useState } from 'react';
import {
  View,
  Text,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, RootStackParamList } from '../../types/navigation';
import {
  RegistrationFormState,
  RegistrationErrors,
  RegistrationStep,
  PersonalDetails,
  AcademicDetails,
  PreferencesDetails,
  UserProfile,
} from '../../types';
import { useAppDispatch } from '../../hooks';
import { setCredentials } from '../../store/slices/authSlice';
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
import { StepIndicator } from './components/StepIndicator';
import { Step1PersonalDetails } from './components/Step1PersonalDetails';
import { Step2AcademicDetails } from './components/Step2AcademicDetails';
import { Step3Preferences } from './components/Step3Preferences';

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

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
 * 3-Step Student Registration Flow:
 * Step 1: Personal & Contact Details
 * Step 2: Address & Academic Information
 * Step 3: Category & Preferences
 */
export const RegistrationScreen: React.FC = () => {
  const navigation = useNavigation<RegisterNavProp>();
  const parentNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();

  // Multi-step & Form state
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1);
  const [formState, setFormState] = useState<RegistrationFormState>(initialFormState);
  const [errors, setErrors] = useState<RegistrationErrors>(initialErrors);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Step 1: Field Updater & Error Cleaner
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

  // Step 2: Field Updater & Error Cleaner
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

  // Step 3: Field Updater & Error Cleaner
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

  // Validation: Step 1
  const validateStep1 = (): boolean => {
    const stepErrors: Partial<Record<keyof PersonalDetails, string>> = {};
    const { firstName, lastName, dateOfBirth, gender, email, mobile } = formState.personal;

    if (!firstName.trim()) {
      stepErrors.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      stepErrors.lastName = 'Last name is required';
    }
    if (!dateOfBirth.trim()) {
      stepErrors.dateOfBirth = 'Date of birth is required';
    }
    if (!gender) {
      stepErrors.gender = 'Please select your gender';
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

  // Validation: Step 2
  const validateStep2 = (): boolean => {
    const stepErrors: Partial<Record<keyof AcademicDetails, string>> = {};
    const {
      country,
      state,
      district,
      city,
      course,
      branch,
      currentYear,
      university,
      college,
      cgpa,
      previousPercentage,
    } = formState.academic;

    if (!country.trim()) stepErrors.country = 'Country is required';
    if (!state.trim()) stepErrors.state = 'State is required';
    if (!district.trim()) stepErrors.district = 'District is required';
    if (!city.trim()) stepErrors.city = 'City / Town is required';
    if (!course) stepErrors.course = 'Course / Degree is required';
    if (!branch) stepErrors.branch = 'Branch / Major specialization is required';
    if (!currentYear) stepErrors.currentYear = 'Current academic year is required';
    if (!university.trim()) stepErrors.university = 'University / Board name is required';
    if (!college.trim()) stepErrors.college = 'College / Institute name is required';

    if (!cgpa.trim()) {
      stepErrors.cgpa = 'CGPA is required';
    } else {
      const numCgpa = parseFloat(cgpa);
      if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
        stepErrors.cgpa = 'Enter valid CGPA between 0.00 and 10.00';
      }
    }

    if (!previousPercentage.trim()) {
      stepErrors.previousPercentage = 'Previous percentage is required';
    } else {
      const numPct = parseFloat(previousPercentage);
      if (isNaN(numPct) || numPct < 0 || numPct > 100) {
        stepErrors.previousPercentage = 'Enter valid percentage between 0 and 100%';
      }
    }

    setErrors((prev) => ({ ...prev, academic: stepErrors }));
    return Object.keys(stepErrors).length === 0;
  };

  // Validation: Step 3
  const validateStep3 = (): boolean => {
    const stepErrors: Partial<Record<keyof PreferencesDetails, string>> = {};
    const { reservationCategory, specialCategories, familyIncome, studyPreference } =
      formState.preferences;

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

  // Step Forward Action
  const handleNext = () => {
    Keyboard.dismiss();
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

  // Step Backward Action (Preserves form state)
  const handleBack = () => {
    Keyboard.dismiss();
    if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 1) {
      navigation.goBack();
    }
  };

  // Final Submission: Step 3 Completion -> Student Dashboard
  const handleCompleteRegistration = () => {
    Keyboard.dismiss();
    if (!validateStep3()) {
      return;
    }

    setIsSubmitting(true);

    // Mock completion and profile provisioning
    setTimeout(() => {
      setIsSubmitting(false);

      const fullName = `${formState.personal.firstName.trim()} ${formState.personal.lastName.trim()}`;
      const mockProfile: UserProfile = {
        id: `usr_student_${Date.now()}`,
        email: formState.personal.email.trim(),
        firstName: formState.personal.firstName.trim(),
        lastName: formState.personal.lastName.trim(),
        name: fullName,
        role: 'student',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        educationLevel: 'undergraduate',
        major: formState.academic.branch || 'Computer Science',
        gpa: parseFloat(formState.academic.cgpa) || 3.8,
        country: formState.academic.country || 'India',
        isProfileComplete: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Set Redux authentication session
      dispatch(
        setCredentials({
          token: 'jwt-scholarhub-registered-session-token',
          user: mockProfile,
        })
      );

      // Navigate to Student Dashboard
      if (parentNavigation) {
        parentNavigation.replace('Student');
      }
    }, 700);
  };

  return (
    <ScreenContainer scrollable withSafeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Header with back control */}
        <Header
          title="Student Registration"
          subtitle="Create your official ScholarHub profile"
          showBack
          onBackPress={handleBack}
        />

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

        {/* Navigation Action Buttons Bar */}
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
                  onPress={handleCompleteRegistration}
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
              onPress={() => navigation.navigate('Login')}
            />
          </Card>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

export default RegistrationScreen;
