import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createHash } from 'crypto';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type AdminCreateUserInput, type JwtPayload } from '../schema';
import { adminCreateUser } from '../handlers/admin_create_user';
import { eq } from 'drizzle-orm';

// Admin JWT payload for testing
const adminJwtPayload: JwtPayload = {
  user_id: 1,
  email: 'admin@example.com',
  is_admin: true
};

// Non-admin JWT payload for testing
const userJwtPayload: JwtPayload = {
  user_id: 2,
  email: 'user@example.com',
  is_admin: false
};

// Test input with all fields
const testInput: AdminCreateUserInput = {
  email: 'newuser@example.com',
  username: 'newuser123',
  password: 'SecurePassword123!',
  first_name: 'John',
  last_name: 'Doe',
  is_admin: false,
  is_active: true,
  email_verified: true
};

describe('adminCreateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with admin privileges', async () => {
    const result = await adminCreateUser(adminJwtPayload, testInput);

    // Verify basic fields
    expect(result.email).toEqual('newuser@example.com');
    expect(result.username).toEqual('newuser123');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.is_admin).toEqual(false);
    expect(result.is_active).toEqual(true);
    expect(result.email_verified).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.last_login).toBeNull();
  });

  it('should save user to database with hashed password', async () => {
    const result = await adminCreateUser(adminJwtPayload, testInput);

    // Query the database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('newuser@example.com');
    expect(savedUser.username).toEqual('newuser123');
    expect(savedUser.first_name).toEqual('John');
    expect(savedUser.last_name).toEqual('Doe');
    expect(savedUser.is_admin).toEqual(false);
    expect(savedUser.is_active).toEqual(true);
    expect(savedUser.email_verified).toEqual(true);

    // Verify password is hashed and valid
    expect(savedUser.password_hash).not.toEqual('SecurePassword123!');
    expect(savedUser.password_hash).toContain(':'); // Should contain salt separator
    
    // Verify password can be validated
    const [salt, hash] = savedUser.password_hash.split(':');
    const expectedHash = createHash('sha256').update(salt + 'SecurePassword123!').digest('hex');
    expect(hash).toEqual(expectedHash);
  });

  it('should use default values when optional fields are not provided', async () => {
    const minimalInput: AdminCreateUserInput = {
      email: 'minimal@example.com',
      username: 'minimal123',
      password: 'SecurePassword123!',
      first_name: null,
      last_name: null
    };

    const result = await adminCreateUser(adminJwtPayload, minimalInput);

    expect(result.email).toEqual('minimal@example.com');
    expect(result.username).toEqual('minimal123');
    expect(result.first_name).toBeNull();
    expect(result.last_name).toBeNull();
    expect(result.is_admin).toEqual(false); // Default value
    expect(result.is_active).toEqual(true); // Default value
    expect(result.email_verified).toEqual(false); // Default value
  });

  it('should create admin user when is_admin is true', async () => {
    const adminInput: AdminCreateUserInput = {
      ...testInput,
      email: 'newadmin@example.com',
      username: 'newadmin123',
      is_admin: true
    };

    const result = await adminCreateUser(adminJwtPayload, adminInput);

    expect(result.is_admin).toEqual(true);

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].is_admin).toEqual(true);
  });

  it('should reject creation by non-admin user', async () => {
    await expect(adminCreateUser(userJwtPayload, testInput))
      .rejects.toThrow(/unauthorized.*admin privileges required/i);
  });

  it('should reject duplicate email', async () => {
    // Create first user
    await adminCreateUser(adminJwtPayload, testInput);

    // Try to create user with same email but different username
    const duplicateEmailInput: AdminCreateUserInput = {
      ...testInput,
      username: 'different123'
    };

    await expect(adminCreateUser(adminJwtPayload, duplicateEmailInput))
      .rejects.toThrow(/email already exists/i);
  });

  it('should reject duplicate username', async () => {
    // Create first user
    await adminCreateUser(adminJwtPayload, testInput);

    // Try to create user with same username but different email
    const duplicateUsernameInput: AdminCreateUserInput = {
      ...testInput,
      email: 'different@example.com'
    };

    await expect(adminCreateUser(adminJwtPayload, duplicateUsernameInput))
      .rejects.toThrow(/username already exists/i);
  });

  it('should create inactive user when is_active is false', async () => {
    const inactiveInput: AdminCreateUserInput = {
      ...testInput,
      email: 'inactive@example.com',
      username: 'inactive123',
      is_active: false
    };

    const result = await adminCreateUser(adminJwtPayload, inactiveInput);

    expect(result.is_active).toEqual(false);

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].is_active).toEqual(false);
  });

  it('should create unverified user when email_verified is false', async () => {
    const unverifiedInput: AdminCreateUserInput = {
      ...testInput,
      email: 'unverified@example.com',
      username: 'unverified123',
      email_verified: false
    };

    const result = await adminCreateUser(adminJwtPayload, unverifiedInput);

    expect(result.email_verified).toEqual(false);

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].email_verified).toEqual(false);
  });
});