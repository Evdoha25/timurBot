const fs = require('fs');
const path = require('path');

/**
 * Assessment Service
 * Handles scoring and level determination
 */
class AssessmentService {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, '../../data/config.json');
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from JSON file
   * @returns {Object} Configuration object
   */
  loadConfig() {
    try {
      const data = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading config:', error.message);
      // Return default config if file cannot be loaded
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration
   */
  getDefaultConfig() {
    return {
      scoring: {
        weights: {
          A1: 1,
          A2: 2,
          B1: 3,
          B2: 4
        },
        levelThresholds: {
          A1: { min: 0, max: 25 },
          A2: { min: 26, max: 50 },
          B1: { min: 51, max: 75 },
          B2: { min: 76, max: 100 }
        }
      },
      recommendations: {
        A1: "Focus on basic vocabulary and simple grammar structures.",
        A2: "Practice past and future tenses, expand your vocabulary.",
        B1: "Work on more complex grammar and improve fluency.",
        B2: "Focus on advanced vocabulary and complex sentence structures."
      }
    };
  }

  /**
   * Calculate the final score and assessment
   * @param {Object} session - User session with answers
   * @param {Array} questions - Questions that were asked
   * @returns {Object} Assessment result
   */
  calculateAssessment(session, questions) {
    const { answers } = session;
    
    // Calculate weighted score
    let totalWeight = 0;
    let earnedWeight = 0;
    
    // Category breakdown
    const categoryStats = {
      vocabulary: { correct: 0, total: 0 },
      grammar: { correct: 0, total: 0 }
    };

    // Level breakdown
    const levelStats = {
      A1: { correct: 0, total: 0 },
      A2: { correct: 0, total: 0 },
      B1: { correct: 0, total: 0 },
      B2: { correct: 0, total: 0 }
    };

    // Process each answer
    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      const weight = question.weight || this.config.scoring.weights[question.level] || 1;
      totalWeight += weight;

      // Update category stats
      if (categoryStats[question.category]) {
        categoryStats[question.category].total++;
        if (answer.isCorrect) {
          categoryStats[question.category].correct++;
        }
      }

      // Update level stats
      if (levelStats[question.level]) {
        levelStats[question.level].total++;
        if (answer.isCorrect) {
          levelStats[question.level].correct++;
        }
      }

      if (answer.isCorrect) {
        earnedWeight += weight;
      }
    }

    // Calculate percentage score
    const percentageScore = totalWeight > 0 
      ? Math.round((earnedWeight / totalWeight) * 100) 
      : 0;

    // Determine level based on score
    const level = this.determineLevel(percentageScore);

    // Calculate category percentages
    const categoryPercentages = {};
    for (const [category, stats] of Object.entries(categoryStats)) {
      categoryPercentages[category] = stats.total > 0
        ? Math.round((stats.correct / stats.total) * 100)
        : 0;
    }

    // Calculate level percentages
    const levelPercentages = {};
    for (const [lvl, stats] of Object.entries(levelStats)) {
      levelPercentages[lvl] = stats.total > 0
        ? Math.round((stats.correct / stats.total) * 100)
        : 0;
    }

    // Get recommendation for determined level
    const recommendation = this.getRecommendation(level);

    return {
      level,
      percentageScore,
      totalQuestions: answers.length,
      correctAnswers: answers.filter(a => a.isCorrect).length,
      categoryStats,
      categoryPercentages,
      levelStats,
      levelPercentages,
      earnedWeight,
      totalWeight,
      recommendation,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Determine CEFR level based on percentage score
   * @param {number} percentage - Score percentage (0-100)
   * @returns {string} CEFR level (A1, A2, B1, B2)
   */
  determineLevel(percentage) {
    const thresholds = this.config.scoring.levelThresholds;

    if (percentage <= thresholds.A1.max) {
      return 'A1';
    } else if (percentage <= thresholds.A2.max) {
      return 'A2';
    } else if (percentage <= thresholds.B1.max) {
      return 'B1';
    } else {
      return 'B2';
    }
  }

  /**
   * Get recommendation for a given level
   * @param {string} level - CEFR level
   * @returns {string} Recommendation text
   */
  getRecommendation(level) {
    return this.config.recommendations[level] || 
      "Keep practicing to improve your English skills!";
  }

  /**
   * Format assessment result for display
   * @param {Object} assessment - Assessment result object
   * @returns {string} Formatted result message
   */
  formatResultMessage(assessment) {
    const levelEmoji = {
      A1: '🌱',
      A2: '🌿',
      B1: '🌳',
      B2: '🌲'
    };

    const levelDescription = {
      A1: 'Beginner',
      A2: 'Elementary',
      B1: 'Intermediate',
      B2: 'Upper-Intermediate'
    };

    const emoji = levelEmoji[assessment.level] || '📊';
    const description = levelDescription[assessment.level] || assessment.level;

    let message = `📊 *Your English Level Assessment Results*\n\n`;
    message += `${emoji} *Level: ${assessment.level} (${description})*\n\n`;
    message += `📈 *Overall Score: ${assessment.percentageScore}%*\n`;
    message += `✅ Correct answers: ${assessment.correctAnswers}/${assessment.totalQuestions}\n\n`;
    
    message += `📚 *Score by Category:*\n`;
    message += `• Vocabulary: ${assessment.categoryPercentages.vocabulary}%`;
    message += ` (${assessment.categoryStats.vocabulary.correct}/${assessment.categoryStats.vocabulary.total})\n`;
    message += `• Grammar: ${assessment.categoryPercentages.grammar}%`;
    message += ` (${assessment.categoryStats.grammar.correct}/${assessment.categoryStats.grammar.total})\n\n`;
    
    message += `📊 *Score by Level:*\n`;
    for (const level of ['A1', 'A2', 'B1', 'B2']) {
      const stats = assessment.levelStats[level];
      if (stats.total > 0) {
        message += `• ${level}: ${assessment.levelPercentages[level]}%`;
        message += ` (${stats.correct}/${stats.total})\n`;
      }
    }
    
    message += `\n💡 *Recommendation:*\n${assessment.recommendation}`;

    return message;
  }

  /**
   * Format result for monitoring bot (concise version)
   * @param {Object} session - User session
   * @param {Object} assessment - Assessment result
   * @returns {string} Formatted message for monitoring
   */
  formatMonitoringMessage(session, assessment) {
    let message = `📝 *New Test Completed*\n\n`;
    message += `👤 User ID: \`${session.userId}\`\n`;
    message += session.username ? `👤 Username: @${session.username}\n` : '';
    message += `🕐 Completed: ${new Date().toLocaleString()}\n\n`;
    message += `📊 *Results:*\n`;
    message += `• Level: *${assessment.level}*\n`;
    message += `• Score: *${assessment.percentageScore}%*\n`;
    message += `• Correct: ${assessment.correctAnswers}/${assessment.totalQuestions}\n`;
    message += `• Vocabulary: ${assessment.categoryPercentages.vocabulary}%\n`;
    message += `• Grammar: ${assessment.categoryPercentages.grammar}%\n`;
    message += `\n⏱ Duration: ${this.calculateDuration(session.startTime)}`;

    return message;
  }

  /**
   * Calculate test duration
   * @param {string} startTime - ISO timestamp of start time
   * @returns {string} Formatted duration
   */
  calculateDuration(startTime) {
    const start = new Date(startTime);
    const end = new Date();
    const durationMs = end - start;
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Generate a simple text-based progress bar
   * @param {number} current - Current progress
   * @param {number} total - Total items
   * @returns {string} Progress bar string
   */
  generateProgressBar(current, total) {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage}%`;
  }
}

module.exports = AssessmentService;
