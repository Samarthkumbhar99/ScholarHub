import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { clearComparedScholarships } from '../../../store/slices/scholarshipSlice';

interface CompareSelectionBarProps {
  bottomOffset?: number;
}

/**
 * CompareSelectionBar
 * Floating bottom action bar that appears when 1 or more scholarships are selected for comparison.
 * Allows clearing the selection or launching the side-by-side comparison screen.
 */
export const CompareSelectionBar: React.FC<CompareSelectionBarProps> = ({
  bottomOffset = 0,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const { comparedScholarshipIds } = useAppSelector((state) => state.scholarships);

  const count = comparedScholarshipIds.length;

  if (count === 0) {
    return null;
  }

  const canCompare = count >= 2;

  const handleClear = () => {
    dispatch(clearComparedScholarships());
  };

  const handleCompareNow = () => {
    if (!canCompare) {
      return;
    }
    // Navigate to CompareScholarships screen in RootStack
    const parentNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    if (parentNav) {
      parentNav.navigate('CompareScholarships');
    } else {
      navigation.navigate('CompareScholarships');
    }
  };

  return (
    <View
      style={{
        bottom: bottomOffset,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 10,
      }}
      className="absolute left-0 right-0 z-50 bg-white/95 px-4 pt-3 pb-4 border-t border-slate-200 backdrop-blur-md"
    >
      <View className="flex-row items-center justify-between">
        {/* Selection Status & Counter */}
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-1.5">
            <View className="h-6 w-6 rounded-full bg-primary-600 items-center justify-center">
              <Text className="text-white text-xs font-black">{count}</Text>
            </View>
            <Text className="text-sm font-black text-slate-900">
              {count} of 3 Selected
            </Text>
          </View>
          <Text className="text-[11px] text-slate-500 font-medium mt-0.5" numberOfLines={1}>
            {canCompare
              ? 'Ready to compare side-by-side'
              : 'Select at least 1 more to compare'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center gap-2">
          {/* Clear Button */}
          <TouchableOpacity
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel="Clear comparison selection"
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 active:bg-slate-100"
          >
            <Text className="text-xs font-bold text-slate-600">Clear</Text>
          </TouchableOpacity>

          {/* Compare Now Button */}
          <TouchableOpacity
            onPress={handleCompareNow}
            disabled={!canCompare}
            accessibilityRole="button"
            accessibilityLabel="Compare scholarships now"
            className={`px-4 py-2.5 rounded-xl flex-row items-center justify-center shadow-sm ${
              canCompare
                ? 'bg-primary-600 active:bg-primary-700'
                : 'bg-slate-200 opacity-70'
            }`}
          >
            <Text
              className={`text-xs font-extrabold ${
                canCompare ? 'text-white' : 'text-slate-400'
              }`}
            >
              Compare Now ⚖️
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CompareSelectionBar;
