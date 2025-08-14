import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateProfileInput, type PublicUser, type JwtPayload } from '../schema';
import { eq, and, or, ne } from 'drizzle-orm';

export async function updateProfile(jwtPayload: JwtPayload, input: UpdateProfileInput): Promise<PublicUser> {
  try {
    // Check if username or email is being updated and ensure uniqueness
    if (input.username || input.email) {
      const conditions: any[] = [];
      
      if (input.username) {
        conditions.push(eq(usersTable.username, input.username));
      }
      
      if (input.email) {
        conditions.push(eq(usersTable.email, input.email));
      }

      // Check for existing users with the new username/email (excluding current user)
      const existingUsers = await db.select({
        id: usersTable.id,
        email: usersTable.email,
        username: usersTable.username
      })
      .from(usersTable)
      .where(
        and(
          or(...conditions),
          ne(usersTable.id, jwtPayload.user_id)
        )
      )
      .execute();

      // Validate uniqueness
      for (const existingUser of existingUsers) {
        if (input.username && existingUser.username === input.username) {
          throw new Error('Username already exists');
        }
        if (input.email && existingUser.email === input.email) {
          throw new Error('Email already exists');
        }
      }
    }

    // Prepare update data - only include fields that are provided
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.username !== undefined) {
      updateData.username = input.username;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.first_name !== undefined) {
      updateData.first_name = input.first_name;
    }
    if (input.last_name !== undefined) {
      updateData.last_name = input.last_name;
    }

    // Update user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, jwtPayload.user_id))
      .returning({
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
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }

    return result[0];
  } catch (error) {
    console.error('Profile update failed:', error);
    throw error;
  }
}