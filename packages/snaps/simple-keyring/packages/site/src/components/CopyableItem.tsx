import React, { useState } from 'react';

import { CopyIcon } from './icons/CopyIcon';
import {
  AccountRow,
  CopyableContainer,
  CopyableItemValue,
} from './styledComponents';

export const CopyableItem = ({ value }: { value: string }) => {
  const [active, setActive] = useState(false);

  return (
    <AccountRow>
      <CopyableContainer
        active={active}
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick={async () => {
          setActive(false);
          await navigator.clipboard.writeText(value);
          setActive(true);
        }}
      >
        <CopyableItemValue>{value}</CopyableItemValue>
        <CopyIcon />
      </CopyableContainer>
    </AccountRow>
  );
};
