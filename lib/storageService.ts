// Frontend-Only Data Persistence using localStorage
// Provides CRUD operations for all historical data

import type { Schedule, Employee } from './schedulingTypes';

// Forecast types (defined in main app)
export type Forecast = any; // Will be properly typed when integrated
export type WeeklyForecast = any;

// Storage keys
const STORAGE_KEYS = {
  FORECASTS: 'pizzai_forecasts',
  WEEKLY_FORECASTS: 'pizzai_weekly_forecasts',
  SCHEDULES: 'pizzai_schedules',
  EMPLOYEES: 'pizzai_employees',
  INVENTORY_SNAPSHOTS: 'pizzai_inventory',
  PROMOS: 'pizzai_promos',
  ACTUALS: 'pizzai_actuals', // For tracking actual vs predicted
} as const;

// Historical record types
export interface ForecastRecord {
  id: string;
  date: string; // ISO date
  type: 'daily' | 'weekly';
  forecast: Forecast | WeeklyForecast;
  createdAt: string;
}

export interface ScheduleRecord {
  id: string;
  schedule: Schedule;
  createdAt: string;
  actualHours?: number; // Track actual hours worked
  actualCost?: number; // Track actual labor cost
  notes?: string;
}

export interface InventorySnapshot {
  id: string;
  date: string;
  items: {
    ingredient: string;
    quantity: number;
    unit: string;
    cost?: number;
  }[];
  totalValue?: number;
  createdAt: string;
}

export interface PromoRecord {
  id: string;
  date: string;
  promo: {
    offer_name: string;
    copy_short: string;
    copy_email: string;
    discount: string;
    target_lift: string;
  };
  performance?: {
    ordersGenerated?: number;
    revenueGenerated?: number;
    actualLift?: number;
  };
  createdAt: string;
}

export interface ActualDataRecord {
  id: string;
  date: string;
  actualOrders: number;
  actualRevenue: number;
  notes?: string;
  createdAt: string;
}

/**
 * Generic storage operations
 */
class StorageService {
  /**
   * Check if localStorage is available
   */
  private isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all records for a key
   */
  private getRecords<T>(key: string): T[] {
    if (!this.isStorageAvailable()) return [];

    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return [];
    }
  }

  /**
   * Save records for a key
   */
  private saveRecords<T>(key: string, records: T[]): boolean {
    if (!this.isStorageAvailable()) return false;

    try {
      localStorage.setItem(key, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
      return false;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===== FORECAST OPERATIONS =====

  saveForecast(forecast: Forecast | WeeklyForecast, type: 'daily' | 'weekly'): ForecastRecord {
    const records = this.getRecords<ForecastRecord>(STORAGE_KEYS.FORECASTS);

    const record: ForecastRecord = {
      id: this.generateId(),
      date: new Date().toISOString().split('T')[0],
      type,
      forecast,
      createdAt: new Date().toISOString(),
    };

    records.push(record);

    // Keep only last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const filtered = records.filter(r => new Date(r.createdAt) > ninetyDaysAgo);

    this.saveRecords(STORAGE_KEYS.FORECASTS, filtered);
    return record;
  }

  getForecasts(startDate?: string, endDate?: string): ForecastRecord[] {
    const records = this.getRecords<ForecastRecord>(STORAGE_KEYS.FORECASTS);

    if (!startDate && !endDate) return records;

    return records.filter(r => {
      const recordDate = new Date(r.date);
      if (startDate && recordDate < new Date(startDate)) return false;
      if (endDate && recordDate > new Date(endDate)) return false;
      return true;
    });
  }

  getForecastById(id: string): ForecastRecord | null {
    const records = this.getRecords<ForecastRecord>(STORAGE_KEYS.FORECASTS);
    return records.find(r => r.id === id) || null;
  }

  // ===== SCHEDULE OPERATIONS =====

  saveSchedule(schedule: Schedule): ScheduleRecord {
    const records = this.getRecords<ScheduleRecord>(STORAGE_KEYS.SCHEDULES);

    const record: ScheduleRecord = {
      id: this.generateId(),
      schedule,
      createdAt: new Date().toISOString(),
    };

    records.push(record);

    // Keep only last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const filtered = records.filter(r => new Date(r.createdAt) > ninetyDaysAgo);

    this.saveRecords(STORAGE_KEYS.SCHEDULES, filtered);
    return record;
  }

  getSchedules(): ScheduleRecord[] {
    return this.getRecords<ScheduleRecord>(STORAGE_KEYS.SCHEDULES);
  }

  getScheduleById(id: string): ScheduleRecord | null {
    const records = this.getRecords<ScheduleRecord>(STORAGE_KEYS.SCHEDULES);
    return records.find(r => r.id === id) || null;
  }

  updateScheduleActuals(id: string, actualHours: number, actualCost: number, notes?: string): boolean {
    const records = this.getRecords<ScheduleRecord>(STORAGE_KEYS.SCHEDULES);
    const index = records.findIndex(r => r.id === id);

    if (index === -1) return false;

    records[index].actualHours = actualHours;
    records[index].actualCost = actualCost;
    if (notes) records[index].notes = notes;

    return this.saveRecords(STORAGE_KEYS.SCHEDULES, records);
  }

  // ===== INVENTORY OPERATIONS =====

  saveInventorySnapshot(items: InventorySnapshot['items']): InventorySnapshot {
    const records = this.getRecords<InventorySnapshot>(STORAGE_KEYS.INVENTORY_SNAPSHOTS);

    const totalValue = items.reduce((sum, item) => sum + (item.cost || 0), 0);

    const snapshot: InventorySnapshot = {
      id: this.generateId(),
      date: new Date().toISOString().split('T')[0],
      items,
      totalValue,
      createdAt: new Date().toISOString(),
    };

    records.push(snapshot);

    // Keep only last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const filtered = records.filter(r => new Date(r.createdAt) > ninetyDaysAgo);

    this.saveRecords(STORAGE_KEYS.INVENTORY_SNAPSHOTS, filtered);
    return snapshot;
  }

  getInventorySnapshots(startDate?: string, endDate?: string): InventorySnapshot[] {
    const records = this.getRecords<InventorySnapshot>(STORAGE_KEYS.INVENTORY_SNAPSHOTS);

    if (!startDate && !endDate) return records;

    return records.filter(r => {
      const recordDate = new Date(r.date);
      if (startDate && recordDate < new Date(startDate)) return false;
      if (endDate && recordDate > new Date(endDate)) return false;
      return true;
    });
  }

  // ===== PROMO OPERATIONS =====

  savePromo(promo: PromoRecord['promo']): PromoRecord {
    const records = this.getRecords<PromoRecord>(STORAGE_KEYS.PROMOS);

    const record: PromoRecord = {
      id: this.generateId(),
      date: new Date().toISOString().split('T')[0],
      promo,
      createdAt: new Date().toISOString(),
    };

    records.push(record);

    // Keep only last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const filtered = records.filter(r => new Date(r.createdAt) > ninetyDaysAgo);

    this.saveRecords(STORAGE_KEYS.PROMOS, filtered);
    return record;
  }

  getPromos(): PromoRecord[] {
    return this.getRecords<PromoRecord>(STORAGE_KEYS.PROMOS);
  }

  updatePromoPerformance(id: string, performance: PromoRecord['performance']): boolean {
    const records = this.getRecords<PromoRecord>(STORAGE_KEYS.PROMOS);
    const index = records.findIndex(r => r.id === id);

    if (index === -1) return false;

    records[index].performance = performance;
    return this.saveRecords(STORAGE_KEYS.PROMOS, records);
  }

  // ===== ACTUAL DATA OPERATIONS =====

  saveActualData(date: string, actualOrders: number, actualRevenue: number, notes?: string): ActualDataRecord {
    const records = this.getRecords<ActualDataRecord>(STORAGE_KEYS.ACTUALS);

    const record: ActualDataRecord = {
      id: this.generateId(),
      date,
      actualOrders,
      actualRevenue,
      notes,
      createdAt: new Date().toISOString(),
    };

    records.push(record);

    // Keep only last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const filtered = records.filter(r => new Date(r.createdAt) > ninetyDaysAgo);

    this.saveRecords(STORAGE_KEYS.ACTUALS, filtered);
    return record;
  }

  getActualData(startDate?: string, endDate?: string): ActualDataRecord[] {
    const records = this.getRecords<ActualDataRecord>(STORAGE_KEYS.ACTUALS);

    if (!startDate && !endDate) return records;

    return records.filter(r => {
      const recordDate = new Date(r.date);
      if (startDate && recordDate < new Date(startDate)) return false;
      if (endDate && recordDate > new Date(endDate)) return false;
      return true;
    });
  }

  getActualDataByDate(date: string): ActualDataRecord | null {
    const records = this.getRecords<ActualDataRecord>(STORAGE_KEYS.ACTUALS);
    return records.find(r => r.date === date) || null;
  }

  // ===== EMPLOYEE OPERATIONS =====

  saveEmployees(employees: Employee[]): boolean {
    return this.saveRecords(STORAGE_KEYS.EMPLOYEES, employees);
  }

  getEmployees(): Employee[] {
    return this.getRecords<Employee>(STORAGE_KEYS.EMPLOYEES);
  }

  // ===== UTILITY OPERATIONS =====

  /**
   * Get storage usage statistics
   */
  getStorageStats(): {
    used: number;
    available: number;
    percentage: number;
    recordCounts: Record<string, number>;
  } {
    let totalSize = 0;
    const recordCounts: Record<string, number> = {};

    Object.values(STORAGE_KEYS).forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        totalSize += data.length;
        try {
          const records = JSON.parse(data);
          recordCounts[key] = Array.isArray(records) ? records.length : 0;
        } catch {
          recordCounts[key] = 0;
        }
      } else {
        recordCounts[key] = 0;
      }
    });

    // localStorage typically has 5-10MB limit, assume 5MB
    const available = 5 * 1024 * 1024; // 5MB in bytes
    const percentage = (totalSize / available) * 100;

    return {
      used: totalSize,
      available,
      percentage: Math.min(percentage, 100),
      recordCounts,
    };
  }

  /**
   * Export all data as JSON
   */
  exportAllData(): string {
    const data: Record<string, any> = {};

    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      data[name] = this.getRecords(key);
    });

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON
   */
  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);

      Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
        if (data[name]) {
          this.saveRecords(key, data[name]);
        }
      });

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  /**
   * Clear all data
   */
  clearAllData(): boolean {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  /**
   * Clear data older than specified days
   */
  clearOldData(days: number): boolean {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      Object.values(STORAGE_KEYS).forEach(key => {
        const records = this.getRecords<any>(key);
        const filtered = records.filter((r: any) =>
          new Date(r.createdAt || r.date) > cutoffDate
        );
        this.saveRecords(key, filtered);
      });

      return true;
    } catch (error) {
      console.error('Error clearing old data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
