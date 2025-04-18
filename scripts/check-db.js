/**
 * Utility script to check the database schema
 */
require('dotenv').config();
const db = require('../src/database/db');

async function checkDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Get all tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables in the database:');
    tables.forEach(table => {
      console.log(`- ${table.name}`);
    });
    
    // Check schema for each table
    for (const table of tables) {
      if (table.name === 'sqlite_sequence') continue; // Skip sqlite internal table
      
      console.log(`\nSchema for ${table.name}:`);
      const columns = await db.all(`PRAGMA table_info(${table.name})`);
      columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
      });
    }
    
    console.log('\nDatabase check completed successfully');
  } catch (err) {
    console.error('Error checking database:', err);
  }
}

checkDatabase(); 