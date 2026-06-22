import React, { useContext } from 'react';
import semver from 'semver';
import styled from 'styled-components';

import { HeaderButtons } from './Buttons';
import snapPackageInfo from '../../../snap/package.json';
import packageInfo from '../../package.json';
import { defaultSnapOrigin } from '../config';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import { connectSnap, getSnap } from '../utils';

const HeaderWrapper = styled.header`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 2.4rem;
  padding-left: 5%;
  padding-right: 5%;
`;

const Title = styled.p`
  font-size: ${(props) => props.theme.fontSizes.title};
  font-weight: bold;
  margin: 0;
  margin-left: 1.2rem;
  ${({ theme }) => theme.mediaQueries.small} {
    display: none;
  }
`;

const LogoWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const RightContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const VersionStyle = styled.p`
  margin-top: 1.2rem;
  font-size: 1.6rem;
  margin: auto;
  padding-right: 2rem;
  color: ${({ theme }) => theme.colors.text?.muted};
`;

export const Header = () => {
  const [state, dispatch] = useContext(MetaMaskContext);

  const updateAvailable = Boolean(
    state?.installedSnap &&
      semver.gt(snapPackageInfo.version, state.installedSnap?.version),
  );

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

  /**
   * Component that displays the dapp and snap versions.
   *
   * @returns A component that displays the dapp and snap versions.
   */
  const Version = () => {
    return (
      <VersionStyle>
        <div>
          <b>Dapp version: </b>
          {packageInfo.version}
        </div>

        <div>
          <b>Snap version (expected): </b>
          {snapPackageInfo.version}
        </div>

        {state.installedSnap ? (
          <div>
            <b>Snap version (installed): </b> {state.installedSnap?.version}
          </div>
        ) : (
          <div>
            <b>Snap version (to install): </b> {snapPackageInfo.version}
          </div>
        )}

        {defaultSnapOrigin.startsWith('local') && `(from ${defaultSnapOrigin})`}
      </VersionStyle>
    );
  };

  return (
    <HeaderWrapper>
      <LogoWrapper>
        <Title>🔑 Snap Simple Keyring</Title>
      </LogoWrapper>
      <RightContainer>
        <Version />
        <HeaderButtons
          state={state}
          onConnectClick={handleConnectClick}
          updateAvailable={updateAvailable}
        />
      </RightContainer>
    </HeaderWrapper>
  );
};
