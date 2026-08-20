import { registerAs } from '@nestjs/config';

export const APP_CONFIG_KEY = 'app';

const DEFAULT_PORT = 3000;

/**
 * Origenes del WebView de Capacitor + el dev server de Angular.
 * El contrato con la app exige que estos tres esten habilitados.
 */
const DEFAULT_CORS_ORIGINS = ['capacitor://localhost', 'http://localhost', 'http://localhost:4200'];

export interface AppConfig {
  port: number;
  version: string;
  corsOrigins: string[];
}

const parsePort = (raw: string | undefined): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
};

const parseCorsOrigins = (raw: string | undefined): string[] => {
  const origins = (raw ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

  return origins.length > 0 ? origins : DEFAULT_CORS_ORIGINS;
};

export default registerAs(APP_CONFIG_KEY, (): AppConfig => ({
  port: parsePort(process.env['PORT']),
  version: process.env['APP_VERSION'] ?? '0.1.0',
  corsOrigins: parseCorsOrigins(process.env['CORS_ORIGINS']),
}));
