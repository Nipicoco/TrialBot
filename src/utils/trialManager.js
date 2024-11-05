import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const trialCodesPath = join(__dirname, '../../data/trial_codes.json');
const usedCodesPath = join(__dirname, '../../data/used_codes.json');
const secondChancesPath = join(__dirname, '../../data/second_chances.json');

// Add backup directory path
const backupDir = join(__dirname, '../../backups');

// Get whitelist from environment variable
const WHITELIST = process.env.WHITELIST_IDS ? process.env.WHITELIST_IDS.split(',') : [];

class TrialManager {
  constructor() {
    // Create backups directory if it doesn't exist
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // Create data files from examples if they don't exist
    this.initializeDataFiles();
    
    this.trialCodes = this.loadTrialCodes();
    this.usedCodes = this.loadUsedCodes();
    this.secondChances = this.loadSecondChances();
  }

  initializeDataFiles() {
    const files = [
      { path: trialCodesPath, example: trialCodesPath + '.example' },
      { path: usedCodesPath, example: usedCodesPath + '.example' },
      { path: secondChancesPath, example: secondChancesPath + '.example' }
    ];

    for (const file of files) {
      if (!existsSync(file.path) && existsSync(file.example)) {
        try {
          copyFileSync(file.example, file.path);
        } catch (error) {
          console.error(`Failed to initialize ${file.path}:`, error);
          // Create empty file with default structure
          writeFileSync(file.path, JSON.stringify(
            file.path.includes('trial_codes') ? { codes: [] } :
            file.path.includes('used_codes') ? { used: {} } :
            { users: [] }
          ));
        }
      }
    }
  }

  loadTrialCodes() {
    try {
      const data = JSON.parse(readFileSync(trialCodesPath, 'utf8'));
      
      // If codes array is empty, try to restore from backup
      if (data.codes.length === 0) {
        const latestBackup = this.getLatestBackup();
        if (latestBackup && latestBackup.unusedKeys.length > 0) {
          console.log('Restoring keys from backup...');
          data.codes = latestBackup.unusedKeys;
          this.saveTrialCodes();
        }
      }
      
      return data;
    } catch {
      return { codes: [] };
    }
  }

  loadUsedCodes() {
    try {
      return JSON.parse(readFileSync(usedCodesPath, 'utf8'));
    } catch {
      return { used: {} };
    }
  }

  loadSecondChances() {
    try {
      return JSON.parse(readFileSync(secondChancesPath, 'utf8'));
    } catch {
      return { users: [] };
    }
  }

  saveTrialCodes() {
    writeFileSync(trialCodesPath, JSON.stringify(this.trialCodes, null, 2));
  }

  saveUsedCodes() {
    writeFileSync(usedCodesPath, JSON.stringify(this.usedCodes, null, 2));
  }

  saveSecondChances() {
    writeFileSync(secondChancesPath, JSON.stringify(this.secondChances, null, 2));
  }

  getUserTrial(userId) {
    return this.usedCodes.used[userId];
  }

  getTrialCode(userId) {
    // Check if user already has a code
    const existingCode = this.getUserTrial(userId);
    if (existingCode && !WHITELIST.includes(userId)) {
      return existingCode;
    }

    // Check if there are available codes
    if (this.trialCodes.codes.length === 0) {
      return null;
    }

    if (WHITELIST.includes(userId)) {
      // For whitelisted users, just return a random code without removing it
      const randomIndex = Math.floor(Math.random() * this.trialCodes.codes.length);
      return this.trialCodes.codes[randomIndex];
    } else {
      // For regular users, remove and store the code
      const code = this.trialCodes.codes.pop();
      this.saveTrialCodes();
      this.usedCodes.used[userId] = code;
      this.saveUsedCodes();
      return code;
    }
  }

  // Method to add new trial codes
  addTrialCodes(newCodes) {
    const validCodes = newCodes.filter(code => {
      return code && typeof code === 'string' && code.length > 0;
    });
    
    this.trialCodes.codes.push(...validCodes);
    this.saveTrialCodes();
    this.backupKeys();
    return validCodes.length;
  }

  // Method to check remaining codes
  getRemainingCodesCount() {
    return this.trialCodes.codes.length;
  }

  getUsedCodes() {
    return this.usedCodes.used;
  }

  getAllUnusedCodes() {
    return this.trialCodes.codes;
  }

  deleteTrialCode(code) {
    const index = this.trialCodes.codes.indexOf(code);
    if (index > -1) {
      this.trialCodes.codes.splice(index, 1);
      this.saveTrialCodes();
      return true;
    }
    return false;
  }

  addSingleCode(code) {
    if (!this.trialCodes.codes.includes(code)) {
      this.trialCodes.codes.push(code);
      this.saveTrialCodes();
      this.backupKeys();
      return true;
    }
    return false;
  }

  getUserByCode(code) {
    for (const [userId, usedCode] of Object.entries(this.usedCodes.used)) {
      if (usedCode === code) return userId;
    }
    return null;
  }

  getWhitelist() {
    return WHITELIST;
  }

  addToWhitelist(userId) {
    if (!WHITELIST.includes(userId)) {
      WHITELIST.push(userId);
      updateWhitelist(WHITELIST);
      return true;
    }
    return false;
  }

  removeFromWhitelist(userId) {
    const index = WHITELIST.indexOf(userId);
    if (index > -1) {
      WHITELIST.splice(index, 1);
      updateWhitelist(WHITELIST);
      return true;
    }
    return false;
  }

  wipeUnusedKeys() {
    const count = this.trialCodes.codes.length;
    this.trialCodes.codes = [];
    this.saveTrialCodes();
    this.backupKeys();
    return count;
  }

  hasSecondChance(userId) {
    return this.secondChances.users.includes(userId);
  }

  addSecondChance(userId) {
    if (!this.hasSecondChance(userId)) {
      this.secondChances.users.push(userId);
      this.saveSecondChances();
      return true;
    }
    return false;
  }

  getUserTrials(userId) {
    const trials = [];
    const userCodes = Object.entries(this.usedCodes.used)
      .filter(([id]) => id === userId)
      .map(([, code]) => code);
    
    return userCodes;
  }

  backupKeys() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `keys_backup_${timestamp}.txt`);
    
    const backupContent = {
      timestamp,
      unusedKeys: this.trialCodes.codes,
      usedKeys: this.usedCodes.used,
      secondChances: this.secondChances.users
    };

    try {
      writeFileSync(backupPath, JSON.stringify(backupContent, null, 2));
      console.log(`Backup created: ${backupPath}`);
      return true;
    } catch (error) {
      console.error('Failed to create backup:', error);
      return false;
    }
  }

  getLatestBackup() {
    try {
      const files = readdirSync(backupDir)
        .filter(file => file.startsWith('keys_backup_'))
        .sort()
        .reverse();

      if (files.length === 0) return null;

      const latestBackup = JSON.parse(
        readFileSync(join(backupDir, files[0]), 'utf8')
      );
      return latestBackup;
    } catch (error) {
      console.error('Failed to get latest backup:', error);
      return null;
    }
  }
}

export default new TrialManager(); 