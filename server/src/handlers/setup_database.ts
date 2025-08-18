import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as schema from "../db/schema";
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { createAdminUser } from './create_admin_user';

export const resetDB = async () => {
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
};

export const createDB = async () => {
  const migrationStatements = await generateMigration(
    generateDrizzleJson({}),
    generateDrizzleJson({ ...schema })
  );
  await db.execute(migrationStatements.join('\n'));
  
  // Create admin user after database setup
  await createAdminUser();
};

export const setupDatabase = async () => {
  await resetDB();
  await createDB();
  return { success: true, message: 'Database setup complete with admin user' };
};