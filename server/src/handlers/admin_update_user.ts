import { db } from '../db';
import { usersTable } from '../db/schema';
import { type AdminUpdateUserInput, type PublicUser, type JwtPayload } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const adminUpdateUser = async (jwtPayload: JwtPayload, input: AdminUpdateUserInput): Promise<PublicUser> => {
  try {
    // 1. Verify that the requesting user is an admin
    if (!jwtPayload.is_admin) {
      throw new Error('Access denied. Admin privileges required.');
    }

    // 2. Fetch the user to be updated from the database
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUsers.length === 0) {
      throw new Error('User not found');
    }

    const existingUser = existingUsers[0];

    // 3. Prevent admins from demoting themselves to avoid lockout
    if (jwtPayload.user_id === input.id && input.is_admin === false) {
      throw new Error('Cannot remove admin privileges from your own account');
    }

    // 4. Validate that email and username are unique if being updated
    const conditions = [];
    
    if (input.email && input.email !== existingUser.email) {
      const emailCheck = await db.select()
        .from(usersTable)
        .where(and(
          eq(usersTable.email, input.email),
          ne(usersTable.id, input.id)
        ))
        .execute();
      
      if (emailCheck.length > 0) {
        throw new Error('Email already exists');
      }
    }

    if (input.username && input.username !== existingUser.username) {
      const usernameCheck = await db.select()
        .from(usersTable)
        .where(and(
          eq(usersTable.username, input.username),
          ne(usersTable.id, input.id)
        ))
        .execute();
      
      if (usernameCheck.length > 0) {
        throw new Error('Username already exists');
      }
    }

    // 5. Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.email !== undefined) updateData.email = input.email;
    if (input.username !== undefined) updateData.username = input.username;
    if (input.first_name !== undefined) updateData.first_name = input.first_name;
    if (input.last_name !== undefined) updateData.last_name = input.last_name;
    if (input.is_admin !== undefined) updateData.is_admin = input.is_admin;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    if (input.email_verified !== undefined) updateData.email_verified = input.email_verified;

    // 6. Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    // 7. Return the updated user data without sensitive information
    const updatedUser = result[0];
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      is_admin: updatedUser.is_admin,
      is_active: updatedUser.is_active,
      email_verified: updatedUser.email_verified,
      last_login: updatedUser.last_login,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at
    };
  } catch (error) {
    console.error('Admin update user failed:', error);
    throw error;
  }
};