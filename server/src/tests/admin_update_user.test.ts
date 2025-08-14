import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type AdminUpdateUserInput, type JwtPayload } from '../schema';
import { adminUpdateUser } from '../handlers/admin_update_user';
import { eq } from 'drizzle-orm';


// Test JWT payload for admin user
const adminJwtPayload: JwtPayload = {
  user_id: 1,
  email: 'admin@example.com',
  is_admin: true
};

// Test JWT payload for non-admin user
const userJwtPayload: JwtPayload = {
  user_id: 2,
  email: 'user@example.com',
  is_admin: false
};

describe('adminUpdateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let adminUserId: number;
  let regularUserId: number;
  let targetUserId: number;

  beforeEach(async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        username: 'admin',
        password_hash: 'hashed_password_admin',
        first_name: 'Admin',
        last_name: 'User',
        is_admin: true,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();
    adminUserId = adminResult[0].id;

    // Create regular user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        username: 'user',
        password_hash: 'hashed_password_user',
        first_name: 'Regular',
        last_name: 'User',
        is_admin: false,
        is_active: true,
        email_verified: false
      })
      .returning()
      .execute();
    regularUserId = userResult[0].id;

    // Create target user to update
    const targetResult = await db.insert(usersTable)
      .values({
        email: 'target@example.com',
        username: 'target',
        password_hash: 'hashed_password_target',
        first_name: 'Target',
        last_name: 'User',
        is_admin: false,
        is_active: true,
        email_verified: false
      })
      .returning()
      .execute();
    targetUserId = targetResult[0].id;
  });

  it('should successfully update user when admin requests', async () => {
    const input: AdminUpdateUserInput = {
      id: targetUserId,
      email: 'updated@example.com',
      username: 'updated_target',
      first_name: 'Updated',
      last_name: 'Target',
      is_admin: false,
      is_active: true,
      email_verified: true
    };

    const result = await adminUpdateUser(adminJwtPayload, input);

    // Verify returned data
    expect(result.id).toEqual(targetUserId);
    expect(result.email).toEqual('updated@example.com');
    expect(result.username).toEqual('updated_target');
    expect(result.first_name).toEqual('Updated');
    expect(result.last_name).toEqual('Target');
    expect(result.is_admin).toEqual(false);
    expect(result.is_active).toEqual(true);
    expect(result.email_verified).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify password_hash is not included
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should update user in database', async () => {
    const input: AdminUpdateUserInput = {
      id: targetUserId,
      email: 'database_updated@example.com',
      username: 'db_updated',
      first_name: 'Database',
      last_name: 'Updated',
      is_admin: true,
      is_active: false,
      email_verified: true
    };

    await adminUpdateUser(adminJwtPayload, input);

    // Query database to verify changes
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, targetUserId))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].email).toEqual('database_updated@example.com');
    expect(updatedUser[0].username).toEqual('db_updated');
    expect(updatedUser[0].first_name).toEqual('Database');
    expect(updatedUser[0].last_name).toEqual('Updated');
    expect(updatedUser[0].is_admin).toEqual(true);
    expect(updatedUser[0].is_active).toEqual(false);
    expect(updatedUser[0].email_verified).toEqual(true);
  });

  it('should update only provided fields', async () => {
    const input: AdminUpdateUserInput = {
      id: targetUserId,
      email: 'partial@example.com',
      is_admin: true
    };

    const result = await adminUpdateUser(adminJwtPayload, input);

    // Verify only specified fields were updated
    expect(result.email).toEqual('partial@example.com');
    expect(result.is_admin).toEqual(true);
    
    // Verify other fields remained unchanged
    expect(result.username).toEqual('target');
    expect(result.first_name).toEqual('Target');
    expect(result.last_name).toEqual('User');
    expect(result.is_active).toEqual(true);
    expect(result.email_verified).toEqual(false);
  });

  it('should handle null values correctly', async () => {
    const input: AdminUpdateUserInput = {
      id: targetUserId,
      first_name: null,
      last_name: null
    };

    const result = await adminUpdateUser(adminJwtPayload, input);

    expect(result.first_name).toBeNull();
    expect(result.last_name).toBeNull();
  });

  it('should throw error when non-admin tries to update', async () => {
    const input: AdminUpdateUserInput = {
      id: targetUserId,
      email: 'unauthorized@example.com'
    };

    await expect(adminUpdateUser(userJwtPayload, input))
      .rejects.toThrow(/access denied.*admin privileges required/i);
  });

  it('should throw error when user not found', async () => {
    const input: AdminUpdateUserInput = {
      id: 99999,
      email: 'notfound@example.com'
    };

    await expect(adminUpdateUser(adminJwtPayload, input))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error when email already exists', async () => {
    const input: AdminUpdateUserInput = {
      id: targetUserId,
      email: 'user@example.com' // Email already used by regularUserId
    };

    await expect(adminUpdateUser(adminJwtPayload, input))
      .rejects.toThrow(/email already exists/i);
  });

  it('should throw error when username already exists', async () => {
    const input: AdminUpdateUserInput = {
      id: targetUserId,
      username: 'user' // Username already used by regularUserId
    };

    await expect(adminUpdateUser(adminJwtPayload, input))
      .rejects.toThrow(/username already exists/i);
  });

  it('should allow updating to same email/username', async () => {
    const input: AdminUpdateUserInput = {
      id: targetUserId,
      email: 'target@example.com', // Same email as target user
      username: 'target', // Same username as target user
      first_name: 'Updated'
    };

    const result = await adminUpdateUser(adminJwtPayload, input);

    expect(result.email).toEqual('target@example.com');
    expect(result.username).toEqual('target');
    expect(result.first_name).toEqual('Updated');
  });

  it('should prevent admin from demoting themselves', async () => {
    const input: AdminUpdateUserInput = {
      id: adminUserId,
      is_admin: false
    };

    await expect(adminUpdateUser(adminJwtPayload, input))
      .rejects.toThrow(/cannot remove admin privileges from your own account/i);
  });

  it('should allow admin to update their other fields', async () => {
    const input: AdminUpdateUserInput = {
      id: adminUserId,
      first_name: 'Updated Admin',
      email: 'updated_admin@example.com'
    };

    const result = await adminUpdateUser(adminJwtPayload, input);

    expect(result.first_name).toEqual('Updated Admin');
    expect(result.email).toEqual('updated_admin@example.com');
    expect(result.is_admin).toEqual(true); // Should remain admin
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, targetUserId))
      .execute();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: AdminUpdateUserInput = {
      id: targetUserId,
      first_name: 'Timestamp Test'
    };

    const result = await adminUpdateUser(adminJwtPayload, input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUser[0].updated_at!.getTime());
  });
});