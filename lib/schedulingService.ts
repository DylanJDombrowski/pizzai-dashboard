// AI-Powered Scheduling Service

import {
  Employee,
  Shift,
  Schedule,
  ScheduleGenerationRequest,
  ScheduleGenerationResponse,
  ShiftType,
  EmployeeRole,
  SHIFT_TEMPLATES,
  calculateShiftHours,
  generateShiftId,
  generateScheduleId,
  getDayOfWeek,
} from './schedulingTypes';
import { getEventsForDate, calculateEventAdjustedDemand, getEventStaffingRecommendations } from './specialEvents';

/**
 * Mock employees for development
 */
export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'emp_001',
    name: 'Marco Rossi',
    role: 'cook',
    hourlyRate: 22.0,
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    maxHoursPerWeek: 40,
    skills: ['pizza_specialist', 'oven_certified'],
    hireDate: '2023-01-15',
    active: true,
  },
  {
    id: 'emp_002',
    name: 'Sofia Chen',
    role: 'cook',
    hourlyRate: 20.0,
    availability: {
      monday: false,
      tuesday: false,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    },
    maxHoursPerWeek: 35,
    skills: ['pizza_specialist'],
    hireDate: '2023-06-01',
    active: true,
  },
  {
    id: 'emp_003',
    name: 'James Wilson',
    role: 'server',
    hourlyRate: 15.0,
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false,
    },
    maxHoursPerWeek: 30,
    skills: ['cashier', 'customer_service'],
    hireDate: '2024-02-10',
    active: true,
  },
  {
    id: 'emp_004',
    name: 'Emma Rodriguez',
    role: 'delivery',
    hourlyRate: 16.0,
    availability: {
      monday: false,
      tuesday: false,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    },
    maxHoursPerWeek: 25,
    skills: ['driver_license', 'navigation'],
    hireDate: '2024-03-20',
    active: true,
  },
  {
    id: 'emp_005',
    name: 'Alex Kumar',
    role: 'delivery',
    hourlyRate: 16.0,
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: false,
      saturday: false,
      sunday: false,
    },
    maxHoursPerWeek: 25,
    skills: ['driver_license', 'navigation'],
    hireDate: '2024-05-15',
    active: true,
  },
  {
    id: 'emp_006',
    name: 'Olivia Taylor',
    role: 'prep',
    hourlyRate: 17.0,
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    maxHoursPerWeek: 30,
    skills: ['food_prep', 'inventory'],
    hireDate: '2023-09-01',
    active: true,
  },
  {
    id: 'emp_007',
    name: 'Michael Brown',
    role: 'manager',
    hourlyRate: 28.0,
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    },
    maxHoursPerWeek: 45,
    skills: ['management', 'scheduling', 'inventory', 'customer_service'],
    hireDate: '2022-03-01',
    active: true,
  },
  {
    id: 'emp_008',
    name: 'Isabella Martinez',
    role: 'server',
    hourlyRate: 15.0,
    availability: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    },
    maxHoursPerWeek: 28,
    skills: ['cashier', 'customer_service'],
    hireDate: '2024-01-05',
    active: true,
  },
];

/**
 * Generate AI-powered schedule based on forecasts, events, and constraints
 */
export async function generateAISchedule(request: ScheduleGenerationRequest): Promise<ScheduleGenerationResponse> {
  const { weekStartDate, employees, forecasts, specialEvents, constraints } = request;

  // Build context for AI
  const contextData = {
    week_start: weekStartDate,
    daily_forecasts: forecasts.daily.map((day) => {
      const events = getEventsForDate(day.date);
      const adjustedDemand = calculateEventAdjustedDemand(day.predictedOrders, day.date);
      const eventRecommendations = getEventStaffingRecommendations(day.date);

      return {
        date: day.date,
        day_of_week: new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' }),
        base_predicted_orders: day.predictedOrders,
        adjusted_predicted_orders: adjustedDemand.adjustedOrders,
        revenue_estimate: day.revenueEstimate,
        peak_window: day.peakWindow,
        special_events: events.map((e) => ({
          name: e.name,
          impact: e.impact,
          multiplier: e.impactMultiplier,
        })),
        event_recommendations: eventRecommendations,
      };
    }),
    available_employees: employees
      .filter((emp) => emp.active)
      .map((emp) => ({
        id: emp.id,
        name: emp.name,
        role: emp.role,
        hourly_rate: emp.hourlyRate,
        max_hours_per_week: emp.maxHoursPerWeek,
        available_days: Object.entries(emp.availability)
          .filter(([_, available]) => available)
          .map(([day]) => day),
        skills: emp.skills,
      })),
    constraints: {
      target_labor_percentage: constraints.maxLaborCostPercent,
      minimum_coverage: constraints.minCoverage,
      shift_length_range: constraints.preferredShiftLengths,
    },
    shift_templates: SHIFT_TEMPLATES,
  };

  try {
    // Call Claude AI for schedule generation
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `You are PizzAI's scheduling optimizer. Generate an optimal weekly staff schedule.

Context Data:
${JSON.stringify(contextData, null, 2)}

IMPORTANT INSTRUCTIONS:
1. Match staffing levels to demand forecasts (higher demand = more staff)
2. Account for special events and their impact multipliers
3. Respect employee availability and max hours
4. Try to keep labor cost within ${constraints.maxLaborCostPercent}% of projected revenue
5. Ensure minimum coverage for each role during operating hours
6. Prioritize experienced staff (earlier hire dates) for high-demand shifts
7. Balance shifts fairly across the week for each employee
8. Consider peak windows when scheduling roles (e.g., more delivery drivers during peak)
9. For Super Bowl or major events (multiplier > 2.0), schedule ALL available staff
10. For slow days (multiplier < 0.5), schedule minimal staff

Generate a JSON response with this structure:
{
  "shifts": [
    {
      "employee_id": "emp_001",
      "date": "2025-11-24",
      "start_time": "16:00",
      "end_time": "22:00",
      "role": "cook",
      "shift_type": "dinner"
    }
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "warnings": [
    "Warning about understaffing, over-budget, etc."
  ]
}

Respond with ONLY the JSON object, no markdown or explanation.`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content.map((item: any) => item.text || '').join('\n').trim();
    const cleanText = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    // Convert AI response to our Shift objects
    const shifts: Shift[] = parsed.shifts.map((shift: any) => ({
      id: generateShiftId(),
      employeeId: shift.employee_id,
      date: shift.date,
      startTime: shift.start_time,
      endTime: shift.end_time,
      role: shift.role as EmployeeRole,
      shiftType: shift.shift_type as ShiftType,
      notes: shift.notes,
    }));

    // Calculate labor metrics
    const laborAnalysis = calculateLaborAnalysis(shifts, employees, forecasts.daily);

    // Create schedule object
    const schedule: Schedule = {
      id: generateScheduleId(),
      weekStartDate,
      shifts,
      totalLaborCost: laborAnalysis.totalCost,
      totalLaborHours: laborAnalysis.totalHours,
      projectedRevenue: forecasts.daily.reduce((sum, day) => sum + day.revenueEstimate, 0),
      laborPercentage: laborAnalysis.laborPercentage,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      schedule,
      recommendations: parsed.recommendations || [],
      warnings: parsed.warnings || [],
      laborAnalysis,
    };
  } catch (error) {
    console.error('Error generating AI schedule:', error);

    // Return fallback schedule
    return generateFallbackSchedule(request);
  }
}

/**
 * Calculate detailed labor analysis from shifts
 */
function calculateLaborAnalysis(
  shifts: Shift[],
  employees: Employee[],
  forecasts: { date: string; revenueEstimate: number }[]
): ScheduleGenerationResponse['laborAnalysis'] {
  const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));

  let totalCost = 0;
  let totalHours = 0;

  const byRole = new Map<EmployeeRole, { hours: number; cost: number }>();
  const byDay = new Map<string, { hours: number; cost: number; staffCount: Set<string> }>();

  shifts.forEach((shift) => {
    const employee = employeeMap.get(shift.employeeId);
    if (!employee) return;

    const hours = calculateShiftHours(shift.startTime, shift.endTime);
    const cost = hours * employee.hourlyRate;

    totalHours += hours;
    totalCost += cost;

    // By role
    const roleData = byRole.get(shift.role) || { hours: 0, cost: 0 };
    roleData.hours += hours;
    roleData.cost += cost;
    byRole.set(shift.role, roleData);

    // By day
    const dayData = byDay.get(shift.date) || { hours: 0, cost: 0, staffCount: new Set() };
    dayData.hours += hours;
    dayData.cost += cost;
    dayData.staffCount.add(shift.employeeId);
    byDay.set(shift.date, dayData);
  });

  const totalRevenue = forecasts.reduce((sum, day) => sum + day.revenueEstimate, 0);
  const laborPercentage = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    totalHours: Math.round(totalHours * 10) / 10,
    laborPercentage: Math.round(laborPercentage * 10) / 10,
    byRole: Array.from(byRole.entries()).map(([role, data]) => ({
      role,
      hours: Math.round(data.hours * 10) / 10,
      cost: Math.round(data.cost * 100) / 100,
    })),
    byDay: Array.from(byDay.entries()).map(([date, data]) => ({
      date,
      hours: Math.round(data.hours * 10) / 10,
      cost: Math.round(data.cost * 100) / 100,
      staffCount: data.staffCount.size,
    })),
  };
}

/**
 * Fallback schedule generation if AI fails
 */
function generateFallbackSchedule(request: ScheduleGenerationRequest): ScheduleGenerationResponse {
  const { weekStartDate, employees, forecasts } = request;
  const shifts: Shift[] = [];

  // Simple rule-based scheduling
  forecasts.daily.forEach((day) => {
    const dayOfWeek = getDayOfWeek(day.date);
    const availableEmployees = employees.filter((emp) => emp.active && emp.availability[dayOfWeek]);

    // Schedule based on demand level
    const demandLevel = day.predictedOrders;
    let staffNeeded = Math.ceil(demandLevel / 30); // ~30 orders per staff member

    availableEmployees.slice(0, staffNeeded).forEach((emp) => {
      const shiftType: ShiftType = demandLevel > 100 ? 'dinner' : 'lunch';
      const template = SHIFT_TEMPLATES[shiftType];

      shifts.push({
        id: generateShiftId(),
        employeeId: emp.id,
        date: day.date,
        startTime: template.start,
        endTime: template.end,
        role: emp.role,
        shiftType,
      });
    });
  });

  const laborAnalysis = calculateLaborAnalysis(shifts, employees, forecasts.daily);

  const schedule: Schedule = {
    id: generateScheduleId(),
    weekStartDate,
    shifts,
    totalLaborCost: laborAnalysis.totalCost,
    totalLaborHours: laborAnalysis.totalHours,
    projectedRevenue: forecasts.daily.reduce((sum, day) => sum + day.revenueEstimate, 0),
    laborPercentage: laborAnalysis.laborPercentage,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    schedule,
    recommendations: ['Fallback schedule generated. Connect AI for optimized scheduling.'],
    warnings: ['AI scheduling unavailable - using basic rule-based schedule'],
    laborAnalysis,
  };
}

/**
 * Export schedule to CSV format
 */
export function exportScheduleToCSV(schedule: Schedule, employees: Employee[]): string {
  const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));

  let csv = 'Employee,Role,Date,Day,Start Time,End Time,Hours,Pay Rate,Shift Cost\n';

  schedule.shifts.forEach((shift) => {
    const employee = employeeMap.get(shift.employeeId);
    if (!employee) return;

    const hours = calculateShiftHours(shift.startTime, shift.endTime);
    const cost = hours * employee.hourlyRate;
    const dayOfWeek = new Date(shift.date).toLocaleDateString('en-US', { weekday: 'long' });

    csv += `${employee.name},${shift.role},${shift.date},${dayOfWeek},${shift.startTime},${shift.endTime},${hours},$${employee.hourlyRate},$${cost.toFixed(2)}\n`;
  });

  csv += `\nTotal Labor Hours,${schedule.totalLaborHours}\n`;
  csv += `Total Labor Cost,$${schedule.totalLaborCost.toFixed(2)}\n`;
  csv += `Projected Revenue,$${schedule.projectedRevenue.toFixed(2)}\n`;
  csv += `Labor Percentage,${schedule.laborPercentage.toFixed(1)}%\n`;

  return csv;
}

/**
 * Get week start date (Monday) for a given date
 */
export function getWeekStartDate(date: Date): string {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Get 7 dates for the week starting from a given Monday
 */
export function getWeekDates(weekStartDate: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(weekStartDate);

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}
