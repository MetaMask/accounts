/**
 * Logging levels.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log function signature.
 */
type LogFunction = (message?: any, ...optionalParams: any[]) => void;

/**
 * Logger context.
 */
type LoggerContext = {
  threshold: LogLevel;
  handlers: Record<LogLevel, LogFunction>;
};

/**
 * Returns the default logging level.
 *
 * @returns The default logging level.
 */
function getDefaultLevel(): LogLevel {
  return process.env.NODE_ENV === 'development'
    ? LogLevel.DEBUG
    : LogLevel.WARN;
}

/**
 * Logger internal context.
 */
const DEFAULT_CONTEXT: LoggerContext = {
  threshold: getDefaultLevel(),
  handlers: {
    [LogLevel.DEBUG]: console.debug,
    [LogLevel.INFO]: console.info,
    [LogLevel.WARN]: console.warn,
    [LogLevel.ERROR]: console.error,
  },
} as const;

export class Logger {
  #context: LoggerContext;

  constructor(context: Partial<LoggerContext> = {}) {
    this.#context = {
      ...DEFAULT_CONTEXT,
      ...context,
    };
  }

  /**
   * Sets the logging level.
   *
   * @param level - Log level to set.
   */
  setLevel(level: LogLevel): void {
    this.#context.threshold = level;
  }

  /**
   * Logs a message at the specified level.
   *
   * @param level - Log level of the message.
   * @param message - Message to log.
   * @param optionalParams - Optional parameters to log.
   */
  #log(
    level: LogLevel = LogLevel.DEBUG,
    message?: any,
    ...optionalParams: any[]
  ): void {
    const { threshold, handlers } = this.#context;
    if (level >= threshold) {
      handlers[level](message, ...optionalParams);
    }
  }

  /**
   * Logs a DEBUG message.
   *
   * @param message - Message to log.
   * @param optionalParams - Optional parameters to log.
   */
  debug(message?: any, ...optionalParams: any[]): void {
    this.#log(LogLevel.DEBUG, message, ...optionalParams);
  }

  /**
   * Logs an INFO message.
   *
   * @param message - Message to log.
   * @param optionalParams - Optional parameters to log.
   */
  info(message?: any, ...optionalParams: any[]): void {
    this.#log(LogLevel.INFO, message, ...optionalParams);
  }

  /**
   * Logs a WARN message.
   *
   * @param message - Message to log.
   * @param optionalParams - Optional parameters to log.
   */
  warn(message?: any, ...optionalParams: any[]): void {
    this.#log(LogLevel.WARN, message, ...optionalParams);
  }

  /**
   * Logs an ERROR message.
   *
   * @param message - Message to log.
   * @param optionalParams - Optional parameters to log.
   */
  error(message?: any, ...optionalParams: any[]): void {
    this.#log(LogLevel.ERROR, message, ...optionalParams);
  }
}

/**
 * Exported logger object.
 */
export const logger = new Logger();
