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
 * The BLE process stream (or lifecycle event) that produced a log line.
 */
export type SpeculosBleLogStream = 'stdout' | 'stderr' | 'exit' | 'error';

/**
 * Options for constructing a {@link SpeculosBleRunner}.
 * All fields are optional; defaults are applied.
 */
export type SpeculosBleRunnerOptions = Partial<SpeculosBleConfig> & {
  /**
   * Optional sink for BLE process output and lifecycle events.
   * When omitted, stdout/stderr/exit/error are silently dropped.
   * Useful for wiring the runner into a host logger (e.g. Detox test logger).
   */
  onLog?: (line: string, stream: SpeculosBleLogStream) => void;
};
