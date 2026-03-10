const logger = require('./Logger');
const MetricsCollector = require('./MetricsCollector');
const AlertService = require('./AlertService');

/**
 * Predictive Analytics Service
 * AI-powered prediction of system issues before they occur
 */
class PredictiveAnalytics {
    static patterns = [];
    static predictions = [];
    static maxPatterns = 1000;

    /**
     * Analyze current metrics and predict issues
     */
    static async analyze() {
        const metrics = MetricsCollector.getAllMetrics();
        const predictions = [];

        // Predict memory exhaustion
        const memoryPrediction = this.predictMemoryExhaustion(metrics.system.memory);
        if (memoryPrediction) predictions.push(memoryPrediction);

        // Predict high error rate
        const errorPrediction = this.predictErrorSpike(metrics.requests);
        if (errorPrediction) predictions.push(errorPrediction);

        // Predict performance degradation
        const perfPrediction = this.predictPerformanceDegradation(metrics.requests);
        if (perfPrediction) predictions.push(perfPrediction);

        // Store predictions
        this.predictions = predictions;

        // Create alerts for high-confidence predictions
        for (const pred of predictions) {
            if (pred.confidence > 0.7) {
                await AlertService.createAlert({
                    type: 'warning',
                    category: 'prediction',
                    title: `Predicted: ${pred.type}`,
                    message: pred.message,
                    details: pred,
                    source: 'predictive-analytics'
                });
            }
        }

        return predictions;
    }

    /**
     * Predict memory exhaustion based on trends
     */
    static predictMemoryExhaustion(memory) {
        const usedPercent = parseFloat(memory.usagePercent);

        // Simple linear prediction based on current usage
        if (usedPercent > 80) {
            const timeToExhaust = this.estimateTimeToThreshold(usedPercent, 95);
            return {
                type: 'memory_exhaustion',
                severity: usedPercent > 90 ? 'critical' : 'high',
                message: `Memory at ${usedPercent}% - may exhaust in ${timeToExhaust}`,
                currentValue: usedPercent,
                threshold: 95,
                confidence: Math.min(0.5 + (usedPercent - 80) / 40, 0.95),
                estimatedTime: timeToExhaust,
                recommendation: 'Consider restarting the server or clearing caches'
            };
        }
        return null;
    }

    /**
     * Predict error spike based on recent trends
     */
    static predictErrorSpike(requestStats) {
        const errorRate = 100 - parseFloat(requestStats.successRate);

        if (errorRate > 5) {
            return {
                type: 'error_spike',
                severity: errorRate > 15 ? 'critical' : 'high',
                message: `Error rate trending up at ${errorRate.toFixed(1)}%`,
                currentValue: errorRate,
                threshold: 10,
                confidence: Math.min(0.4 + errorRate / 20, 0.9),
                recommendation: 'Check recent deployments and logs for issues'
            };
        }
        return null;
    }

    /**
     * Predict performance degradation
     */
    static predictPerformanceDegradation(requestStats) {
        const avgTime = requestStats.last1Min.avgResponseTime;

        if (avgTime > 500) {
            return {
                type: 'performance_degradation',
                severity: avgTime > 1500 ? 'high' : 'medium',
                message: `Response times increasing: ${avgTime}ms avg`,
                currentValue: avgTime,
                threshold: 1000,
                confidence: Math.min(0.4 + avgTime / 3000, 0.85),
                recommendation: 'Check database queries and external API calls'
            };
        }
        return null;
    }

    /**
     * Estimate time to reach threshold
     */
    static estimateTimeToThreshold(current, threshold) {
        if (current >= threshold) return 'now';

        // Simple estimation (assumes 1% increase per 10 minutes)
        const remaining = threshold - current;
        const minutes = remaining * 10;

        if (minutes < 60) return `~${Math.round(minutes)} minutes`;
        if (minutes < 1440) return `~${Math.round(minutes / 60)} hours`;
        return '>24 hours';
    }

    /**
     * Get current predictions
     */
    static getPredictions() {
        return {
            timestamp: new Date().toISOString(),
            predictions: this.predictions,
            overallRisk: this.calculateOverallRisk()
        };
    }

    /**
     * Calculate overall system risk
     */
    static calculateOverallRisk() {
        if (this.predictions.length === 0) return { level: 'low', score: 0 };

        const maxConfidence = Math.max(...this.predictions.map(p => p.confidence));
        const criticalCount = this.predictions.filter(p => p.severity === 'critical').length;

        let score = maxConfidence * 100;
        if (criticalCount > 0) score += criticalCount * 20;
        score = Math.min(score, 100);

        let level = 'low';
        if (score > 70) level = 'critical';
        else if (score > 50) level = 'high';
        else if (score > 30) level = 'medium';

        return { level, score: Math.round(score) };
    }

    /**
     * Get recommendations based on predictions
     */
    static getRecommendations() {
        const recommendations = [];

        for (const pred of this.predictions) {
            if (pred.recommendation) {
                recommendations.push({
                    priority: pred.severity === 'critical' ? 1 : pred.severity === 'high' ? 2 : 3,
                    type: pred.type,
                    action: pred.recommendation,
                    confidence: (pred.confidence * 100).toFixed(0) + '%'
                });
            }
        }

        return recommendations.sort((a, b) => a.priority - b.priority);
    }
}

module.exports = PredictiveAnalytics;
