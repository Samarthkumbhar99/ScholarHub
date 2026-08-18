import React from 'react';
import { View, Text } from 'react-native';

interface MatchScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

/**
 * MatchScoreBadge
 * Reusable visual badge indicating AI-estimated compatibility match percentage
 */
export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({
  score,
  size = 'sm',
}) => {
  const getBadgeStyle = () => {
    if (score >= 90) {
      return {
        bg: 'bg-emerald-50 border-emerald-200',
        text: 'text-emerald-800',
        icon: '🎯',
      };
    }
    if (score >= 80) {
      return {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-primary-800',
        icon: '✨',
      };
    }
    return {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      icon: '⚡',
    };
  };

  const style = getBadgeStyle();
  const paddingStyle = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <View
      className={`flex-row items-center rounded-full border ${style.bg} ${paddingStyle}`}
    >
      <Text className="mr-1 text-[10px]">{style.icon}</Text>
      <Text className={`font-extrabold ${style.text} ${textSize}`}>
        {score}% Match
      </Text>
    </View>
  );
};

export default MatchScoreBadge;
