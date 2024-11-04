import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const trialCodesPath = join(__dirname, '../../data/trial_codes.json');
const usedCodesPath = join(__dirname, '../../data/used_codes.json');

// Whitelist of user IDs that can use the command multiple times
const WHITELIST = [
  '572959864423448580',  // Test account 2
  // Add more whitelisted IDs here
];

class TrialManager {
  constructor() {
    this.trialCodes = this.loadTrialCodes();
    this.usedCodes = this.loadUsedCodes();
  }

  loadTrialCodes() {
    try {
      return JSON.parse(readFileSync(trialCodesPath, 'utf8'));
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

  saveTrialCodes() {
    writeFileSync(trialCodesPath, JSON.stringify(this.trialCodes, null, 2));
  }

  saveUsedCodes() {
    writeFileSync(usedCodesPath, JSON.stringify(this.usedCodes, null, 2));
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
      // Add any validation logic you need for your key format
      return code && typeof code === 'string' && code.length > 0;
    });
    
    this.trialCodes.codes.push(...validCodes);
    this.saveTrialCodes();
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
}

export default new TrialManager(); 