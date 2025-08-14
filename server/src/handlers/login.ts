import { eq } from 'drizzle-orm';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type AuthResponse } from '../schema';

// Using Node.js built-in crypto for password hashing instead of bcrypt
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  try {
    // 1. Find user by email in the database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // 2. Verify the password against the stored hash using built-in crypto
    const isPasswordValid = verifyPassword(input.password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // 3. Check if user is active and not suspended
    if (!user.is_active) {
      throw new Error('Account is inactive');
    }

    // 4. Update last_login timestamp
    await db.update(usersTable)
      .set({ 
        last_login: new Date(),
        updated_at: new Date()
      })
      .where(eq(usersTable.id, user.id))
      .execute();

    // 5. Generate a JWT token for the authenticated user (simplified)
    const tokenPayload = {
      user_id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    const jwtSecret = process.env['JWT_SECRET'] || 'development-secret-key';
    const token = generateJWT(tokenPayload, jwtSecret);

    // 6. Return the user data (without password) and token
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
        last_login: new Date(), // Use current timestamp for response
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Helper function to hash passwords using PBKDF2
export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
};

// Helper function to verify passwords
export const verifyPassword = (password: string, storedHash: string): boolean => {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  
  const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return hash === verifyHash;
};

// Simplified JWT generation using HMAC
export const generateJWT = (payload: any, secret: string): string => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = createHash('sha256')
    .update(`${encodedHeader}.${encodedPayload}.${secret}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

// Simplified JWT verification
export const verifyJWT = (token: string, secret: string): any => {
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Invalid token format');
  }

  // Verify signature
  const expectedSignature = createHash('sha256')
    .update(`${encodedHeader}.${encodedPayload}.${secret}`)
    .digest('base64url');

  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  // Decode payload
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
  
  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
};