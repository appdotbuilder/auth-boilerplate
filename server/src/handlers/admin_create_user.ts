import { createHash, randomBytes } from 'crypto';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type AdminCreateUserInput, type PublicUser, type JwtPayload } from '../schema';
import { eq, or } from 'drizzle-orm';

export async function adminCreateUser(jwtPayload: JwtPayload, input: AdminCreateUserInput): Promise<PublicUser> {
  try {
    // 1. Verify that the requesting user is an admin
    if (!jwtPayload.is_admin) {
      throw new Error('Unauthorized: Admin privileges required');
    }

    // 2. Validate that email and username are unique
    const existingUsers = await db.select()
      .from(usersTable)
      .where(or(
        eq(usersTable.email, input.email),
        eq(usersTable.username, input.username)
      ))
      .execute();

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.email === input.email) {
        throw new Error('Email already exists');
      }
      if (existingUser.username === input.username) {
        throw new Error('Username already exists');
      }
    }

    // 3. Hash the password using crypto
    const salt = randomBytes(16).toString('hex');
    const password_hash = salt + ':' + createHash('sha256').update(salt + input.password).digest('hex');

    // 4. Create a new user record in the database with admin-specified settings
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        username: input.username,
        password_hash,
        first_name: input.first_name,
        last_name: input.last_name,
        is_admin: input.is_admin || false,
        is_active: input.is_active !== undefined ? input.is_active : true,
        email_verified: input.email_verified !== undefined ? input.email_verified : false,
        last_login: null
      })
      .returning()
      .execute();

    // 5. Return the created user data without sensitive information
    const createdUser = result[0];
    return {
      id: createdUser.id,
      email: createdUser.email,
      username: createdUser.username,
      first_name: createdUser.first_name,
      last_name: createdUser.last_name,
      is_admin: createdUser.is_admin,
      is_active: createdUser.is_active,
      email_verified: createdUser.email_verified,
      last_login: createdUser.last_login,
      created_at: createdUser.created_at,
      updated_at: createdUser.updated_at
    };
  } catch (error) {
    console.error('Admin user creation failed:', error);
    throw error;
  }
}