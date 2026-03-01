function getEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing or empty environment variable: ${key}`);
  }
  return value;
}

function getEnvOptional(key: string, defaultValue: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") return defaultValue;
  return value;
}

function parsePort(value: string): number {
  const port = parseInt(value, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${value}. Must be 1-65535.`);
  }
  return port;
}

export const env = {
  get NODE_ENV(): string {
    return getEnvOptional("NODE_ENV", "development");
  },

  get PORT(): number {
    return parsePort(getEnvOptional("PORT", "3000"));
  },

  get DATABASE_URL(): string {
    return getEnv("DATABASE_URL");
  },
} as const;
