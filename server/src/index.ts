import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  registerInputSchema,
  loginInputSchema,
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  updateProfileInputSchema,
  changePasswordInputSchema,
  adminCreateUserInputSchema,
  adminUpdateUserInputSchema,
  paginationInputSchema,
  type JwtPayload
} from './schema';

// Import handlers
import { register } from './handlers/register';
import { login } from './handlers/login';
import { forgotPassword } from './handlers/forgot_password';
import { resetPassword } from './handlers/reset_password';
import { getCurrentUser } from './handlers/get_current_user';
import { updateProfile } from './handlers/update_profile';
import { changePassword } from './handlers/change_password';
import { adminGetUsers } from './handlers/admin_get_users';
import { adminGetUser } from './handlers/admin_get_user';
import { adminCreateUser } from './handlers/admin_create_user';
import { adminUpdateUser } from './handlers/admin_update_user';
import { adminDeleteUser } from './handlers/admin_delete_user';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Middleware for JWT authentication (placeholder)
const authenticatedProcedure = publicProcedure.use(async ({ next }) => {
  // This is a placeholder! Real implementation should:
  // 1. Extract JWT token from Authorization header
  // 2. Verify and decode the JWT token
  // 3. Add user payload to context
  
  const mockJwtPayload: JwtPayload = {
    user_id: 1,
    email: 'user@example.com',
    is_admin: false
  };
  
  return next({
    ctx: { user: mockJwtPayload }
  });
});

// Middleware for admin-only routes
const adminProcedure = authenticatedProcedure.use(async ({ ctx, next }) => {
  // This is a placeholder! Real implementation should:
  // 1. Check if user.is_admin is true
  // 2. Throw error if not admin
  
  if (!ctx.user.is_admin) {
    throw new Error('Admin access required');
  }
  
  return next({ ctx });
});

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => register(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  forgotPassword: publicProcedure
    .input(forgotPasswordInputSchema)
    .mutation(({ input }) => forgotPassword(input)),

  resetPassword: publicProcedure
    .input(resetPasswordInputSchema)
    .mutation(({ input }) => resetPassword(input)),

  // Protected user routes
  getCurrentUser: authenticatedProcedure
    .query(({ ctx }) => getCurrentUser(ctx.user)),

  updateProfile: authenticatedProcedure
    .input(updateProfileInputSchema)
    .mutation(({ ctx, input }) => updateProfile(ctx.user, input)),

  changePassword: authenticatedProcedure
    .input(changePasswordInputSchema)
    .mutation(({ ctx, input }) => changePassword(ctx.user, input)),

  // Admin routes
  admin: router({
    getUsers: adminProcedure
      .input(paginationInputSchema)
      .query(({ ctx, input }) => adminGetUsers(ctx.user, input)),

    getUser: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => adminGetUser(ctx.user, input.id)),

    createUser: adminProcedure
      .input(adminCreateUserInputSchema)
      .mutation(({ ctx, input }) => adminCreateUser(ctx.user, input)),

    updateUser: adminProcedure
      .input(adminUpdateUserInputSchema)
      .mutation(({ ctx, input }) => adminUpdateUser(ctx.user, input)),

    deleteUser: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => adminDeleteUser(ctx.user, input.id)),
  })
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();