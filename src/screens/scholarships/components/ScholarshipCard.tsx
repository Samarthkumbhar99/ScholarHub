import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScholarshipItem } from '../types';
import { Card, Badge } from '../../../components/common';
import { PrimaryButton, OutlineButton } from '../../../components/buttons';
import { MatchScoreBadge } from './MatchScoreBadge';

interface ScholarshipCardProps {
  scholarship: ScholarshipItem;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onDetails: (scholarship: ScholarshipItem) => void;
  onApply: (scholarship: ScholarshipItem) => void;
  isCompared?: boolean;
  onToggleCompare?: (id: string) => void;
}

/**
 * ScholarshipCard
 * Comprehensive scholarship discovery card with match rating, metadata tags, bookmarking, and actions
 */
export const ScholarshipCard: React.FC<ScholarshipCardProps> = ({
  scholarship,
  isSaved,
  onToggleSave,
  onDetails,
  onApply,
  isCompared = false,
  onToggleCompare,
}) => {
  const isUrgent = scholarship.daysLeft <= 7;

  return (
    <Card variant="elevated" className="p-4 mb-3.5 border border-slate-200">
      {/* Top Row: Title, Provider & Bookmark Star */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <View className="flex-row items-center flex-wrap gap-1.5 mb-1">
            <MatchScoreBadge score={scholarship.matchScore} size="sm" />
            {scholarship.featured && (
              <Badge variant="warning" size="sm" label="Featured" />
            )}
          </View>
          <Text className="text-base font-bold text-slate-900 leading-snug">
            {scholarship.title}
          </Text>
          <Text className="text-xs text-slate-500 font-medium mt-0.5">
            {scholarship.provider}
          </Text>
        </View>

        {/* Bookmark Toggle Button */}
        <TouchableOpacity
          onPress={() => onToggleSave(scholarship.id)}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save scholarship'}
          className={`h-9 w-9 rounded-xl items-center justify-center border transition-all ${
            isSaved
              ? 'bg-blue-50 border-blue-300 shadow-sm'
              : 'bg-slate-50 border-slate-200 active:bg-slate-100'
          }`}
        >
          <Text className={`text-base ${isSaved ? 'text-blue-600' : 'text-slate-400'}`}>
            {isSaved ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Brief Description */}
      {scholarship.description ? (
        <Text
          className="text-xs text-slate-600 mb-3 leading-relaxed"
          numberOfLines={2}
        >
          {scholarship.description}
        </Text>
      ) : null}

      {/* Award Amount & Deadline Bar */}
      <View className="flex-row items-center justify-between py-2.5 px-3 bg-slate-50 rounded-xl mb-3 border border-slate-100">
        <View>
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Award Value
          </Text>
          <Text className="text-sm font-black text-emerald-700 mt-0.5">
            {scholarship.awardAmount}
          </Text>
        </View>

        <View className="items-end">
          <Badge
            variant={isUrgent ? 'warning' : 'info'}
            size="sm"
            showDot
            label={`Closes in ${scholarship.daysLeft} days`}
          />
          <Text className="text-[10px] text-slate-400 mt-1">
            Deadline: {scholarship.deadline}
          </Text>
        </View>
      </View>

      {/* Metadata Tags */}
      <View className="flex-row flex-wrap gap-1.5 mb-3.5">
        {scholarship.tags.map((tag) => (
          <Badge key={tag} variant="neutral" size="sm" label={tag} />
        ))}
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-2 items-center">
        <View className="flex-1">
          <PrimaryButton
            title="Apply Now"
            size="sm"
            onPress={() => onApply(scholarship)}
          />
        </View>
        <OutlineButton
          title="Details"
          size="sm"
          onPress={() => onDetails(scholarship)}
        />
        {Boolean(onToggleCompare) ? (
          <TouchableOpacity
            onPress={() => onToggleCompare!(scholarship.id)}
            accessibilityRole="button"
            accessibilityLabel={isCompared ? 'Remove from compare' : 'Add to compare'}
            className={`px-3 py-2 rounded-xl border flex-row items-center justify-center ${
              isCompared
                ? 'bg-indigo-50 border-indigo-400 shadow-sm'
                : 'bg-slate-50 border-slate-200 active:bg-slate-100'
            }`}
          >
            <Text className="text-xs mr-1">{isCompared ? '✓' : '⚖️'}</Text>
            <Text
              className={`text-xs font-bold ${
                isCompared ? 'text-indigo-700' : 'text-slate-600'
              }`}
            >
              {isCompared ? 'Compared' : 'Compare'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
  );
};

export default ScholarshipCard;
