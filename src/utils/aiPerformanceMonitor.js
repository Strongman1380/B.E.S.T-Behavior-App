/**
 * AI Performance Monitor
 * Tracks AI service performance metrics and provides analytics
 */

class AIPerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: [],
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      totalRequests: 0
    };
    this.isEnabled = import.meta.env.DEV; // Only track in development
  }

  /**
   * Record AI request start
   */
  startRequest(type, context = {}) {
    if (!this.isEnabled) return null;

    const requestId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    this.metrics.requests.push({
      id: requestId,
      type,
      context,
      startTime,
      endTime: null,
      duration: null,
      success: null,
      cached: false,
      error: null
    });

    this.metrics.totalRequests++;
    return requestId;
  }

  /**
   * Record AI request completion
   */
  endRequest(requestId, success, cached = false, error = null) {
    if (!this.isEnabled || !requestId) return;

    const request = this.metrics.requests.find(r => r.id === requestId);
    if (!request) return;

    const endTime = performance.now();
    request.endTime = endTime;
    request.duration = endTime - request.startTime;
    request.success = success;
    request.cached = cached;
    request.error = error;

    if (cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    if (!success) {
      this.metrics.errors++;
    }

    // Cleanup old requests (keep last 100)
    if (this.metrics.requests.length > 100) {
      this.metrics.requests = this.metrics.requests.slice(-100);
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(type) {
    if (!this.isEnabled) return;
    this.metrics.cacheHits++;
    this.metrics.totalRequests++;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    if (!this.isEnabled) return null;

    const completedRequests = this.metrics.requests.filter(r => r.endTime !== null);
    const successfulRequests = completedRequests.filter(r => r.success);
    const failedRequests = completedRequests.filter(r => !r.success);

    const durations = completedRequests.map(r => r.duration).filter(d => d !== null);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;

    const cacheHitRate = this.metrics.totalRequests > 0
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
      : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      completedRequests: completedRequests.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      successRate: completedRequests.length > 0 ? (successfulRequests.length / completedRequests.length) * 100 : 0,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      cacheHitRate: cacheHitRate,
      avgDuration: Math.round(avgDuration),
      maxDuration: Math.round(maxDuration),
      minDuration: Math.round(minDuration),
      requestsByType: this.getRequestsByType(),
      errors: this.metrics.errors
    };
  }

  /**
   * Get requests grouped by type
   */
  getRequestsByType() {
    const typeStats = {};

    this.metrics.requests.forEach(request => {
      if (!typeStats[request.type]) {
        typeStats[request.type] = {
          total: 0,
          successful: 0,
          failed: 0,
          avgDuration: 0,
          durations: []
        };
      }

      typeStats[request.type].total++;

      if (request.success === true) {
        typeStats[request.type].successful++;
      } else if (request.success === false) {
        typeStats[request.type].failed++;
      }

      if (request.duration !== null) {
        typeStats[request.type].durations.push(request.duration);
      }
    });

    // Calculate averages
    Object.keys(typeStats).forEach(type => {
      const durations = typeStats[type].durations;
      typeStats[type].avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
      delete typeStats[type].durations; // Clean up raw data
    });

    return typeStats;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10) {
    if (!this.isEnabled) return [];

    return this.metrics.requests
      .filter(r => !r.success && r.error)
      .slice(-count)
      .map(r => ({
        type: r.type,
        error: r.error,
        timestamp: new Date(r.startTime).toISOString(),
        context: r.context
      }));
  }

  /**
   * Export performance data for analysis
   */
  exportData() {
    if (!this.isEnabled) return null;

    return {
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      recentErrors: this.getRecentErrors(),
      rawRequests: this.metrics.requests.slice(-50) // Last 50 requests
    };
  }

  /**
   * Log performance summary to console
   */
  logSummary() {
    if (!this.isEnabled) return;

    const stats = this.getStats();
    if (!stats) return;

    console.group('🤖 AI Performance Summary');
    console.log(`📊 Total Requests: ${stats.totalRequests}`);
    console.log(`✅ Success Rate: ${stats.successRate.toFixed(1)}%`);
    console.log(`⚡ Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%`);
    console.log(`⏱️  Avg Duration: ${stats.avgDuration}ms`);
    console.log(`🎯 Request Types:`, stats.requestsByType);

    if (stats.errors > 0) {
      console.warn(`❌ Recent Errors (${stats.errors}):`, this.getRecentErrors(3));
    }

    console.groupEnd();
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      requests: [],
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      totalRequests: 0
    };
  }
}

// Export singleton instance
export const aiPerformanceMonitor = new AIPerformanceMonitor();
export default aiPerformanceMonitor;