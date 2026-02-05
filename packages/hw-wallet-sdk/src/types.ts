import { HardwareWalletError } from './hardware-error';

export enum HardwareWalletType {
  Ledger = 'ledger',
  Trezor = 'trezor',
  OneKey = 'oneKey',
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
  Disconnected = 'disconnected',
  DeviceLocked = 'device_locked',
  ConnectionFailed = 'connection_failed',
  OperationTimeout = 'operation_timeout',
  Connected = 'connected',
  AppOpened = 'app_opened',
  AppNotOpen = 'app_not_open',
  AppChanged = 'app_changed',
  ConfirmationRequired = 'confirmation_required',
  ConfirmationReceived = 'confirmation_received',
  ConfirmationRejected = 'confirmation_rejected',
  PermissionChanged = 'permission_changed',
}

export type HardwareWalletConnectionState =
  | { status: ConnectionStatus.Disconnected }
  | { status: ConnectionStatus.Scanning }
  | { status: ConnectionStatus.Connecting; deviceId?: string }
  | { status: ConnectionStatus.Connected; deviceId: string }
  | { status: ConnectionStatus.Ready }
  | { status: ConnectionStatus.AwaitingApp; deviceId: string; appName?: string }
  | {
      status: ConnectionStatus.AwaitingConfirmation;
      deviceId: string;
      operationType?: string;
    }
  | { status: ConnectionStatus.ErrorState; error: HardwareWalletError | Error }
  | { status: ConnectionStatus.Ready; deviceId?: string };

export interface DeviceEventPayload {
  event: DeviceEvent;
  deviceId?: string;
  deviceName?: string;
  currentAppName?: string;
  previousAppName?: string;
  error?: Error;
  metadata?: Record<string, unknown>;
}
