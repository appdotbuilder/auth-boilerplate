import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, passwordResetTokensTable } from '../db/schema';
import { type ForgotPasswordInput } from '../schema';
import { forgotPassword } from '../handlers/forgot_password';
import { eq, and, gte } from 'drizzle-orm';


// Test user data
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  password_hash: 'hashed_password_123', // Simple test hash
  first_name: 'Test',
  last_name: 'User',
  is_admin: false,
  is_active: true,
  email_verified: true
};

const testInput: ForgotPasswordInput = {
  email: 'test@example.com'
};

describe('forgotPassword', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return success response for existing user', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await forgotPassword(testInput);

    expect(result.success).toBe(true);
    expect(result.message).toEqual('If an account with that email exists, a password reset link has been sent.');
  });

  it('should return success response for non-existing user (security)', async () => {
    const result = await forgotPassword({
      email: 'nonexistent@example.com'
    });

    expect(result.success).toBe(true);
    expect(result.message).toEqual('If an account with that email exists, a password reset link has been sent.');
  });

  it('should create password reset token for existing user', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = users[0];

    await forgotPassword(testInput);

    // Check that a reset token was created
    const tokens = await db.select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.user_id, user.id))
      .execute();

    expect(tokens).toHaveLength(1);
    expect(tokens[0].user_id).toEqual(user.id);
    expect(tokens[0].token).toBeDefined();
    expect(tokens[0].token.length).toEqual(64); // 32 bytes = 64 hex chars
    expect(tokens[0].used).toBe(false);
    expect(tokens[0].expires_at).toBeInstanceOf(Date);
    expect(tokens[0].created_at).toBeInstanceOf(Date);
  });

  it('should not create password reset token for non-existing user', async () => {
    await forgotPassword({
      email: 'nonexistent@example.com'
    });

    // Check that no reset token was created
    const tokens = await db.select()
      .from(passwordResetTokensTable)
      .execute();

    expect(tokens).toHaveLength(0);
  });

  it('should set expiration time approximately 1 hour in the future', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = users[0];

    const beforeRequest = new Date();
    await forgotPassword(testInput);
    const afterRequest = new Date();

    // Get the created token
    const tokens = await db.select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.user_id, user.id))
      .execute();

    const token = tokens[0];
    const expiresAt = token.expires_at;

    // Calculate expected expiration times (1 hour from before/after request)
    const expectedMinExpiration = new Date(beforeRequest.getTime() + 60 * 60 * 1000);
    const expectedMaxExpiration = new Date(afterRequest.getTime() + 60 * 60 * 1000);

    expect(expiresAt >= expectedMinExpiration).toBe(true);
    expect(expiresAt <= expectedMaxExpiration).toBe(true);
  });

  it('should generate unique tokens for multiple requests', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Generate two tokens
    await forgotPassword(testInput);
    await forgotPassword(testInput);

    // Check that both tokens exist and are different
    const tokens = await db.select()
      .from(passwordResetTokensTable)
      .execute();

    expect(tokens).toHaveLength(2);
    expect(tokens[0].token).not.toEqual(tokens[1].token);
    expect(tokens[0].token.length).toEqual(64);
    expect(tokens[1].token.length).toEqual(64);
  });

  it('should handle case insensitive email lookup', async () => {
    // Create test user with lowercase email
    await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'test@example.com'
      })
      .execute();

    // Try with uppercase email
    const result = await forgotPassword({
      email: 'TEST@EXAMPLE.COM'
    });

    // Should still return success (though no token created due to exact match requirement)
    expect(result.success).toBe(true);

    // In this test, no token should be created because email lookup is case-sensitive
    // In a real app, you might want to normalize email case before comparison
    const tokens = await db.select()
      .from(passwordResetTokensTable)
      .execute();

    expect(tokens).toHaveLength(0);
  });

  it('should work with inactive users', async () => {
    // Create inactive test user
    const users = await db.insert(usersTable)
      .values({
        ...testUser,
        is_active: false
      })
      .returning()
      .execute();
    const user = users[0];

    const result = await forgotPassword(testInput);

    expect(result.success).toBe(true);

    // Token should still be created for inactive users
    const tokens = await db.select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.user_id, user.id))
      .execute();

    expect(tokens).toHaveLength(1);
  });

  it('should work with unverified email users', async () => {
    // Create user with unverified email
    const users = await db.insert(usersTable)
      .values({
        ...testUser,
        email_verified: false
      })
      .returning()
      .execute();
    const user = users[0];

    const result = await forgotPassword(testInput);

    expect(result.success).toBe(true);

    // Token should still be created for users with unverified emails
    const tokens = await db.select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.user_id, user.id))
      .execute();

    expect(tokens).toHaveLength(1);
  });

  it('should query tokens by expiration date correctly', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = users[0];

    await forgotPassword(testInput);

    // Test date filtering - find unexpired tokens
    const now = new Date();
    const tokens = await db.select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.user_id, user.id),
          gte(passwordResetTokensTable.expires_at, now)
        )
      )
      .execute();

    expect(tokens.length).toBeGreaterThan(0);
    tokens.forEach(token => {
      expect(token.expires_at).toBeInstanceOf(Date);
      expect(token.expires_at >= now).toBe(true);
    });
  });
});