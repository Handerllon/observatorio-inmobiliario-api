/**
 * Logger Service
 * 
 * Servicio centralizado de logging con 4 niveles:
 * - DEBUG: Muestra todos los mensajes incluyendo ejecuciones internas
 * - INFO: Logging de peticiones de los usuarios hacia la API
 * - WARNING: Errores no bloqueantes y avisos
 * - ERROR: Errores que "rompen" la aplicación
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel;

  private constructor() {
    // Por defecto: INFO (puedes cambiar según NODE_ENV)
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    
    switch (envLevel) {
      case 'DEBUG':
        this.currentLevel = LogLevel.DEBUG;
        break;
      case 'INFO':
        this.currentLevel = LogLevel.INFO;
        break;
      case 'WARNING':
        this.currentLevel = LogLevel.WARNING;
        break;
      case 'ERROR':
        this.currentLevel = LogLevel.ERROR;
        break;
      default:
        this.currentLevel = process.env.NODE_ENV === 'production' 
          ? LogLevel.INFO 
          : LogLevel.DEBUG;
    }
  }

  /**
   * Obtiene la instancia singleton del Logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Formatea la fecha y hora actual
   */
  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Método genérico de logging
   */
  private log(level: LogLevel, levelName: string, message: string, ...args: any[]): void {
    if (level < this.currentLevel) {
      return; // No loguear si el nivel es menor al configurado
    }

    const timestamp = this.getTimestamp();
    const formattedMessage = `[ ${timestamp} - ${levelName} ] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.log(formattedMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, ...args);
        break;
      case LogLevel.WARNING:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }
  }

  /**
   * DEBUG: Muestra todos los mensajes incluyendo ejecuciones internas
   */
  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, ...args);
  }

  /**
   * INFO: Logging de peticiones de los usuarios hacia la API
   */
  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, 'INFO', message, ...args);
  }

  /**
   * WARNING: Errores no bloqueantes y avisos
   */
  public warning(message: string, ...args: any[]): void {
    this.log(LogLevel.WARNING, 'WARNING', message, ...args);
  }

  /**
   * ERROR: Errores que "rompen" la aplicación
   */
  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, 'ERROR', message, ...args);
  }

  /**
   * Cambia el nivel de logging dinámicamente
   */
  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Obtiene el nivel de logging actual
   */
  public getLevel(): LogLevel {
    return this.currentLevel;
  }
}

// Exportar instancia singleton para uso directo
export const logger = Logger.getInstance();

