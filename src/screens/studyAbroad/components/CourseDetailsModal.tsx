import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Course } from '../../../types/studyAbroad';
import { Badge } from '../../../components/common';
import { PrimaryButton, OutlineButton } from '../../../components/buttons';

interface CourseDetailsModalProps {
  course: Course | null;
  visible: boolean;
  onClose: () => void;
  onViewUniversity?: (universityId: string) => void;
}

/**
 * CourseDetailsModal
 * Bottom sheet modal providing full curriculum, duration, tuition and admission prerequisites.
 */
export const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({
  course,
  visible,
  onClose,
  onViewUniversity,
}) => {
  if (!course) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-3xl p-5 max-h-[85%] shadow-2xl border-t border-slate-200">
          {/* Header */}
          <View className="flex-row items-start justify-between pb-3 border-b border-slate-100 mb-3">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Badge variant="primary" size="sm" label={course.degreeLevel} />
                <Badge variant="neutral" size="sm" label={course.countryName} />
              </View>
              <Text className="text-base font-black text-slate-900 leading-snug">
                {course.name}
              </Text>
              <Text className="text-xs text-slate-500 font-medium mt-0.5">
                {course.universityName}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="h-8 w-8 rounded-full bg-slate-100 items-center justify-center"
              accessibilityLabel="Close course details"
            >
              <Text className="text-sm font-bold text-slate-600">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView showsVerticalScrollIndicator={false} className="my-2">
            {/* Quick Metrics Grid */}
            <View className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-4 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 font-medium">⏱️ Program Duration</Text>
                <Text className="text-xs font-bold text-slate-900">{course.duration}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 font-medium">💰 Tuition Fee</Text>
                <Text className="text-xs font-black text-emerald-700">{course.tuition}</Text>
              </View>
              {course.languageRequirement && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-slate-500 font-medium">🗣️ Instruction</Text>
                  <Text className="text-xs font-bold text-slate-900">{course.languageRequirement}</Text>
                </View>
              )}
              {course.intakeSeason && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-slate-500 font-medium">📅 Typical Intake</Text>
                  <Text className="text-xs font-bold text-slate-900">{course.intakeSeason}</Text>
                </View>
              )}
            </View>

            {/* Overview */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                Program Description
              </Text>
              <Text className="text-xs text-slate-600 leading-relaxed">
                {course.description}
              </Text>
            </View>

            {/* Fields of Study */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Core Specialization Areas
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {course.fieldsOfStudy.map((f, idx) => (
                  <View
                    key={idx}
                    className="bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200"
                  >
                    <Text className="text-xs font-bold text-primary-800">{f}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Admission Prerequisites */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Admission Prerequisites & Criteria
              </Text>
              <View className="gap-2">
                {course.applicationRequirements.map((req, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                  >
                    <Text className="text-xs font-bold text-primary-600">✓</Text>
                    <Text className="text-xs text-slate-700 leading-snug flex-1">
                      {req}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="pt-3 border-t border-slate-100 flex-row gap-3">
            <View className="flex-1">
              <OutlineButton title="Close" size="md" onPress={onClose} />
            </View>
            {onViewUniversity && (
              <View className="flex-1">
                <PrimaryButton
                  title="View University →"
                  size="md"
                  onPress={() => {
                    onClose();
                    onViewUniversity(course.universityId);
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CourseDetailsModal;
