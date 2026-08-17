import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, RootStackParamList } from '../../types/navigation';
import { useAppDispatch } from '../../hooks';
import { setCredentials } from '../../store/slices/authSlice';
import {
  ScreenContainer,
  Card,
  Badge,
  Divider,
} from '../../components/common';
import {
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from '../../components/buttons';
import {
  TextInput,
  PasswordInput,
} from '../../components/inputs';

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavProp>();
  const parentNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('alex.morgan@university.edu');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = (isDemo = false) => {
    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsLoading(false);
      dispatch(
        setCredentials({
          token: 'jwt-token-scholarhub-student-session',
          user: {
            id: 'usr_student_01',
            email: isDemo ? 'alex.morgan@university.edu' : email,
            firstName: 'Alex',
            lastName: 'Morgan',
            name: 'Alex Morgan',
            role: 'student',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            educationLevel: 'undergraduate',
            major: 'Computer Science',
            gpa: 3.82,
            country: 'United States',
            isProfileComplete: true,
            createdAt: '2026-01-15T00:00:00Z',
            updatedAt: '2026-08-17T00:00:00Z',
          },
        })
      );
      if (parentNavigation) {
        parentNavigation.replace('Student');
      }
    }, 600);
  };

  return (
    <ScreenContainer scrollable withSafeArea>
      {/* Header Banner */}
      <View className="items-center mt-2 mb-6">
        <View className="h-16 w-16 rounded-2xl bg-primary-600 items-center justify-center mb-3 shadow-md shadow-blue-500/20">
          <Text className="text-white text-3xl">🎓</Text>
        </View>
        <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Welcome to ScholarHub
        </Text>
        <Text className="text-xs text-slate-500 font-medium mt-1 text-center">
          Sign in to access verified scholarships and applications
        </Text>
      </View>

      {/* Login Form Card */}
      <Card variant="elevated" className="mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-base font-extrabold text-slate-900">Student Sign In</Text>
          <Badge variant="primary" size="sm" label="Portal Access" />
        </View>

        {errorMessage && (
          <View className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200">
            <Text className="text-xs font-semibold text-red-700">{errorMessage}</Text>
          </View>
        )}

        <TextInput
          label="Student Email Address"
          placeholder="student@university.edu"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          required
        />

        <PasswordInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          required
        />

        <View className="items-end mb-4">
          <TouchableOpacity activeOpacity={0.7}>
            <Text className="text-xs font-bold text-primary-600">
              Forgot password?
            </Text>
          </TouchableOpacity>
        </View>

        <PrimaryButton
          title="Sign In"
          fullWidth
          isLoading={isLoading}
          loadingText="Authenticating..."
          onPress={() => handleLogin(false)}
        />

        <Divider label="OR QUICK ACCESS" spacing="md" />

        <SecondaryButton
          title="⚡ 1-Click Demo Student Login"
          fullWidth
          onPress={() => handleLogin(true)}
        />
      </Card>

      {/* Switch to Register */}
      <Card variant="outlined" className="items-center py-4">
        <Text className="text-xs text-slate-500 mb-2">
          Don't have a student account yet?
        </Text>
        <TextButton
          title="Create New Student Account →"
          textClassName="text-sm font-bold text-primary-600"
          onPress={() => navigation.navigate('Register')}
        />
      </Card>
    </ScreenContainer>
  );
};

export default LoginScreen;
