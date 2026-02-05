// istanbul ignore file

import { type HardwareWalletError } from './hardware-error';

export enum HardwareWalletType {
  Ledger = 'ledger',
  Trezor = 'trezor',
  OneKey = 'onekey',
  Lattice = 'lattice',
  Qr = 'qr',
  Unknown = 'unknown',
}

export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Scanning = 'scanning',
  Connecting = 'connecting',
  Connected = 'connected',
  Ready = 'ready',
  AwaitingApp = 'awaiting_app',
  AwaitingConfirmation = 'awaiting_confirmation',
  ErrorState = 'error',
}

export enum DeviceEvent {
  Connected = 'connected',
  Disconnected = 'disconnected',
  ConnectionFailed = 'connection_failed',
  DeviceLocked = 'device_locked',
  AppOpened = 'app_opened',
  AppNotOpen = 'app_not_open',
  AppChanged = 'app_changed',
  ConfirmationRequired = 'confirmation_required',
  ConfirmationReceived = 'confirmation_received',
  ConfirmationRejected = 'confirmation_rejected',
  OperationTimeout = 'operation_timeout',
  PermissionChanged = 'permission_changed',
}

export type HardwareWalletConnectionState =
  | { status: ConnectionStatus.Disconnected }
  | { status: ConnectionStatus.Scanning }
  | { status: ConnectionStatus.Connecting; deviceId?: string }
  | { status: ConnectionStatus.Connected; deviceId: string }
  | { status: ConnectionStatus.Ready; deviceId?: string }
  | { status: ConnectionStatus.AwaitingApp; deviceId: string; appName?: string }
  | {
      status: ConnectionStatus.AwaitingConfirmation;
      deviceId: string;
      operationType?: string;
    }
  | { status: ConnectionStatus.ErrorState; error: HardwareWalletError };

export type DeviceEventPayload = {
  event: DeviceEvent;
  deviceId?: string;
  deviceName?: string;
  currentAppName?: string;
  previousAppName?: string;
  error?: Error;
  metadata?: Record<string, unknown>;
};
