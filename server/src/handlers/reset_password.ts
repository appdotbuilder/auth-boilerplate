import { db } from '../db';
import { usersTable, passwordResetTokensTable } from '../db/schema';
import { type ResetPasswordInput, type SuccessResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

export async function resetPassword(input: ResetPasswordInput): Promise<SuccessResponse> {
  try {
    // 1. Find the password reset token in the database
    const tokenResults = await db.select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.token, input.token))
      .execute();

    if (tokenResults.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    const resetToken = tokenResults[0];

    // 2. Validate that token exists, is not used, and hasn't expired
    const now = new Date();
    
    if (resetToken.used) {
      throw new Error('This reset token has already been used');
    }

    if (resetToken.expires_at < now) {
      throw new Error('Reset token has expired');
    }

    // 3. Hash the new password using PBKDF2 (secure alternative to bcrypt)
    const salt = randomBytes(32).toString('hex');
    const hashedPassword = pbkdf2Sync(input.new_password, salt, 10000, 64, 'sha512').toString('hex');
    const passwordWithSalt = `${salt}:${hashedPassword}`;

    // 4. Update the user's password_hash in the database
    await db.update(usersTable)
      .set({ 
        password_hash: passwordWithSalt,
        updated_at: now
      })
      .where(eq(usersTable.id, resetToken.user_id))
      .execute();

    // 5. Mark the reset token as used
    await db.update(passwordResetTokensTable)
      .set({ used: true })
      .where(eq(passwordResetTokensTable.id, resetToken.id))
      .execute();

    // 6. Return success response
    return {
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    };
  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
}

// Helper function to verify password (for testing purposes)
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const hashedPassword = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashedPassword;
}