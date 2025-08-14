import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type PaginationInput, type JwtPayload } from '../schema';
import { adminGetUsers } from '../handlers/admin_get_users';

// Test JWT payloads
const adminJwtPayload: JwtPayload = {
  user_id: 1,
  email: 'admin@test.com',
  is_admin: true
};

const regularUserJwtPayload: JwtPayload = {
  user_id: 2,
  email: 'user@test.com',
  is_admin: false
};

// Test pagination input with all fields
const testInput: PaginationInput = {
  page: 1,
  limit: 10
};

describe('adminGetUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch users with default pagination', async () => {
    // Create test users
    const hashedPassword = 'hashed_password_123';
    await db.insert(usersTable).values([
      {
        email: 'admin@test.com',
        username: 'admin',
        password_hash: hashedPassword,
        first_name: 'Admin',
        last_name: 'User',
        is_admin: true,
        is_active: true,
        email_verified: true
      },
      {
        email: 'user1@test.com',
        username: 'user1',
        password_hash: hashedPassword,
        first_name: 'User',
        last_name: 'One',
        is_admin: false,
        is_active: true,
        email_verified: false
      }
    ]).execute();

    const result = await adminGetUsers(adminJwtPayload, {});

    // Verify response structure
    expect(result.users).toHaveLength(2);
    expect(result.total).toEqual(2);
    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(10);
    expect(result.total_pages).toEqual(1);

    // Verify user data (should not include password_hash)
    const adminUser = result.users.find(u => u.email === 'admin@test.com');
    expect(adminUser).toBeDefined();
    expect(adminUser!.username).toEqual('admin');
    expect(adminUser!.first_name).toEqual('Admin');
    expect(adminUser!.last_name).toEqual('User');
    expect(adminUser!.is_admin).toEqual(true);
    expect(adminUser!.is_active).toEqual(true);
    expect(adminUser!.email_verified).toEqual(true);
    expect(adminUser!.created_at).toBeInstanceOf(Date);
    expect(adminUser!.updated_at).toBeInstanceOf(Date);
    expect((adminUser as any).password_hash).toBeUndefined();

    const regularUser = result.users.find(u => u.email === 'user1@test.com');
    expect(regularUser).toBeDefined();
    expect(regularUser!.username).toEqual('user1');
    expect(regularUser!.is_admin).toEqual(false);
    expect(regularUser!.email_verified).toEqual(false);
  });

  it('should apply pagination correctly', async () => {
    // Create multiple test users
    const hashedPassword = 'hashed_password_123';
    const users = Array.from({ length: 15 }, (_, i) => ({
      email: `user${i}@test.com`,
      username: `user${i}`,
      password_hash: hashedPassword,
      first_name: `User`,
      last_name: `${i}`,
      is_admin: false,
      is_active: true,
      email_verified: i % 2 === 0
    }));

    await db.insert(usersTable).values(users).execute();

    // Test first page
    const firstPageInput: PaginationInput = { page: 1, limit: 5 };
    const firstPage = await adminGetUsers(adminJwtPayload, firstPageInput);

    expect(firstPage.users).toHaveLength(5);
    expect(firstPage.total).toEqual(15);
    expect(firstPage.page).toEqual(1);
    expect(firstPage.limit).toEqual(5);
    expect(firstPage.total_pages).toEqual(3);

    // Test second page
    const secondPageInput: PaginationInput = { page: 2, limit: 5 };
    const secondPage = await adminGetUsers(adminJwtPayload, secondPageInput);

    expect(secondPage.users).toHaveLength(5);
    expect(secondPage.page).toEqual(2);
    expect(secondPage.total).toEqual(15);

    // Test last page
    const lastPageInput: PaginationInput = { page: 3, limit: 5 };
    const lastPage = await adminGetUsers(adminJwtPayload, lastPageInput);

    expect(lastPage.users).toHaveLength(5);
    expect(lastPage.page).toEqual(3);

    // Verify no duplicate users across pages
    const allUserIds = [
      ...firstPage.users.map(u => u.id),
      ...secondPage.users.map(u => u.id),
      ...lastPage.users.map(u => u.id)
    ];
    const uniqueIds = new Set(allUserIds);
    expect(uniqueIds.size).toEqual(15);
  });

  it('should handle empty database', async () => {
    const result = await adminGetUsers(adminJwtPayload, testInput);

    expect(result.users).toHaveLength(0);
    expect(result.total).toEqual(0);
    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(10);
    expect(result.total_pages).toEqual(0);
  });

  it('should handle page beyond available data', async () => {
    // Create only 2 users
    const hashedPassword = 'hashed_password_123';
    await db.insert(usersTable).values([
      {
        email: 'user1@test.com',
        username: 'user1',
        password_hash: hashedPassword,
        first_name: 'User',
        last_name: 'One',
        is_admin: false,
        is_active: true,
        email_verified: true
      },
      {
        email: 'user2@test.com',
        username: 'user2',
        password_hash: hashedPassword,
        first_name: 'User',
        last_name: 'Two',
        is_admin: false,
        is_active: true,
        email_verified: true
      }
    ]).execute();

    // Request page 5 with limit 5
    const input: PaginationInput = { page: 5, limit: 5 };
    const result = await adminGetUsers(adminJwtPayload, input);

    expect(result.users).toHaveLength(0);
    expect(result.total).toEqual(2);
    expect(result.page).toEqual(5);
    expect(result.limit).toEqual(5);
    expect(result.total_pages).toEqual(1);
  });

  it('should reject non-admin users', async () => {
    await expect(adminGetUsers(regularUserJwtPayload, testInput))
      .rejects.toThrow(/access denied.*admin privileges required/i);
  });

  it('should handle users with null fields correctly', async () => {
    // Create user with null optional fields
    const hashedPassword = 'hashed_password_123';
    await db.insert(usersTable).values({
      email: 'user@test.com',
      username: 'testuser',
      password_hash: hashedPassword,
      first_name: null,
      last_name: null,
      is_admin: false,
      is_active: true,
      email_verified: false
    }).execute();

    const result = await adminGetUsers(adminJwtPayload, testInput);

    expect(result.users).toHaveLength(1);
    const user = result.users[0];
    expect(user.first_name).toBeNull();
    expect(user.last_name).toBeNull();
    expect(user.last_login).toBeNull();
    expect(user.email).toEqual('user@test.com');
    expect(user.username).toEqual('testuser');
  });

  it('should calculate total_pages correctly for edge cases', async () => {
    // Create exactly 10 users
    const hashedPassword = 'hashed_password_123';
    const users = Array.from({ length: 10 }, (_, i) => ({
      email: `user${i}@test.com`,
      username: `user${i}`,
      password_hash: hashedPassword,
      first_name: 'User',
      last_name: `${i}`,
      is_admin: false,
      is_active: true,
      email_verified: true
    }));

    await db.insert(usersTable).values(users).execute();

    // Test with limit 3 (should give 4 pages: 3+3+3+1)
    const input: PaginationInput = { page: 1, limit: 3 };
    const result = await adminGetUsers(adminJwtPayload, input);

    expect(result.total).toEqual(10);
    expect(result.limit).toEqual(3);
    expect(result.total_pages).toEqual(4); // Math.ceil(10/3) = 4
  });
});