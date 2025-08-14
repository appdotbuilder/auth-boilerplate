import { eq } from 'drizzle-orm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type ChangePasswordInput, type SuccessResponse, type JwtPayload } from '../schema';

// Helper function to hash password with salt
function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

// Helper function to verify password
function verifyPassword(password: string, hashedPassword: string): boolean {
  // Extract salt from stored hash (format: salt:hash)
  const [salt, hash] = hashedPassword.split(':');
  if (!salt || !hash) {
    return false;
  }
  
  const expectedHash = hashPassword(password, salt);
  const expectedBuffer = Buffer.from(expectedHash);
  const actualBuffer = Buffer.from(hash);
  
  // Use timing-safe comparison to prevent timing attacks
  return expectedBuffer.length === actualBuffer.length && 
         timingSafeEqual(expectedBuffer, actualBuffer);
}

// Helper function to create password hash with salt
function createPasswordHash(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
}

export async function changePassword(jwtPayload: JwtPayload, input: ChangePasswordInput): Promise<SuccessResponse> {
  try {
    // Extract user_id from the JWT payload
    const userId = jwtPayload.user_id;

    // Fetch the current user from the database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is deactivated');
    }

    // Verify the current password against the stored hash
    const isCurrentPasswordValid = verifyPassword(input.current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash the new password
    const newPasswordHash = createPasswordHash(input.new_password);

    // Update the user's password_hash and updated_at timestamp in the database
    await db.update(usersTable)
      .set({
        password_hash: newPasswordHash,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .execute();

    return {
      success: true,
      message: 'Password changed successfully.'
    };
  } catch (error) {
    console.error('Password change failed:', error);
    throw error;
  }
}