import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { register } from '../handlers/register';
import { eq, or } from 'drizzle-orm';
import crypto from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'fallback-secret-for-tests';

// Helper function to verify password hash
const verifyPassword = (password: string, hash: string): boolean => {
  const [salt, storedHash] = hash.split(':');
  const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return storedHash === testHash;
};

// Helper function to decode JWT (without verification for testing)
const decodeJWT = (token: string): any => {
  const [header, payload, signature] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
};

// Helper function to verify JWT signature
const verifyJWT = (token: string, secret: string): boolean => {
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return signature === expectedSignature;
};

// Test input with all fields
const testInput: RegisterInput = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User'
};

// Test input with nullable fields
const minimalInput: RegisterInput = {
  email: 'minimal@example.com',
  username: 'minimaluser',
  password: 'password123',
  first_name: null,
  last_name: null
};

describe('register', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user successfully', async () => {
    const result = await register(testInput);

    // Validate user data structure
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.username).toEqual('testuser');
    expect(result.user.first_name).toEqual('Test');
    expect(result.user.last_name).toEqual('User');
    expect(result.user.is_admin).toBe(false);
    expect(result.user.is_active).toBe(true);
    expect(result.user.email_verified).toBe(false);
    expect(result.user.last_login).toBeNull();
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Validate JWT token
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');

    // Verify token is valid
    expect(verifyJWT(result.token, JWT_SECRET)).toBe(true);

    // Verify token payload
    const decoded = decodeJWT(result.token);
    expect(decoded.user_id).toEqual(result.user.id);
    expect(decoded.email).toEqual('test@example.com');
    expect(decoded.is_admin).toBe(false);
  });

  it('should register user with nullable fields', async () => {
    const result = await register(minimalInput);

    expect(result.user.email).toEqual('minimal@example.com');
    expect(result.user.username).toEqual('minimaluser');
    expect(result.user.first_name).toBeNull();
    expect(result.user.last_name).toBeNull();
    expect(result.user.id).toBeDefined();
    expect(result.token).toBeDefined();
  });

  it('should save user to database with hashed password', async () => {
    const result = await register(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];

    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.username).toEqual('testuser');
    expect(savedUser.first_name).toEqual('Test');
    expect(savedUser.last_name).toEqual('User');
    expect(savedUser.is_admin).toBe(false);
    expect(savedUser.is_active).toBe(true);
    expect(savedUser.email_verified).toBe(false);

    // Verify password was hashed (not stored in plain text)
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('password123');
    expect(savedUser.password_hash).toContain(':'); // Salt:hash format
    
    // Verify password hash is valid
    const isValidPassword = verifyPassword('password123', savedUser.password_hash);
    expect(isValidPassword).toBe(true);

    // Verify wrong password fails
    const isInvalidPassword = verifyPassword('wrongpassword', savedUser.password_hash);
    expect(isInvalidPassword).toBe(false);
  });

  it('should reject duplicate email', async () => {
    // Register first user
    await register(testInput);

    // Attempt to register second user with same email but different username
    const duplicateEmailInput: RegisterInput = {
      ...testInput,
      username: 'differentuser'
    };

    expect(register(duplicateEmailInput)).rejects.toThrow(/email already exists/i);
  });

  it('should reject duplicate username', async () => {
    // Register first user
    await register(testInput);

    // Attempt to register second user with same username but different email
    const duplicateUsernameInput: RegisterInput = {
      ...testInput,
      email: 'different@example.com'
    };

    expect(register(duplicateUsernameInput)).rejects.toThrow(/username already exists/i);
  });

  it('should handle database timestamp fields correctly', async () => {
    const result = await register(testInput);

    // Verify timestamps are proper Date objects
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify timestamps are recent (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    expect(result.user.created_at >= oneMinuteAgo).toBe(true);
    expect(result.user.created_at <= now).toBe(true);
    expect(result.user.updated_at >= oneMinuteAgo).toBe(true);
    expect(result.user.updated_at <= now).toBe(true);
  });

  it('should generate valid JWT tokens with correct expiration', async () => {
    const result = await register(testInput);

    // Verify token signature is valid
    expect(verifyJWT(result.token, JWT_SECRET)).toBe(true);

    // Decode token to check structure
    const decoded = decodeJWT(result.token);
    expect(decoded).toBeDefined();
    expect(decoded.user_id).toEqual(result.user.id);
    expect(decoded.email).toEqual('test@example.com');
    expect(decoded.is_admin).toBe(false);
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();

    // Verify token expires in approximately 24 hours
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const issuedTime = decoded.iat * 1000;
    const expectedDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const actualDuration = expirationTime - issuedTime;

    // Allow for small timing differences
    expect(Math.abs(actualDuration - expectedDuration)).toBeLessThan(1000);
  });

  it('should create unique password hashes for same password', async () => {
    const input1: RegisterInput = {
      email: 'user1@example.com',
      username: 'user1',
      password: 'samepassword',
      first_name: 'User',
      last_name: 'One'
    };

    const input2: RegisterInput = {
      email: 'user2@example.com',
      username: 'user2',
      password: 'samepassword',
      first_name: 'User',
      last_name: 'Two'
    };

    const result1 = await register(input1);
    const result2 = await register(input2);

    // Get password hashes from database
    const users = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.id, result1.user.id),
          eq(usersTable.id, result2.user.id)
        )
      )
      .execute();

    expect(users).toHaveLength(2);
    const hash1 = users.find(u => u.id === result1.user.id)?.password_hash;
    const hash2 = users.find(u => u.id === result2.user.id)?.password_hash;

    // Hashes should be different due to unique salts
    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
    expect(hash1).not.toEqual(hash2);

    // But both should verify against the same password
    expect(verifyPassword('samepassword', hash1!)).toBe(true);
    expect(verifyPassword('samepassword', hash2!)).toBe(true);
  });
});