import { db } from '../db';
import { usersTable, passwordResetTokensTable } from '../db/schema';
import { type ForgotPasswordInput, type SuccessResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export async function forgotPassword(input: ForgotPasswordInput): Promise<SuccessResponse> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    // Always return the same response for security (don't reveal if email exists)
    const response: SuccessResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    };

    // If user doesn't exist, still return success but don't process further
    if (users.length === 0) {
      return response;
    }

    const user = users[0];

    // Generate a secure random token (32 bytes = 64 hex characters)
    const token = randomBytes(32).toString('hex');

    // Set expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store the reset token in password_reset_tokens table
    await db.insert(passwordResetTokensTable)
      .values({
        user_id: user.id,
        token: token,
        expires_at: expiresAt,
        used: false
      })
      .execute();

    // TODO: In a real application, you would send an email here
    // Example: await sendPasswordResetEmail(user.email, token);
    console.log(`Password reset token generated for user ${user.email}: ${token}`);

    return response;
  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
}