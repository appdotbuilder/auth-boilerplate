import { z } from 'zod';

// User schema with proper type handling
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  password_hash: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  is_admin: z.boolean(),
  is_active: z.boolean(),
  email_verified: z.boolean(),
  last_login: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Public user schema (without sensitive data)
export const publicUserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  is_admin: z.boolean(),
  is_active: z.boolean(),
  email_verified: z.boolean(),
  last_login: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PublicUser = z.infer<typeof publicUserSchema>;

// Registration input schema
export const registerInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  first_name: z.string().nullable(),
  last_name: z.string().nullable()
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

// Login input schema
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Password reset request schema
export const forgotPasswordInputSchema = z.object({
  email: z.string().email()
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

// Password reset schema
export const resetPasswordInputSchema = z.object({
  token: z.string(),
  new_password: z.string().min(8).max(100)
});

export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

// Profile update schema
export const updateProfileInputSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  email: z.string().email().optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

// Change password schema
export const changePasswordInputSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(8).max(100)
});

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

// Admin user update schema
export const adminUpdateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  username: z.string().min(3).max(50).optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  is_admin: z.boolean().optional(),
  is_active: z.boolean().optional(),
  email_verified: z.boolean().optional()
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserInputSchema>;

// Admin create user schema
export const adminCreateUserInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  is_admin: z.boolean().optional(),
  is_active: z.boolean().optional(),
  email_verified: z.boolean().optional()
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserInputSchema>;

// Password reset tokens schema
export const passwordResetTokenSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  token: z.string(),
  expires_at: z.coerce.date(),
  used: z.boolean(),
  created_at: z.coerce.date()
});

export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;

// JWT payload schema
export const jwtPayloadSchema = z.object({
  user_id: z.number(),
  email: z.string().email(),
  is_admin: z.boolean(),
  iat: z.number().optional(),
  exp: z.number().optional()
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

// Authentication response schema
export const authResponseSchema = z.object({
  user: publicUserSchema,
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// General response schemas
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional()
});

export type SuccessResponse = z.infer<typeof successResponseSchema>;

// Pagination schema
export const paginationInputSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional()
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;

// Paginated users response schema
export const paginatedUsersResponseSchema = z.object({
  users: z.array(publicUserSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  total_pages: z.number()
});

export type PaginatedUsersResponse = z.infer<typeof paginatedUsersResponseSchema>;