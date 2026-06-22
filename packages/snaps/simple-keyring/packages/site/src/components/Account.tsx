import { type KeyringAccount } from '@metamask/keyring-api';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import React, { useState } from 'react';

import { MethodButton } from './Buttons';
import { CopyableItem } from './CopyableItem';
import {
  AccountContainer,
  AccountTitleContainer,
  AccountTitle,
  AccountTitleIconContainer,
  AccountRow,
  AccountRowTitle,
  AccountRowValue,
} from './styledComponents';

export const Account = ({
  account,
  handleDelete,
}: {
  account: KeyringAccount;
  handleDelete: (accountId: string) => Promise<void>;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <AccountContainer>
      <AccountTitleContainer>
        <AccountTitle>{account.address}</AccountTitle>
        <AccountTitleIconContainer>
          {isCollapsed ? (
            <ExpandMoreIcon
              fontSize="large"
              onClick={() => setIsCollapsed(!isCollapsed)}
            />
          ) : (
            <ExpandLessIcon
              fontSize="large"
              onClick={() => setIsCollapsed(!isCollapsed)}
            />
          )}
        </AccountTitleIconContainer>
      </AccountTitleContainer>
      {!isCollapsed && (
        <>
          <AccountRow>
            <AccountRowTitle>ID</AccountRowTitle>
            <CopyableItem value={account.id} />
          </AccountRow>
          <AccountRow>
            <AccountRowTitle>Address</AccountRowTitle>
            <CopyableItem value={account.address} />
          </AccountRow>
          <AccountRow>
            <AccountRowTitle>Type</AccountRowTitle>
            <AccountRowValue>{account.type}</AccountRowValue>
          </AccountRow>
          <AccountRow>
            <AccountRowTitle>Account Supported Methods</AccountRowTitle>
            <ul style={{ padding: '0px 0px 0px 16px' }}>
              {account.methods.map((method) => (
                <AccountRowValue key={`account-${account.id}-method-${method}`}>
                  <li>{method}</li>
                </AccountRowValue>
              ))}
            </ul>
          </AccountRow>
          <AccountRow alignItems="flex-end">
            <MethodButton
              width="30%"
              margin="8px 0px 8px 8px"
              onClick={async (): Promise<void> => {
                await handleDelete(account.id);
              }}
              label="Delete"
            />
          </AccountRow>
        </>
      )}
    </AccountContainer>
  );
};
