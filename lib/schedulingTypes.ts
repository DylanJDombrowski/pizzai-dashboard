// Scheduling System Type Definitions

export type EmployeeRole = 'cook' | 'server' | 'delivery' | 'prep' | 'manager';

export type ShiftType = 'morning_prep' | 'lunch' | 'dinner' | 'late_night' | 'full_day';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  hourlyRate: number;
  availability: {
    [key in DayOfWeek]: boolean;
  };
  maxHoursPerWeek: number;
  skills: string[]; // e.g., ['pizza_specialist', 'oven_certified', 'cashier']
  hireDate: string;
  active: boolean;
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string; // ISO date string
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  role: EmployeeRole;
  shiftType: ShiftType;
  notes?: string;
}

export interface Schedule {
  id: string;
  weekStartDate: string; // ISO date string (Monday)
  shifts: Shift[];
  totalLaborCost: number;
  totalLaborHours: number;
  projectedRevenue: number;
  laborPercentage: number; // labor cost as % of revenue
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export type EventType = 'holiday' | 'sports' | 'local_event' | 'weather_severe' | 'promotion';

export type EventImpact = 'very_high' | 'high' | 'moderate' | 'low';

export interface SpecialEvent {
  id: string;
  name: string;
  date: string; // ISO date string
  type: EventType;
  impact: EventImpact;
  impactMultiplier: number; // e.g., 2.5 = 250% of normal demand
  description: string;
  recurring: boolean; // if true, repeats annually
  customizations?: {
    staffingNotes?: string;
    recommendedRoles?: EmployeeRole[];
    extendedHours?: boolean;
  };
}

export interface ScheduleGenerationRequest {
  weekStartDate: string;
  employees: Employee[];
  forecasts: {
    daily: {
      date: string;
      predictedOrders: number;
      revenueEstimate: number;
      peakWindow: string;
    }[];
  };
  specialEvents: SpecialEvent[];
  constraints: {
    maxLaborCostPercent: number; // target labor % (e.g., 30)
    minCoverage: {
      [key in EmployeeRole]: number; // minimum staff per shift
    };
    preferredShiftLengths: {
      min: number; // hours
      max: number; // hours
    };
  };
}

export interface ScheduleGenerationResponse {
  schedule: Schedule;
  recommendations: string[];
  warnings: string[];
  laborAnalysis: {
    totalCost: number;
    totalHours: number;
    laborPercentage: number;
    byRole: {
      role: EmployeeRole;
      hours: number;
      cost: number;
    }[];
    byDay: {
      date: string;
      hours: number;
      cost: number;
      staffCount: number;
    }[];
  };
}

// Pre-defined shift templates
export const SHIFT_TEMPLATES = {
  morning_prep: { start: '08:00', end: '12:00', duration: 4 },
  lunch: { start: '11:00', end: '15:00', duration: 4 },
  dinner: { start: '16:00', end: '22:00', duration: 6 },
  late_night: { start: '20:00', end: '00:00', duration: 4 },
  full_day: { start: '10:00', end: '18:00', duration: 8 },
} as const;

// Role requirements by shift type
export const ROLE_REQUIREMENTS = {
  morning_prep: ['prep', 'cook'],
  lunch: ['cook', 'server', 'delivery'],
  dinner: ['cook', 'server', 'delivery', 'manager'],
  late_night: ['cook', 'server', 'delivery'],
  full_day: ['manager'],
} as const;

// Helper functions
export function calculateShiftHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let hours = endHour - startHour;
  let minutes = endMin - startMin;

  // Handle overnight shifts
  if (hours < 0) {
    hours += 24;
  }

  return hours + minutes / 60;
}

export function formatShiftTime(time: string): string {
  const [hour, min] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
}

export function getDayOfWeek(date: string): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dateObj = new Date(date);
  return days[dateObj.getDay()];
}

export function generateEmployeeId(): string {
  return `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateShiftId(): string {
  return `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateScheduleId(): string {
  return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
