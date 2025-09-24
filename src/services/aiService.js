import OpenAI from 'openai';
import { aiPerformanceMonitor } from '@/utils/aiPerformanceMonitor';

/**
 * Enhanced AI Service with performance optimizations, caching, and better error handling
 * Features:
 * - Response caching to reduce API calls
 * - Request batching and deduplication
 * - Retry logic with exponential backoff
 * - Progressive response streaming
 * - Optimized prompts and model selection
 */

class AIService {
  constructor() {
    this.client = null;
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    };

    // Initialize with environment check
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OpenAI API key not found. AI features will be disabled.');
      return;
    }

    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  /**
   * Generate cache key for request deduplication
   */
  generateCacheKey(type, data) {
    // Extract studentId first to ensure it's always part of the cache key
    const studentId = data.studentId || 'unknown';

    // Create a simpler data structure for hashing that focuses on content, not object references
    const hashData = {
      studentId,
      type,
      ...data
    };

    const sortedData = JSON.stringify(hashData, Object.keys(hashData).sort());
    const hash = btoa(sortedData).slice(0, 32);
    // Put studentId at the beginning of the cache key for clear separation
    const cacheKey = `${type}_student${studentId}_${hash}`;

    // Debug logging to see cache keys
    console.log(`[AI Service] Generating cache key for ${type}:`, {
      type,
      studentId,
      dataKeys: Object.keys(data),
      hash,
      cacheKey
    });

    return cacheKey;
  }

  /**
   * Check if response is cached and still valid
   */
  getCachedResponse(cacheKey, maxAge = 300000) { // 5 minutes default
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.data;
    }
    return null;
  }

  /**
   * Store response in cache
   */
  setCachedResponse(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    // Cleanup old entries (keep last 50)
    if (this.cache.size > 50) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < entries.length - 50; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  async withRetry(operation, context = '') {
    let lastError;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (error.status === 401 || error.status === 429) {
          throw error;
        }

        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(2, attempt),
            this.retryConfig.maxDelay
          );

          console.warn(`AI request failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}) for ${context}. Retrying in ${delay}ms...`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Optimized comment enhancement with better prompts
   */
  async enhanceComment(comment, context = {}) {
    const requestId = aiPerformanceMonitor.startRequest('enhance_comment', context);

    if (!this.client) {
      aiPerformanceMonitor.endRequest(requestId, false, false, 'AI service not initialized');
      throw new Error('AI service not initialized. Please check your OpenAI API key.');
    }

    const cacheKey = this.generateCacheKey('enhance_comment', { comment, context });

    // Check for pending identical request
    if (this.pendingRequests.has(cacheKey)) {
      aiPerformanceMonitor.endRequest(requestId, true, false);
      return this.pendingRequests.get(cacheKey);
    }

    // Check cache first
    const cached = this.getCachedResponse(cacheKey, 600000); // 10 minutes for comment enhancement
    if (cached) {
      aiPerformanceMonitor.endRequest(requestId, true, true);
      return cached;
    }

    const requestPromise = this.withRetry(async () => {
      const optimizedPrompt = this.buildCommentEnhancementPrompt(comment, context);

      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional educational behavioral specialist who creates comprehensive narrative assessments. Transform brief behavioral observations into detailed, flowing narratives that capture the full context and implications of student behaviors. Use professional educational and behavioral terminology while maintaining engaging, readable content."
          },
          {
            role: "user",
            content: optimizedPrompt
          }
        ],
        temperature: 0.5, // Slightly higher for more natural language
        max_tokens: 400,   // Increased for 4-5 sentence responses
        top_p: 0.9        // Added for better quality control
      });

      return completion.choices[0].message.content.trim();
    }, `comment enhancement`);

    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.setCachedResponse(cacheKey, result);
      aiPerformanceMonitor.endRequest(requestId, true, false);
      return result;
    } catch (error) {
      aiPerformanceMonitor.endRequest(requestId, false, false, error.message);
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Optimized behavior summary generation with streaming
   */
  async generateBehaviorSummary(commentsData, dateRange, options = {}) {
    const requestId = aiPerformanceMonitor.startRequest('behavior_summary', { dateRange, dataLength: commentsData.length, studentId: options.studentId });

    if (!this.client) {
      aiPerformanceMonitor.endRequest(requestId, false, false, 'AI service not initialized');
      throw new Error('AI service not initialized. Please check your OpenAI API key.');
    }

    // Include studentId in cache key to ensure student-specific caching
    // Create a simpler representation for caching that focuses on the content structure
    const cacheKey = this.generateCacheKey('behavior_summary', {
      studentId: options.studentId,
      dateRange: dateRange,
      commentCount: commentsData.length,
      commentSummary: commentsData.map(c => ({
        type: c.type,
        date: c.date,
        source: c.source,
        contentHash: btoa(c.content || '').slice(0, 16), // Use content hash instead of full content
        rating: c.rating
      }))
    });

    // Check cache first (shorter cache time for summaries)
    const cached = this.getCachedResponse(cacheKey, 180000); // 3 minutes
    if (cached && !options.forceRefresh) {
      aiPerformanceMonitor.endRequest(requestId, true, true);
      return cached;
    }

    try {
      const result = await this.withRetry(async () => {
        const optimizedPrompt = this.buildBehaviorSummaryPrompt(commentsData, dateRange);

        const completion = await this.client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: this.getBehaviorAnalystSystemPrompt()
            },
            {
              role: "user",
              content: optimizedPrompt
            }
          ],
          temperature: 0.4,  // Increased for more natural, flowing narratives
          max_tokens: 1800,  // Increased for comprehensive 4-5 sentence responses
          top_p: 0.85,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        });

        const response = completion.choices[0].message.content;
        let analysis;

        try {
          analysis = JSON.parse(response);
        } catch (parseError) {
          console.warn('Failed to parse AI response as JSON, attempting to extract content:', parseError);
          // Fallback: try to extract JSON from response
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              analysis = JSON.parse(jsonMatch[0]);
            } catch (e) {
              throw new Error('AI response format invalid');
            }
          } else {
            throw new Error('No valid JSON found in AI response');
          }
        }

        // Validate required fields and provide fallbacks
        const validatedAnalysis = {
          general_overview: analysis.general_overview || analysis.general || 'Behavioral overview based on available data within the specified date range.',
          strengths: analysis.strengths || 'Student strengths identified from behavioral observations.',
          improvements: analysis.improvements || analysis.improvements_needed || 'Areas for behavioral improvement identified.',
          incidents: analysis.incidents || analysis.behavioral_incidents || '',
          recommendations: analysis.recommendations || analysis.summary_recommendations || 'Behavioral recommendations based on observed patterns.'
        };

        // Cache the validated result
        this.setCachedResponse(cacheKey, validatedAnalysis);

        return validatedAnalysis;
      }, `behavior summary generation`);

      aiPerformanceMonitor.endRequest(requestId, true, false);
      return result;
    } catch (error) {
      aiPerformanceMonitor.endRequest(requestId, false, false, error.message);
      throw error;
    }
  }

  /**
   * Batch multiple comment enhancements for efficiency
   */
  async batchEnhanceComments(comments, context = {}) {
    if (!this.client || comments.length === 0) {
      return comments;
    }

    // Group comments to optimize API usage
    const batchSize = 5; // Process 5 comments per request
    const batches = [];

    for (let i = 0; i < comments.length; i += batchSize) {
      batches.push(comments.slice(i, i + batchSize));
    }

    const results = await Promise.allSettled(
      batches.map(batch => this.processBatch(batch, context))
    );

    // Flatten results and handle errors gracefully
    const enhancedComments = [];
    results.forEach((result, batchIndex) => {
      if (result.status === 'fulfilled') {
        enhancedComments.push(...result.value);
      } else {
        console.error(`Batch ${batchIndex} failed:`, result.reason);
        // Fallback to original comments for failed batch
        enhancedComments.push(...batches[batchIndex]);
      }
    });

    return enhancedComments;
  }

  async processBatch(commentBatch, context) {
    const cacheKey = this.generateCacheKey('batch_enhance', { commentBatch, context });

    const cached = this.getCachedResponse(cacheKey, 300000); // 5 minutes
    if (cached) {
      return cached;
    }

    const result = await this.withRetry(async () => {
      const batchPrompt = this.buildBatchEnhancementPrompt(commentBatch, context);

      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional educational behavioral specialist. Transform multiple brief behavioral observations into comprehensive, detailed narratives using professional terminology. Each narrative should be 4-5 flowing sentences that capture the full behavioral context and educational implications. Separate each enhanced narrative with '---' and maintain the original order."
          },
          {
            role: "user",
            content: batchPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1200,
        top_p: 0.9
      });

      const enhancedText = completion.choices[0].message.content;
      const enhancedComments = this.parseBatchResponse(enhancedText, commentBatch);

      this.setCachedResponse(cacheKey, enhancedComments);
      return enhancedComments;
    }, `batch comment enhancement`);

    return result;
  }

  /**
   * Build optimized prompt for comment enhancement
   */
  buildCommentEnhancementPrompt(comment, context) {
    const contextInfo = context.timeSlot ? `Time: ${context.timeSlot}` : '';
    const behaviorContext = context.behaviorType ? `Behavior Type: ${context.behaviorType}` : '';

    return `Transform this behavioral observation into a comprehensive, professional narrative using clear behavioral language:

Original: "${comment}"
${contextInfo}
${behaviorContext}

Requirements:
- Expand into 4-5 complete, flowing sentences
- Use professional behavioral and educational terminology
- Include specific behavioral descriptions and context
- Describe observable actions, patterns, and interactions
- Reference environmental factors and triggers when applicable
- Maintain objective, professional tone throughout
- Focus on behavioral dynamics and their educational implications
- Connect behaviors to learning and social development

Enhanced behavioral narrative:`;
  }

  /**
   * Build optimized prompt for batch comment enhancement
   */
  buildBatchEnhancementPrompt(comments, context) {
    const contextInfo = context.timeSlot ? `Context: ${context.timeSlot}` : '';

    return `Transform these behavioral observations into comprehensive, professional narratives. Each response should be 4-5 flowing sentences using educational behavioral terminology. Return each enhanced comment separated by "---" in the same order:

${contextInfo}

Original comments:
${comments.map((comment, index) => `${index + 1}. ${comment}`).join('\n')}

Enhanced behavioral narratives (separated by "---", same order):`;
  }

  /**
   * Parse batch enhancement response
   */
  parseBatchResponse(response, originalComments) {
    // First try parsing with "---" separator
    const segments = response.split('---').map(segment => segment.trim()).filter(segment => segment.length > 0);

    if (segments.length === originalComments.length) {
      return segments.map(segment => {
        // Remove any numbering that might be present
        return segment.replace(/^\d+\.\s*/, '').trim();
      });
    }

    // Fallback to line-based parsing
    const lines = response.split('\n').filter(line => line.trim());

    if (lines.length === originalComments.length) {
      return lines.map(line => {
        // Remove numbering if present
        return line.replace(/^\d+\.\s*/, '').trim();
      });
    }

    // If both parsing methods fail, return originals
    console.warn('Batch response parsing failed, using originals. Expected', originalComments.length, 'comments, got', segments.length, 'segments and', lines.length, 'lines');
    return originalComments;
  }

  /**
   * Optimized behavior summary prompt
   */
  buildBehaviorSummaryPrompt(commentsData, dateRange) {
    const { startDate, endDate } = dateRange;
    const dateRangeText = startDate === endDate ? startDate : `${startDate} to ${endDate}`;

    // Pre-process and summarize data more efficiently
    const summary = this.preprocessCommentsData(commentsData);

    return `Analyze behavioral data for ${dateRangeText} and create comprehensive, detailed behavioral narratives:

BEHAVIORAL DATA SUMMARY:
- Total observations: ${summary.totalObservations}
- Rating distribution: ${summary.ratingDistribution}
- Date range: ${dateRangeText}

DETAILED OBSERVATIONS:
${summary.detailedObservations.slice(0, 20).join('\n')}

INCIDENTS: ${summary.incidents.join('\n')}
CONTACTS: ${summary.contacts.join('\n')}

Generate JSON response with ALL required keys: general_overview, strengths, improvements, incidents, recommendations

CRITICAL REQUIREMENTS:
- Each field must contain 4-5 flowing, comprehensive sentences
- Use professional educational and behavioral terminology throughout
- Write detailed narratives that capture behavioral dynamics and educational implications
- Include specific behavioral patterns, triggers, and environmental contexts
- Reference observable behaviors with dates and rating analysis (4=exceeds, 3=meets, 2=needs improvement, 1=does not meet)
- Connect behaviors to learning processes, social development, and educational outcomes
- Provide detailed, actionable recommendations with specific implementation strategies
- Maintain professional, objective tone while being comprehensive and descriptive
- If limited data available, extrapolate professional insights based on documented observations within ${dateRangeText}`;
  }

  /**
   * Preprocess comments data for more efficient AI processing
   */
  preprocessCommentsData(commentsData) {
    const summary = {
      totalObservations: commentsData.length,
      ratingDistribution: {},
      keyPatterns: [],
      detailedObservations: [],
      incidents: [],
      contacts: []
    };

    // Count ratings and identify patterns
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const timeSlotPatterns = {};

    commentsData.forEach(comment => {
      if (comment.rating) {
        ratingCounts[comment.rating] = (ratingCounts[comment.rating] || 0) + 1;
      }

      if (comment.type === 'time_slot') {
        timeSlotPatterns[comment.slot] = timeSlotPatterns[comment.slot] || [];
        timeSlotPatterns[comment.slot].push(comment.rating);
      }

      // Categorize for inclusion
      if (comment.type === 'incident') {
        summary.incidents.push(`${comment.date}: ${comment.content}`);
      } else if (comment.type === 'contact') {
        summary.contacts.push(`${comment.date}: ${comment.content}`);
      } else if (comment.rating <= 2 || summary.detailedObservations.length < 15) {
        summary.detailedObservations.push(`${comment.date} - ${comment.context}: ${comment.content} (Rating: ${comment.rating || 'N/A'})`);
      }
    });

    summary.ratingDistribution = Object.entries(ratingCounts)
      .filter(([_, count]) => count > 0)
      .map(([rating, count]) => `${count}x rating ${rating}`)
      .join(', ');

    return summary;
  }

  /**
   * System prompt for behavior analyst
   */
  getBehaviorAnalystSystemPrompt() {
    return `You are a professional educational behavioral analyst creating comprehensive, detailed behavioral assessments. Your role is to transform observational data into rich, informative narratives that capture the full scope of student behavioral patterns and educational implications.

CORE PRINCIPLES:
- Create detailed, flowing narratives (4-5 sentences per section) using professional educational terminology
- Base all assessments on observable, documented behaviors while providing comprehensive context
- Maintain professional, objective tone while being descriptive and thorough
- Reference specific dates and patterns from provided data
- Connect behaviors to educational outcomes, learning processes, and developmental considerations
- Include environmental factors, triggers, and intervention effectiveness
- Provide actionable, specific recommendations with implementation strategies

RATING SYSTEM:
4 = Exceeds expectations, 3 = Meets expectations, 2 = Needs improvement, 1 = Does not meet expectations

Return valid JSON with comprehensive, detailed narratives for each section that demonstrate professional behavioral analysis expertise.`;
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Clear cache for specific student (useful when switching students)
   */
  clearStudentCache(studentId) {
    const keysToDelete = Array.from(this.cache.keys()).filter(key =>
      key.includes(`studentId:${studentId}`)
    );

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    console.log(`[AI Service] Cleared cache for student ${studentId}, removed ${keysToDelete.length} entries`);
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheHitRatio: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;
