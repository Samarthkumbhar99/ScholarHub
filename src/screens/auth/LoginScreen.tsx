import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, RootStackParamList } from '../../types/navigation';
import { useAppDispatch } from '../../hooks';
import { loginUserThunk, logout } from '../../store/slices/authSlice';
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
import { authService } from '../../services/authService';
import { showMessageDialog } from '../../utils';

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
type LoginRouteProp = RouteProp<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavProp>();
  const route = useRoute<LoginRouteProp>();
  const parentNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();

  // Helper for guaranteed portal navigation
  const navigateToPortal = (targetScreen: 'Student' | 'ProviderDashboard' | 'AdminDashboard') => {
    if (parentNavigation) {
      try {
        parentNavigation.reset({
          index: 0,
          routes: [{ name: targetScreen }],
        });
      } catch {
        try {
          parentNavigation.replace(targetScreen);
        } catch {
          parentNavigation.navigate(targetScreen as any);
        }
      }
    } else {
      navigation.navigate(targetScreen as any);
    }
  };

  // Active Role Portal Tab: 'student' | 'provider' | 'admin'
  const [activeRole, setActiveRole] = useState<'student' | 'provider' | 'admin'>(
    route.params?.initialRole || 'student'
  );

  // Student Mode: 'email' | 'mobile'
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

  // Switch role portal
  const handleRoleTabChange = (role: 'student' | 'provider' | 'admin') => {
    setActiveRole(role);
    setErrors({});
    setInfoBanner(null);
  };

  // Handle Role-Aware Sign In
  const handleSignIn = async () => {
    const newErrors: { email?: string; mobile?: string; password?: string } = {};

    let targetEmail = '';

    if (activeRole === 'student') {
      if (loginMode === 'email') {
        if (!email.trim()) {
          newErrors.email = 'Student email is required';
        } else if (!validateEmail(email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        targetEmail = email.trim().toLowerCase();
      } else {
        if (!mobile.trim()) {
          newErrors.mobile = 'Mobile number is required';
        } else if (!validateMobile(mobile)) {
          newErrors.mobile = 'Please enter a valid 10-digit mobile number';
        }
        targetEmail = `${mobile.trim()}@mobile.scholarhub.edu`;
      }
    } else if (activeRole === 'provider') {
      if (!email.trim()) {
        newErrors.email = 'Organization contact email is required';
      } else if (!validateEmail(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      targetEmail = email.trim().toLowerCase();
    } else if (activeRole === 'admin') {
      if (!email.trim()) {
        newErrors.email = 'Administrator email is required';
      } else if (!validateEmail(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      targetEmail = email.trim().toLowerCase();
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

    try {
      const res = await dispatch(
        loginUserThunk({
          email: targetEmail,
          password,
        })
      ).unwrap();

      setIsLoading(false);

      const userRole = (res.user?.role || 'student').toLowerCase();

      // STRICT ADMIN CHECK: If attempting Admin portal login, user must genuinely have ADMIN role
      if (activeRole === 'admin') {
        if (userRole !== 'admin') {
          // Immediately revoke session
          dispatch(logout());
          const denialMsg =
            'Access Denied: This account does not possess Administrator privileges. Only authorized administrators may log in to this portal.';
          setErrors({ general: denialMsg });
          setInfoBanner(denialMsg);
          return;
        }
      }

      // Check Provider Pending Approval Status
      if (userRole === 'provider' && res.user?.providerProfile && !res.user.providerProfile.isApproved) {
        setInfoBanner('Notice: Your provider account is currently pending administrator verification.');
      }

      // Role-Aware Redirection
      if (userRole === 'admin') {
        navigateToPortal('AdminDashboard');
      } else if (userRole === 'provider') {
        navigateToPortal('ProviderDashboard');
      } else {
        navigateToPortal('Student');
      }
    } catch (err: any) {
      setIsLoading(false);
      const errorMsg =
        typeof err === 'string' ? err : err?.message || 'Login failed. Please check your credentials.';
      setErrors({ general: errorMsg });
      setInfoBanner(errorMsg);
    }
  };

  // 1-Click Demo Student Login
  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrors({});
    setInfoBanner(null);

    try {
      await dispatch(
        loginUserThunk({
          email: 'rahul.sharma@university.edu',
          password: 'Password123!',
        })
      ).unwrap();

      setIsLoading(false);
      navigateToPortal('Student');
    } catch {
      // Auto-fallback: If account was missing, automatically register and login
      try {
        await authService.register({
          email: 'rahul.sharma@university.edu',
          password: 'Password123!',
        });
        await dispatch(
          loginUserThunk({
            email: 'rahul.sharma@university.edu',
            password: 'Password123!',
          })
        ).unwrap();

        setIsLoading(false);
        navigateToPortal('Student');
      } catch (fallbackErr: any) {
        setIsLoading(false);
        showMessageDialog(
          'Student Demo Login Notice',
          fallbackErr?.message || 'Unable to sign in to demo student account. Please check backend connection.'
        );
      }
    }
  };

  // 1-Click Demo Provider Login
  const handleDemoProviderLogin = async () => {
    setIsLoading(true);
    setErrors({});
    setInfoBanner(null);

    try {
      await dispatch(
        loginUserThunk({
          email: 'tata.trusts@foundation.org',
          password: 'Password123!',
        })
      ).unwrap();

      setIsLoading(false);
      navigateToPortal('ProviderDashboard');
    } catch {
      // Auto-fallback: If provider account was missing, automatically register and login
      try {
        await authService.registerProvider({
          email: 'tata.trusts@foundation.org',
          password: 'Password123!',
          organization_name: 'Tata Trusts',
          contact_person: 'Dr. Ratan Tata',
          phone: '+91-22-6665-8282',
          website: 'https://www.tatatrusts.org',
          description: 'Supporting underprivileged and meritorious students across India.',
        });
        await dispatch(
          loginUserThunk({
            email: 'tata.trusts@foundation.org',
            password: 'Password123!',
          })
        ).unwrap();

        setIsLoading(false);
        navigateToPortal('ProviderDashboard');
      } catch (fallbackErr: any) {
        setIsLoading(false);
        showMessageDialog(
          'Provider Demo Login Notice',
          fallbackErr?.message || 'Unable to sign in to demo provider account. Please check backend connection.'
        );
      }
    }
  };

  // 1-Click Demo Admin Login
  const handleDemoAdminLogin = async () => {
    setIsLoading(true);
    setErrors({});
    setInfoBanner(null);

    // Try standard admin demo account first
    try {
      const res = await dispatch(
        loginUserThunk({
          email: 'admin@scholarhub.edu',
          password: 'Password123!',
        })
      ).unwrap();

      setIsLoading(false);
      if (res.user?.role !== 'admin') {
        dispatch(logout());
        showMessageDialog('Access Denied', 'The account does not possess the ADMIN role.');
        return;
      }
      navigateToPortal('AdminDashboard');
      return;
    } catch {
      // Fallback: Try provisioned administrator account samarth081112@gmail.com
      try {
        const res = await dispatch(
          loginUserThunk({
            email: 'samarth081112@gmail.com',
            password: 'htramas01',
          })
        ).unwrap();

        setIsLoading(false);
        if (res.user?.role !== 'admin') {
          dispatch(logout());
          showMessageDialog('Access Denied', 'The account does not possess the ADMIN role.');
          return;
        }
        navigateToPortal('AdminDashboard');
        return;
      } catch {
        setIsLoading(false);
        showMessageDialog(
          'Admin Account Provisioning Required',
          'No demo admin account was found in the database.\n\nTo provision an admin safely, run the CLI tool in backend:\npython -m app.cli.admin_tool create --email admin@scholarhub.edu --password Password123!'
        );
      }
    }
  };

  // Google OAuth placeholder handler
  const handleGoogleSignIn = () => {
    setInfoBanner('Google Sign-In integration point ready.');
  };

  // Forgot Password handler
  const handleForgotPassword = () => {
    const target =
      activeRole === 'student'
        ? loginMode === 'email'
          ? email.trim() || 'your registered email'
          : mobile.trim() || 'your registered mobile'
        : email.trim() || 'your registered email';
    setInfoBanner(`Password recovery instructions will be sent to ${target}.`);
  };

  return (
    <ScreenContainer scrollable withSafeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* ScholarHub Brand Header */}
        <View className="items-center mt-2 mb-4">
          <View className="h-16 w-16 rounded-2xl bg-primary-600 items-center justify-center mb-2 shadow-md shadow-blue-500/20">
            <Text className="text-white text-3xl">🎓</Text>
          </View>
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {APP_CONFIG.APP_NAME}
          </Text>
          <Text className="text-xs text-slate-500 font-medium mt-0.5 text-center px-4">
            Unified scholarship discovery, provider listings & verification portal
          </Text>
        </View>

        {/* Dedicated 3-Role Authentication Switcher Tabs */}
        <View className="flex-row bg-slate-200/90 p-1 rounded-2xl mb-4">
          <TouchableOpacity
            onPress={() => handleRoleTabChange('student')}
            accessibilityRole="tab"
            accessibilityLabel="Student Login Portal"
            accessibilityState={{ selected: activeRole === 'student' }}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
              activeRole === 'student' ? 'bg-white shadow-sm' : 'bg-transparent'
            }`}
          >
            <Text className="mr-1.5 text-sm">🎓</Text>
            <Text
              className={`text-xs font-bold ${
                activeRole === 'student' ? 'text-primary-700' : 'text-slate-600'
              }`}
            >
              Student
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleRoleTabChange('provider')}
            accessibilityRole="tab"
            accessibilityLabel="Provider Login Portal"
            accessibilityState={{ selected: activeRole === 'provider' }}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
              activeRole === 'provider' ? 'bg-white shadow-sm' : 'bg-transparent'
            }`}
          >
            <Text className="mr-1.5 text-sm">🏢</Text>
            <Text
              className={`text-xs font-bold ${
                activeRole === 'provider' ? 'text-amber-800' : 'text-slate-600'
              }`}
            >
              Provider
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleRoleTabChange('admin')}
            accessibilityRole="tab"
            accessibilityLabel="Admin Login Portal"
            accessibilityState={{ selected: activeRole === 'admin' }}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
              activeRole === 'admin' ? 'bg-white shadow-sm' : 'bg-transparent'
            }`}
          >
            <Text className="mr-1.5 text-sm">🛡️</Text>
            <Text
              className={`text-xs font-bold ${
                activeRole === 'admin' ? 'text-indigo-800' : 'text-slate-600'
              }`}
            >
              Admin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Informational Message Banner / Error Display */}
        {Boolean(infoBanner) && (
          <View className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-amber-900 flex-1 mr-2">
              ℹ️ {infoBanner}
            </Text>
            <TouchableOpacity onPress={() => setInfoBanner(null)}>
              <Text className="text-xs font-bold text-amber-700">✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* General Error Alert */}
        {Boolean(errors.general) && (
          <View className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-red-700 flex-1 mr-2">
              ⚠️ {errors.general}
            </Text>
            <TouchableOpacity onPress={() => setErrors((prev) => ({ ...prev, general: undefined }))}>
              <Text className="text-xs font-bold text-red-400">✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================================================================= */}
        {/* 1. STUDENT LOGIN FORM CARD                                        */}
        {/* ================================================================= */}
        {activeRole === 'student' && (
          <Card variant="elevated" className="mb-4 p-5">
            <View className="mb-4 pb-2 border-b border-slate-100 flex-row items-center justify-between">
              <View>
                <Text className="text-base font-extrabold text-slate-900">Student Sign In</Text>
                <Text className="text-xs text-slate-500">Access scholarships & applications</Text>
              </View>
              <Text className="text-2xl">🎓</Text>
            </View>

            {/* Email / Mobile Switcher Tabs */}
            <View className="flex-row bg-slate-100 p-1 rounded-xl mb-4">
              <TouchableOpacity
                onPress={() => {
                  setLoginMode('email');
                  setErrors({});
                }}
                className={`flex-1 py-1.5 rounded-lg items-center ${
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
                className={`flex-1 py-1.5 rounded-lg items-center ${
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

            {loginMode === 'email' ? (
              <TextInput
                label="Student Email Address"
                placeholder="student@university.edu"
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
              <TextInput
                label="Mobile Number"
                placeholder="+91 98765 43210"
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

            <View className="items-end mb-4">
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text className="text-xs font-bold text-primary-600">Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <PrimaryButton
              title="Sign In as Student"
              fullWidth
              isLoading={isLoading}
              loadingText="Signing in..."
              onPress={handleSignIn}
            />

            <Divider label="OR" spacing="md" />

            <OutlineButton
              title="Continue with Google"
              fullWidth
              leftIcon={<Text className="text-base mr-1">🌐</Text>}
              onPress={handleGoogleSignIn}
              className="mb-3 border-slate-300 active:bg-slate-50"
              textClassName="text-slate-700 font-bold text-xs"
            />

            {/* Provider Registration Cross-Link Card */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Register', { initialRole: 'provider' })}
              className="mt-1 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <Text className="text-base mr-2">🏢</Text>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-amber-900">Are you a Scholarship Provider?</Text>
                  <Text className="text-[11px] text-amber-700">Register an organization to publish listings</Text>
                </View>
              </View>
              <Text className="text-xs font-bold text-amber-800">Register →</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* ================================================================= */}
        {/* 2. PROVIDER LOGIN FORM CARD                                       */}
        {/* ================================================================= */}
        {activeRole === 'provider' && (
          <Card variant="elevated" className="mb-4 p-5 border-amber-200">
            <View className="mb-4 pb-2 border-b border-slate-100 flex-row items-center justify-between">
              <View>
                <Text className="text-base font-extrabold text-slate-900">
                  Scholarship Provider Sign In
                </Text>
                <Text className="text-xs text-slate-500">
                  Publish scholarships and manage applicants
                </Text>
              </View>
              <View className="h-9 w-9 rounded-xl bg-amber-100 items-center justify-center">
                <Text className="text-xl">🏢</Text>
              </View>
            </View>

            <TextInput
              label="Organization Contact Email"
              placeholder="contact@foundation.org"
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

            <PasswordInput
              label="Provider Account Password"
              placeholder="Enter provider password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              required
            />

            <View className="items-end mb-4">
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text className="text-xs font-bold text-amber-800">Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <PrimaryButton
              title="Sign In as Provider 🏢"
              fullWidth
              isLoading={isLoading}
              loadingText="Authenticating provider..."
              onPress={handleSignIn}
              className="bg-amber-600 active:bg-amber-700"
            />

            <Divider label="NEW PROVIDER?" spacing="md" />

            {/* Prominent "Register as Provider" Option */}
            <Card variant="outlined" className="p-4 bg-amber-50/50 border-amber-200 items-center">
              <Text className="text-xs font-bold text-slate-800 mb-1 text-center">
                Need a Provider Account for your Organization?
              </Text>
              <Text className="text-[11px] text-slate-500 text-center mb-3">
                Foundations, universities, and trusts can register to list scholarships and review candidate eligibility.
              </Text>
              <OutlineButton
                title="Register as Provider 🏢"
                fullWidth
                onPress={() => navigation.navigate('Register', { initialRole: 'provider' })}
                className="border-amber-500 bg-white"
                textClassName="text-amber-900 font-bold text-xs"
              />
            </Card>
          </Card>
        )}

        {/* ================================================================= */}
        {/* 3. ADMIN LOGIN FORM CARD                                          */}
        {/* ================================================================= */}
        {activeRole === 'admin' && (
          <Card variant="elevated" className="mb-4 p-5 border-indigo-200">
            <View className="mb-3 pb-2 border-b border-slate-100 flex-row items-center justify-between">
              <View>
                <Text className="text-base font-extrabold text-slate-900">
                  Administrator Portal
                </Text>
                <Text className="text-xs text-slate-500">
                  Scholarship moderation, reviews & audit logs
                </Text>
              </View>
              <View className="h-9 w-9 rounded-xl bg-indigo-100 items-center justify-center">
                <Text className="text-xl">🛡️</Text>
              </View>
            </View>

            {/* Security Notice: No Public Admin Registration */}
            <View className="mb-4 p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl">
              <Text className="text-[11px] text-indigo-950 font-medium leading-relaxed">
                🔒 <Text className="font-bold">Restricted Access:</Text> Admin accounts require verified ADMIN privileges. Public self-registration for administrator access is prohibited.
              </Text>
            </View>

            <TextInput
              label="Administrator Email"
              placeholder="admin@scholarhub.edu"
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

            <PasswordInput
              label="Administrator Password"
              placeholder="Enter admin password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              required
            />

            <View className="items-end mb-4">
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text className="text-xs font-bold text-indigo-800">Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <PrimaryButton
              title="Sign In as Administrator 🛡️"
              fullWidth
              isLoading={isLoading}
              loadingText="Authenticating admin..."
              onPress={handleSignIn}
              className="bg-indigo-600 active:bg-indigo-700"
            />
          </Card>
        )}

        {/* 1-Click Role-Based Development Shortcuts (Distinct & Clear) */}
        <Card variant="outlined" className="p-4 mb-4 bg-slate-50 border-slate-200">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold text-slate-700">
              🛠️ Development Shortcuts
            </Text>
            <Text className="text-[10px] text-slate-400 font-semibold">Local Environment</Text>
          </View>

          <View className="gap-2">
            {activeRole === 'student' && (
              <SecondaryButton
                title="🎓 1-Click Demo Student Login"
                fullWidth
                onPress={handleDemoLogin}
                textClassName="text-xs font-bold"
              />
            )}
            {activeRole === 'provider' && (
              <OutlineButton
                title="🏢 1-Click Demo Provider Login"
                fullWidth
                onPress={handleDemoProviderLogin}
                className="border-amber-400 bg-amber-50"
                textClassName="text-xs font-bold text-amber-900"
              />
            )}
            {activeRole === 'admin' && (
              <View>
                <OutlineButton
                  title="🛡️ 1-Click Demo Admin Login"
                  fullWidth
                  onPress={handleDemoAdminLogin}
                  className="border-indigo-300 bg-indigo-50"
                  textClassName="text-xs font-bold text-indigo-900"
                />
                <Text className="text-[10px] text-slate-400 mt-2 text-center">
                  To provision test admin in terminal: python -m app.cli.admin_tool create --email admin@scholarhub.edu --password Password123!
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Sign Up Navigation Prompt */}
        <Card variant="outlined" className="items-center py-4 mb-6">
          <Text className="text-xs text-slate-500 mb-2">
            {activeRole === 'provider'
              ? 'Looking to register as a scholarship provider?'
              : "Don't have an account yet?"}
          </Text>
          <TextButton
            title={activeRole === 'provider' ? 'Register Provider Account →' : 'Create Student Account →'}
            textClassName="text-sm font-bold text-primary-600"
            onPress={() =>
              navigation.navigate('Register', {
                initialRole: activeRole === 'provider' ? 'provider' : 'student',
              })
            }
          />
        </Card>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

export default LoginScreen;
