import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, passwordResetTokensTable } from '../db/schema';
import { type JwtPayload } from '../schema';
import { adminDeleteUser } from '../handlers/admin_delete_user';
import { eq } from 'drizzle-orm';

// Test JWT payload for admin user
const adminJwtPayload: JwtPayload = {
  user_id: 1,
  email: 'admin@test.com',
  is_admin: true
};

// Test JWT payload for regular user
const userJwtPayload: JwtPayload = {
  user_id: 2,
  email: 'user@test.com',
  is_admin: false
};

describe('adminDeleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete a user as admin', async () => {
    // Create test users
    const passwordHash = 'test_password_hash';
    
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        username: 'admin',
        password_hash: passwordHash,
        first_name: 'Admin',
        last_name: 'User',
        is_admin: true,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();

    const userToDelete = await db.insert(usersTable)
      .values({
        email: 'delete@test.com',
        username: 'deleteuser',
        password_hash: passwordHash,
        first_name: 'Delete',
        last_name: 'User',
        is_admin: false,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();

    const deleteUserId = userToDelete[0].id;

    // Delete the user
    const result = await adminDeleteUser(adminJwtPayload, deleteUserId);

    // Verify response
    expect(result.success).toBe(true);
    expect(result.message).toEqual('User deleted successfully.');

    // Verify user was deleted from database
    const deletedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, deleteUserId))
      .execute();

    expect(deletedUser).toHaveLength(0);

    // Verify admin user still exists
    const remainingAdmin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminUser[0].id))
      .execute();

    expect(remainingAdmin).toHaveLength(1);
    expect(remainingAdmin[0].email).toEqual('admin@test.com');
  });

  it('should delete user and cascade delete related password reset tokens', async () => {
    // Create test user
    const passwordHash = 'test_password_hash';
    
    await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        username: 'admin',
        password_hash: passwordHash,
        is_admin: true,
        is_active: true,
        email_verified: true
      })
      .execute();

    const userToDelete = await db.insert(usersTable)
      .values({
        email: 'delete@test.com',
        username: 'deleteuser',
        password_hash: passwordHash,
        is_admin: false,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();

    const deleteUserId = userToDelete[0].id;

    // Create password reset token for user
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.insert(passwordResetTokensTable)
      .values({
        user_id: deleteUserId,
        token: 'test-token-123',
        expires_at: expiresAt,
        used: false
      })
      .execute();

    // Verify token exists before deletion
    const tokensBefore = await db.select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.user_id, deleteUserId))
      .execute();

    expect(tokensBefore).toHaveLength(1);

    // Delete the user
    const result = await adminDeleteUser(adminJwtPayload, deleteUserId);

    expect(result.success).toBe(true);

    // Verify user was deleted
    const deletedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, deleteUserId))
      .execute();

    expect(deletedUser).toHaveLength(0);

    // Verify password reset tokens were cascade deleted
    const tokensAfter = await db.select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.user_id, deleteUserId))
      .execute();

    expect(tokensAfter).toHaveLength(0);
  });

  it('should throw error when non-admin tries to delete user', async () => {
    // Create test users
    const passwordHash = 'test_password_hash';
    
    await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        username: 'user',
        password_hash: passwordHash,
        is_admin: false,
        is_active: true,
        email_verified: true
      })
      .execute();

    const userToDelete = await db.insert(usersTable)
      .values({
        email: 'delete@test.com',
        username: 'deleteuser',
        password_hash: passwordHash,
        is_admin: false,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();

    const deleteUserId = userToDelete[0].id;

    // Attempt deletion with non-admin user
    await expect(adminDeleteUser(userJwtPayload, deleteUserId))
      .rejects.toThrow(/access denied.*admin privileges required/i);

    // Verify user was not deleted
    const remainingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, deleteUserId))
      .execute();

    expect(remainingUser).toHaveLength(1);
  });

  it('should throw error when admin tries to delete themselves', async () => {
    // Create admin user
    const passwordHash = 'test_password_hash';
    
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        username: 'admin',
        password_hash: passwordHash,
        is_admin: true,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();

    const adminUserId = adminUser[0].id;

    // Create JWT payload with matching user_id
    const selfDeletionPayload: JwtPayload = {
      user_id: adminUserId,
      email: 'admin@test.com',
      is_admin: true
    };

    // Attempt self-deletion
    await expect(adminDeleteUser(selfDeletionPayload, adminUserId))
      .rejects.toThrow(/cannot delete your own account/i);

    // Verify admin user still exists
    const remainingAdmin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminUserId))
      .execute();

    expect(remainingAdmin).toHaveLength(1);
  });

  it('should throw error when trying to delete non-existent user', async () => {
    // Create admin user
    const passwordHash = 'test_password_hash';
    
    await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        username: 'admin',
        password_hash: passwordHash,
        is_admin: true,
        is_active: true,
        email_verified: true
      })
      .execute();

    const nonExistentUserId = 99999;

    // Attempt to delete non-existent user
    await expect(adminDeleteUser(adminJwtPayload, nonExistentUserId))
      .rejects.toThrow(/user not found/i);
  });

  it('should handle database errors gracefully', async () => {
    // Create admin user
    const passwordHash = 'test_password_hash';
    
    await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        username: 'admin',
        password_hash: passwordHash,
        is_admin: true,
        is_active: true,
        email_verified: true
      })
      .execute();

    const userToDelete = await db.insert(usersTable)
      .values({
        email: 'delete@test.com',
        username: 'deleteuser',
        password_hash: passwordHash,
        is_admin: false,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();

    const deleteUserId = userToDelete[0].id;

    // First deletion should succeed
    const result = await adminDeleteUser(adminJwtPayload, deleteUserId);
    expect(result.success).toBe(true);

    // Second deletion attempt should fail with user not found
    await expect(adminDeleteUser(adminJwtPayload, deleteUserId))
      .rejects.toThrow(/user not found/i);
  });
});