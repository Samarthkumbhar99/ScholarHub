import React from 'react';
import { View, Text } from 'react-native';
import { RegistrationStep } from '../../../types';
import { Badge } from '../../../components/common';

interface StepIndicatorProps {
  currentStep: RegistrationStep;
}

interface StepMeta {
  step: RegistrationStep;
  title: string;
  shortLabel: string;
}

const STEPS_META: StepMeta[] = [
  { step: 1, title: 'Personal & Contact', shortLabel: 'Personal' },
  { step: 2, title: 'Address & Academic', shortLabel: 'Academic' },
  { step: 3, title: 'Category & Preferences', shortLabel: 'Preferences' },
];

/**
 * StepIndicator
 * Displays progress progression for the 3-step registration flow:
 * Step 1 of 3: ●────○────○
 * Step 2 of 3: ●────●────○
 * Step 3 of 3: ●────●────●
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  return (
    <View className="w-full mb-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      {/* Top Row: Current Step Label & Progress Badge */}
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Registration Progress
          </Text>
          <Text className="text-base font-extrabold text-slate-900 mt-0.5">
            {STEPS_META[currentStep - 1]?.title}
          </Text>
        </View>
        <Badge
          variant="primary"
          size="sm"
          label={`Step ${currentStep} of 3`}
        />
      </View>

      {/* Connected Progression Nodes Bar */}
      <View className="flex-row items-center justify-between px-2 pt-1">
        {STEPS_META.map((item, index) => {
          const isCompleted = item.step < currentStep;
          const isActive = item.step === currentStep;
          const isUpcoming = item.step > currentStep;

          return (
            <React.Fragment key={item.step}>
              {/* Step Node */}
              <View className="items-center">
                <View
                  className={`h-8 w-8 rounded-full items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/20'
                      : isActive
                      ? 'bg-primary-600 border-primary-600 ring-4 ring-primary-100 shadow-sm shadow-primary-500/30'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <Text className="text-white font-bold text-xs">✓</Text>
                  ) : (
                    <Text
                      className={`text-xs font-extrabold ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {item.step}
                    </Text>
                  )}
                </View>
                <Text
                  className={`text-[10px] mt-1 font-semibold ${
                    isActive
                      ? 'text-primary-700 font-bold'
                      : isCompleted
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                  }`}
                >
                  {item.shortLabel}
                </Text>
              </View>

              {/* Connecting Line between steps */}
              {index < STEPS_META.length - 1 && (
                <View className="flex-1 mx-2 h-1 -mt-4 rounded-full overflow-hidden bg-slate-200">
                  <View
                    className={`h-full rounded-full ${
                      currentStep > item.step ? 'bg-emerald-500' : 'bg-transparent'
                    }`}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

export default StepIndicator;
