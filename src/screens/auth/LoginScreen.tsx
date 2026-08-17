import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
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
  OutlineButton,
  TextButton,
} from '../../components/buttons';
import {
  TextInput,
  PasswordInput,
} from '../../components/inputs';
import { APP_CONFIG } from '../../constants';

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavProp>();
  const parentNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();

  // Mode: 'email' | 'mobile'
  const [loginMode, setLoginMode] = useState<'email' | 'mobile'>('email');

  // Form fields
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');

  // UI / UX states
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; mobile?: string; password?: string; general?: string }>({});
  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  // Email format validation
  const validateEmail = (val: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  // Mobile format validation (10 digits)
  const validateMobile = (val: string): boolean => {
    const cleaned = val.replace(/[\s\-\+]/g, '');
    return cleaned.length >= 10 && /^\d+$/.test(cleaned);
  };

  // Handle standard user login
  const handleSignIn = () => {
    const newErrors: { email?: string; mobile?: string; password?: string } = {};

    if (loginMode === 'email') {
      if (!email.trim()) {
        newErrors.email = 'Student email is required';
      } else if (!validateEmail(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    } else {
      if (!mobile.trim()) {
        newErrors.mobile = 'Mobile number is required';
      } else if (!validateMobile(mobile)) {
        newErrors.mobile = 'Please enter a valid 10-digit mobile number';
      }
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);
    setInfoBanner(null);

    // Mock authentication process
    setTimeout(() => {
      setIsLoading(false);
      dispatch(
        setCredentials({
          token: 'jwt-mock-session-token',
          user: {
            id: 'usr_student_01',
            email: loginMode === 'email' ? email.trim() : `${mobile.trim()}@mobile.scholarhub.edu`,
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
    }, 800);
  };

  // 1-Click Demo Login handler
  const handleDemoLogin = () => {
    setIsLoading(true);
    setErrors({});
    setInfoBanner(null);

    setTimeout(() => {
      setIsLoading(false);
      dispatch(
        setCredentials({
          token: 'jwt-demo-student-token',
          user: {
            id: 'usr_demo_student',
            email: 'alex.morgan@university.edu',
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
    }, 500);
  };

  // Google OAuth placeholder handler
  const handleGoogleSignIn = () => {
    setInfoBanner('Google Sign-In integration point ready (Frontend Prototype).');
  };

  // Forgot Password handler
  const handleForgotPassword = () => {
    const target = loginMode === 'email' ? (email.trim() || 'your registered email') : (mobile.trim() || 'your registered mobile');
    setInfoBanner(`Password recovery instructions will be sent to ${target}.`);
  };

  return (
    <ScreenContainer scrollable withSafeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* ScholarHub Brand Header */}
        <View className="items-center mt-2 mb-6">
          <View className="h-16 w-16 rounded-2xl bg-primary-600 items-center justify-center mb-3 shadow-md shadow-blue-500/20">
            <Text className="text-white text-3xl">🎓</Text>
          </View>
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Welcome to {APP_CONFIG.APP_NAME}
          </Text>
          <Text className="text-xs text-slate-500 font-medium mt-1 text-center px-4">
            Sign in to access verified scholarships and applications
          </Text>
        </View>

        {/* Informational Message Banner (e.g. Forgot Password / Google feedback) */}
        {Boolean(infoBanner) ? (
          <View className="mb-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-primary-800 flex-1 mr-2">
              ℹ️ {infoBanner}
            </Text>
            <TouchableOpacity onPress={() => setInfoBanner(null)}>
              <Text className="text-xs font-bold text-primary-600">✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Main Login Form Card */}
        <Card variant="elevated" className="mb-4 p-5">
          {/* Mode Switcher Tabs: [ Email ]  [ Mobile ] */}
          <View className="flex-row bg-slate-100 p-1 rounded-xl mb-5">
            <TouchableOpacity
              onPress={() => {
                setLoginMode('email');
                setErrors({});
              }}
              accessibilityRole="tab"
              accessibilityLabel="Sign in with Email"
              accessibilityState={{ selected: loginMode === 'email' }}
              className={`flex-1 py-2 rounded-lg items-center ${
                loginMode === 'email' ? 'bg-white shadow-sm' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  loginMode === 'email' ? 'text-primary-700' : 'text-slate-500'
                }`}
              >
                Email Address
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setLoginMode('mobile');
                setErrors({});
              }}
              accessibilityRole="tab"
              accessibilityLabel="Sign in with Mobile"
              accessibilityState={{ selected: loginMode === 'mobile' }}
              className={`flex-1 py-2 rounded-lg items-center ${
                loginMode === 'mobile' ? 'bg-white shadow-sm' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  loginMode === 'mobile' ? 'text-primary-700' : 'text-slate-500'
                }`}
              >
                Mobile Number
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email Mode Input */}
          {loginMode === 'email' ? (
            <TextInput
              label="Student Email Address"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
              required
            />
          ) : (
            /* Mobile Mode Input */
            <TextInput
              label="Mobile Number"
              placeholder="+91 XXXXX XXXXX"
              value={mobile}
              onChangeText={(text) => {
                setMobile(text);
                if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: undefined }));
              }}
              keyboardType="phone-pad"
              error={errors.mobile}
              required
            />
          )}

          {/* Password Input (Shared with visibility toggle) */}
          <PasswordInput
            label="Password"
            placeholder="Enter password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            required
          />

          {/* Forgot Password Link */}
          <View className="items-end mb-5">
            <TouchableOpacity
              onPress={handleForgotPassword}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
              activeOpacity={0.7}
            >
              <Text className="text-xs font-bold text-primary-600">
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Primary Action Button */}
          <PrimaryButton
            title="Sign In"
            fullWidth
            isLoading={isLoading}
            loadingText="Signing in..."
            onPress={handleSignIn}
          />

          {/* Divider */}
          <Divider label="OR" spacing="md" />

          {/* Google Login Placeholder Button */}
          <OutlineButton
            title="Continue with Google"
            fullWidth
            leftIcon={<Text className="text-base mr-1">🌐</Text>}
            onPress={handleGoogleSignIn}
            className="mb-3 border-slate-300 active:bg-slate-50"
            textClassName="text-slate-700 font-bold text-xs"
          />

          {/* 1-Click Demo / Development Login */}
          <SecondaryButton
            title="⚡ 1-Click Demo Student Login"
            fullWidth
            onPress={handleDemoLogin}
            textClassName="text-xs font-bold"
          />
          <Text className="text-[10px] text-slate-400 text-center mt-1.5 font-medium">
            Demo / Development Login
          </Text>
        </Card>

        {/* Sign Up Navigation Prompt */}
        <Card variant="outlined" className="items-center py-4 mb-6">
          <Text className="text-xs text-slate-500 mb-2">
            Don't have an account?
          </Text>
          <TextButton
            title="Create Account →"
            textClassName="text-sm font-bold text-primary-600"
            onPress={() => navigation.navigate('Register')}
          />
        </Card>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

export default LoginScreen;
