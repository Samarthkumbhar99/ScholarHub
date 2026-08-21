import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentTabParamList, RootStackParamList } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  updatePersonalDetails,
  updateAcademicDetails,
  updatePreferencesDetails,
  logout,
} from '../../store/slices/authSlice';
import {
  PersonalDetails,
  AcademicDetails,
  PreferencesDetails,
} from '../../types/registration';
import {
  calculateProfileCompletion,
  formatIncomeAmount,
} from '../../utils/profileUtils';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
} from '../../components/common';
import { OutlineButton } from '../../components/buttons';
import {
  ProfileCompletionCard,
  ProfileSectionCard,
  EditSectionModal,
  SectionType,
} from './components';

type ProfileTabNavProp = BottomTabNavigationProp<StudentTabParamList, 'Profile'>;

/**
 * ProfileScreen
 * Student profile center featuring canonical user data, deterministic profile completion,
 * section-level editing, quick-access shortcuts, and settings navigation.
 */
export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileTabNavProp>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  // Active section for modal editor
  const [activeEditSection, setActiveEditSection] = useState<SectionType | null>(null);

  // Compute live deterministic completion percentage
  const completion = useMemo(() => {
    return calculateProfileCompletion(user);
  }, [user]);

  const studentDisplayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || 'Student';

  // Navigation handlers
  const handleOpenSettings = () => {
    const parentNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    if (parentNav) {
      parentNav.navigate('Settings');
    } else {
      (navigation as any).navigate('Settings');
    }
  };

  const handleOpenEditProfile = (section?: SectionType) => {
    const parentNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    if (parentNav) {
      parentNav.navigate('EditProfile', { section });
    } else {
      (navigation as any).navigate('EditProfile', { section });
    }
  };

  const handleOpenSavedScholarships = () => {
    const parentNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    if (parentNav) {
      parentNav.navigate('SavedScholarships');
    } else {
      (navigation as any).navigate('SavedScholarships');
    }
  };

  const handleOpenStudyAbroad = () => {
    const parentNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    if (parentNav) {
      parentNav.navigate('StudyAbroad');
    } else {
      (navigation as any).navigate('StudyAbroad');
    }
  };

  const handleLogout = () => {

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your ScholarHub account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            const parentNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
            if (parentNav) {
              parentNav.replace('Auth');
            } else {
              (navigation as any).replace('Auth');
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
        {/* Header */}
        <Header
          title="Student Profile"
          subtitle="Manage credentials, eligibility & account settings"
          rightAction={
            <TouchableOpacity
              onPress={handleOpenSettings}
              className="py-1.5 px-3 rounded-xl bg-slate-100 border border-slate-200 active:bg-slate-200 flex-row items-center gap-1"
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Text className="text-sm">⚙️</Text>
              <Text className="text-xs font-bold text-slate-700">Settings</Text>
            </TouchableOpacity>
          }
        />

        {/* Profile Hero Avatar Card */}
        <Card variant="elevated" className="mb-4 p-5 items-center border border-slate-200 bg-white">
          <View className="h-20 w-20 rounded-full bg-primary-600 items-center justify-center mb-3 shadow-md border-2 border-white">
            <Text className="text-white text-3xl font-black">
              {studentDisplayName.charAt(0)}
            </Text>
          </View>

          <Text className="text-lg font-black text-slate-900 text-center">
            {studentDisplayName}
          </Text>

          <Text className="text-xs text-slate-500 font-medium mt-0.5 text-center">
            {user?.email || user?.personal?.email || 'student@university.edu'}
          </Text>

          <View className="flex-row items-center gap-2 mt-2.5">
            <Badge variant="success" size="sm" showDot label="Verified Student" />
            <Badge
              variant="neutral"
              size="sm"
              label={user?.academic?.course || 'Undergraduate'}
            />
          </View>
        </Card>

        {/* Profile Completion Progress Card */}
        <ProfileCompletionCard
          completion={completion}
          onEditProfile={() => handleOpenEditProfile('personal')}
        />

        {/* Quick Access Services Hub */}
        <Card variant="outlined" className="p-3 mb-4 bg-white border-slate-200">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Quick Navigation
          </Text>
          <View className="flex-row justify-between">
            <TouchableOpacity
              onPress={handleOpenSavedScholarships}
              className="items-center justify-center p-1.5 rounded-xl active:bg-slate-50 flex-1"
            >
              <Text className="text-base mb-0.5">🔖</Text>
              <Text className="text-[9px] font-bold text-slate-700 text-center">Saved</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Applications')}
              className="items-center justify-center p-1.5 rounded-xl active:bg-slate-50 flex-1"
            >
              <Text className="text-base mb-0.5">📝</Text>
              <Text className="text-[9px] font-bold text-slate-700 text-center">Tracker</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Documents')}
              className="items-center justify-center p-1.5 rounded-xl active:bg-slate-50 flex-1"
            >
              <Text className="text-base mb-0.5">📁</Text>
              <Text className="text-[9px] font-bold text-slate-700 text-center">Docs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenStudyAbroad}
              className="items-center justify-center p-1.5 rounded-xl active:bg-slate-50 flex-1"
            >
              <Text className="text-base mb-0.5">✈️</Text>
              <Text className="text-[9px] font-bold text-primary-700 text-center">Abroad</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              className="items-center justify-center p-1.5 rounded-xl active:bg-slate-50 flex-1"
            >
              <Text className="text-base mb-0.5">🔔</Text>
              <Text className="text-[9px] font-bold text-slate-700 text-center">Alerts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenSettings}
              className="items-center justify-center p-1.5 rounded-xl active:bg-slate-50 flex-1"
            >
              <Text className="text-base mb-0.5">⚙️</Text>
              <Text className="text-[9px] font-bold text-slate-700 text-center">Settings</Text>
            </TouchableOpacity>
          </View>
        </Card>


        {/* Section 1: Personal Information */}
        <ProfileSectionCard
          title="Personal Information"
          icon="👤"
          isComplete={completion.sections.personal.completed}
          onEdit={() => setActiveEditSection('personal')}
        >
          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Full Name</Text>
            <Text className="text-xs font-bold text-slate-900">{studentDisplayName}</Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Date of Birth</Text>
            <Text className="text-xs font-bold text-slate-900">
              {user?.personal?.dateOfBirth || 'Not specified'}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Gender</Text>
            <Text className="text-xs font-bold text-slate-900">
              {user?.personal?.gender || 'Not specified'}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Email Address</Text>
            <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
              {user?.personal?.email || user?.email || 'Not specified'}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5">
            <Text className="text-xs text-slate-500 font-medium">Mobile Number</Text>
            <Text className="text-xs font-bold text-slate-900">
              {user?.personal?.mobile ? `+91 ${user.personal.mobile}` : 'Not specified'}
            </Text>
          </View>
        </ProfileSectionCard>

        {/* Section 2: Academic & Location Information */}
        <ProfileSectionCard
          title="Academic & Location Information"
          icon="🎓"
          isComplete={completion.sections.academic.completed}
          onEdit={() => setActiveEditSection('academic')}
        >
          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Course / Degree</Text>
            <Text className="text-xs font-bold text-slate-900">
              {user?.academic?.course || 'Not specified'}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Branch / Specialization</Text>
            <Text className="text-xs font-bold text-slate-900">
              {user?.academic?.branch || user?.major || 'Not specified'}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Current Academic Year</Text>
            <Text className="text-xs font-bold text-slate-900">
              {user?.academic?.currentYear || 'Not specified'}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">University / Board</Text>
            <Text className="text-xs font-bold text-slate-900 flex-1 text-right ml-4" numberOfLines={1}>
              {user?.academic?.university || 'Not specified'}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">College / Institute</Text>
            <Text className="text-xs font-bold text-slate-900 flex-1 text-right ml-4" numberOfLines={1}>
              {user?.academic?.college || 'Not specified'}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Cumulative CGPA</Text>
            <Text className="text-xs font-extrabold text-primary-700">
              {user?.academic?.cgpa ? `${user.academic.cgpa} / 10.00` : user?.gpa ? `${user.gpa} / 10.00` : 'N/A'}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Previous Percentage</Text>
            <Text className="text-xs font-extrabold text-emerald-700">
              {user?.academic?.previousPercentage ? `${user.academic.previousPercentage}%` : 'N/A'}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5">
            <Text className="text-xs text-slate-500 font-medium">Location</Text>
            <Text className="text-xs font-bold text-slate-900">
              {[user?.academic?.city, user?.academic?.state, user?.academic?.country || user?.country]
                .filter(Boolean)
                .join(', ') || 'Not specified'}
            </Text>
          </View>
        </ProfileSectionCard>

        {/* Section 3: Category & Financial Information */}
        <ProfileSectionCard
          title="Category & Financial Information"
          icon="📜"
          isComplete={completion.sections.category.completed}
          onEdit={() => setActiveEditSection('category')}
        >
          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Reservation Category</Text>
            <Badge
              variant="primary"
              size="sm"
              label={user?.preferences?.reservationCategory || 'General'}
            />
          </View>

          <View className="flex-row items-start justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium mt-1">Special Categories</Text>
            <View className="flex-row flex-wrap gap-1 justify-end max-w-[60%]">
              {user?.preferences?.specialCategories?.length ? (
                user.preferences.specialCategories.map((sc, i) => (
                  <Badge key={i} variant="neutral" size="sm" label={sc} />
                ))
              ) : (
                <Text className="text-xs font-bold text-slate-900">None</Text>
              )}
            </View>
          </View>

          <View className="flex-row items-center justify-between py-1.5">
            <Text className="text-xs text-slate-500 font-medium">Annual Family Income</Text>
            <Text className="text-xs font-extrabold text-emerald-700">
              {formatIncomeAmount(user?.preferences?.familyIncome)}
            </Text>
          </View>
        </ProfileSectionCard>

        {/* Section 4: Preferences */}
        <ProfileSectionCard
          title="Study Preferences"
          icon="🌍"
          isComplete={completion.sections.preferences.completed}
          onEdit={() => setActiveEditSection('preferences')}
        >
          <View className="flex-row items-center justify-between py-1.5">
            <Text className="text-xs text-slate-500 font-medium">Study Location</Text>
            <Badge
              variant="info"
              size="sm"
              label={
                user?.preferences?.studyPreference === 'Both'
                  ? '🌍 India & Abroad'
                  : user?.preferences?.studyPreference === 'Abroad'
                  ? '✈️ Abroad Only'
                  : '🇮🇳 India Only'
              }
            />
          </View>
        </ProfileSectionCard>

        {/* Sign Out Card */}
        <Card variant="outlined" className="p-4 items-center bg-red-50/20 border-red-200">
          <Text className="text-xs text-slate-500 mb-3">
            Sign out from this device to end your student session.
          </Text>
          <OutlineButton
            title="Sign Out of Account 🚪"
            size="md"
            className="border-red-300 bg-white active:bg-red-50"
            textClassName="text-red-600 font-bold"
            onPress={handleLogout}
          />
        </Card>
      </ScreenContainer>

      {/* Edit Section Modal */}
      <EditSectionModal
        visible={activeEditSection !== null}
        section={activeEditSection}
        user={user}
        onClose={() => setActiveEditSection(null)}
        onSavePersonal={(data: PersonalDetails) => {
          dispatch(updatePersonalDetails(data));
        }}
        onSaveAcademic={(data: AcademicDetails) => {
          dispatch(updateAcademicDetails(data));
        }}
        onSavePreferences={(data: PreferencesDetails) => {
          dispatch(updatePreferencesDetails(data));
        }}
      />
    </View>
  );
};

export default ProfileScreen;
