import React from 'react';
import { View, Text } from 'react-native';
import { PersonalDetails, RegistrationErrors } from '../../../types';
import { Card } from '../../../components/common';
import { TextInput, DateInput, SelectInput } from '../../../components/inputs';
import { GENDER_OPTIONS } from '../constants';

interface Step1Props {
  data: PersonalDetails;
  errors: RegistrationErrors['personal'];
  onChange: <K extends keyof PersonalDetails>(field: K, value: PersonalDetails[K]) => void;
  onClearError: (field: keyof PersonalDetails) => void;
}

/**
 * Step 1: Personal & Contact Details
 */
export const Step1PersonalDetails: React.FC<Step1Props> = ({
  data,
  errors,
  onChange,
  onClearError,
}) => {
  return (
    <Card variant="elevated" className="mb-4 p-5">
      {/* Section Header */}
      <View className="mb-4 border-b border-slate-100 pb-3">
        <Text className="text-base font-bold text-slate-900">
          Personal & Contact Details
        </Text>
        <Text className="text-xs text-slate-500 mt-0.5">
          Please enter your official identification and communication details.
        </Text>
      </View>

      {/* First Name & Last Name (2 columns or stacked) */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextInput
            label="First Name"
            placeholder="e.g. Rahul"
            value={data.firstName}
            onChangeText={(val) => {
              onChange('firstName', val);
              if (errors.firstName) onClearError('firstName');
            }}
            error={errors.firstName}
            autoCapitalize="words"
            required
          />
        </View>

        <View className="flex-1">
          <TextInput
            label="Last Name"
            placeholder="e.g. Sharma"
            value={data.lastName}
            onChangeText={(val) => {
              onChange('lastName', val);
              if (errors.lastName) onClearError('lastName');
            }}
            error={errors.lastName}
            autoCapitalize="words"
            required
          />
        </View>
      </View>

      {/* Date of Birth */}
      <DateInput
        label="Date of Birth"
        placeholder="Select your birth date (YYYY-MM-DD)"
        value={data.dateOfBirth}
        onChangeDate={(val) => {
          onChange('dateOfBirth', val);
          if (errors.dateOfBirth) onClearError('dateOfBirth');
        }}
        error={errors.dateOfBirth}
        helperText="Used to verify scholarship age criteria"
        required
      />

      {/* Gender Select */}
      <SelectInput
        label="Gender"
        placeholder="Select your gender identity"
        value={data.gender}
        options={GENDER_OPTIONS}
        onSelect={(val) => {
          onChange('gender', String(val));
          if (errors.gender) onClearError('gender');
        }}
        error={errors.gender}
        modalTitle="Select Gender"
        required
      />

      {/* Email Address */}
      <TextInput
        label="Email Address"
        placeholder="student@example.edu / personal email"
        value={data.email}
        onChangeText={(val) => {
          onChange('email', val);
          if (errors.email) onClearError('email');
        }}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        helperText="All scholarship notifications will be sent to this email"
        required
      />

      {/* Mobile Number */}
      <TextInput
        label="Mobile Number"
        placeholder="e.g. 9876543210"
        value={data.mobile}
        onChangeText={(val) => {
          onChange('mobile', val);
          if (errors.mobile) onClearError('mobile');
        }}
        error={errors.mobile}
        keyboardType="phone-pad"
        helperText="10-digit mobile number for application SMS updates"
        required
      />
    </Card>
  );
};

export default Step1PersonalDetails;
