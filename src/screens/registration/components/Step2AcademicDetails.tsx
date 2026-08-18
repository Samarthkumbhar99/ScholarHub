import React from 'react';
import { View, Text } from 'react-native';
import { AcademicDetails, RegistrationErrors } from '../../../types';
import { Card } from '../../../components/common';
import { TextInput, SelectInput } from '../../../components/inputs';
import {
  COUNTRY_OPTIONS,
  STATE_OPTIONS,
  COURSE_OPTIONS,
  BRANCH_OPTIONS,
  CURRENT_YEAR_OPTIONS,
} from '../constants';

interface Step2Props {
  data: AcademicDetails;
  errors: RegistrationErrors['academic'];
  onChange: <K extends keyof AcademicDetails>(field: K, value: AcademicDetails[K]) => void;
  onClearError: (field: keyof AcademicDetails) => void;
}

/**
 * Step 2: Address & Academic Information
 */
export const Step2AcademicDetails: React.FC<Step2Props> = ({
  data,
  errors,
  onChange,
  onClearError,
}) => {
  return (
    <View className="gap-4 mb-4">
      {/* 1. Address Information Card */}
      <Card variant="elevated" className="p-5">
        <View className="mb-4 border-b border-slate-100 pb-3">
          <Text className="text-base font-bold text-slate-900">
            Address & Location
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            Domicile location for state & central government scholarship eligibility.
          </Text>
        </View>

        {/* Country & State */}
        <SelectInput
          label="Country"
          placeholder="Select your country of residence"
          value={data.country}
          options={COUNTRY_OPTIONS}
          onSelect={(val) => {
            onChange('country', String(val));
            if (errors.country) onClearError('country');
          }}
          error={errors.country}
          modalTitle="Select Country"
          searchable
          required
        />

        <SelectInput
          label="State / Domicile State"
          placeholder="Select your state"
          value={data.state}
          options={STATE_OPTIONS}
          onSelect={(val) => {
            onChange('state', String(val));
            if (errors.state) onClearError('state');
          }}
          error={errors.state}
          modalTitle="Select State"
          searchable
          required
        />

        {/* District & City */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextInput
              label="District"
              placeholder="e.g. Pune"
              value={data.district}
              onChangeText={(val) => {
                onChange('district', val);
                if (errors.district) onClearError('district');
              }}
              error={errors.district}
              autoCapitalize="words"
              required
            />
          </View>

          <View className="flex-1">
            <TextInput
              label="City / Town"
              placeholder="e.g. Pune"
              value={data.city}
              onChangeText={(val) => {
                onChange('city', val);
                if (errors.city) onClearError('city');
              }}
              error={errors.city}
              autoCapitalize="words"
              required
            />
          </View>
        </View>
      </Card>

      {/* 2. Academic Information Card */}
      <Card variant="elevated" className="p-5">
        <View className="mb-4 border-b border-slate-100 pb-3">
          <Text className="text-base font-bold text-slate-900">
            Academic Information
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            Current enrollment details for merit calculation and criteria matching.
          </Text>
        </View>

        {/* Course / Degree Level */}
        <SelectInput
          label="Course / Degree"
          placeholder="Select your degree program"
          value={data.course}
          options={COURSE_OPTIONS}
          onSelect={(val) => {
            onChange('course', String(val));
            if (errors.course) onClearError('course');
          }}
          error={errors.course}
          modalTitle="Select Course / Program"
          searchable
          required
        />

        {/* Branch / Stream */}
        <SelectInput
          label="Branch / Major Specialization"
          placeholder="Select your branch or department"
          value={data.branch}
          options={BRANCH_OPTIONS}
          onSelect={(val) => {
            onChange('branch', String(val));
            if (errors.branch) onClearError('branch');
          }}
          error={errors.branch}
          modalTitle="Select Branch / Major"
          searchable
          required
        />

        {/* Current Year */}
        <SelectInput
          label="Current Academic Year"
          placeholder="Select current year of study"
          value={data.currentYear}
          options={CURRENT_YEAR_OPTIONS}
          onSelect={(val) => {
            onChange('currentYear', String(val));
            if (errors.currentYear) onClearError('currentYear');
          }}
          error={errors.currentYear}
          modalTitle="Select Year of Study"
          required
        />

        {/* University & College */}
        <TextInput
          label="University / Board"
          placeholder="e.g. Savitribai Phule Pune University"
          value={data.university}
          onChangeText={(val) => {
            onChange('university', val);
            if (errors.university) onClearError('university');
          }}
          error={errors.university}
          autoCapitalize="words"
          required
        />

        <TextInput
          label="College / Institute Name"
          placeholder="e.g. College of Engineering Pune (COEP)"
          value={data.college}
          onChangeText={(val) => {
            onChange('college', val);
            if (errors.college) onClearError('college');
          }}
          error={errors.college}
          autoCapitalize="words"
          required
        />

        {/* CGPA & Previous Percentage (2 Columns) */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextInput
              label="Current CGPA"
              placeholder="e.g. 8.75"
              value={data.cgpa}
              onChangeText={(val) => {
                onChange('cgpa', val);
                if (errors.cgpa) onClearError('cgpa');
              }}
              error={errors.cgpa}
              keyboardType="decimal-pad"
              helperText="Scale: 0.00 to 10.00"
              required
            />
          </View>

          <View className="flex-1">
            <TextInput
              label="Previous Score (%)"
              placeholder="e.g. 88.5"
              value={data.previousPercentage}
              onChangeText={(val) => {
                onChange('previousPercentage', val);
                if (errors.previousPercentage) onClearError('previousPercentage');
              }}
              error={errors.previousPercentage}
              keyboardType="decimal-pad"
              helperText="Percentage: 0 to 100%"
              required
            />
          </View>
        </View>
      </Card>
    </View>
  );
};

export default Step2AcademicDetails;
