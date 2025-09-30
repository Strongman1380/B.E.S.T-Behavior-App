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
    
    console.log('🔍 AI Service Initialization Debug:');
    console.log('- Environment check:', !!import.meta.env);
    console.log('- API key present:', !!apiKey);
    console.log('- API key starts with sk-:', apiKey?.startsWith('sk-'));
    console.log('- API key length:', apiKey?.length || 0);
    
    if (!apiKey) {
      console.warn('❌ OpenAI API key not found in environment variables.');
      console.warn('Please add VITE_OPENAI_API_KEY to your .env.local file');
      console.warn('Available env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE')));
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format. Key should start with "sk-"');
      console.error('Current key starts with:', apiKey.substring(0, 5) + '...');
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
      console.log('✅ AI Service initialized successfully');
      console.log('✅ OpenAI client created with API key ending in:', '...' + apiKey.slice(-8));
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI client:', error);
      this.client = null;
    }
  }

  /**
   * Generate cache key for request deduplication
   */
  generateCacheKey(type, data) {
    // Extract studentId first to ensure it's always part of the cache key
    const studentId = data.studentId || 'unknown';
    
    // For comment enhancement, include timeSlot to ensure period-specific caching
    let periodSpecifier = '';
    if (type === 'enhance_comment' && data.context && data.context.timeSlot) {
      periodSpecifier = `_period${data.context.timeSlot.replace(/[^a-zA-Z0-9]/g, '')}`;
    }

    // Create a simpler data structure for hashing that focuses on content, not object references
    const hashData = {
      studentId,
      type,
      ...data
    };

    const sortedData = JSON.stringify(hashData, Object.keys(hashData).sort());
    const hash = encodeURIComponent(sortedData).slice(0, 32);
    // Put studentId at the beginning of the cache key for clear separation
    const cacheKey = `${type}_student${studentId}${periodSpecifier}_${hash}`;

    // Debug logging to see cache keys
    console.log(`[AI Service] Generating cache key for ${type}:`, {
      type,
      studentId,
      timeSlot: data.context?.timeSlot,
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
   * Clear comment enhancement cache for a specific student to ensure fresh responses
   */
  clearCommentEnhancementCache(studentId) {
    const keysToDelete = [];
    for (const [key] of this.cache) {
      if (key.includes('enhance_comment') && key.includes(`student${studentId}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`[AI Service] Cleared ${keysToDelete.length} comment enhancement cache entries for student ${studentId}`);
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
   * Optimized comment enhancement with better prompts and strict length control
   */
  async enhanceComment(comment, context = {}) {
    const requestId = aiPerformanceMonitor.startRequest('enhance_comment', context);

    if (!this.client) {
      aiPerformanceMonitor.endRequest(requestId, false, false, 'AI service not initialized');
      throw new Error('AI service not initialized. Please check your OpenAI API key.');
    }

    // Don't enhance very short or empty comments
    if (!comment || comment.trim().length < 3) {
      aiPerformanceMonitor.endRequest(requestId, true, false, 'Comment too short to enhance');
      return comment || '';
    }

    const cacheKey = this.generateCacheKey('enhance_comment', { comment, context });

    // Check for pending identical request
    if (this.pendingRequests.has(cacheKey)) {
      aiPerformanceMonitor.endRequest(requestId, true, false);
      return this.pendingRequests.get(cacheKey);
    }

    // Check cache first - shorter cache for period-specific comments
    const cached = this.getCachedResponse(cacheKey, 60000); // 1 minute for comment enhancement to ensure period-specific responses
    if (cached) {
      aiPerformanceMonitor.endRequest(requestId, true, true);
      return cached;
    }

    const requestPromise = this.withRetry(async () => {
      const optimizedPrompt = this.buildCommentEnhancementPrompt(comment, context);

      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a behavioral specialist for educational settings. Transform brief notes into professional behavioral observations. Use precise, educational terminology. Keep responses UNDER 200 characters - be concise and direct. Focus on observable behaviors and use professional language suitable for educational records."
          },
          {
            role: "user",
            content: optimizedPrompt
          }
        ],
        temperature: 0.1, // Very low for consistency and precision
        max_tokens: 60,   // Strict limit to ensure under 200 characters
        top_p: 0.8        // Balanced response diversity
      });

      const result = completion.choices[0].message.content.trim();
      
      // Ensure result is under 200 characters
      if (result.length > 200) {
        return result.substring(0, 197) + '...';
      }
      
      return result;
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
   * Expand quick notes into a teacher-style daily narrative for general comments
   */
  async expandGeneralComment(comment, context = {}) {
    const requestId = aiPerformanceMonitor.startRequest('expand_general_comment', context);

    if (!this.client) {
      aiPerformanceMonitor.endRequest(requestId, false, false, 'AI service not initialized');
      throw new Error('AI service not initialized. Please check your OpenAI API key.');
    }

    if (!comment || comment.trim().length === 0) {
      aiPerformanceMonitor.endRequest(requestId, true, false, 'No comment to expand');
      return comment || '';
    }

    const cacheKey = this.generateCacheKey('expand_general_comment', { comment, context });

    if (this.pendingRequests.has(cacheKey)) {
      aiPerformanceMonitor.endRequest(requestId, true, false);
      return this.pendingRequests.get(cacheKey);
    }

    const cached = this.getCachedResponse(cacheKey, 600000);
    if (cached) {
      aiPerformanceMonitor.endRequest(requestId, true, true);
      return cached;
    }

    const requestPromise = this.withRetry(async () => {
      const prompt = this.buildGeneralCommentPrompt(comment, context);

      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a caring classroom teacher summarizing the day for families and staff. Highlight observed behaviors, adult supports, wins, and areas to keep coaching in a supportive voice. Do not invent plans or recommendations that were not mentioned, and do not include greetings or sign-offs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.35,
        max_tokens: 400,
        top_p: 0.8,
        frequency_penalty: 0.2,
        presence_penalty: 0.1
      });

      return completion.choices[0].message.content.trim();
    }, 'general comment expansion');

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
    console.log('🤖 AI Service: generateBehaviorSummary called');
    console.log('📊 Input data:', {
      commentsCount: commentsData?.length || 0,
      dateRange,
      options: {
        studentId: options.studentId,
        studentName: options.studentName,
        forceRefresh: options.forceRefresh
      }
    });

    const requestId = aiPerformanceMonitor.startRequest('behavior_summary', { dateRange, dataLength: commentsData.length, studentId: options.studentId });

    if (!this.client) {
      console.error('❌ AI client not initialized');
      aiPerformanceMonitor.endRequest(requestId, false, false, 'AI service not initialized');
      throw new Error('AI service not initialized. Please check your OpenAI API key.');
    }

    console.log('✅ AI client is initialized, proceeding...');

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
        contentHash: encodeURIComponent(c.content || '').slice(0, 16), // Use safe encoding instead of btoa
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
      console.log('🔄 Starting withRetry for behavior summary...');
      const result = await this.withRetry(async () => {
        console.log('🏗️ Building behavior summary prompt...');
        const optimizedPrompt = this.buildBehaviorSummaryPrompt(commentsData, dateRange, options);
        console.log('📝 Prompt created, length:', optimizedPrompt.length);

        console.log('🌐 Making OpenAI API call...');
        const completion = await this.client.chat.completions.create({
          model: "gpt-3.5-turbo",
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
          temperature: 0.2,  // Low temperature keeps voice consistent and grounded
          max_tokens: 2500,  // Enough room for 4-5 sentence teacher narratives per section
          top_p: 0.7,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        });

        console.log('✅ OpenAI response received');
        const response = completion.choices[0].message.content;
        console.log('📄 Raw response length:', response.length);
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
          general_overview: analysis.general_overview || analysis.general || 'Overall classroom summary for the reporting window.',
          strengths: analysis.strengths || 'Celebrations and bright spots noted by staff.',
          improvements: analysis.improvements || analysis.improvements_needed || 'Coaching focuses and areas we will keep practicing.',
          incidents: analysis.incidents || analysis.behavioral_incidents || 'No significant incidents documented.',
          recommendations: analysis.recommendations || analysis.summary_recommendations || 'Next steps the teaching team will try moving forward.'
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
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a supportive classroom teacher. Rewrite each observation in a friendly, professional teacher voice (1-2 sentences). Mention what the student did, how adults or peers responded, and next steps if needed. Keep each rewrite short, stay focused on that period only, and separate entries with '---'."
          },
          {
            role: "user",
            content: batchPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 500,
        top_p: 0.7
      });

      const enhancedText = completion.choices[0].message.content;
      const enhancedComments = this.parseBatchResponse(enhancedText, commentBatch);

      this.setCachedResponse(cacheKey, enhancedComments);
      return enhancedComments;
    }, `batch comment enhancement`);

    return result;
  }

  /**
   * Build optimized prompt for comment enhancement with strict length control
   * Hyper-focused on specific period data only
   */
  buildCommentEnhancementPrompt(comment, context) {
    const details = [];
    if (context.studentName) details.push(`Student: ${context.studentName}`);
    if (context.timeSlot) details.push(`Period: ${context.timeSlot}`);
    if (context.scoreSnapshot) details.push(`Scores: ${context.scoreSnapshot}`);
    if (context.evaluationDate) details.push(`Date: ${context.evaluationDate}`);

    const contextBlock = details.length ? `Context: ${details.join(' | ')}` : '';

    return `Rewrite this observation the way a teacher or para would describe this specific period. Keep it UNDER 200 characters and focus only on what happened during this period.

${contextBlock}

Observation: "${comment}"

Guidelines:
- Use classroom language (no clinical jargon)
- Mention what the student did and how adults/peers responded
- Celebrate one success or effort and note one coaching point
- Stay supportive and period-specific
- Mention ${context.studentName || 'the student'} by name once
- Keep it brief, single-sentence, under 200 characters

Teacher note:`;
  }

  buildGeneralCommentPrompt(comment, context) {
    const details = [];
    if (context.studentName) details.push(`Student: ${context.studentName}`);
    if (context.teacherName) details.push(`Reporter: ${context.teacherName}`);
    if (context.schoolName) details.push(`School: ${context.schoolName}`);
    if (context.evaluationDate) details.push(`Date: ${context.evaluationDate}`);

    const contextBlock = details.length ? `Context: ${details.join(' | ')}` : '';

    return `Write a short daily progress note (4-6 sentences) in a professional, encouraging teacher/para voice. Focus on behavior, participation, and classroom engagement for this day only.

${contextBlock}

Source note: "${comment}"

Progress note requirements:
- Mention ${context.studentName || 'the student'} by name and focus only on today's observations.
- Highlight responsibility, cooperation, effort, and other positives before noting coaching points.
- Describe observable behaviors, participation, and adult supports used today.
- Include short direct quotes from the source note when they help (use quotation marks).
- Do not add recommendations or plans unless they appear in the source note.
- Keep the tone supportive and useful for quick scoring sheets.
- Begin directly with ${context.studentName || 'the student'} or "The student"—no greetings or sign-offs.

Expanded paragraph requirements:
- Minimum length: one full paragraph (4-6 sentences).
- All sentences must elaborate on details present or implied in the source note.
- Do not add new plans, recommendations, or generic encouragement like "Thank you for your support".

Daily progress note:`;
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

    return `Rewrite these observations in a friendly teacher voice. Each rewrite should be 1-2 sentences, focused on the specific period, and separated by "---". Keep the same order as provided.

${contextInfo}

Original observations:
${comments.map((comment, index) => `${index + 1}. ${comment}`).join('\n')}

Teacher-style rewrites (separated by "---", same order):`;
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
      `Reporting Window: ${dateRangeText}`,
      options.dailyAverage ? `Overall Daily Average: ${options.dailyAverage}/4` : null
    ].filter(Boolean);

    // Add period-specific averages if available
    let periodAveragesText = '';
    if (options.periodAverages) {
      const periodDetails = Object.entries(options.periodAverages)
        .filter(([key, data]) => data.count > 0)
        .map(([key, data]) => `${key}: ${data.average}/4 (${data.count} observations)`)
        .join(', ');
      if (periodDetails) {
        periodAveragesText = `\nPERIOD-SPECIFIC AVERAGES:\n- ${periodDetails}`;
      }
    }

    const sourceBreakdown = summary.sourceSummary.length
      ? summary.sourceSummary.map(item => `- ${item}`).join('\n')
      : '- Source details unavailable';

    const ratingSnapshot = summary.numericRatingCount > 0
      ? `Average numeric rating: ${summary.overallAverageRating} across ${summary.numericRatingCount} scoring entries. Low ratings (≤2): ${summary.lowRatingCount}.`
      : 'Numeric rating data was not available within this window.';

    const timeSlotInsights = summary.timeSlotHighlights.length
      ? summary.timeSlotHighlights.map(item => `- ${item.slotLabel}: avg ${item.averageRating} (${item.entryCount} entries${item.lowCount > 0 ? `, low scores: ${item.lowCount}` : ''})`).join('\n')
      : '- No consistent time-slot patterns detected from the available observations.';

    return `Analyze QuickScore evaluation data for ${options.studentName || 'the student'} during ${dateRangeText}. Transform the behavioral observations and ratings into a comprehensive behavior summary report with appropriate categorization.

STUDENT PROFILE:
${studentProfileLines.length ? studentProfileLines.map(line => `- ${line}`).join('\n') : '- Reporting context limited to date range provided.'}${periodAveragesText}

QUICKSCORE DATA SOURCES:
${sourceBreakdown}

RATING SNAPSHOT:
- ${ratingSnapshot}

TIME-SLOT TRENDS:
${timeSlotInsights}

BEHAVIORAL DATA SUMMARY:
- Total observations: ${summary.totalObservations}
- Rating distribution: ${summary.ratingDistribution}
- Date range: ${dateRangeText}

DETAILED OBSERVATIONS FROM QUICKSCORE:
${summary.detailedObservations.slice(0, 20).join('\n')}

POSITIVE BEHAVIORAL OBSERVATIONS (Ratings 3-4):
${summary.positiveComments.length > 0 ? summary.positiveComments.slice(0, 15).join('\n') : '- No high-rated behavioral observations available in this reporting period.'}

CONCERNING BEHAVIORAL OBSERVATIONS (Ratings 1-2):
${summary.concerningComments.length > 0 ? summary.concerningComments.slice(0, 15).join('\n') : '- No low-rated behavioral concerns documented in this reporting period.'}

TASK: Create a balanced classroom narrative for the HBH BEST printout.

Return JSON with the following keys (string values, each 4-5 sentences written in a teacher voice):
- general_overview (summary of the overall tone for the window, mentioning ratings/periods and balancing wins with coaching needs)
- strengths (celebrations of positive behaviors, strategies that worked, include direct student quotes when available)
- improvements (areas still needing support with period references and quoted phrases when possible)
- incidents (notable events or safety concerns with dates/periods and short quotes if they exist)
- recommendations (next steps teachers/paras will try, framed positively for the student and team)

TEACHER DOCUMENTATION GUIDELINES:
- Use encouraging classroom language; avoid clinical or diagnostic jargon.
- Highlight what went well before discussing challenges, keeping a supportive tone.
- Reference exact ratings/periods when relevant to ground observations.
- Pull short quotes or phrases from the notes whenever they illustrate a point (use quotation marks).
- Focus on observable behaviors, adult responses, and student outcomes.
- Keep sentences concrete, student-focused, and actionable.`;
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
      lowRatingCount: 0,
      positiveComments: [],
      concerningComments: [],
      highRatingCount: 0
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
        if (ratingValue >= 3) {
          summary.highRatingCount += 1;
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

      // Categorize comments by rating for teacher-balanced analysis
      if (comment.content && comment.content.trim()) {
        const quotedContent = `"${comment.content.trim()}"`;
        if (ratingValue >= 3) {
          summary.positiveComments.push(`${comment.date} - ${comment.source}: ${quotedContent} (Rating: ${ratingValue})`);
        } else if (ratingValue <= 2) {
          summary.concerningComments.push(`${comment.date} - ${comment.source}: ${quotedContent} (Rating: ${ratingValue})`);
        }
      }

      // Categorize for inclusion
      if (comment.type === 'incident') {
        summary.incidents.push(`${comment.date}: ${comment.content}`);
      } else if (comment.type === 'contact') {
        summary.contacts.push(`${comment.date}: ${comment.content}`);
      } else if (comment.rating <= 2 || summary.detailedObservations.length < 15) {
        const quotedContent = comment.content ? `"${comment.content}"` : '';
        const contextLabel = comment.context || comment.source || 'Observation';
        summary.detailedObservations.push(`${comment.date} - ${contextLabel}: ${quotedContent} (Rating: ${comment.rating || 'N/A'})`);
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
    return `You are the lead classroom teacher summarizing student behavior for families and the school team.

TEACHER SUMMARY STANDARDS:
- Balance celebrations and coaching needs with equal attention.
- Reference observable actions, specific periods, adult supports, and student responses.
- Use encouraging, professional classroom language (no clinical or diagnostic jargon).
- Whenever possible, include short direct quotes from staff notes to illustrate key moments (use quotation marks).
- Mention QuickScore ratings or period names when they reinforce the point.

FORMAT:
- Return valid JSON only (no commentary).
- Keys must include: general_overview, strengths, improvements, incidents, recommendations.
- Each value must be 4-5 sentences written in a supportive teacher voice.`;
  }

  buildCsvMappingPrompt(headers, sampleRow, config = {}) {
    const canonicalLines = (config.canonicalFields || []).map((field) => {
      const description = config.fieldDescriptions?.[field];
      return description ? `- ${field}: ${description}` : `- ${field}`;
    }).join('\n');

    const readableHeaders = JSON.stringify(headers, null, 2);
    const readableRow = JSON.stringify(sampleRow || {}, null, 2);
    const label = config.label || 'data import';

    return `You are a meticulous data import assistant helping map CSV columns to canonical fields for ${label}.

Canonical fields (map each to the best CSV header, or "" if none match):
${canonicalLines || '(none provided)'}

CSV_HEADERS = ${readableHeaders}
SAMPLE_ROW = ${readableRow}

Return ONLY a JSON object where each key is a canonical field and each value is the exact CSV header name that best matches it. Use "" for fields without a reasonable match. Do not include explanations or code fences.`;
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

  async mapCsvHeaders(headers, sampleRow, config = {}) {
    const requestId = aiPerformanceMonitor.startRequest('csv_header_mapping', { label: config.label || 'dataset' });

    if (!this.client) {
      aiPerformanceMonitor.endRequest(requestId, false, false, 'AI service not initialized');
      throw new Error('AI service not initialized. Please check your OpenAI API key.');
    }

    const prompt = this.buildCsvMappingPrompt(headers, sampleRow, config);

    try {
      const raw = await this.withRetry(async () => {
        const completion = await this.client.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a meticulous data import assistant. Always respond with strict JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0,
          max_tokens: 400,
          top_p: 0.9
        });

        return completion.choices[0].message.content.trim();
      }, 'csv header mapping');

      const parsed = this.parseJsonResponse(raw);
      aiPerformanceMonitor.endRequest(requestId, true, false);
      return parsed;
    } catch (error) {
      aiPerformanceMonitor.endRequest(requestId, false, false, error?.message);
      throw error;
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
        model: 'gpt-3.5-turbo',
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
   * Clear cache and provide debugging info (useful for testing or memory management)
   */
  clearCache() {
    console.log('🧹 Clearing AI service cache...');
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('✅ AI service cache cleared');
  }

  /**
   * Reinitialize the OpenAI client (useful for troubleshooting API key issues)
   */
  reinitialize() {
    console.log('🔄 Reinitializing AI service...');
    this.client = null;
    this.clearCache();
    this.initializeClient();
  }

  /**
   * Check if AI service is properly initialized
   */
  isInitialized() {
    return !!this.client;
  }

  /**
   * Test AI functionality with a simple request (useful for debugging)
   */
  async testConnection() {
    if (!this.client) {
      throw new Error('AI service not initialized');
    }

    try {
      console.log('🧪 Testing AI connection...');
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: "Respond with exactly: 'AI connection test successful'"
          }
        ],
        max_tokens: 10,
        temperature: 0
      });
      
      const result = response.choices[0].message.content.trim();
      console.log('✅ AI connection test result:', result);
      return result;
    } catch (error) {
      console.error('❌ AI connection test failed:', error);
      throw error;
    }
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
