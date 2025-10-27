// This script will output the CREATE TABLE statements that you can copy and paste into Supabase SQL Editor

import fs from 'fs';

console.log('Reading schema.sql file...');

// Read the schema file
const schema = fs.readFileSync('./schema.sql', 'utf8');

// Extract CREATE TABLE statements
const createTableRegex = /CREATE TABLE [\s\S]*?;/g;
const createTableStatements = schema.match(createTableRegex);

console.log('Found CREATE TABLE statements:');
console.log('==============================');

if (createTableStatements) {
  for (let i = 0; i < createTableStatements.length; i++) {
    console.log(`\n-- Statement ${i + 1}:`);
    console.log(createTableStatements[i]);
  }
}

// Extract CREATE INDEX statements
const createIndexRegex = /CREATE INDEX [\s\S]*?;/g;
const createIndexStatements = schema.match(createIndexRegex);

console.log('\n\nFound CREATE INDEX statements:');
console.log('==============================');

if (createIndexStatements) {
  for (let i = 0; i < createIndexStatements.length; i++) {
    console.log(`\n-- Index Statement ${i + 1}:`);
    console.log(createIndexStatements[i]);
  }
}

console.log('\n\nYou can copy and paste these statements into the Supabase SQL Editor.');