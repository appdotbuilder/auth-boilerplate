import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, hashPassword, verifyJWT } from '../handlers/login';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'testpassword123',
  first_name: 'Test',
  last_name: 'User',
  is_admin: false,
  is_active: true,
  email_verified: true
};

const adminUser = {
  email: 'admin@example.com',
  username: 'adminuser',
  password: 'adminpassword123',
  first_name: 'Admin',
  last_name: 'User',
  is_admin: true,
  is_active: true,
  email_verified: true
};

const inactiveUser = {
  email: 'inactive@example.com',
  username: 'inactiveuser',
  password: 'inactivepassword123',
  first_name: 'Inactive',
  last_name: 'User',
  is_admin: false,
  is_active: false,
  email_verified: false
};

// Helper function to create a user in the database
const createUser = async (userData: typeof testUser) => {
  const passwordHash = hashPassword(userData.password);
  
  const result = await db.insert(usersTable)
    .values({
      email: userData.email,
      username: userData.username,
      password_hash: passwordHash,
      first_name: userData.first_name,
      last_name: userData.last_name,
      is_admin: userData.is_admin,
      is_active: userData.is_active,
      email_verified: userData.email_verified
    })
    .returning()
    .execute();

  return result[0];
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully login with valid credentials', async () => {
    // Create test user
    await createUser(testUser);

    const loginInput: LoginInput = {
      email: testUser.email,
      password: testUser.password
    };

    const result = await login(loginInput);

    // Verify response structure
    expect(result).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();

    // Verify user data
    expect(result.user.email).toEqual(testUser.email);
    expect(result.user.username).toEqual(testUser.username);
    expect(result.user.first_name).toEqual(testUser.first_name);
    expect(result.user.last_name).toEqual(testUser.last_name);
    expect(result.user.is_admin).toEqual(testUser.is_admin);
    expect(result.user.is_active).toEqual(testUser.is_active);
    expect(result.user.email_verified).toEqual(testUser.email_verified);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.user.last_login).toBeInstanceOf(Date);

    // Verify JWT token structure
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('should successfully login admin user', async () => {
    // Create admin user
    await createUser(adminUser);

    const loginInput: LoginInput = {
      email: adminUser.email,
      password: adminUser.password
    };

    const result = await login(loginInput);

    // Verify admin privileges
    expect(result.user.is_admin).toBe(true);
    expect(result.user.email).toEqual(adminUser.email);
  });

  it('should update last_login timestamp on successful login', async () => {
    // Create test user
    const createdUser = await createUser(testUser);
    const originalLastLogin = createdUser.last_login;

    const loginInput: LoginInput = {
      email: testUser.email,
      password: testUser.password
    };

    await login(loginInput);

    // Query the updated user from database
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    const updatedUser = updatedUsers[0];
    expect(updatedUser.last_login).toBeDefined();
    expect(updatedUser.last_login).toBeInstanceOf(Date);
    
    // Should be different from original (which was null)
    if (originalLastLogin) {
      expect(updatedUser.last_login?.getTime()).toBeGreaterThan(originalLastLogin.getTime());
    } else {
      expect(updatedUser.last_login).not.toBeNull();
    }
  });

  it('should generate valid JWT token', async () => {
    // Create test user
    await createUser(testUser);

    const loginInput: LoginInput = {
      email: testUser.email,
      password: testUser.password
    };

    const result = await login(loginInput);

    // Verify JWT token can be decoded
    const jwtSecret = process.env['JWT_SECRET'] || 'development-secret-key';
    const decoded = verifyJWT(result.token, jwtSecret);

    expect(decoded.user_id).toBeDefined();
    expect(decoded.email).toEqual(testUser.email);
    expect(decoded.is_admin).toEqual(testUser.is_admin);
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
  });

  it('should throw error for non-existent email', async () => {
    const loginInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'anypassword'
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user
    await createUser(testUser);

    const loginInput: LoginInput = {
      email: testUser.email,
      password: 'wrongpassword'
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for inactive user', async () => {
    // Create inactive user
    await createUser(inactiveUser);

    const loginInput: LoginInput = {
      email: inactiveUser.email,
      password: inactiveUser.password
    };

    await expect(login(loginInput)).rejects.toThrow(/account is inactive/i);
  });

  it('should handle empty password correctly', async () => {
    // Create test user
    await createUser(testUser);

    const loginInput: LoginInput = {
      email: testUser.email,
      password: ''
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should handle case sensitivity in email', async () => {
    // Create test user
    await createUser(testUser);

    const loginInput: LoginInput = {
      email: testUser.email.toUpperCase(),
      password: testUser.password
    };

    // This should fail since email comparison is case-sensitive
    await expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should not expose password hash in response', async () => {
    // Create test user
    await createUser(testUser);

    const loginInput: LoginInput = {
      email: testUser.email,
      password: testUser.password
    };

    const result = await login(loginInput);

    // Verify password_hash is not in the response
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('should handle malformed stored password hash', async () => {
    // Create user with malformed password hash
    await db.insert(usersTable)
      .values({
        email: 'malformed@example.com',
        username: 'malformed',
        password_hash: 'invalid-hash-format',
        first_name: 'Test',
        last_name: 'User',
        is_admin: false,
        is_active: true,
        email_verified: true
      })
      .execute();

    const loginInput: LoginInput = {
      email: 'malformed@example.com',
      password: 'anypassword'
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should create consistent password hashes', async () => {
    const password = 'testpassword';
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);

    // Hashes should be different (due to salt)
    expect(hash1).not.toEqual(hash2);
    
    // But both should contain salt and hash parts
    expect(hash1.split(':')).toHaveLength(2);
    expect(hash2.split(':')).toHaveLength(2);
  });
});