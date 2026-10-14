import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, RootStackParamList } from '../../types/navigation';
import { useAppDispatch } from '../../hooks';
import { loginUserThunk, setCredentials, initialDefaultProfile } from '../../store/slices/authSlice';
import {
  ScreenContainer,
  Card,
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
  const handleSignIn = async () => {
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

    const targetEmail = loginMode === 'email' ? email.trim().toLowerCase() : `${mobile.trim()}@mobile.scholarhub.edu`;

    try {
      const res = await dispatch(
        loginUserThunk({
          email: targetEmail,
          password,
        })
      ).unwrap();

      setIsLoading(false);
      if (parentNavigation) {
        const role = (res.user?.role || 'student').toLowerCase();
        if (role === 'admin') {
          parentNavigation.replace('AdminDashboard');
        } else if (role === 'provider') {
          parentNavigation.replace('ProviderDashboard');
        } else {
          parentNavigation.replace('Student');
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      const errorMsg = typeof err === 'string' ? err : err?.message || 'Login failed. Please check your credentials.';
      setErrors({ general: errorMsg });
      setInfoBanner(errorMsg);
    }
  };

  // 1-Click Demo Student Login handler
  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrors({});
    setInfoBanner(null);

    try {
      const res = await dispatch(
        loginUserThunk({
          email: 'rahul.sharma@university.edu',
          password: 'Password123!',
        })
      ).unwrap();

      setIsLoading(false);
      if (parentNavigation) {
        parentNavigation.replace('Student');
      }
    } catch {
      dispatch(
        setCredentials({
          token: 'jwt-demo-student-session-token',
          user: { ...initialDefaultProfile, role: 'student' },
        })
      );
      setIsLoading(false);
      if (parentNavigation) {
        parentNavigation.replace('Student');
      }
    }
  };

  // 1-Click Demo Provider Login handler
  const handleDemoProviderLogin = async () => {
    setIsLoading(true);
    setErrors({});
    setInfoBanner(null);

    try {
      const res = await dispatch(
        loginUserThunk({
          email: 'tata.trusts@foundation.org',
          password: 'Password123!',
        })
      ).unwrap();

      setIsLoading(false);
      if (parentNavigation) {
        parentNavigation.replace('ProviderDashboard');
      }
    } catch {
      dispatch(
        setCredentials({
          token: 'jwt-demo-provider-session-token',
          user: {
            ...initialDefaultProfile,
            id: 'usr_provider_demo_01',
            email: 'tata.trusts@foundation.org',
            name: 'Tata Trusts Foundation',
            role: 'provider',
            providerProfile: {
              id: 'prof_provider_01',
              organizationName: 'Tata Trusts Foundation',
              contactPerson: 'Aditi Deshmukh',
              website: 'https://tatatrusts.org',
              isApproved: true,
            },
          },
        })
      );
      setIsLoading(false);
      if (parentNavigation) {
        parentNavigation.replace('ProviderDashboard');
      }
    }
  };

  // 1-Click Demo Admin Login handler
  const handleDemoAdminLogin = async () => {
    setIsLoading(true);
    setErrors({});
    setInfoBanner(null);

    try {
      const res = await dispatch(
        loginUserThunk({
          email: 'admin@scholarhub.edu',
          password: 'Password123!',
        })
      ).unwrap();

      setIsLoading(false);
      if (parentNavigation) {
        parentNavigation.replace('AdminDashboard');
      }
    } catch {
      dispatch(
        setCredentials({
          token: 'jwt-demo-admin-session-token',
          user: {
            ...initialDefaultProfile,
            id: 'usr_admin_demo_01',
            email: 'admin@scholarhub.edu',
            name: 'System Administrator',
            role: 'admin',
          },
        })
      );
      setIsLoading(false);
      if (parentNavigation) {
        parentNavigation.replace('AdminDashboard');
      }
    }
  };

  // Google OAuth placeholder handler
  const handleGoogleSignIn = () => {
    setInfoBanner('Google Sign-In integration point ready.');
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

        {/* Informational Message Banner / Error Display */}
        {Boolean(infoBanner) ? (
          <View className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-amber-900 flex-1 mr-2">
              ℹ️ {infoBanner}
            </Text>
            <TouchableOpacity onPress={() => setInfoBanner(null)}>
              <Text className="text-xs font-bold text-amber-700">✕</Text>
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

          {/* 1-Click Demo / Development Logins */}
          <View className="gap-2">
            <SecondaryButton
              title="🎓 1-Click Demo Student Login"
              fullWidth
              onPress={handleDemoLogin}
              textClassName="text-xs font-bold"
            />
            <OutlineButton
              title="🏢 1-Click Demo Provider Login"
              fullWidth
              onPress={handleDemoProviderLogin}
              className="border-amber-400 bg-amber-50/50"
              textClassName="text-xs font-bold text-amber-900"
            />
            <OutlineButton
              title="🛡️ 1-Click Demo Admin Login"
              fullWidth
              onPress={handleDemoAdminLogin}
              className="border-indigo-300 bg-indigo-50/70 active:bg-indigo-100"
              textClassName="text-xs font-bold text-indigo-900"
            />
          </View>
          <Text className="text-[10px] text-slate-400 text-center mt-2 font-medium">
            Role-Based Development Shortcuts (Pre-configured)
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
