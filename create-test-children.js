import 'dotenv/config';
import { initDB } from './server/db.js';
import { children } from './shared/postgres-schema.js';

async function createTestChildren() {
  try {
    const db = await initDB();
    
    const testChildren = [
      {
        childId: 'CH001',
        fullName: 'Baby John',
        dateOfBirth: '2023-01-15',
        gender: 'male',
        district: 'Kampala',
        healthFacility: 'Central Hospital',
        caretakerName: 'Mary John',
        caretakerContact: '+256700000011',
        address: 'Plot 123, Kampala Road',
        status: 'healthy',
        registeredBy: 4 // ID of vht1 user
      },
      {
        childId: 'CH002',
        fullName: 'Baby Jane',
        dateOfBirth: '2023-02-20',
        gender: 'female',
        district: 'Wakiso',
        healthFacility: 'Community Health Center',
        caretakerName: 'Sarah Jane',
        caretakerContact: '+256700000012',
        address: 'Plot 456, Wakiso Road',
        status: 'healthy',
        registeredBy: 5 // ID of vht2 user
      }
    ];

    for (const child of testChildren) {
      const result = await db.insert(children).values(child).returning();
      console.log('Child created successfully:', result);
    }
  } catch (error) {
    console.error('Error creating test children:', error);
  } finally {
    process.exit();
  }
}

createTestChildren(); 