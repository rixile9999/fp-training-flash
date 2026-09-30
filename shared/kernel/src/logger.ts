export interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export function createConsoleLogger(scope: string): Logger {
  const line = (level: string, message: string, fields?: Record<string, unknown>) =>
    JSON.stringify({ level, scope, message, ...fields, at: new Date().toISOString() });
  return {
    info: (m, f) => console.log(line("info", m, f)),
    warn: (m, f) => console.warn(line("warn", m, f)),
    error: (m, f) => console.error(line("error", m, f)),
  };
}

export const silentLogger: Logger = { info: () => {}, warn: () => {}, error: () => {} };
