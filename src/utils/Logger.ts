/**
 * Utility class for consistent logging throughout the application
 */
export class Logger {
  private context: string;
  
  /**
   * Create a new logger with the specified context
   * @param context The context name to prefix log messages with
   */
  constructor(context: string) {
    this.context = context;
  }
  
  /**
   * Log an informational message
   * @param message The message to log
   * @param args Optional arguments to include
   */
  public log(message: string, ...args: any[]): void {
    if (args.length > 0) {
      console.log(`[${this.context}] ${message}`, ...args);
    } else {
      console.log(`[${this.context}] ${message}`);
    }
  }
  
  /**
   * Log a warning message
   * @param message The warning message to log
   * @param args Optional arguments to include
   */
  public warn(message: string, ...args: any[]): void {
    if (args.length > 0) {
      console.warn(`[${this.context}] WARNING: ${message}`, ...args);
    } else {
      console.warn(`[${this.context}] WARNING: ${message}`);
    }
  }
  
  /**
   * Log an error message
   * @param message The error message to log
   * @param args Optional arguments to include
   */
  public error(message: string, ...args: any[]): void {
    if (args.length > 0) {
      console.error(`[${this.context}] ERROR: ${message}`, ...args);
    } else {
      console.error(`[${this.context}] ERROR: ${message}`);
    }
  }
  
  /**
   * Log a debug message (only in development environments)
   * @param message The debug message to log
   * @param args Optional arguments to include
   */
  public debug(message: string, ...args: any[]): void {
    // Only log debug messages in development mode
    if (process.env.NODE_ENV !== 'production') {
      if (args.length > 0) {
        console.debug(`[${this.context}] DEBUG: ${message}`, ...args);
      } else {
        console.debug(`[${this.context}] DEBUG: ${message}`);
      }
    }
  }
} 