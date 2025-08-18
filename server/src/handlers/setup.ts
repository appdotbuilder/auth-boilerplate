// This script sets up the database with an admin user
// Run with: bun run src/handlers/setup.ts

import { setupDatabase } from './setup_database';

async function main() {
  try {
    console.log('Setting up database...');
    const result = await setupDatabase();
    console.log(result.message);
    console.log('Setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

main();