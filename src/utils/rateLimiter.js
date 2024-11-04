import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const blacklistPath = join(__dirname, '../../data/blacklist.json');

class RateLimiter {
  constructor() {
    this.attempts = new Map();
    this.blacklist = this.loadBlacklist();
    this.MAX_ATTEMPTS = 5;
    this.ATTEMPT_WINDOW = 60000; // 1 minute
    this.BLACKLIST_DURATION = 3600000; // 1 hour
  }

  loadBlacklist() {
    try {
      const data = JSON.parse(readFileSync(blacklistPath, 'utf8'));
      // Convert stored blacklist to Map with expiry times
      const blacklist = new Map();
      for (const [userId, expiryTime] of Object.entries(data)) {
        if (Date.now() < expiryTime) {
          blacklist.set(userId, parseInt(expiryTime));
        }
      }
      return blacklist;
    } catch {
      return new Map();
    }
  }

  saveBlacklist() {
    const blacklistObject = Object.fromEntries(this.blacklist);
    writeFileSync(blacklistPath, JSON.stringify(blacklistObject, null, 2));
  }

  isBlacklisted(userId) {
    if (!this.blacklist.has(userId)) return false;
    
    const expiryTime = this.blacklist.get(userId);
    if (Date.now() >= expiryTime) {
      this.blacklist.delete(userId);
      this.saveBlacklist();
      return false;
    }
    return true;
  }

  getBlacklistRemaining(userId) {
    if (!this.blacklist.has(userId)) return 0;
    const remaining = this.blacklist.get(userId) - Date.now();
    return Math.ceil(remaining / 1000 / 60); // Returns minutes
  }

  checkAndAddAttempt(userId) {
    if (this.isBlacklisted(userId)) {
      return false;
    }

    const now = Date.now();
    const userAttempts = this.attempts.get(userId) || [];
    
    // Remove old attempts
    const recentAttempts = userAttempts.filter(time => now - time < this.ATTEMPT_WINDOW);
    
    if (recentAttempts.length >= this.MAX_ATTEMPTS) {
      const expiryTime = now + this.BLACKLIST_DURATION;
      this.blacklist.set(userId, expiryTime);
      this.saveBlacklist();
      return false;
    }

    recentAttempts.push(now);
    this.attempts.set(userId, recentAttempts);
    return true;
  }
}

export default new RateLimiter(); 