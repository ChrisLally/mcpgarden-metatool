import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { DATABASE_URL, dbCredentials } from './config';
import * as schema from './schema';

// Create a PostgreSQL connection pool
const pool = new Pool(dbCredentials);

// Create Drizzle database instance
export const db = drizzle(pool, { schema });
