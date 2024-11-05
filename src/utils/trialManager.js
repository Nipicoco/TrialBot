import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const trialCodesPath = join(__dirname, '../../data/trial_codes.json');
const usedCodesPath = join(__dirname, '../../data/used_codes.json');
const secondChancesPath = join(__dirname, '../../data/second_chances.json');

// Get whitelist from environment variable
const WHITELIST = process.env.WHITELIST_IDS ? process.env.WHITELIST_IDS.split(',') : [];

class TrialManager {
  constructor() {
    this.trialCodes = this.loadTrialCodes();
    this.usedCodes = this.loadUsedCodes();
    this.secondChances = this.loadSecondChances();
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
    if (this.usedCodes.used[userId]) {
      trials.push(this.usedCodes.used[userId]);
    }
    return trials;
  }
}

export default new TrialManager(); 