import { db } from '../db';
import { usersTable } from '../db/schema';
import { type PaginationInput, type PaginatedUsersResponse, type JwtPayload } from '../schema';
import { count } from 'drizzle-orm';

export async function adminGetUsers(jwtPayload: JwtPayload, input: PaginationInput): Promise<PaginatedUsersResponse> {
  try {
    // 1. Verify that the requesting user is an admin
    if (!jwtPayload.is_admin) {
      throw new Error('Access denied: Admin privileges required');
    }

    // 2. Calculate pagination parameters with defaults
    const page = input.page || 1;
    const limit = input.limit || 10;
    const offset = (page - 1) * limit;

    // 3. Fetch total count for pagination metadata
    const totalResult = await db.select({ count: count() })
      .from(usersTable)
      .execute();
    
    const total = totalResult[0]?.count || 0;

    // 4. Fetch users with pagination (excluding password_hash for security)
    const users = await db.select({
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
      .limit(limit)
      .offset(offset)
      .execute();

    // 5. Return paginated response with metadata
    return {
      users,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Admin get users failed:', error);
    throw error;
  }
}