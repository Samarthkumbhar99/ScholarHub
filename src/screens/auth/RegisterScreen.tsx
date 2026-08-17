import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { useAppDispatch } from '../../hooks';
import { setCredentials } from '../../store/slices/authSlice';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
} from '../../components/common';
import {
  PrimaryButton,
  TextButton,
} from '../../components/buttons';
import {
  TextInput,
  PasswordInput,
  SelectInput,
  SelectOption,
} from '../../components/inputs';

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterNavProp>();
  const dispatch = useAppDispatch();

  const [fullName, setFullName] = useState('Alex Morgan');
  const [email, setEmail] = useState('alex.morgan@university.edu');
  const [studentId, setStudentId] = useState('STU-2026-884');
  const [studyLevel, setStudyLevel] = useState<string | number>('undergraduate');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);

  const studyLevelOptions: SelectOption[] = [
    { label: 'High School Senior', value: 'high_school' },
    { label: 'Undergraduate (Bachelor)', value: 'undergraduate' },
    { label: 'Postgraduate (Master)', value: 'postgraduate' },
    { label: 'Doctoral / PhD Candidate', value: 'doctorate' },
  ];

  const handleRegister = () => {
    setIsLoading(true);
    const names = fullName.trim().split(' ');
    const firstName = names[0] || 'Student';
    const lastName = names.slice(1).join(' ') || '';

    setTimeout(() => {
      setIsLoading(false);
      dispatch(
        setCredentials({
          token: 'jwt-token-scholarhub-registered-session',
          user: {
            id: 'usr_student_02',
            email: email,
            firstName: firstName,
            lastName: lastName,
            name: fullName,
            role: 'student',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            educationLevel: 'undergraduate',
            major: 'Computer Science',
            gpa: 3.8,
            country: 'United States',
            isProfileComplete: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
      );
    }, 600);
  };

  return (
    <ScreenContainer scrollable withSafeArea>
      {/* Header */}
      <Header
        title="Student Registration"
        subtitle="Create your personalized scholarship profile"
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={<Badge variant="primary" size="sm" label="Step 1 of 1" />}
      />

      {/* Form Card */}
      <Card variant="elevated" className="mb-4">
        <Text className="text-sm font-bold text-slate-900 mb-3">
          Academic Profile Information
        </Text>

        <TextInput
          label="Full Legal Name"
          placeholder="e.g. Alex Morgan"
          value={fullName}
          onChangeText={setFullName}
          required
        />

        <TextInput
          label="Institutional Email"
          placeholder="student@university.edu"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          required
        />

        <TextInput
          label="Student / Roll Number"
          placeholder="e.g. STU-2026-884"
          value={studentId}
          onChangeText={setStudentId}
          required
        />

        <SelectInput
          label="Current Level of Study"
          placeholder="Select current degree level"
          value={studyLevel}
          options={studyLevelOptions}
          onSelect={(val) => setStudyLevel(val)}
          required
        />

        <PasswordInput
          label="Create Account Password"
          placeholder="Min 8 characters"
          value={password}
          onChangeText={setPassword}
          helperText="Must include uppercase, lowercase, and numeric characters."
          required
        />

        <PrimaryButton
          title="Create Student Account"
          fullWidth
          isLoading={isLoading}
          loadingText="Setting up your account..."
          onPress={handleRegister}
          className="mt-2"
        />
      </Card>

      {/* Switch to Login */}
      <Card variant="outlined" className="items-center py-4">
        <Text className="text-xs text-slate-500 mb-2">
          Already have an existing ScholarHub account?
        </Text>
        <TextButton
          title="← Back to Sign In"
          textClassName="text-sm font-bold text-primary-600"
          onPress={() => navigation.navigate('Login')}
        />
      </Card>
    </ScreenContainer>
  );
};

export default RegisterScreen;
