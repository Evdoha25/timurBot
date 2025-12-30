/**
 * Utility Helper Functions
 */

/**
 * Format a date to a readable string
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Escape markdown special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate percentage
 * @param {number} value - Part value
 * @param {number} total - Total value
 * @returns {number} Percentage rounded to nearest integer
 */
function calculatePercentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Delay execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated (default: '...')
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength, suffix = '...') {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Generate a random string ID
 * @param {number} length - Length of the ID
 * @returns {string} Random ID
 */
function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate Telegram user ID
 * @param {any} userId - User ID to validate
 * @returns {boolean} True if valid
 */
function isValidUserId(userId) {
  return typeof userId === 'number' && userId > 0 && Number.isInteger(userId);
}

/**
 * Parse CEFR level from score
 * @param {number} percentage - Score percentage
 * @returns {string} CEFR level
 */
function getLevelFromScore(percentage) {
  if (percentage <= 25) return 'A1';
  if (percentage <= 50) return 'A2';
  if (percentage <= 75) return 'B1';
  return 'B2';
}

/**
 * Get level description
 * @param {string} level - CEFR level
 * @returns {string} Level description
 */
function getLevelDescription(level) {
  const descriptions = {
    'A1': 'Beginner',
    'A2': 'Elementary',
    'B1': 'Intermediate',
    'B2': 'Upper-Intermediate'
  };
  return descriptions[level] || level;
}

/**
 * Get level emoji
 * @param {string} level - CEFR level
 * @returns {string} Emoji for level
 */
function getLevelEmoji(level) {
  const emojis = {
    'A1': '🌱',
    'A2': '🌿',
    'B1': '🌳',
    'B2': '🌲'
  };
  return emojis[level] || '📊';
}

module.exports = {
  formatDate,
  escapeMarkdown,
  shuffleArray,
  calculatePercentage,
  delay,
  truncateText,
  generateId,
  isValidUserId,
  getLevelFromScore,
  getLevelDescription,
  getLevelEmoji
};
