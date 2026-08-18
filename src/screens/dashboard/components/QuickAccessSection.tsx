import React from 'react';
import { View, Text } from 'react-native';
import { QuickAccessItem } from '../types';
import { StudentTabParamList } from '../../../types/navigation';
import { Card, Badge } from '../../../components/common';

interface QuickAccessSectionProps {
  items: QuickAccessItem[];
  onNavigateTab: (tab: keyof StudentTabParamList) => void;
}

/**
 * QuickAccessSection
 * Categorized navigation hub for Discover, Manage, and Support student workflows
 */
export const QuickAccessSection: React.FC<QuickAccessSectionProps> = ({
  items,
  onNavigateTab,
}) => {
  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-extrabold text-slate-900">
          Quick Access
        </Text>
        <Text className="text-xs font-semibold text-slate-400">
          Features & Services
        </Text>
      </View>

      {/* Interactive Card List */}
      <View className="gap-2.5">
        {items.map((item) => (
          <Card
            key={item.id}
            variant="interactive"
            onPress={() => onNavigateTab(item.targetTab)}
            className="flex-row items-center justify-between p-3.5"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View className="h-10 w-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
                <Text className="text-lg">{item.icon}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-sm font-bold text-slate-900 mr-2">
                    {item.title}
                  </Text>
                  {item.badge ? (
                    <Badge variant="primary" size="sm" label={item.badge} />
                  ) : null}
                </View>
                <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
            <Text className="text-slate-400 font-bold text-base">→</Text>
          </Card>
        ))}
      </View>
    </View>
  );
};

export default QuickAccessSection;
