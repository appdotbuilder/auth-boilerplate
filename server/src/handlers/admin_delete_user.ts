import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type SuccessResponse, type JwtPayload } from '../schema';

export async function adminDeleteUser(jwtPayload: JwtPayload, userId: number): Promise<SuccessResponse> {
  try {
    // 1. Verify that the requesting user is an admin
    if (!jwtPayload.is_admin) {
      throw new Error('Access denied. Admin privileges required.');
    }

    // 2. Prevent admins from deleting themselves to avoid lockout
    if (jwtPayload.user_id === userId) {
      throw new Error('Cannot delete your own account.');
    }

    // 3. Fetch the user to be deleted from the database
    const userToDelete = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userToDelete.length === 0) {
      throw new Error('User not found.');
    }

    // 4. Delete the user record (cascade will handle reset tokens)
    await db.delete(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    // 5. Return success response
    return {
      success: true,
      message: 'User deleted successfully.'
    };
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
}