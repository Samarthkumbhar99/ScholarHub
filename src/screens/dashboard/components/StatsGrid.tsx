import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { DashboardStats } from '../types';
import { Card } from '../../../components/common';

interface StatsGridProps {
  stats: DashboardStats;
  onStatPress?: (statKey: keyof DashboardStats) => void;
}

interface StatItemConfig {
  key: keyof DashboardStats;
  label: string;
  count: number;
  subtext: string;
  textColor: string;
  icon: string;
}

/**
 * StatsGrid
 * Reusable summary statistics grid displaying all 6 core dashboard metrics
 */
export const StatsGrid: React.FC<StatsGridProps> = ({ stats, onStatPress }) => {
  const statItems: StatItemConfig[] = [
    {
      key: 'eligible',
      label: 'Eligible',
      count: stats.eligible,
      subtext: 'Matching profile',
      textColor: 'text-primary-600',
      icon: '🎓',
    },
    {
      key: 'saved',
      label: 'Saved',
      count: stats.saved,
      subtext: 'Bookmarked',
      textColor: 'text-blue-600',
      icon: '⭐',
    },
    {
      key: 'applied',
      label: 'Applied',
      count: stats.applied,
      subtext: 'In review',
      textColor: 'text-emerald-600',
      icon: '📤',
    },
    {
      key: 'closingSoon',
      label: 'Closing Soon',
      count: stats.closingSoon,
      subtext: '< 7 days left',
      textColor: 'text-amber-600',
      icon: '⏰',
    },
    {
      key: 'resultsDeclared',
      label: 'Results',
      count: stats.resultsDeclared,
      subtext: 'Declared',
      textColor: 'text-purple-600',
      icon: '🏆',
    },
    {
      key: 'recommended',
      label: 'Recommended',
      count: stats.recommended,
      subtext: 'AI curated',
      textColor: 'text-indigo-600',
      icon: '✨',
    },
  ];

  return (
    <View className="mb-5">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-extrabold text-slate-900">
          Application Overview
        </Text>
        <Text className="text-xs font-semibold text-slate-400">
          6 Key Metrics
        </Text>
      </View>

      {/* 3x2 Grid Layout for optimal mobile density and readability */}
      <View className="flex-row flex-wrap gap-2.5">
        {statItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.count} items, ${item.subtext}`}
            activeOpacity={0.7}
            onPress={() => onStatPress && onStatPress(item.key)}
            className="flex-1 min-w-[28%] max-w-[32%]"
          >
            <Card variant="outlined" className="p-3 items-start h-full justify-between">
              <View className="flex-row items-center justify-between w-full mb-1">
                <Text className="text-xs">{item.icon}</Text>
                <Text className={`text-xl font-black ${item.textColor}`}>
                  {item.count}
                </Text>
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                  {item.label}
                </Text>
                <Text className="text-[10px] text-slate-400 font-medium" numberOfLines={1}>
                  {item.subtext}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default StatsGrid;
