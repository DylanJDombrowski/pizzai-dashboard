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
  CUSTOM_PREP_TASKS: 'pizzai_custom_prep_tasks',
  CHECKED_PREP_ITEMS: 'pizzai_checked_prep',
  CUSTOM_INVENTORY: 'pizzai_custom_inventory',
  WEEKLY_GOAL: 'pizzai_weekly_goal',
} as const;

// Day tags for annotations
export const DAY_TAGS = [
  'event',
  'short-staffed',
  'bad-weather',
  'promotion',
  'holiday',
  'slow-day',
] as const;
export type DayTag = typeof DAY_TAGS[number];

// Custom prep task
export interface CustomPrepTask {
  id: string;
  task: string;
  createdAt: string;
}

// Custom inventory item
export interface CustomInventoryItem {
  id: string;
  ingredient: string;
  unit: string;
  par_level: number;
  on_hand: number;
  cost_per_unit?: number;
}

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
  laborHours?: number;
  laborCost?: number;
  notes?: string;
  tags?: DayTag[];
  createdAt: string;
}

export interface WeeklyGoal {
  revenue: number;
  weekStart: string; // ISO date of week start (Monday)
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

  saveActualData(
    date: string,
    actualOrders: number,
    actualRevenue: number,
    laborHours?: number,
    laborCost?: number,
    notes?: string,
    tags?: DayTag[]
  ): ActualDataRecord {
    const records = this.getRecords<ActualDataRecord>(STORAGE_KEYS.ACTUALS);

    // Check if we already have data for this date
    const existingIndex = records.findIndex(r => r.date === date);

    const record: ActualDataRecord = {
      id: existingIndex >= 0 ? records[existingIndex].id : this.generateId(),
      date,
      actualOrders,
      actualRevenue,
      laborHours,
      laborCost,
      notes,
      tags,
      createdAt: existingIndex >= 0 ? records[existingIndex].createdAt : new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update existing record
      records[existingIndex] = record;
    } else {
      // Add new record
      records.push(record);
    }

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

  /**
   * Get average orders by day of week from historical data
   * Returns null for days with no data
   */
  getAveragesByDayOfWeek(): { [dayOfWeek: number]: { avgOrders: number; avgRevenue: number; count: number } | null } {
    const records = this.getRecords<ActualDataRecord>(STORAGE_KEYS.ACTUALS);

    // Group by day of week (0 = Sunday, 6 = Saturday)
    const byDay: { [key: number]: { orders: number[]; revenue: number[] } } = {
      0: { orders: [], revenue: [] },
      1: { orders: [], revenue: [] },
      2: { orders: [], revenue: [] },
      3: { orders: [], revenue: [] },
      4: { orders: [], revenue: [] },
      5: { orders: [], revenue: [] },
      6: { orders: [], revenue: [] },
    };

    records.forEach(record => {
      const dayOfWeek = new Date(record.date).getDay();
      byDay[dayOfWeek].orders.push(record.actualOrders);
      byDay[dayOfWeek].revenue.push(record.actualRevenue);
    });

    const result: { [dayOfWeek: number]: { avgOrders: number; avgRevenue: number; count: number } | null } = {};

    for (let day = 0; day < 7; day++) {
      const data = byDay[day];
      if (data.orders.length === 0) {
        result[day] = null;
      } else {
        result[day] = {
          avgOrders: Math.round(data.orders.reduce((a, b) => a + b, 0) / data.orders.length),
          avgRevenue: Math.round(data.revenue.reduce((a, b) => a + b, 0) / data.revenue.length),
          count: data.orders.length,
        };
      }
    }

    return result;
  }

  /**
   * Get total tracked days count
   */
  getTrackedDaysCount(): number {
    return this.getRecords<ActualDataRecord>(STORAGE_KEYS.ACTUALS).length;
  }

  /**
   * Get data for same day last week (for comparison)
   */
  getSameDayLastWeek(date: string): ActualDataRecord | null {
    const targetDate = new Date(date);
    targetDate.setDate(targetDate.getDate() - 7);
    const lastWeekDate = targetDate.toISOString().split('T')[0];
    return this.getActualDataByDate(lastWeekDate);
  }

  // ===== WEEKLY GOAL =====

  saveWeeklyGoal(revenue: number): WeeklyGoal {
    // Get start of current week (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday start
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const weekStart = monday.toISOString().split('T')[0];

    const goal: WeeklyGoal = { revenue, weekStart };
    localStorage.setItem(STORAGE_KEYS.WEEKLY_GOAL, JSON.stringify(goal));
    return goal;
  }

  getWeeklyGoal(): WeeklyGoal | null {
    const data = localStorage.getItem(STORAGE_KEYS.WEEKLY_GOAL);
    if (!data) return null;
    return JSON.parse(data);
  }

  getWeekProgress(): { goal: number; current: number; percentage: number; daysTracked: number } | null {
    const goal = this.getWeeklyGoal();
    if (!goal) return null;

    // Get start of current week (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const weekStart = monday.toISOString().split('T')[0];

    // Get all actuals for this week
    const records = this.getRecords<ActualDataRecord>(STORAGE_KEYS.ACTUALS);
    const thisWeekRecords = records.filter(r => r.date >= weekStart);

    const current = thisWeekRecords.reduce((sum, r) => sum + r.actualRevenue, 0);
    const percentage = Math.round((current / goal.revenue) * 100);

    return {
      goal: goal.revenue,
      current,
      percentage: Math.min(percentage, 100),
      daysTracked: thisWeekRecords.length,
    };
  }

  // ===== CSV EXPORT =====

  exportActualsToCSV(): string {
    const records = this.getRecords<ActualDataRecord>(STORAGE_KEYS.ACTUALS);
    const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const headers = ['Date', 'Day', 'Orders', 'Revenue', 'Labor Hours', 'Labor Cost', 'Labor %', 'Tags', 'Notes'];
    const rows = sorted.map(r => {
      const laborPercent = r.laborCost && r.actualRevenue > 0
        ? ((r.laborCost / r.actualRevenue) * 100).toFixed(1) + '%'
        : '';
      const dayName = new Date(r.date).toLocaleDateString('en-US', { weekday: 'long' });
      return [
        r.date,
        dayName,
        r.actualOrders,
        r.actualRevenue.toFixed(2),
        r.laborHours || '',
        r.laborCost ? r.laborCost.toFixed(2) : '',
        laborPercent,
        (r.tags || []).join('; '),
        r.notes || '',
      ].map(v => `"${v}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // ===== BEST DAY INSIGHTS =====

  getBestDaysByDayOfWeek(): { [dayOfWeek: number]: { date: string; orders: number; revenue: number } | null } {
    const records = this.getRecords<ActualDataRecord>(STORAGE_KEYS.ACTUALS);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const bestByDay: { [key: number]: { date: string; orders: number; revenue: number } | null } = {};

    for (let day = 0; day < 7; day++) {
      const dayRecords = records.filter(r => new Date(r.date).getDay() === day);
      if (dayRecords.length === 0) {
        bestByDay[day] = null;
      } else {
        const best = dayRecords.reduce((max, r) => r.actualOrders > max.actualOrders ? r : max);
        bestByDay[day] = {
          date: best.date,
          orders: best.actualOrders,
          revenue: best.actualRevenue
        };
      }
    }

    return bestByDay;
  }

  getOverallBestDay(): { date: string; orders: number; revenue: number; dayName: string } | null {
    const records = this.getRecords<ActualDataRecord>(STORAGE_KEYS.ACTUALS);
    if (records.length === 0) return null;

    const best = records.reduce((max, r) => r.actualOrders > max.actualOrders ? r : max);
    const dayName = new Date(best.date).toLocaleDateString('en-US', { weekday: 'long' });

    return {
      date: best.date,
      orders: best.actualOrders,
      revenue: best.actualRevenue,
      dayName
    };
  }

  // ===== WEEK COMPARISON DATA =====

  getWeekComparisonData(): { thisWeek: { day: string; orders: number; revenue: number }[]; lastWeek: { day: string; orders: number; revenue: number }[] } {
    const records = this.getRecords<ActualDataRecord>(STORAGE_KEYS.ACTUALS);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get start of current week (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + diff);
    const thisWeekStart = thisMonday.toISOString().split('T')[0];

    // Get start of last week
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastWeekStart = lastMonday.toISOString().split('T')[0];
    const lastWeekEnd = thisWeekStart;

    const thisWeekRecords = records.filter(r => r.date >= thisWeekStart);
    const lastWeekRecords = records.filter(r => r.date >= lastWeekStart && r.date < lastWeekEnd);

    // Build arrays for each day of week
    const thisWeek = dayNames.map((day, idx) => {
      const adjustedIdx = idx === 0 ? 6 : idx - 1; // Adjust for Monday start
      const record = thisWeekRecords.find(r => {
        const d = new Date(r.date).getDay();
        return d === (adjustedIdx + 1) % 7 || (adjustedIdx === 6 && d === 0);
      });
      return { day, orders: record?.actualOrders || 0, revenue: record?.actualRevenue || 0 };
    });

    const lastWeek = dayNames.map((day, idx) => {
      const record = lastWeekRecords.find(r => {
        const d = new Date(r.date).getDay();
        return d === idx;
      });
      return { day, orders: record?.actualOrders || 0, revenue: record?.actualRevenue || 0 };
    });

    return { thisWeek, lastWeek };
  }

  // ===== CUSTOM PREP TASKS =====

  getCustomPrepTasks(): CustomPrepTask[] {
    return this.getRecords<CustomPrepTask>(STORAGE_KEYS.CUSTOM_PREP_TASKS);
  }

  addCustomPrepTask(task: string): CustomPrepTask {
    const records = this.getRecords<CustomPrepTask>(STORAGE_KEYS.CUSTOM_PREP_TASKS);
    const newTask: CustomPrepTask = {
      id: this.generateId(),
      task,
      createdAt: new Date().toISOString(),
    };
    records.push(newTask);
    this.saveRecords(STORAGE_KEYS.CUSTOM_PREP_TASKS, records);
    return newTask;
  }

  deleteCustomPrepTask(id: string): boolean {
    const records = this.getRecords<CustomPrepTask>(STORAGE_KEYS.CUSTOM_PREP_TASKS);
    const filtered = records.filter(t => t.id !== id);
    return this.saveRecords(STORAGE_KEYS.CUSTOM_PREP_TASKS, filtered);
  }

  // ===== CHECKED PREP ITEMS (resets daily) =====

  getCheckedPrepItems(): { date: string; checkedIds: string[] } {
    const data = localStorage.getItem(STORAGE_KEYS.CHECKED_PREP_ITEMS);
    if (!data) return { date: '', checkedIds: [] };

    const parsed = JSON.parse(data);
    const today = new Date().toISOString().split('T')[0];

    // Reset if different day
    if (parsed.date !== today) {
      return { date: today, checkedIds: [] };
    }
    return parsed;
  }

  togglePrepItemChecked(itemId: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    const current = this.getCheckedPrepItems();

    let newCheckedIds: string[];
    if (current.checkedIds.includes(itemId)) {
      newCheckedIds = current.checkedIds.filter(id => id !== itemId);
    } else {
      newCheckedIds = [...current.checkedIds, itemId];
    }

    localStorage.setItem(STORAGE_KEYS.CHECKED_PREP_ITEMS, JSON.stringify({
      date: today,
      checkedIds: newCheckedIds,
    }));
    return true;
  }

  // ===== CUSTOM INVENTORY =====

  getCustomInventory(): CustomInventoryItem[] {
    return this.getRecords<CustomInventoryItem>(STORAGE_KEYS.CUSTOM_INVENTORY);
  }

  saveCustomInventory(items: CustomInventoryItem[]): boolean {
    return this.saveRecords(STORAGE_KEYS.CUSTOM_INVENTORY, items);
  }

  addInventoryItem(item: Omit<CustomInventoryItem, 'id'>): CustomInventoryItem {
    const records = this.getRecords<CustomInventoryItem>(STORAGE_KEYS.CUSTOM_INVENTORY);
    const newItem: CustomInventoryItem = {
      ...item,
      id: this.generateId(),
    };
    records.push(newItem);
    this.saveRecords(STORAGE_KEYS.CUSTOM_INVENTORY, records);
    return newItem;
  }

  updateInventoryItem(id: string, updates: Partial<CustomInventoryItem>): boolean {
    const records = this.getRecords<CustomInventoryItem>(STORAGE_KEYS.CUSTOM_INVENTORY);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return false;

    records[index] = { ...records[index], ...updates };
    return this.saveRecords(STORAGE_KEYS.CUSTOM_INVENTORY, records);
  }

  deleteInventoryItem(id: string): boolean {
    const records = this.getRecords<CustomInventoryItem>(STORAGE_KEYS.CUSTOM_INVENTORY);
    const filtered = records.filter(r => r.id !== id);
    return this.saveRecords(STORAGE_KEYS.CUSTOM_INVENTORY, filtered);
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
