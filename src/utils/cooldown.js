const cooldowns = new Map();
const COOLDOWN_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function isOnCooldown(userId) {
  if (!cooldowns.has(userId)) return false;
  const timeLeft = cooldowns.get(userId) - Date.now();
  return timeLeft > 0;
}

export function setCooldown(userId) {
  cooldowns.set(userId, Date.now() + COOLDOWN_DURATION);
}

export function getCooldownTime(userId) {
  const timeLeft = cooldowns.get(userId) - Date.now();
  return Math.ceil(timeLeft / 1000 / 60); // Returns minutes
} 