import { isLocalSnap } from './snap';
import type { Snap } from '../types';

export const shouldDisplayReconnectButton = (installedSnap?: Snap) =>
  installedSnap && isLocalSnap(installedSnap?.id);
