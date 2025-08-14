import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, passwordResetTokensTable } from '../db/schema';
import { type ResetPasswordInput } from '../schema';
import { resetPassword, verifyPassword } from '../handlers/reset_password';
import { eq } from 'drizzle-orm';
import { pbkdf2Sync, randomBytes } from 'crypto';

// Helper function to hash password for test setup
function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

describe('resetPassword', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let validToken: string;
  
  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: hashPassword('oldpassword123'),
        first_name: 'Test',
        last_name: 'User',
        is_admin: false,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
    
    // Create valid reset token
    validToken = 'valid-reset-token-123';
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Valid for 1 hour
    
    await db.insert(passwordResetTokensTable)
      .values({
        user_id: testUserId,
        token: validToken,
        expires_at: expiresAt,
        used: false
      })
      .execute();
  });

  const validInput: ResetPasswordInput = {
    token: 'valid-reset-token-123',
    new_password: 'newpassword123'
  };

  it('should successfully reset password with valid token', async () => {
    const result = await resetPassword(validInput);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Password has been reset successfully. Please log in with your new password.');

    // Verify password was updated in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const user = users[0];
    const passwordMatches = verifyPassword('newpassword123', user.password_hash);
    expect(passwordMatches).toBe(true);

    // Verify old password no longer works
    const oldPasswordMatches = verifyPassword('oldpassword123', user.password_hash);
    expect(oldPasswordMatches).toBe(false);
  });

  it('should mark reset token as used', async () => {
    await resetPassword(validInput);

    // Verify token is marked as used
    const tokens = await db.select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.token, validToken))
      .execute();

    expect(tokens).toHaveLength(1);
    expect(tokens[0].used).toBe(true);
  });

  it('should update user updated_at timestamp', async () => {
    // Get original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const originalUpdatedAt = originalUser[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    await resetPassword(validInput);

    // Check updated timestamp
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser[0].updated_at).not.toEqual(originalUpdatedAt);
    expect(updatedUser[0].updated_at > originalUpdatedAt).toBe(true);
  });

  it('should reject invalid token', async () => {
    const invalidInput: ResetPasswordInput = {
      token: 'invalid-token',
      new_password: 'newpassword123'
    };

    await expect(resetPassword(invalidInput))
      .rejects
      .toThrow(/invalid or expired reset token/i);
  });

  it('should reject already used token', async () => {
    // Mark token as used
    await db.update(passwordResetTokensTable)
      .set({ used: true })
      .where(eq(passwordResetTokensTable.token, validToken))
      .execute();

    await expect(resetPassword(validInput))
      .rejects
      .toThrow(/already been used/i);
  });

  it('should reject expired token', async () => {
    // Create expired token
    const expiredToken = 'expired-token-123';
    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() - 1); // Expired 1 hour ago

    await db.insert(passwordResetTokensTable)
      .values({
        user_id: testUserId,
        token: expiredToken,
        expires_at: expiredDate,
        used: false
      })
      .execute();

    const expiredInput: ResetPasswordInput = {
      token: expiredToken,
      new_password: 'newpassword123'
    };

    await expect(resetPassword(expiredInput))
      .rejects
      .toThrow(/token has expired/i);
  });

  it('should hash password with proper salt', async () => {
    await resetPassword(validInput);

    // Verify password was properly hashed
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const user = users[0];
    
    // Check that it's a salted hash (contains colon separator)
    expect(user.password_hash).toMatch(/^[a-f0-9]{64}:[a-f0-9]{128}$/);
    
    // Ensure it's not the plain text password
    expect(user.password_hash).not.toBe('newpassword123');

    // Verify the salt is different each time
    const anotherUser = await db.insert(usersTable)
      .values({
        email: 'test2@example.com',
        username: 'testuser2',
        password_hash: hashPassword('newpassword123'),
        first_name: 'Test2',
        last_name: 'User2',
        is_admin: false,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();

    const [salt1] = user.password_hash.split(':');
    const [salt2] = anotherUser[0].password_hash.split(':');
    expect(salt1).not.toBe(salt2);
  });

  it('should handle nonexistent user gracefully', async () => {
    // Delete the user but keep the token
    await db.delete(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    // Should handle the foreign key constraint gracefully
    await expect(resetPassword(validInput))
      .rejects
      .toThrow();
  });

  it('should verify password helper works correctly', () => {
    const password = 'testpassword123';
    const hashedPassword = hashPassword(password);
    
    // Should verify correct password
    expect(verifyPassword(password, hashedPassword)).toBe(true);
    
    // Should reject incorrect password
    expect(verifyPassword('wrongpassword', hashedPassword)).toBe(false);
    
    // Should reject malformed hash
    expect(verifyPassword(password, 'invalid-hash')).toBe(false);
  });
});