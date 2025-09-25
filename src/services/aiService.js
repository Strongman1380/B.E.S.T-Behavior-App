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
            content: "You are a professional educational behavioral specialist who creates concise, impactful narrative assessments. Transform brief behavioral observations into short but comprehensive narratives (exactly 4 sentences) that capture key behaviors and their implications. Use professional educational terminology while keeping the writing clear, direct, and engaging."
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
        const optimizedPrompt = this.buildBehaviorSummaryPrompt(commentsData, dateRange, options);

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
            content: "You are a professional educational behavioral specialist. Transform multiple brief behavioral observations into concise, impactful narratives using professional terminology. Each narrative should be exactly 4 sentences that capture key behavioral context and educational implications. Separate each enhanced narrative with '---' and maintain the original order."
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
    const details = [];
    if (context.studentName) details.push(`Student: ${context.studentName}`);
    if (context.gradeLevel) details.push(`Grade Level: ${context.gradeLevel}`);
    if (context.timeSlot) details.push(`Time Slot: ${context.timeSlot}`);
    if (context.evaluationDate) details.push(`Date: ${context.evaluationDate}`);
    if (context.teacherName) details.push(`Staff/Reporter: ${context.teacherName}`);
    if (context.scoreSnapshot) details.push(`Recorded Scores: ${context.scoreSnapshot}`);
    if (context.behaviorType) details.push(`Observation Type: ${context.behaviorType}`);

    const contextBlock = details.length ? `Context:\n- ${details.join('\n- ')}` : 'Context:\n- Observation recorded within daily evaluation data.';

    return `Transform this behavioral observation into a professional, concise narrative for student documentation.

${contextBlock}

Original Observation:
"""${comment}"""

Requirements:
- Write exactly 4 sentences using professional educational language
- Keep it short and sweet but comprehensive
- Focus on key behaviors and their impact
- End with a brief forward-looking statement

Enhanced Narrative:`;
  }

  /**
   * Build optimized prompt for batch comment enhancement
   */
  buildBatchEnhancementPrompt(comments, context) {
    const details = [];
    if (context.studentName) details.push(`Student: ${context.studentName}`);
    if (context.gradeLevel) details.push(`Grade Level: ${context.gradeLevel}`);
    if (context.timeSlot) details.push(`Primary Context: ${context.timeSlot}`);
    if (context.teacherName) details.push(`Staff/Reporter: ${context.teacherName}`);
    if (context.scoreSnapshot) details.push(`Recorded Scores: ${context.scoreSnapshot}`);

    const contextInfo = details.length ? `Context:\n- ${details.join('\n- ')}` : 'Context:\n- Daily evaluation excerpts.';

    return `Transform these behavioral observations into professional, concise narratives. Each narrative must contain exactly 4 sentences, use educational behavioral terminology, and be separated by "---" in the same order provided.

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
  buildBehaviorSummaryPrompt(commentsData, dateRange, options = {}) {
    const { startDate, endDate } = dateRange;
    const dateRangeText = startDate === endDate ? startDate : `${startDate} to ${endDate}`;

    // Pre-process and summarize data more efficiently
    const summary = this.preprocessCommentsData(commentsData);

    const studentProfileLines = [
      options.studentName ? `Student: ${options.studentName}` : null,
      options.gradeLevel ? `Grade Level: ${options.gradeLevel}` : null,
      options.schoolName ? `Program/Campus: ${options.schoolName}` : null,
      options.teacherName ? `Primary Staff: ${options.teacherName}` : null,
      `Reporting Window: ${dateRangeText}`
    ].filter(Boolean);

    const sourceBreakdown = summary.sourceSummary.length
      ? summary.sourceSummary.map(item => `- ${item}`).join('\n')
      : '- Source details unavailable';

    const ratingSnapshot = summary.numericRatingCount > 0
      ? `Average numeric rating: ${summary.overallAverageRating} across ${summary.numericRatingCount} scoring entries. Low ratings (≤2): ${summary.lowRatingCount}.`
      : 'Numeric rating data was not available within this window.';

    const timeSlotInsights = summary.timeSlotHighlights.length
      ? summary.timeSlotHighlights.map(item => `- ${item.slotLabel}: avg ${item.averageRating} (${item.entryCount} entries${item.lowCount > 0 ? `, low scores: ${item.lowCount}` : ''})`).join('\n')
      : '- No consistent time-slot patterns detected from the available observations.';

    return `You are analyzing behavioral data for ${options.studentName || 'the student'} during ${dateRangeText}. Produce an actionable, professional summary grounded in the evidence provided.

STUDENT PROFILE:
${studentProfileLines.length ? studentProfileLines.map(line => `- ${line}`).join('\n') : '- Reporting context limited to date range provided.'}

DATA SOURCES:
${sourceBreakdown}

RATING SNAPSHOT:
- ${ratingSnapshot}

TIME-SLOT TRENDS:
${timeSlotInsights}

BEHAVIORAL DATA SUMMARY:
- Total observations: ${summary.totalObservations}
- Rating distribution: ${summary.ratingDistribution}
- Date range: ${dateRangeText}

DETAILED OBSERVATIONS:
${summary.detailedObservations.slice(0, 20).join('\n')}

INCIDENTS: ${summary.incidents.join('\n')}
CONTACTS: ${summary.contacts.join('\n')}

Return JSON with the following keys (string values, each 4-5 sentences long):
- general_overview (comprehensive narrative of overall behavioral patterns and progress)
- strengths (spotlighting specific positive behaviors and growth areas)
- improvements (areas requiring coaching or intervention, tied to data)
- incidents (summary of critical events or high-leverage concerns)
- recommendations (actionable next steps with practical strategies)

CRITICAL REQUIREMENTS:
- Each field must contain 4-5 flowing, comprehensive sentences written in a professional, objective tone
- Reference concrete evidence from the observations (dates, ratings, time slots, incidents)
- Highlight patterns, triggers, environmental factors, and the impact on learning or social development
- Celebrate strengths using asset-based language while still noting supporting data
- Provide actionable recommendations with specific strategies (who, what, when) tied to observed needs
- If data is sparse, acknowledge limitations while extrapolating reasonable insights from the available evidence`;
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
      contacts: [],
      sourceSummary: [],
      timeSlotHighlights: [],
      overallAverageRating: null,
      numericRatingCount: 0,
      lowRatingCount: 0
    };

    // Count ratings and identify patterns
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const timeSlotPatterns = {};
    const slotLabels = {};
    const sourceCounts = {};
    const numericRatings = [];

    commentsData.forEach(comment => {
      const ratingValue = Number(comment.rating);
      if (Number.isFinite(ratingValue)) {
        ratingCounts[ratingValue] = (ratingCounts[ratingValue] || 0) + 1;
        numericRatings.push(ratingValue);
        if (ratingValue <= 2) {
          summary.lowRatingCount += 1;
        }
      }

      if (comment.type === 'time_slot') {
        timeSlotPatterns[comment.slot] = timeSlotPatterns[comment.slot] || [];
        if (Number.isFinite(ratingValue)) {
          timeSlotPatterns[comment.slot].push(ratingValue);
        }
        if (!slotLabels[comment.slot] && comment.slotLabel) {
          slotLabels[comment.slot] = comment.slotLabel;
        }
      }

      const sourceKey = comment.source || comment.type || 'general';
      sourceCounts[sourceKey] = (sourceCounts[sourceKey] || 0) + 1;

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

    if (numericRatings.length > 0) {
      const total = numericRatings.reduce((acc, value) => acc + value, 0);
      summary.numericRatingCount = numericRatings.length;
      summary.overallAverageRating = (total / numericRatings.length).toFixed(2);
    }

    summary.sourceSummary = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => `${source.replace(/_/g, ' ')}: ${count}`);

    summary.timeSlotHighlights = Object.entries(timeSlotPatterns)
      .map(([slot, values]) => {
        if (!values.length) return null;
        const average = values.reduce((acc, value) => acc + value, 0) / values.length;
        const lowCount = values.filter(value => value <= 2).length;
        const slotLabel = slotLabels[slot] || slot.replace(/_/g, ' ');
        return {
          slot,
          slotLabel,
          averageRating: average.toFixed(2),
          entryCount: values.length,
          lowCount
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.lowCount - a.lowCount) || (b.entryCount - a.entryCount))
      .slice(0, 5);

    return summary;
  }

  /**
   * System prompt for behavior analyst
   */
  getBehaviorAnalystSystemPrompt() {
    return `You are a professional educational behavioral analyst creating comprehensive, data-driven summaries for educators and program staff.

CORE PRINCIPLES:
- Provide 4-5 sentence paragraphs for each requested field using professional, objective language.
- Base every insight on the supplied evidence, referencing dates, time blocks, ratings, incidents, and contacts.
- Highlight student assets and growth while addressing areas of concern with constructive, trauma-informed language.
- Reference the 4-point behavioral scale where applicable (4 = exceeds, 3 = meets, 2 = needs improvement, 1 = does not meet expectations).
- Offer actionable recommendations that specify strategies, responsible roles, and follow-up timelines when possible.
- Acknowledge data limitations transparently if information is sparse.

OUTPUT FORMAT:
- Return valid JSON only (no additional commentary).
- Keys must include: general_overview, strengths, improvements, incidents, recommendations.
- Values must be rich narrative strings (not lists) suitable for direct inclusion in reports.`;
  }

  buildKpiInsightsPrompt(metrics, options = {}) {
    const metricsPreview = JSON.stringify(metrics, null, 2);
    const focus = options.scope || 'kpi_dashboard';

    return `You are an educational data coach generating concise KPI insights for administrators (${focus}).

DATA INPUT (JSON):
${metricsPreview}

TASK:
Analyze the data and return JSON with the following structure:
{
  "panels": [
    { "id": "behavior", "title": "Behavior Trends", "summary": "One to two sentences" },
    { "id": "recognition", "title": "Recognition Rate", "summary": "One to two sentences" },
    { "id": "incident", "title": "Incident Prevention", "summary": "One to two sentences" },
    { "id": "data", "title": "Data Quality", "summary": "One to two sentences" }
  ],
  "focusAreas": ["Action-oriented bullet", "Another action"],
  "celebrateSuccesses": ["Positive highlight", "Another highlight"]
}

REQUIREMENTS:
- Always provide four panels using the specified ids and titles.
- Summaries must reference the supplied data (ratings, steps, credits, incidents, trends).
- Focus areas: max 3 short bullet strings with actionable language (verbs first).
- Celebrate successes: max 3 short bullet strings highlighting measurable wins.
- Avoid placeholders like N/A; if data is missing, state that directly (e.g., "Limited step data available this period.").
- Output ONLY valid JSON without additional commentary.`;
  }

  parseJsonResponse(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Empty AI response');
    }

    const trimmed = rawContent.trim();
    const withoutFence = trimmed.replace(/^```json/i, '').replace(/```$/i, '').trim();

    try {
      return JSON.parse(withoutFence);
    } catch (error) {
      console.warn('AI response parse failed, attempting recovery fallback.', error);
      const match = withoutFence.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (err) {
          console.warn('AI response fallback parse failed.', err);
          throw new Error('Failed to parse AI JSON response');
        }
      }
      console.warn('AI response did not contain valid JSON payload.');
      throw new Error('Invalid AI JSON response');
    }
  }

  async generateKpiInsights(metrics, options = {}) {
    const requestId = aiPerformanceMonitor.startRequest('kpi_insights', { scope: options.scope || 'kpi_dashboard' });

    if (!this.client) {
      aiPerformanceMonitor.endRequest(requestId, false, false, 'AI service not initialized');
      throw new Error('AI service not initialized. Please check your OpenAI API key.');
    }

    const cacheKey = this.generateCacheKey('kpi_insights', { metrics, options });

    if (this.pendingRequests.has(cacheKey)) {
      aiPerformanceMonitor.endRequest(requestId, true, false);
      return this.pendingRequests.get(cacheKey);
    }

    const cached = this.getCachedResponse(cacheKey, 180000);
    if (cached) {
      aiPerformanceMonitor.endRequest(requestId, true, true);
      return cached;
    }

    const requestPromise = this.withRetry(async () => {
      const prompt = this.buildKpiInsightsPrompt(metrics, options);

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an educational data strategist who produces concise, actionable KPI insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 450,
        top_p: 0.9
      });

      return completion.choices[0].message.content.trim();
    }, 'kpi insights');

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const raw = await requestPromise;
      const parsed = this.parseJsonResponse(raw);
      this.setCachedResponse(cacheKey, parsed);
      aiPerformanceMonitor.endRequest(requestId, true, false);
      return parsed;
    } catch (error) {
      aiPerformanceMonitor.endRequest(requestId, false, false, error.message);
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
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
