import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from '../../../components/common';

/**
 * ApplicationGuidanceSection
 * Structured 5-step roadmap and documentation checklist for international applications.
 */
export const ApplicationGuidanceSection: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  const steps = [
    {
      step: '1',
      title: 'Standardized Exams & Language Proficiency',
      detail: 'Prepare and take IELTS Academic (6.5+) or TOEFL (90+) alongside GRE/GMAT if mandated by your program.',
    },
    {
      step: '2',
      title: 'Course & University Shortlisting',
      detail: 'Identify 6–8 universities across dream, target, and safe tiers aligned with your GPA and career goals.',
    },
    {
      step: '3',
      title: 'Academic Dossier & Documentation',
      detail: 'Draft a compelling Statement of Purpose (SOP), secure 2–3 Academic LORs, and obtain certified transcripts.',
    },
    {
      step: '4',
      title: 'University & Scholarship Applications',
      detail: 'Submit online applications before early deadlines to maximize consideration for university fellowships.',
    },
    {
      step: '5',
      title: 'Visa Application & Financial Proof',
      detail: 'Secure financial affidavits / blocked accounts (e.g. Germany €11,208 / GIC CAD $20,635) and attend visa interviews.',
    },
  ];

  return (
    <Card variant="elevated" className="p-4 mb-4 border border-blue-200 bg-blue-50/20">
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <Text className="text-xl">✈️</Text>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-slate-900 leading-snug">
              Study Abroad Roadmap & Guidance
            </Text>
            <Text className="text-[11px] text-slate-500 font-medium mt-0.5">
              5-Step international application checklist
            </Text>
          </View>
        </View>

        <Text className="text-xs font-bold text-primary-700">
          {expanded ? 'Hide Guide ▲' : 'View Guide ▼'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View className="mt-4 pt-3 border-t border-blue-200/60 gap-3">
          {steps.map((s, idx) => (
            <View key={idx} className="flex-row items-start gap-2.5">
              <View className="h-6 w-6 rounded-full bg-primary-600 items-center justify-center mt-0.5">
                <Text className="text-[11px] font-black text-white">{s.step}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-900">
                  {s.title}
                </Text>
                <Text className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                  {s.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

export default ApplicationGuidanceSection;
