import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type JwtPayload } from '../schema';
import { adminGetUser } from '../handlers/admin_get_user';

// Test data
const adminJwtPayload: JwtPayload = {
  user_id: 1,
  email: 'admin@example.com',
  is_admin: true
};

const userJwtPayload: JwtPayload = {
  user_id: 2,
  email: 'user@example.com',
  is_admin: false
};

// Simple test password hash (not for production use)
const testPasswordHash = 'hashed_password_123';

describe('adminGetUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully retrieve a user when called by admin', async () => {
    // Create test users
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        username: 'admin_user',
        password_hash: testPasswordHash,
        first_name: 'Admin',
        last_name: 'User',
        is_admin: true,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();

    const targetUser = await db.insert(usersTable)
      .values({
        email: 'target@example.com',
        username: 'target_user',
        password_hash: testPasswordHash,
        first_name: 'Target',
        last_name: 'User',
        is_admin: false,
        is_active: true,
        email_verified: false
      })
      .returning()
      .execute();

    // Test retrieving the target user
    const result = await adminGetUser(adminJwtPayload, targetUser[0].id);

    // Verify all fields are returned correctly
    expect(result.id).toEqual(targetUser[0].id);
    expect(result.email).toEqual('target@example.com');
    expect(result.username).toEqual('target_user');
    expect(result.first_name).toEqual('Target');
    expect(result.last_name).toEqual('User');
    expect(result.is_admin).toEqual(false);
    expect(result.is_active).toEqual(true);
    expect(result.email_verified).toEqual(false);
    expect(result.last_login).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify password_hash is not included in the response
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should retrieve user with nullable fields correctly', async () => {
    // Create a user with null values for optional fields
    await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        username: 'admin_user',
        password_hash: testPasswordHash,
        is_admin: true
      })
      .returning()
      .execute();

    const targetUser = await db.insert(usersTable)
      .values({
        email: 'minimal@example.com',
        username: 'minimal_user',
        password_hash: testPasswordHash,
        first_name: null,
        last_name: null,
        is_admin: false,
        is_active: true,
        email_verified: true,
        last_login: null
      })
      .returning()
      .execute();

    const result = await adminGetUser(adminJwtPayload, targetUser[0].id);

    // Verify nullable fields are handled correctly
    expect(result.first_name).toBeNull();
    expect(result.last_name).toBeNull();
    expect(result.last_login).toBeNull();
    expect(result.id).toEqual(targetUser[0].id);
    expect(result.email).toEqual('minimal@example.com');
    expect(result.username).toEqual('minimal_user');
  });

  it('should throw error when called by non-admin user', async () => {
    // Create test users
    const targetUser = await db.insert(usersTable)
      .values({
        email: 'target@example.com',
        username: 'target_user',
        password_hash: testPasswordHash,
        first_name: 'Target',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Test that non-admin cannot retrieve user
    await expect(
      adminGetUser(userJwtPayload, targetUser[0].id)
    ).rejects.toThrow(/unauthorized.*admin.*required/i);
  });

  it('should throw error when user is not found', async () => {
    // Create admin user
    await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        username: 'admin_user',
        password_hash: testPasswordHash,
        is_admin: true
      })
      .returning()
      .execute();

    // Test with non-existent user ID
    await expect(
      adminGetUser(adminJwtPayload, 99999)
    ).rejects.toThrow(/user not found/i);
  });

  it('should allow admin to retrieve their own user data', async () => {
    // Create admin user
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        username: 'admin_user',
        password_hash: testPasswordHash,
        first_name: 'Admin',
        last_name: 'User',
        is_admin: true,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();

    // Admin retrieving their own data
    const result = await adminGetUser({
      user_id: adminUser[0].id,
      email: 'admin@example.com',
      is_admin: true
    }, adminUser[0].id);

    expect(result.id).toEqual(adminUser[0].id);
    expect(result.email).toEqual('admin@example.com');
    expect(result.username).toEqual('admin_user');
    expect(result.is_admin).toEqual(true);
  });

  it('should handle user with last_login timestamp correctly', async () => {
    // Create users with specific last_login times
    const lastLoginTime = new Date('2024-01-15T10:30:00Z');
    
    await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        username: 'admin_user',
        password_hash: testPasswordHash,
        is_admin: true
      })
      .returning()
      .execute();

    const targetUser = await db.insert(usersTable)
      .values({
        email: 'target@example.com',
        username: 'target_user',
        password_hash: testPasswordHash,
        first_name: 'Target',
        last_name: 'User',
        last_login: lastLoginTime
      })
      .returning()
      .execute();

    const result = await adminGetUser(adminJwtPayload, targetUser[0].id);

    expect(result.last_login).toBeInstanceOf(Date);
    expect(result.last_login?.getTime()).toEqual(lastLoginTime.getTime());
  });
});