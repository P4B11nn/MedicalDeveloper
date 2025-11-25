// performanceMonitor.js - Monitor de rendimiento básico
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.startTimes = {};
    }

    measureFunction(name, fn) {
        const startTime = performance.now();
        try {
            const result = fn();
            const endTime = performance.now();
            this.recordMetric(name, endTime - startTime);
            return result;
        } catch (error) {
            const endTime = performance.now();
            this.recordMetric(name, endTime - startTime, { error: true });
            throw error;
        }
    }

    startTimer(name) {
        this.startTimes[name] = performance.now();
    }

    endTimer(name) {
        if (this.startTimes[name]) {
            const duration = performance.now() - this.startTimes[name];
            this.recordMetric(name, duration);
            delete this.startTimes[name];
            return duration;
        }
        return null;
    }

    recordMetric(name, value, metadata = {}) {
        if (!this.metrics[name]) {
            this.metrics[name] = {
                count: 0,
                total: 0,
                average: 0,
                min: Infinity,
                max: -Infinity,
                errors: 0
            };
        }

        const metric = this.metrics[name];
        metric.count++;
        metric.total += value;
        metric.average = metric.total / metric.count;
        metric.min = Math.min(metric.min, value);
        metric.max = Math.max(metric.max, value);

        if (metadata.error) {
            metric.errors++;
        }
    }

    getMetrics(name = null) {
        if (name) {
            return this.metrics[name] || null;
        }
        return { ...this.metrics };
    }

    clearMetrics() {
        this.metrics = {};
        this.startTimes = {};
    }

    logMetrics() {
        console.log('Performance Metrics:', this.metrics);
    }
}

const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
