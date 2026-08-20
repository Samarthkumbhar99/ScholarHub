import React from 'react';
import { View, Text } from 'react-native';
import {
  ApplicationStatus,
  APPLICATION_STATUS_DETAILS,
  getStageIndex,
} from '../../../types/application';
import { Badge } from '../../../components/common';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md' | 'lg';
  showStage?: boolean;
  className?: string;
}

/**
 * ApplicationStatusBadge
 * Standardized status badge showing stage number, icon, and label
 */
export const ApplicationStatusBadge: React.FC<ApplicationStatusBadgeProps> = ({
  status,
  size = 'sm',
  showStage = false,
  className = '',
}) => {
  const meta = APPLICATION_STATUS_DETAILS[status] || APPLICATION_STATUS_DETAILS.SAVED;
  const stage = getStageIndex(status);

  const label = showStage ? `Stage ${stage}/7 • ${meta.label}` : meta.label;

  return (
    <Badge
      variant={meta.badgeVariant}
      size={size}
      showDot={meta.badgeVariant !== 'neutral'}
      label={`${meta.stageIcon} ${label}`}
      className={className}
    />
  );
};

export default ApplicationStatusBadge;
