import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput, type AuthResponse } from '../schema';
import { eq, or } from 'drizzle-orm';
import crypto from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'fallback-secret-for-tests';

// Simple password hashing using Node.js crypto
const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

// Simple JWT implementation using Node.js crypto
const createJWT = (payload: object, secret: string, expiresIn: string): string => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const exp = now + (24 * 60 * 60); // 24 hours

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: exp
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  try {
    // 1. Validate that email and username are unique
    const existingUser = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.email, input.email),
          eq(usersTable.username, input.username)
        )
      )
      .limit(1)
      .execute();

    if (existingUser.length > 0) {
      const existingField = existingUser[0].email === input.email ? 'email' : 'username';
      throw new Error(`User with this ${existingField} already exists`);
    }

    // 2. Hash the password
    const password_hash = await hashPassword(input.password);

    // 3. Create a new user record in the database
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        username: input.username,
        password_hash,
        first_name: input.first_name,
        last_name: input.last_name,
        is_admin: false, // Default value
        is_active: true, // Default value
        email_verified: false // Default value
      })
      .returning()
      .execute();

    const user = result[0];

    // 4. Generate a JWT token for the new user
    const token = createJWT(
      {
        user_id: user.id,
        email: user.email,
        is_admin: user.is_admin
      },
      JWT_SECRET,
      '24h'
    );

    // 5. Return the user data (without password) and token
    return {
      user: {
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
      },
      token
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};