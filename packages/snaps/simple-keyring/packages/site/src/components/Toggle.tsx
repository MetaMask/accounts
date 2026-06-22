import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

type CheckedProps = {
  readonly checked: boolean;
  readonly enabled?: boolean;
};

const ToggleWrapper = styled.div`
  touch-action: pan-x;
  display: inline-block;
  position: relative;
  cursor: pointer;
  background-color: transparent;
  border: 0;
  padding: 0;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  -webkit-tap-highlight-color: transparent;
  margin-right: 2.4rem;
  ${({ theme }) => theme.mediaQueries.small} {
    margin-right: 2.4rem;
  }
`;

const ToggleInput = styled.input`
  border: 0;
  clip: rect(0 0 0 0);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  width: 1px;
`;

const IconContainer = styled.div`
  position: absolute;
  width: 22px;
  height: 22px;
  top: 0;
  bottom: 0;
  margin-top: auto;
  margin-bottom: auto;
  line-height: 0;
  opacity: 0;
  transition: opacity 0.25s ease;
  & > * {
    align-items: center;
    display: flex;
    height: 22px;
    justify-content: center;
    position: relative;
    width: 22px;
  }
`;

const CheckedContainer = styled(IconContainer)<CheckedProps>`
  opacity: ${({ checked }) => (checked ? 1 : 0)};
  left: 10px;
`;

const UncheckedContainer = styled(IconContainer)<CheckedProps>`
  opacity: ${({ checked }) => (checked ? 0 : 1)};
  right: 10px;
`;

const ToggleContainer = styled.div<CheckedProps>`
  width: 68px;
  height: 36px;
  padding: 0;
  border-radius: 36px;
  background-color: ${({ checked, enabled }) => {
    if (!enabled) {
      return '#ddd';
    } else if (checked) {
      return '#0ba6ff';
    }
    return '#d3d3d3';
  }};
  transition: all 0.2s ease;
`;
const ToggleCircle = styled.div<CheckedProps>`
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1) 0ms;
  position: absolute;
  top: 4px;
  left: ${({ checked }) => (checked ? '36px' : '4px')};
  width: 28px;
  height: 28px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.14);
  border-radius: 50%;
  background-color: ${({ enabled }) => (enabled ? '#ffffff' : '#eee')};
  box-sizing: border-box;
  transition: all 0.25s ease;
`;

const Label = styled.span`
  display: inline-block;
  margin: 0;
  position: relative;
  top: 50%;
  transform: translateY(-50%);
`;

export const Toggle = ({
  onToggle,
  defaultChecked = false,
  enabled = true,
  title,
  checkedIcon = '',
  uncheckedIcon = '',
}: {
  onToggle(): Promise<void>;
  defaultChecked?: boolean;
  enabled?: boolean;
  title?: string;
  checkedIcon?: string;
  uncheckedIcon?: string;
}) => {
  const [checked, setChecked] = useState(defaultChecked);

  useEffect(() => {
    setChecked(defaultChecked);
  }, [defaultChecked]);

  const handleChange = async () => {
    if (!enabled) {
      return;
    }
    await onToggle();
    setChecked(!checked);
  };

  return (
    <div>
      <ToggleWrapper
        onClick={() => {
          handleChange().catch(console.error);
        }}
        data-testid="use-sync-flow-toggle"
      >
        <ToggleContainer checked={checked} enabled={enabled}>
          <CheckedContainer checked={checked}>
            <span>{checkedIcon}</span>
          </CheckedContainer>
          <UncheckedContainer checked={checked}>
            <span>{uncheckedIcon}</span>
          </UncheckedContainer>
        </ToggleContainer>
        <ToggleCircle checked={checked} enabled={enabled} />
        <ToggleInput type="checkbox" aria-label="Toggle Button" />
      </ToggleWrapper>
      <Label>{title}</Label>
    </div>
  );
};
