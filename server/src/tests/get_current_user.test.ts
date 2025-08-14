import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type JwtPayload } from '../schema';
import { getCurrentUser } from '../handlers/get_current_user';

// Test JWT payload
const testJwtPayload: JwtPayload = {
  user_id: 1,
  email: 'john@example.com',
  is_admin: false
};

// Test user data
const testUserData = {
  email: 'john@example.com',
  username: 'john_doe',
  password_hash: '$2a$10$hashedpassword123', // Simple mock hash
  first_name: 'John',
  last_name: 'Doe',
  is_admin: false,
  is_active: true,
  email_verified: true
};

describe('getCurrentUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return current user data for valid JWT payload', async () => {
    // Create test user in database
    const insertResult = await db.insert(usersTable)
      .values(testUserData)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Update JWT payload with actual user ID
    const jwtPayload: JwtPayload = {
      ...testJwtPayload,
      user_id: createdUser.id
    };

    // Get current user
    const result = await getCurrentUser(jwtPayload);

    // Verify user data is returned correctly
    expect(result.id).toEqual(createdUser.id);
    expect(result.email).toEqual('john@example.com');
    expect(result.username).toEqual('john_doe');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.is_admin).toEqual(false);
    expect(result.is_active).toEqual(true);
    expect(result.email_verified).toEqual(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.last_login).toBeNull();

    // Verify sensitive data is not included
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should return user with nullable fields', async () => {
    // Create user with nullable fields set to null
    const userDataWithNulls = {
      ...testUserData,
      first_name: null,
      last_name: null,
      last_login: null
    };

    const insertResult = await db.insert(usersTable)
      .values(userDataWithNulls)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    const jwtPayload: JwtPayload = {
      ...testJwtPayload,
      user_id: createdUser.id
    };

    const result = await getCurrentUser(jwtPayload);

    expect(result.id).toEqual(createdUser.id);
    expect(result.first_name).toBeNull();
    expect(result.last_name).toBeNull();
    expect(result.last_login).toBeNull();
    expect(result.email).toEqual('john@example.com');
    expect(result.username).toEqual('john_doe');
  });

  it('should return user with admin privileges', async () => {
    // Create admin user
    const adminUserData = {
      ...testUserData,
      email: 'admin@example.com',
      username: 'admin_user',
      is_admin: true
    };

    const insertResult = await db.insert(usersTable)
      .values(adminUserData)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    const jwtPayload: JwtPayload = {
      user_id: createdUser.id,
      email: 'admin@example.com',
      is_admin: true
    };

    const result = await getCurrentUser(jwtPayload);

    expect(result.id).toEqual(createdUser.id);
    expect(result.is_admin).toEqual(true);
    expect(result.email).toEqual('admin@example.com');
    expect(result.username).toEqual('admin_user');
  });

  it('should return user with last_login timestamp', async () => {
    const lastLoginDate = new Date('2024-01-15T10:30:00Z');
    
    const userDataWithLogin = {
      ...testUserData,
      last_login: lastLoginDate
    };

    const insertResult = await db.insert(usersTable)
      .values(userDataWithLogin)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    const jwtPayload: JwtPayload = {
      ...testJwtPayload,
      user_id: createdUser.id
    };

    const result = await getCurrentUser(jwtPayload);

    expect(result.id).toEqual(createdUser.id);
    expect(result.last_login).toBeInstanceOf(Date);
    expect(result.last_login).toEqual(lastLoginDate);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentJwtPayload: JwtPayload = {
      user_id: 99999, // Non-existent user ID
      email: 'nonexistent@example.com',
      is_admin: false
    };

    await expect(getCurrentUser(nonExistentJwtPayload))
      .rejects.toThrow(/user with id 99999 not found/i);
  });

  it('should handle inactive user correctly', async () => {
    // Create inactive user
    const inactiveUserData = {
      ...testUserData,
      is_active: false,
      email_verified: false
    };

    const insertResult = await db.insert(usersTable)
      .values(inactiveUserData)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    const jwtPayload: JwtPayload = {
      ...testJwtPayload,
      user_id: createdUser.id
    };

    const result = await getCurrentUser(jwtPayload);

    expect(result.id).toEqual(createdUser.id);
    expect(result.is_active).toEqual(false);
    expect(result.email_verified).toEqual(false);
    expect(result.email).toEqual('john@example.com');
  });
});