import 'dotenv/config';
import { initDB } from './server/db.js';
import { users } from './shared/postgres-schema.js';
import bcrypt from 'bcryptjs';

async function createVHTUsers() {
  try {
    const db = await initDB();
    
    const vhtUsers = [
      {
        username: 'vht1',
        password: await bcrypt.hash('vht123', 10),
        role: 'vht',
        fullName: 'John Doe',
        email: 'john@idec.com',
        mobilePhone: '+256700000001',
        district: 'Kampala',
        healthFacility: 'Central Hospital'
      },
      {
        username: 'vht2',
        password: await bcrypt.hash('vht123', 10),
        role: 'vht',
        fullName: 'Jane Smith',
        email: 'jane@idec.com',
        mobilePhone: '+256700000002',
        district: 'Wakiso',
        healthFacility: 'Community Health Center'
      }
    ];

    for (const user of vhtUsers) {
      const result = await db.insert(users).values(user).returning();
      console.log('VHT user created successfully:', result);
    }
  } catch (error) {
    console.error('Error creating VHT users:', error);
  } finally {
    process.exit();
  }
}

createVHTUsers(); 