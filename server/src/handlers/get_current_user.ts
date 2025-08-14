import { db } from '../db';
import { usersTable } from '../db/schema';
import { type PublicUser, type JwtPayload } from '../schema';
import { eq } from 'drizzle-orm';

export const getCurrentUser = async (jwtPayload: JwtPayload): Promise<PublicUser> => {
  try {
    // Extract user_id from JWT payload
    const userId = jwtPayload.user_id;

    // Fetch current user data from database
    const result = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      username: usersTable.username,
      first_name: usersTable.first_name,
      last_name: usersTable.last_name,
      is_admin: usersTable.is_admin,
      is_active: usersTable.is_active,
      email_verified: usersTable.email_verified,
      last_login: usersTable.last_login,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .execute();

    // Check if user exists
    if (result.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Return user data without sensitive information (password_hash is excluded)
    return result[0];
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
};