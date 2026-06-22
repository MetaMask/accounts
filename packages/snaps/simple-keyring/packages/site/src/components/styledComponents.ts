import Box from '@mui/material/Box';
import styled, { keyframes, css } from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-left: 5%;
  padding-right: 5%;
  flex: 1;
  margin-bottom: 7.6rem;
`;

export const StyledBox = styled(Box)`
  width: 100%;
`;

export const InformationBox = styled.div<{ error: boolean }>`
  display: flex;
  background-color: ${({ error }) => (error ? '#B22222' : '#50c878')};
  padding: 10px;
  margin: 10px 0;
  border-radius: 5px;
`;

export const Divider = styled.div`
  color: #24272a;

  /* Heading-MD */
  font-family: Geist, ui-sans-serif;
  font-size: 24px;
  font-style: normal;
  font-weight: 700;
  line-height: 32px; /* 133.333% */
`;

export const DividerTitle = styled.p`
  margin: 0;
  font-size: 25px;
  margin-bottom: 3rem;
`;

export const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  padding-left: 14rem;
  padding-right: 14rem;
  flex: 1;
`;

export const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error?.muted};
  border: 1px solid ${({ theme }) => theme.colors.error?.default};
  color: ${({ theme }) => theme.colors.error?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

export const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

export const AccountTitleContainer = styled.div`
  width: 100%;
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0px;
`;

export const AccountTitle = styled.p`
  display: flex;
  margin: 0px;
  color: #000;
  font-family: Geist, ui-sans-serif;
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px; /* 150% */
`;

export const AccountTitleIconContainer = styled.div`
  display: flex;
`;

export const AccountContainer = styled.div`
  display: flex;
  flex: 1;
  padding: 16px;
  margin-bottom: 20px;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  border-radius: 8px;
  border: 0px solid var(--border-default, #bbc0c5);
  background: var(--background-default, #fff);
  /* lg */
  box-shadow: 0px 2px 40px 0px rgba(0, 0, 0, 0.1);
`;

export const AccountRow = styled.div<{
  alignItems?: string;
  flexDirection?: string;
}>`
  display: flex;
  flex-direction: ${({ flexDirection }) => flexDirection ?? 'column'};
  flex: 1;
  width: 100%;
  align-items: ${({ alignItems }) => alignItems ?? 'stretch'};
`;

const copyKeyframe = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

export const CopyableContainer = styled.div<{ active: boolean }>`
  display: flex;
  justify-content: space-between;
  padding: 4px 12px;
  align-items: center;
  gap: 4px;
  flex: 1 0 0;
  border-radius: 4px;
  background: rgba(3, 118, 201, 0.1);
  overflow-x: wrap;
  animation: ${({ active }) =>
    active
      ? css`
          ${copyKeyframe} 0.2s linear
        `
      : 'none'};
`;

export const CopyableItemValue = styled.div`
  color: #0376c9;
  text-align: left;
  max-width: 80%;
  word-break: break-all;
  white-space: pre-wrap;
  margin: 0px;

  /* Body-SM-Medium */
  font-family: Roboto Mono, ui-monospace;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px; /* 166.667% */
  letter-spacing: 0.25px;
`;

export const AccountRowTitle = styled.p`
  color: #000;

  /* H6 - Bold 14px */
  font-family: Geist, ui-sans-serif;
  font-size: 14px;
  font-style: normal;
  font-weight: 700;
  line-height: 140.625%; /* 19.688px */
  margin-bottom: 4px;
`;

export const AccountRowValue = styled.p`
  margin: 0px;
  color: #6a737d;

  /* H6 - Normal 14px */
  font-family: Geist, ui-sans-serif;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 140.625%; /* 19.688px */

  li {
    list-style-type: disc;
  }
`;
