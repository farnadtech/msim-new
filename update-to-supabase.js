// Script to update the application to use Supabase instead of Firebase

import fs from 'fs';
import path from 'path';

// Function to replace text in a file
function replaceInFile(filePath, searchValue, replaceValue) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const updatedContent = fileContent.replace(new RegExp(searchValue, 'g'), replaceValue);
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Updated ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
}

// Function to rename a file
function renameFile(oldPath, newPath) {
  try {
    fs.renameSync(oldPath, newPath);
    console.log(`Renamed ${oldPath} to ${newPath}`);
  } catch (error) {
    console.error(`Error renaming ${oldPath}:`, error.message);
  }
}

console.log('Updating application to use Supabase...');

// 1. Update DataContext to use Supabase API
replaceInFile(
  path.join('contexts', 'DataContext.tsx'),
  "import api from '../services/api';",
  "import api from '../services/api-supabase';"
);

// 2. Update updatePackage function call
replaceInFile(
  path.join('contexts', 'DataContext.tsx'),
  "await api.updatePackage(packageId.toString(), updatedData);",
  "await api.updatePackage(packageId, updatedData);"
);

// 3. Update App.tsx to use Supabase AuthProvider
replaceInFile(
  path.join('App.tsx'),
  "import { AuthProvider } from './contexts/AuthContext';",
  "import { AuthProvider } from './contexts/AuthContext-supabase';"
);

// 4. Update useAuth hook to use Supabase AuthContext
replaceInFile(
  path.join('hooks', 'useAuth.ts'),
  "import { AuthContext } from '../contexts/AuthContext';",
  "import { AuthContext } from '../contexts/AuthContext-supabase';"
);

console.log('Application updated to use Supabase!');
console.log('Please restart your development server to see the changes.');