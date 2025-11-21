// Analytics and Comparison Service
// Calculates accuracy, trends, and insights from historical data

import { storageService, type ForecastRecord, type ScheduleRecord, type ActualDataRecord } from './storageService';

export interface ForecastAccuracy {
  date: string;
  predictedOrders: number;
  actualOrders: number;
  accuracy: number; // percentage
  variance: number; // difference
  variancePercent: number;
}

export interface AccuracyStats {
  averageAccuracy: number;
  totalForecasts: number;
  accurateForecasts: number; // within 10%
  overForecasts: number;
  underForecasts: number;
  bestDay: ForecastAccuracy | null;
  worstDay: ForecastAccuracy | null;
}

export interface SchedulePerformance {
  scheduleId: string;
  weekStartDate: string;
  plannedHours: number;
  actualHours?: number;
  plannedCost: number;
  actualCost?: number;
  variance?: number;
  variancePercent?: number;
  efficiency?: number; // actual/planned
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

class AnalyticsService {
  /**
   * Calculate forecast accuracy by comparing predictions with actuals
   */
  calculateForecastAccuracy(startDate?: string, endDate?: string): ForecastAccuracy[] {
    const forecasts = storageService.getForecasts(startDate, endDate);
    const actuals = storageService.getActualData(startDate, endDate);

    const accuracyData: ForecastAccuracy[] = [];

    // Map actuals by date for quick lookup
    const actualsMap = new Map(actuals.map(a => [a.date, a]));

    forecasts.forEach(forecast => {
      const actual = actualsMap.get(forecast.date);

      if (!actual) return; // Skip if no actual data available

      let predictedOrders = 0;

      if (forecast.type === 'daily' && 'hourly_forecast' in forecast.forecast) {
        predictedOrders = forecast.forecast.hourly_forecast.reduce(
          (sum, h) => sum + h.predicted_orders,
          0
        );
      } else if (forecast.type === 'weekly' && 'week_summary' in forecast.forecast) {
        predictedOrders = forecast.forecast.week_summary.total_orders;
      }

      const variance = actual.actualOrders - predictedOrders;
      const variancePercent = predictedOrders > 0 ? (variance / predictedOrders) * 100 : 0;
      const accuracy = 100 - Math.abs(variancePercent);

      accuracyData.push({
        date: forecast.date,
        predictedOrders,
        actualOrders: actual.actualOrders,
        accuracy: Math.max(0, accuracy),
        variance,
        variancePercent,
      });
    });

    return accuracyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get overall accuracy statistics
   */
  getAccuracyStats(startDate?: string, endDate?: string): AccuracyStats {
    const accuracyData = this.calculateForecastAccuracy(startDate, endDate);

    if (accuracyData.length === 0) {
      return {
        averageAccuracy: 0,
        totalForecasts: 0,
        accurateForecasts: 0,
        overForecasts: 0,
        underForecasts: 0,
        bestDay: null,
        worstDay: null,
      };
    }

    const totalForecasts = accuracyData.length;
    const averageAccuracy =
      accuracyData.reduce((sum, d) => sum + d.accuracy, 0) / totalForecasts;

    // Within 10% variance is considered accurate
    const accurateForecasts = accuracyData.filter(d => Math.abs(d.variancePercent) <= 10).length;
    const overForecasts = accuracyData.filter(d => d.variance < 0).length;
    const underForecasts = accuracyData.filter(d => d.variance > 0).length;

    const bestDay = accuracyData.reduce((best, current) =>
      current.accuracy > (best?.accuracy || 0) ? current : best
    );

    const worstDay = accuracyData.reduce((worst, current) =>
      current.accuracy < (worst?.accuracy || 100) ? current : worst
    );

    return {
      averageAccuracy: Math.round(averageAccuracy * 10) / 10,
      totalForecasts,
      accurateForecasts,
      overForecasts,
      underForecasts,
      bestDay,
      worstDay,
    };
  }

  /**
   * Calculate schedule performance (planned vs actual)
   */
  getSchedulePerformance(): SchedulePerformance[] {
    const schedules = storageService.getSchedules();

    return schedules.map(record => {
      const performance: SchedulePerformance = {
        scheduleId: record.id,
        weekStartDate: record.schedule.weekStartDate,
        plannedHours: record.schedule.totalLaborHours,
        plannedCost: record.schedule.totalLaborCost,
      };

      if (record.actualHours !== undefined && record.actualCost !== undefined) {
        performance.actualHours = record.actualHours;
        performance.actualCost = record.actualCost;

        const costVariance = record.actualCost - record.schedule.totalLaborCost;
        performance.variance = costVariance;
        performance.variancePercent =
          record.schedule.totalLaborCost > 0
            ? (costVariance / record.schedule.totalLaborCost) * 100
            : 0;
        performance.efficiency =
          record.actualHours > 0 ? record.schedule.totalLaborHours / record.actualHours : 0;
      }

      return performance;
    });
  }

  /**
   * Get labor cost trend over time
   */
  getLaborCostTrend(): TrendData[] {
    const schedules = storageService.getSchedules();

    return schedules
      .map(record => ({
        date: record.schedule.weekStartDate,
        value: record.actualCost || record.schedule.totalLaborCost,
        label: record.actualCost ? 'Actual' : 'Planned',
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get labor percentage trend over time
   */
  getLaborPercentageTrend(): TrendData[] {
    const schedules = storageService.getSchedules();

    return schedules
      .map(record => {
        const laborPercent = record.actualCost
          ? (record.actualCost / record.schedule.projectedRevenue) * 100
          : record.schedule.laborPercentage;

        return {
          date: record.schedule.weekStartDate,
          value: Math.round(laborPercent * 10) / 10,
          label: record.actualCost ? 'Actual' : 'Planned',
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get order volume trend
   */
  getOrderTrend(startDate?: string, endDate?: string): TrendData[] {
    const actuals = storageService.getActualData(startDate, endDate);

    return actuals
      .map(record => ({
        date: record.date,
        value: record.actualOrders,
        label: 'Orders',
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get revenue trend
   */
  getRevenueTrend(startDate?: string, endDate?: string): TrendData[] {
    const actuals = storageService.getActualData(startDate, endDate);

    return actuals
      .map(record => ({
        date: record.date,
        value: record.actualRevenue,
        label: 'Revenue',
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get inventory value trend
   */
  getInventoryValueTrend(startDate?: string, endDate?: string): TrendData[] {
    const snapshots = storageService.getInventorySnapshots(startDate, endDate);

    return snapshots
      .map(snapshot => ({
        date: snapshot.date,
        value: snapshot.totalValue || 0,
        label: 'Inventory Value',
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Calculate week-over-week growth
   */
  calculateWeekOverWeekGrowth(metric: 'orders' | 'revenue'): number {
    const actuals = storageService.getActualData();

    if (actuals.length < 7) return 0;

    // Sort by date descending
    const sorted = actuals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Get last 7 days and previous 7 days
    const lastWeek = sorted.slice(0, 7);
    const previousWeek = sorted.slice(7, 14);

    if (previousWeek.length < 7) return 0;

    const lastWeekValue = lastWeek.reduce(
      (sum, d) => sum + (metric === 'orders' ? d.actualOrders : d.actualRevenue),
      0
    );
    const previousWeekValue = previousWeek.reduce(
      (sum, d) => sum + (metric === 'orders' ? d.actualOrders : d.actualRevenue),
      0
    );

    if (previousWeekValue === 0) return 0;

    return ((lastWeekValue - previousWeekValue) / previousWeekValue) * 100;
  }

  /**
   * Get most recent data summary
   */
  getRecentSummary() {
    const actuals = storageService.getActualData();
    const schedules = storageService.getSchedules();
    const forecasts = storageService.getForecasts();

    const recentActuals = actuals
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);

    const avgOrders =
      recentActuals.length > 0
        ? recentActuals.reduce((sum, a) => sum + a.actualOrders, 0) / recentActuals.length
        : 0;

    const avgRevenue =
      recentActuals.length > 0
        ? recentActuals.reduce((sum, a) => sum + a.actualRevenue, 0) / recentActuals.length
        : 0;

    return {
      totalRecords: actuals.length + schedules.length + forecasts.length,
      recentDays: recentActuals.length,
      avgDailyOrders: Math.round(avgOrders),
      avgDailyRevenue: Math.round(avgRevenue),
      weekOverWeekOrderGrowth: this.calculateWeekOverWeekGrowth('orders'),
      weekOverWeekRevenueGrowth: this.calculateWeekOverWeekGrowth('revenue'),
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
