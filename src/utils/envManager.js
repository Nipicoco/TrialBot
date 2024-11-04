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
  } catch (error) {
    console.error('Error updating .env file:', error);
  }
}

export function updateWhitelist(userIds) {
  try {
    let envContent = readFileSync(envPath, 'utf8');
    const whitelistString = userIds.join(',');
    
    const regex = new RegExp(`^WHITELIST_IDS=.*$`, 'm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `WHITELIST_IDS=${whitelistString}`);
    } else {
      envContent += `\nWHITELIST_IDS=${whitelistString}`;
    }
    
    writeFileSync(envPath, envContent.trim());
  } catch (error) {
    console.error('Error updating whitelist in .env file:', error);
  }
} 