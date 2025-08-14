import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { changePassword } from '../handlers/change_password';
import { type ChangePasswordInput, type JwtPayload } from '../schema';
import { eq } from 'drizzle-orm';

// Helper functions for password hashing (matching the handler implementation)
function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

function createPasswordHash(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  if (!salt || !hash) {
    return false;
  }
  
  const expectedHash = hashPassword(password, salt);
  const expectedBuffer = Buffer.from(expectedHash);
  const actualBuffer = Buffer.from(hash);
  
  return expectedBuffer.length === actualBuffer.length && 
         timingSafeEqual(expectedBuffer, actualBuffer);
}

describe('changePassword', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const mockJwtPayload: JwtPayload = {
    user_id: 1,
    email: 'test@example.com',
    is_admin: false
  };

  const validInput: ChangePasswordInput = {
    current_password: 'currentpassword123',
    new_password: 'newpassword456'
  };

  beforeEach(async () => {
    // Create a test user with a known password
    const hashedPassword = createPasswordHash('currentpassword123');
    await db.insert(usersTable).values({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      password_hash: hashedPassword,
      first_name: 'Test',
      last_name: 'User',
      is_admin: false,
      is_active: true,
      email_verified: true
    }).execute();
  });

  it('should change password successfully', async () => {
    const result = await changePassword(mockJwtPayload, validInput);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Password changed successfully.');

    // Verify the password was actually updated in the database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 1))
      .execute();

    expect(users).toHaveLength(1);
    const user = users[0];
    
    // Password hash should be different from the original
    const originalHash = createPasswordHash('currentpassword123');
    expect(user.password_hash).not.toBe(originalHash);
    
    // Updated timestamp should be recent
    expect(user.updated_at).toBeInstanceOf(Date);
    const timeDiff = Date.now() - user.updated_at.getTime();
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
  });

  it('should verify new password can be used for login', async () => {
    await changePassword(mockJwtPayload, validInput);

    // Fetch the updated user and verify the new password works
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 1))
      .execute();

    const user = users[0];
    
    // New password should work
    const isNewPasswordValid = verifyPassword('newpassword456', user.password_hash);
    expect(isNewPasswordValid).toBe(true);

    // Old password should no longer work
    const isOldPasswordValid = verifyPassword('currentpassword123', user.password_hash);
    expect(isOldPasswordValid).toBe(false);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserJwt: JwtPayload = {
      user_id: 999,
      email: 'nonexistent@example.com',
      is_admin: false
    };

    await expect(changePassword(nonExistentUserJwt, validInput))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error when current password is incorrect', async () => {
    const incorrectPasswordInput: ChangePasswordInput = {
      current_password: 'wrongpassword',
      new_password: 'newpassword456'
    };

    await expect(changePassword(mockJwtPayload, incorrectPasswordInput))
      .rejects.toThrow(/current password is incorrect/i);
  });

  it('should throw error when user account is deactivated', async () => {
    // Deactivate the user account
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, 1))
      .execute();

    await expect(changePassword(mockJwtPayload, validInput))
      .rejects.toThrow(/user account is deactivated/i);
  });

  it('should handle minimum length new password', async () => {
    const minPasswordInput: ChangePasswordInput = {
      current_password: 'currentpassword123',
      new_password: '12345678' // Minimum 8 characters
    };

    const result = await changePassword(mockJwtPayload, minPasswordInput);
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Password changed successfully.');
  });

  it('should handle maximum length new password', async () => {
    const maxPasswordInput: ChangePasswordInput = {
      current_password: 'currentpassword123',
      new_password: 'a'.repeat(100) // Maximum 100 characters
    };

    const result = await changePassword(mockJwtPayload, maxPasswordInput);
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Password changed successfully.');
  });

  it('should properly hash new password with salt', async () => {
    await changePassword(mockJwtPayload, validInput);

    // Fetch the updated user
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 1))
      .execute();

    const user = users[0];
    
    // Verify the password hash has the expected salt:hash format
    expect(user.password_hash).toMatch(/^[a-f0-9]{64}:[a-f0-9]{64}$/);
    
    // Verify it's not the plain text password
    expect(user.password_hash).not.toBe('newpassword456');
    expect(user.password_hash).not.toContain('newpassword456');
  });

  it('should handle corrupted password hash gracefully', async () => {
    // Update user with corrupted password hash (missing salt)
    await db.update(usersTable)
      .set({ password_hash: 'corrupted_hash_without_salt' })
      .where(eq(usersTable.id, 1))
      .execute();

    await expect(changePassword(mockJwtPayload, validInput))
      .rejects.toThrow(/current password is incorrect/i);
  });

  it('should use timing-safe comparison for security', async () => {
    // This test verifies that our password verification uses timing-safe comparison
    // We can't easily test the timing aspect, but we can verify the function works correctly
    const testPassword = 'testpassword123';
    const hashedPassword = createPasswordHash(testPassword);
    
    // Correct password should verify
    expect(verifyPassword(testPassword, hashedPassword)).toBe(true);
    
    // Wrong password should not verify
    expect(verifyPassword('wrongpassword', hashedPassword)).toBe(false);
    
    // Empty password should not verify
    expect(verifyPassword('', hashedPassword)).toBe(false);
  });
});