import { useColorScheme } from 'react-native';
import { colors } from '../theme/colors';
import { useAppSelector } from './useAppStore';

/**
 * Hook to access current active theme and palette
 */
export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const themeMode = useAppSelector((state) => state.ui.themeMode);

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  return {
    isDark,
    colors,
    themeMode,
  };
};
