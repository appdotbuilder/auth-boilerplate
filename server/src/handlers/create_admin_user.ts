import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from './login';

export const createAdminUser = async (): Promise<void> => {
  try {
    // Check if admin user already exists
    const existingAdmin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'admin@example.com'))
      .execute();

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists, skipping creation');
      return;
    }

    // Create admin user
    const hashedPassword = hashPassword('adminpassword123');
    
    await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        username: 'adminuser',
        password_hash: hashedPassword,
        first_name: null,
        last_name: null,
        is_admin: true,
        is_active: true,
        email_verified: true
      })
      .execute();

    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Failed to create admin user:', error);
    throw error;
  }
};