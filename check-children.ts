import { initDB } from './server/db';
import { children } from './shared/postgres-schema';

async function checkChildren() {
  try {
    const db = await initDB();
    const result = await db.select().from(children);
    
    // Display each child's name
    console.log('\nChildren in database:');
    result.forEach((child, index) => {
      console.log(`${index + 1}. ${child.fullName || 'Unnamed Child'}`);
    });
    
    // Log full details for debugging
    console.log('\nFull database details:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkChildren(); 