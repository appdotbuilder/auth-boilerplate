import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type PublicUser, type JwtPayload } from '../schema';

export async function adminGetUser(jwtPayload: JwtPayload, userId: number): Promise<PublicUser> {
  try {
    // Verify that the requesting user is an admin
    if (!jwtPayload.is_admin) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Fetch the specific user by ID from the database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    // Check if user was found
    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Return the user data without sensitive information (password_hash excluded)
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      is_admin: user.is_admin,
      is_active: user.is_active,
      email_verified: user.email_verified,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Admin get user failed:', error);
    throw error;
  }
}