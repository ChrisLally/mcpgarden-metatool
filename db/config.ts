import { z } from 'zod';

// Database configuration schema for runtime validation
const dbConfigSchema = z.object({
  host: z.string().default('metatool-postgres'),
  port: z.coerce.number().default(5432),
  database: z.string().default('metatool'),
  user: z.string().default('metatool'),
  password: z.string().default('m3t4t00l'),
});

// Type inference from schema
type DbConfig = z.infer<typeof dbConfigSchema>;

// Database configuration with environment variable overrides
const rawConfig = {
  host: process.env.DB_HOST || undefined,
  port: process.env.DB_PORT || undefined,
  database: process.env.DB_NAME || undefined,
  user: process.env.DB_USER || undefined,
  password: process.env.DB_PASSWORD || undefined,
};

// Validate and parse configuration
const dbConfig = dbConfigSchema.parse(rawConfig);

// Construct connection URL
const getConnectionUrl = (config: DbConfig): string => {
  return `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
};

export const DATABASE_URL = getConnectionUrl(dbConfig);
export const dbCredentials = {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password,
}; 