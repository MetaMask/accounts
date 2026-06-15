/**
 * Configuration options for the Speculos BLE bridge service.
 */
export interface SpeculosBleConfig {
  /** Host where Speculos is running. */
  speculosHost: string;
  /** Speculos APDU TCP port. */
  speculosApduPort: number;
  /** Speculos HTTP API port. */
  speculosApiPort: number;
  /** Control API port for the BLE bridge. */
  controlApiPort: number;
  /** BLE device name advertised to the scanner. */
  deviceName: string;
  /** Transport mode (e.g. `android-netsim`, `vhci`). */
  transport: string;
  /** Enable verbose logging. */
  verbose: boolean;
}

/**
 * Options for constructing a {@link SpeculosBleRunner}.
 * All fields are optional; defaults are applied.
 */
export type SpeculosBleRunnerOptions = Partial<SpeculosBleConfig>;
