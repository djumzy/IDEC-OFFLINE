import 'dotenv/config';
import { initDB } from './server/db.js';
import { users } from './shared/postgres-schema.js';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
  try {
    const db = await initDB();
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = {
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      fullName: 'System Administrator',
      email: 'admin@idec.com',
      mobilePhone: '+256700000000',
      district: 'Kampala',
      healthFacility: 'Central Hospital'
    };

    const result = await db.insert(users).values(adminUser).returning();
    console.log('Admin user created successfully:', result);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    process.exit();
  }
}

createAdminUser(); 