// Supabase-backed Data Persistence
// Mirrors the localStorage storageService API but uses Supabase

import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import type { DayTag } from './database.types';

export { DAY_TAGS } from './storageService';
export type { DayTag } from './database.types';

// Re-export types that match the database
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

export interface CustomPrepTask {
  id: string;
  task: string;
  createdAt: string;
}

export interface CustomInventoryItem {
  id: string;
  ingredient: string;
  unit: string;
  par_level: number;
  on_hand: number;
  cost_per_unit?: number;
}

export interface WeeklyGoal {
  revenue: number;
  weekStart: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  hourlyRate: number;
  availability: Record<string, boolean>;
  maxHours: number;
  phone?: string;
}

class SupabaseStorageService {
  private userId: string | null = null;

  setUser(user: User | null) {
    this.userId = user?.id ?? null;
  }

  private ensureUser(): string {
    if (!this.userId) {
      throw new Error('User not authenticated');
    }
    return this.userId;
  }

  // ===== ACTUAL DATA OPERATIONS =====

  async saveActualData(
    date: string,
    actualOrders: number,
    actualRevenue: number,
    laborHours?: number,
    laborCost?: number,
    notes?: string,
    tags?: DayTag[]
  ): Promise<ActualDataRecord> {
    const userId = this.ensureUser();

    // Upsert based on user_id + date
    const { data, error } = await supabase
      .from('actual_data')
      .upsert({
        user_id: userId,
        date,
        actual_orders: actualOrders,
        actual_revenue: actualRevenue,
        labor_hours: laborHours ?? null,
        labor_cost: laborCost ?? null,
        notes: notes ?? null,
        tags: tags ?? [],
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapActualData(data);
  }

  async getActualData(startDate?: string, endDate?: string): Promise<ActualDataRecord[]> {
    const userId = this.ensureUser();

    let query = supabase
      .from('actual_data')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map(this.mapActualData);
  }

  async getActualDataByDate(date: string): Promise<ActualDataRecord | null> {
    const userId = this.ensureUser();

    const { data, error } = await supabase
      .from('actual_data')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data ? this.mapActualData(data) : null;
  }

  async getSameDayLastWeek(date: string): Promise<ActualDataRecord | null> {
    const targetDate = new Date(date);
    targetDate.setDate(targetDate.getDate() - 7);
    const lastWeekDate = targetDate.toISOString().split('T')[0];
    return this.getActualDataByDate(lastWeekDate);
  }

  private mapActualData(row: any): ActualDataRecord {
    return {
      id: row.id,
      date: row.date,
      actualOrders: row.actual_orders,
      actualRevenue: Number(row.actual_revenue),
      laborHours: row.labor_hours ? Number(row.labor_hours) : undefined,
      laborCost: row.labor_cost ? Number(row.labor_cost) : undefined,
      notes: row.notes ?? undefined,
      tags: row.tags ?? undefined,
      createdAt: row.created_at,
    };
  }

  // ===== AVERAGES & ANALYTICS =====

  async getAveragesByDayOfWeek(): Promise<{ [dayOfWeek: number]: { avgOrders: number; avgRevenue: number; count: number } | null }> {
    const records = await this.getActualData();

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

  async getTrackedDaysCount(): Promise<number> {
    const records = await this.getActualData();
    return records.length;
  }

  async getBestDaysByDayOfWeek(): Promise<{ [dayOfWeek: number]: { date: string; orders: number; revenue: number } | null }> {
    const records = await this.getActualData();
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

  async getOverallBestDay(): Promise<{ date: string; orders: number; revenue: number; dayName: string } | null> {
    const records = await this.getActualData();
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

  async getWeekComparisonData(): Promise<{ thisWeek: { day: string; orders: number; revenue: number }[]; lastWeek: { day: string; orders: number; revenue: number }[] }> {
    const records = await this.getActualData();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + diff);
    const thisWeekStart = thisMonday.toISOString().split('T')[0];

    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastWeekStart = lastMonday.toISOString().split('T')[0];
    const lastWeekEnd = thisWeekStart;

    const thisWeekRecords = records.filter(r => r.date >= thisWeekStart);
    const lastWeekRecords = records.filter(r => r.date >= lastWeekStart && r.date < lastWeekEnd);

    const thisWeek = dayNames.map((day, idx) => {
      const record = thisWeekRecords.find(r => new Date(r.date).getDay() === idx);
      return { day, orders: record?.actualOrders || 0, revenue: record?.actualRevenue || 0 };
    });

    const lastWeek = dayNames.map((day, idx) => {
      const record = lastWeekRecords.find(r => new Date(r.date).getDay() === idx);
      return { day, orders: record?.actualOrders || 0, revenue: record?.actualRevenue || 0 };
    });

    return { thisWeek, lastWeek };
  }

  // ===== WEEKLY GOAL =====

  async saveWeeklyGoal(revenue: number): Promise<WeeklyGoal> {
    const userId = this.ensureUser();

    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const weekStart = monday.toISOString().split('T')[0];

    const { error } = await supabase
      .from('weekly_goals')
      .upsert({
        user_id: userId,
        revenue,
        week_start: weekStart,
      }, {
        onConflict: 'user_id,week_start'
      });

    if (error) throw error;

    return { revenue, weekStart };
  }

  async getWeeklyGoal(): Promise<WeeklyGoal | null> {
    const userId = this.ensureUser();

    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const weekStart = monday.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      revenue: Number(data.revenue),
      weekStart: data.week_start,
    };
  }

  async getWeekProgress(): Promise<{ goal: number; current: number; percentage: number; daysTracked: number } | null> {
    const goal = await this.getWeeklyGoal();
    if (!goal) return null;

    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const weekStart = monday.toISOString().split('T')[0];

    const records = await this.getActualData(weekStart);
    const current = records.reduce((sum, r) => sum + r.actualRevenue, 0);
    const percentage = Math.round((current / goal.revenue) * 100);

    return {
      goal: goal.revenue,
      current,
      percentage: Math.min(percentage, 100),
      daysTracked: records.length,
    };
  }

  // ===== CSV EXPORT =====

  async exportActualsToCSV(): Promise<string> {
    const records = await this.getActualData();
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

  // ===== CUSTOM PREP TASKS =====

  async getCustomPrepTasks(): Promise<CustomPrepTask[]> {
    const userId = this.ensureUser();

    const { data, error } = await supabase
      .from('custom_prep_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data ?? []).map(row => ({
      id: row.id,
      task: row.task,
      createdAt: row.created_at,
    }));
  }

  async addCustomPrepTask(task: string): Promise<CustomPrepTask> {
    const userId = this.ensureUser();

    const { data, error } = await supabase
      .from('custom_prep_tasks')
      .insert({ user_id: userId, task })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      task: data.task,
      createdAt: data.created_at,
    };
  }

  async deleteCustomPrepTask(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('custom_prep_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // ===== CUSTOM INVENTORY =====

  async getCustomInventory(): Promise<CustomInventoryItem[]> {
    const userId = this.ensureUser();

    const { data, error } = await supabase
      .from('custom_inventory')
      .select('*')
      .eq('user_id', userId)
      .order('ingredient', { ascending: true });

    if (error) throw error;

    return (data ?? []).map(row => ({
      id: row.id,
      ingredient: row.ingredient,
      unit: row.unit,
      par_level: Number(row.par_level),
      on_hand: Number(row.on_hand),
      cost_per_unit: row.cost_per_unit ? Number(row.cost_per_unit) : undefined,
    }));
  }

  async addInventoryItem(item: Omit<CustomInventoryItem, 'id'>): Promise<CustomInventoryItem> {
    const userId = this.ensureUser();

    const { data, error } = await supabase
      .from('custom_inventory')
      .insert({
        user_id: userId,
        ingredient: item.ingredient,
        unit: item.unit,
        par_level: item.par_level,
        on_hand: item.on_hand,
        cost_per_unit: item.cost_per_unit ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      ingredient: data.ingredient,
      unit: data.unit,
      par_level: Number(data.par_level),
      on_hand: Number(data.on_hand),
      cost_per_unit: data.cost_per_unit ? Number(data.cost_per_unit) : undefined,
    };
  }

  async updateInventoryItem(id: string, updates: Partial<CustomInventoryItem>): Promise<boolean> {
    const updateData: any = {};
    if (updates.ingredient !== undefined) updateData.ingredient = updates.ingredient;
    if (updates.unit !== undefined) updateData.unit = updates.unit;
    if (updates.par_level !== undefined) updateData.par_level = updates.par_level;
    if (updates.on_hand !== undefined) updateData.on_hand = updates.on_hand;
    if (updates.cost_per_unit !== undefined) updateData.cost_per_unit = updates.cost_per_unit;

    const { error } = await supabase
      .from('custom_inventory')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('custom_inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async saveCustomInventory(items: CustomInventoryItem[]): Promise<boolean> {
    // For bulk save, delete all and re-insert
    const userId = this.ensureUser();

    // Delete all existing
    await supabase.from('custom_inventory').delete().eq('user_id', userId);

    // Insert all
    if (items.length > 0) {
      const { error } = await supabase
        .from('custom_inventory')
        .insert(items.map(item => ({
          id: item.id,
          user_id: userId,
          ingredient: item.ingredient,
          unit: item.unit,
          par_level: item.par_level,
          on_hand: item.on_hand,
          cost_per_unit: item.cost_per_unit ?? null,
        })));

      if (error) throw error;
    }

    return true;
  }

  // ===== EMPLOYEES =====

  async getEmployees(): Promise<Employee[]> {
    const userId = this.ensureUser();

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data ?? []).map(row => ({
      id: row.id,
      name: row.name,
      role: row.role,
      hourlyRate: Number(row.hourly_rate),
      availability: row.availability as Record<string, boolean>,
      maxHours: row.max_hours,
      phone: row.phone ?? undefined,
    }));
  }

  async saveEmployees(employees: Employee[]): Promise<boolean> {
    const userId = this.ensureUser();

    // Delete all existing
    await supabase.from('employees').delete().eq('user_id', userId);

    // Insert all
    if (employees.length > 0) {
      const { error } = await supabase
        .from('employees')
        .insert(employees.map(emp => ({
          id: emp.id,
          user_id: userId,
          name: emp.name,
          role: emp.role,
          hourly_rate: emp.hourlyRate,
          availability: emp.availability,
          max_hours: emp.maxHours,
          phone: emp.phone ?? null,
        })));

      if (error) throw error;
    }

    return true;
  }

  // ===== CHECKED PREP ITEMS (still localStorage - daily reset) =====
  // These are transient daily states, localStorage is fine

  getCheckedPrepItems(): { date: string; checkedIds: string[] } {
    if (typeof window === 'undefined') return { date: '', checkedIds: [] };

    const data = localStorage.getItem('pizzai_checked_prep');
    if (!data) return { date: '', checkedIds: [] };

    const parsed = JSON.parse(data);
    const today = new Date().toISOString().split('T')[0];

    if (parsed.date !== today) {
      return { date: today, checkedIds: [] };
    }
    return parsed;
  }

  togglePrepItemChecked(itemId: string): boolean {
    if (typeof window === 'undefined') return false;

    const today = new Date().toISOString().split('T')[0];
    const current = this.getCheckedPrepItems();

    let newCheckedIds: string[];
    if (current.checkedIds.includes(itemId)) {
      newCheckedIds = current.checkedIds.filter(id => id !== itemId);
    } else {
      newCheckedIds = [...current.checkedIds, itemId];
    }

    localStorage.setItem('pizzai_checked_prep', JSON.stringify({
      date: today,
      checkedIds: newCheckedIds,
    }));
    return true;
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService();
