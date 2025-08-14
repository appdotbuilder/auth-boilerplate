import { serial, text, pgTable, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name'), // Nullable by default
  last_name: text('last_name'), // Nullable by default
  is_admin: boolean('is_admin').notNull().default(false),
  is_active: boolean('is_active').notNull().default(true),
  email_verified: boolean('email_verified').notNull().default(false),
  last_login: timestamp('last_login'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Password reset tokens table
export const passwordResetTokensTable = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expires_at: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  passwordResetTokens: many(passwordResetTokensTable),
}));

export const passwordResetTokensRelations = relations(passwordResetTokensTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [passwordResetTokensTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect; // For SELECT operations
export type NewUser = typeof usersTable.$inferInsert; // For INSERT operations

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokensTable.$inferInsert;

// Important: Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  passwordResetTokens: passwordResetTokensTable 
};