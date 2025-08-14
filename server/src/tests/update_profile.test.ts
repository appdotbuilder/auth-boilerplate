import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateProfileInput, type JwtPayload } from '../schema';
import { updateProfile } from '../handlers/update_profile';
import { eq } from 'drizzle-orm';

describe('updateProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test users for the tests
  let testUser: any;
  let otherUser: any;
  let testJwtPayload: JwtPayload;

  beforeEach(async () => {
    // Create primary test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        is_admin: false,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create another user to test uniqueness constraints
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        username: 'otheruser',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        is_admin: false,
        is_active: true,
        email_verified: true
      })
      .returning()
      .execute();
    otherUser = otherUserResult[0];

    testJwtPayload = {
      user_id: testUser.id,
      email: testUser.email,
      is_admin: testUser.is_admin
    };
  });

  it('should update username successfully', async () => {
    const input: UpdateProfileInput = {
      username: 'newusername'
    };

    const result = await updateProfile(testJwtPayload, input);

    expect(result.id).toEqual(testUser.id);
    expect(result.username).toEqual('newusername');
    expect(result.email).toEqual(testUser.email);
    expect(result.first_name).toEqual(testUser.first_name);
    expect(result.last_name).toEqual(testUser.last_name);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });

  it('should update email successfully', async () => {
    const input: UpdateProfileInput = {
      email: 'newemail@example.com'
    };

    const result = await updateProfile(testJwtPayload, input);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('newemail@example.com');
    expect(result.username).toEqual(testUser.username);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update first and last name successfully', async () => {
    const input: UpdateProfileInput = {
      first_name: 'Updated',
      last_name: 'Name'
    };

    const result = await updateProfile(testJwtPayload, input);

    expect(result.id).toEqual(testUser.id);
    expect(result.first_name).toEqual('Updated');
    expect(result.last_name).toEqual('Name');
    expect(result.email).toEqual(testUser.email);
    expect(result.username).toEqual(testUser.username);
  });

  it('should set names to null when provided', async () => {
    const input: UpdateProfileInput = {
      first_name: null,
      last_name: null
    };

    const result = await updateProfile(testJwtPayload, input);

    expect(result.first_name).toBeNull();
    expect(result.last_name).toBeNull();
  });

  it('should update multiple fields simultaneously', async () => {
    const input: UpdateProfileInput = {
      username: 'multifieldupdate',
      email: 'multifield@example.com',
      first_name: 'Multi',
      last_name: 'Field'
    };

    const result = await updateProfile(testJwtPayload, input);

    expect(result.username).toEqual('multifieldupdate');
    expect(result.email).toEqual('multifield@example.com');
    expect(result.first_name).toEqual('Multi');
    expect(result.last_name).toEqual('Field');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    const input: UpdateProfileInput = {
      username: 'persisteduser',
      email: 'persisted@example.com'
    };

    await updateProfile(testJwtPayload, input);

    // Verify changes persisted in database
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].username).toEqual('persisteduser');
    expect(updatedUser[0].email).toEqual('persisted@example.com');
    expect(updatedUser[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when username already exists', async () => {
    const input: UpdateProfileInput = {
      username: otherUser.username // Try to use other user's username
    };

    await expect(updateProfile(testJwtPayload, input)).rejects.toThrow(/username already exists/i);
  });

  it('should throw error when email already exists', async () => {
    const input: UpdateProfileInput = {
      email: otherUser.email // Try to use other user's email
    };

    await expect(updateProfile(testJwtPayload, input)).rejects.toThrow(/email already exists/i);
  });

  it('should allow user to keep their current username', async () => {
    const input: UpdateProfileInput = {
      username: testUser.username, // Same username
      first_name: 'Updated'
    };

    const result = await updateProfile(testJwtPayload, input);

    expect(result.username).toEqual(testUser.username);
    expect(result.first_name).toEqual('Updated');
  });

  it('should allow user to keep their current email', async () => {
    const input: UpdateProfileInput = {
      email: testUser.email, // Same email
      last_name: 'Updated'
    };

    const result = await updateProfile(testJwtPayload, input);

    expect(result.email).toEqual(testUser.email);
    expect(result.last_name).toEqual('Updated');
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentJwtPayload: JwtPayload = {
      user_id: 99999, // Non-existent user ID
      email: 'nonexistent@example.com',
      is_admin: false
    };

    const input: UpdateProfileInput = {
      username: 'newusername'
    };

    await expect(updateProfile(nonExistentJwtPayload, input)).rejects.toThrow(/user not found/i);
  });

  it('should handle empty input gracefully', async () => {
    const input: UpdateProfileInput = {};

    const result = await updateProfile(testJwtPayload, input);

    // Should return user data with only updated_at changed
    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual(testUser.email);
    expect(result.username).toEqual(testUser.username);
    expect(result.first_name).toEqual(testUser.first_name);
    expect(result.last_name).toEqual(testUser.last_name);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });

  it('should preserve user permissions and status', async () => {
    const input: UpdateProfileInput = {
      username: 'preserveduser'
    };

    const result = await updateProfile(testJwtPayload, input);

    expect(result.is_admin).toEqual(testUser.is_admin);
    expect(result.is_active).toEqual(testUser.is_active);
    expect(result.email_verified).toEqual(testUser.email_verified);
  });
});