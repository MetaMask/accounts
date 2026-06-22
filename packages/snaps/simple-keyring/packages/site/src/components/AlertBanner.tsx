import React from 'react';
import {
  BsFillCheckCircleFill,
  BsFillExclamationTriangleFill,
} from 'react-icons/bs';
import styled from 'styled-components';

const StyledAlertContainer = styled.div`
  background-color: ${({ error }: { error?: boolean }) =>
    error ? '#f8ebed' : '#ebf6ed'};
  width: 100%;
  height: 40px;
  margin: 10px 0px 10px 0px;
  border-radius: 4px;
  display: flex;
  flex-direction: row;
`;

const Side = styled.div`
  min-width: 5px;
  max-width: 5px;
  height: 100%;
  background-color: ${({ error }: { error?: boolean }) =>
    error ? '#d73847' : '#28a745'};
  border-radius: 4px 0px 0px 4px;
  flex: 1;
`;

const AlertIcon = styled(BsFillExclamationTriangleFill)`
  margin: 13px 5px 13px 8px;
  color: #d73847;
`;

const CheckIcon = styled(BsFillCheckCircleFill)`
  margin: 13px 5px 13px 8px;
  color: #28a745;
`;

const StyledTitle = styled.p`
  margin: 10px 5px;

  /* Body-LG-Medium */
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px; /* 150% */
`;

export enum AlertType {
  Success = 'success',
  Failure = 'failure',
}

export const AlertBanner = ({
  title,
  alertType,
}: {
  title: string;
  alertType: AlertType;
}) => {
  const icon = () => {
    switch (alertType) {
      case AlertType.Failure:
        return <AlertIcon />;
      case AlertType.Success:
        return <CheckIcon />;
      default:
        return null;
    }
  };

  return (
    <StyledAlertContainer error={alertType === AlertType.Failure}>
      <Side error={alertType === AlertType.Failure} />
      {icon()}
      <StyledTitle>{title}</StyledTitle>
    </StyledAlertContainer>
  );
};
