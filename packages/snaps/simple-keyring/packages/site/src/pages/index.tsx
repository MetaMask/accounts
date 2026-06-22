import type { KeyringAccount, KeyringRequest } from '@metamask/keyring-api';
import { KeyringSnapRpcClient } from '@metamask/keyring-snap-client';
import Grid from '@mui/material/Grid';
import React, { useCallback, useContext, useEffect, useState } from 'react';

import {
  Accordion,
  AccountList,
  Card,
  ConnectButton,
  Toggle,
} from '../components';
import {
  CardContainer,
  Container,
  Divider,
  DividerTitle,
  StyledBox,
} from '../components/styledComponents';
import { defaultSnapOrigin } from '../config';
import { MetaMaskContext, MetamaskActions } from '../hooks';
import { InputType } from '../types';
import type { KeyringState } from '../utils';
import {
  connectSnap,
  getSnap,
  isSynchronousMode,
  toggleSynchronousApprovals,
} from '../utils';

const snapId = defaultSnapOrigin;

const initialState: {
  pendingRequests: KeyringRequest[];
  accounts: KeyringAccount[];
  useSynchronousApprovals: boolean;
} = {
  pendingRequests: [],
  accounts: [],
  useSynchronousApprovals: true,
};

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [snapState, setSnapState] = useState<KeyringState>(initialState);
  // Is not a good practice to store sensitive data in the state of
  // a component but for this case it should be ok since this is an
  // internal development and testing tool.
  const [privateKey, setPrivateKey] = useState<string | null>();
  const [accountId, setAccountId] = useState<string | null>();
  const [accountObject, setAccountObject] = useState<string | null>();
  const [requestId, setRequestId] = useState<string | null>(null);
  // const [accountPayload, setAccountPayload] =
  //   useState<Pick<KeyringAccount, 'name' | 'options'>>();
  const client = new KeyringSnapRpcClient(snapId, window.ethereum);

  useEffect(() => {
    /**
     * Return the current state of the snap.
     *
     * @returns The current state of the snap.
     */
    async function getState() {
      if (!state.installedSnap) {
        return;
      }
      const accounts = await client.listAccounts();
      const pendingRequests = await client.listRequests();
      const isSynchronous = await isSynchronousMode();
      setSnapState({
        accounts,
        pendingRequests,
        useSynchronousApprovals: isSynchronous,
      });
    }

    getState().catch((error) => console.error(error));
  }, [state.installedSnap]);

  const syncAccounts = async () => {
    const accounts = await client.listAccounts();
    setSnapState({
      ...snapState,
      accounts,
    });
  };

  const createAccount = async () => {
    const newAccount = await client.createAccount();
    await syncAccounts();
    return newAccount;
  };

  const importAccount = async () => {
    const newAccount = await client.createAccount({
      privateKey: privateKey as string,
    });
    await syncAccounts();
    return newAccount;
  };

  const deleteAccount = async () => {
    await client.deleteAccount(accountId as string);
    await syncAccounts();
  };

  const updateAccount = async () => {
    if (!accountObject) {
      return;
    }
    const account: KeyringAccount = JSON.parse(accountObject);
    await client.updateAccount(account);
    await syncAccounts();
  };

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const handleUseSyncToggle = useCallback(async () => {
    console.log('Toggling synchronous approval');
    await toggleSynchronousApprovals();
    setSnapState({
      ...snapState,
      useSynchronousApprovals: !snapState.useSynchronousApprovals,
    });
  }, [snapState]);

  const accountManagementMethods = [
    {
      name: 'Create account',
      description: 'Create a new account',
      inputs: [],
      action: {
        callback: async () => await createAccount(),
        label: 'Create Account',
      },
      successMessage: 'Account created',
    },
    {
      name: 'Import account',
      description: 'Import an account using a private key',
      inputs: [
        {
          id: 'import-account-private-key',
          title: 'Private key',
          value: privateKey,
          type: InputType.TextField,
          placeholder:
            'E.g. 0000000000000000000000000000000000000000000000000000000000000000',
          onChange: (event: any) => setPrivateKey(event.currentTarget.value),
        },
      ],
      action: {
        callback: async () => await importAccount(),
        label: 'Import Account',
      },
      successMessage: 'Account imported',
    },
    {
      name: 'Get account',
      description: 'Get data of the selected account',
      inputs: [
        {
          id: 'get-account-account-id',
          title: 'Account ID',
          type: InputType.TextField,
          placeholder: 'E.g. f59a9562-96de-4e75-9229-079e82c7822a',
          options: snapState.accounts.map((account) => {
            return { value: account.address };
          }),
          onChange: (event: any) => setAccountId(event.currentTarget.value),
        },
      ],
      action: {
        disabled: Boolean(accountId),
        callback: async () => await client.getAccount(accountId as string),
        label: 'Get Account',
      },
      successMessage: 'Account fetched',
    },
    {
      name: 'List accounts',
      description: 'List all account managed by the SSK',
      action: {
        disabled: false,
        callback: async () => {
          const accounts = await client.listAccounts();
          setSnapState({
            ...snapState,
            accounts,
          });
          return accounts;
        },
        label: 'List Accounts',
      },
    },
    {
      name: 'Remove account',
      description: 'Remove an account',
      inputs: [
        {
          id: 'delete-account-account-id',
          title: 'Account ID',
          type: InputType.TextField,
          placeholder: 'E.g. 394bd587-7be4-4ffb-a113-198c6a7764c2',
          options: snapState.accounts.map((account) => {
            return { value: account.address };
          }),
          onChange: (event: any) => setAccountId(event.currentTarget.value),
        },
      ],
      action: {
        disabled: Boolean(accountId),
        callback: async () => await deleteAccount(),
        label: 'Remove Account',
      },
      successMessage: 'Account Removed',
    },
    {
      name: 'Update account',
      description: 'Update an account',
      inputs: [
        {
          id: 'update-account-account-object',
          title: 'Account Object',
          type: InputType.TextArea,
          placeholder: 'E.g. { id: ... }',
          onChange: (event: any) => setAccountObject(event.currentTarget.value),
        },
      ],
      action: {
        disabled: Boolean(accountId),
        callback: async () => await updateAccount(),
        label: 'Update Account',
      },
      successMessage: 'Account Updated',
    },
  ];

  const requestMethods = [
    {
      name: 'Get request',
      description: 'Get a pending request by ID',
      inputs: [
        {
          id: 'get-request-request-id',
          title: 'Request ID',
          type: InputType.TextField,
          placeholder: 'E.g. e5156958-16ad-4d5d-9dcd-6a8ba1d34906',
          onChange: (event: any) => setRequestId(event.currentTarget.value),
        },
      ],
      action: {
        enabled: Boolean(requestId),
        callback: async () => await client.getRequest(requestId as string),
        label: 'Get Request',
      },
    },
    {
      name: 'List requests',
      description: 'List pending requests',
      action: {
        disabled: false,
        callback: async () => {
          const requests = await client.listRequests();
          setSnapState({
            ...snapState,
            pendingRequests: requests,
          });
          return requests;
        },
        label: 'List Requests',
      },
    },
    {
      name: 'Approve request',
      description: 'Approve a pending request by ID',
      inputs: [
        {
          id: 'approve-request-request-id',
          title: 'Request ID',
          type: InputType.TextField,
          placeholder: 'E.g. 6fcbe1b5-f250-452c-8114-683dfa5ea74d',
          onChange: (event: any) => {
            setRequestId(event.currentTarget.value);
          },
        },
      ],
      action: {
        disabled: !requestId,
        callback: async () => await client.approveRequest(requestId as string),
        label: 'Approve Request',
      },
      successMessage: 'Request approved',
    },
    {
      name: 'Reject request',
      description: 'Reject a pending request by ID',
      inputs: [
        {
          id: 'reject-request-request-id',
          title: 'Request ID',
          type: InputType.TextField,
          placeholder: 'E.g. 424ad2ee-56cf-493e-af82-cee79c591117',
          onChange: (event: any) => {
            setRequestId(event.currentTarget.value);
          },
        },
      ],
      action: {
        disabled: !requestId,
        callback: async () => await client.rejectRequest(requestId as string),
        label: 'Reject Request',
      },
      successMessage: 'Request Rejected',
    },
  ];

  return (
    <Container>
      <CardContainer>
        {!state.installedSnap && (
          <Card
            content={{
              title: 'Connect',
              description:
                'Get started by connecting to and installing the example snap.',
              button: (
                <ConnectButton
                  onClick={handleConnectClick}
                  disabled={!state.hasMetaMask}
                />
              ),
            }}
            disabled={!state.hasMetaMask}
          />
        )}
      </CardContainer>

      <StyledBox sx={{ flexGrow: 1 }}>
        <Grid container spacing={4} columns={[1, 2, 3]}>
          <Grid item xs={8} sm={4} md={2}>
            <DividerTitle>Options</DividerTitle>
            <Toggle
              title="Use Synchronous Approval"
              defaultChecked={snapState.useSynchronousApprovals}
              onToggle={handleUseSyncToggle}
              enabled={Boolean(state.installedSnap)}
            />
            <Divider>&nbsp;</Divider>
            <DividerTitle>Methods</DividerTitle>
            <Accordion items={accountManagementMethods} />
            <Divider />
            <DividerTitle>Request Methods</DividerTitle>
            <Accordion items={requestMethods} />
            <Divider />
          </Grid>
          <Grid item xs={4} sm={2} md={1}>
            <Divider />
            <DividerTitle>Accounts</DividerTitle>
            <AccountList
              accounts={snapState.accounts}
              handleDelete={async (accountIdToDelete) => {
                await client.deleteAccount(accountIdToDelete);
                const accounts = await client.listAccounts();
                setSnapState({
                  ...snapState,
                  accounts,
                });
              }}
            />
          </Grid>
        </Grid>
      </StyledBox>
    </Container>
  );
};

export default Index;
