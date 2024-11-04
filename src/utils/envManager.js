import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../../.env');

export function updateEnvFile(updates) {
  try {
    let envContent = readFileSync(envPath, 'utf8');
    
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }
    
    writeFileSync(envPath, envContent.trim());
    console.log('Updated .env file with new values:', updates);
  } catch (error) {
    console.error('Error updating .env file:', error);
  }
} 