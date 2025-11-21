// Special Events and Holiday Calendar for Restaurant Operations

import { SpecialEvent, EventType, EventImpact } from './schedulingTypes';

/**
 * Pre-defined holidays and special events with their expected impact on restaurant demand
 * Impact multipliers are research-based estimates for pizza restaurant traffic
 */

export const ANNUAL_HOLIDAYS: Omit<SpecialEvent, 'id'>[] = [
  // VERY HIGH IMPACT EVENTS (2.0x - 3.0x normal demand)
  {
    name: 'Super Bowl Sunday',
    date: '2025-02-09', // First Sunday in February (varies)
    type: 'sports',
    impact: 'very_high',
    impactMultiplier: 3.0,
    description: 'Highest volume day of the year for pizza delivery',
    recurring: true,
    customizations: {
      staffingNotes: 'All hands on deck - expect 3x normal volume. Start prep early.',
      recommendedRoles: ['cook', 'delivery', 'prep'],
      extendedHours: true,
    },
  },
  {
    name: "New Year's Eve",
    date: '2025-12-31',
    type: 'holiday',
    impact: 'very_high',
    impactMultiplier: 2.2,
    description: 'Major party night with high delivery and takeout demand',
    recurring: true,
    customizations: {
      staffingNotes: 'Late night surge expected. Consider extended hours until 2 AM.',
      extendedHours: true,
    },
  },
  {
    name: 'Halloween',
    date: '2025-10-31',
    type: 'holiday',
    impact: 'very_high',
    impactMultiplier: 2.0,
    description: 'High family demand and party orders',
    recurring: true,
    customizations: {
      staffingNotes: 'Peak from 5-8 PM. Many large family orders.',
    },
  },

  // HIGH IMPACT EVENTS (1.5x - 2.0x normal demand)
  {
    name: "Valentine's Day",
    date: '2025-02-14',
    type: 'holiday',
    impact: 'high',
    impactMultiplier: 1.8,
    description: 'Strong dinner demand, many couples dining in',
    recurring: true,
  },
  {
    name: 'March Madness (First Weekend)',
    date: '2025-03-20', // Third Thursday in March
    type: 'sports',
    impact: 'high',
    impactMultiplier: 1.7,
    description: 'NCAA tournament drives sports bar and delivery demand',
    recurring: true,
  },
  {
    name: 'Cinco de Mayo',
    date: '2025-05-05',
    type: 'holiday',
    impact: 'high',
    impactMultiplier: 1.6,
    description: 'Party night with strong evening demand',
    recurring: true,
  },
  {
    name: 'Memorial Day Weekend',
    date: '2025-05-26', // Last Monday in May
    type: 'holiday',
    impact: 'high',
    impactMultiplier: 1.5,
    description: 'Summer kickoff, strong weekend demand',
    recurring: true,
  },
  {
    name: 'Independence Day (July 4th)',
    date: '2025-07-04',
    type: 'holiday',
    impact: 'high',
    impactMultiplier: 1.8,
    description: 'Major party day with BBQs and gatherings',
    recurring: true,
  },
  {
    name: 'Labor Day Weekend',
    date: '2025-09-01', // First Monday in September
    type: 'holiday',
    impact: 'high',
    impactMultiplier: 1.5,
    description: 'Summer ending celebrations',
    recurring: true,
  },
  {
    name: 'Thanksgiving Eve',
    date: '2025-11-26', // Day before Thanksgiving
    type: 'holiday',
    impact: 'high',
    impactMultiplier: 1.9,
    description: 'Biggest bar night of the year, high late-night demand',
    recurring: true,
    customizations: {
      staffingNotes: 'Late night surge. Many people out with friends/family.',
    },
  },
  {
    name: 'Black Friday',
    date: '2025-11-28', // Day after Thanksgiving
    type: 'holiday',
    impact: 'high',
    impactMultiplier: 1.6,
    description: 'Shoppers ordering delivery and takeout',
    recurring: true,
  },
  {
    name: 'Christmas Eve',
    date: '2025-12-24',
    type: 'holiday',
    impact: 'high',
    impactMultiplier: 1.7,
    description: 'Family gatherings and last-minute orders',
    recurring: true,
  },

  // MODERATE IMPACT EVENTS (1.2x - 1.5x normal demand)
  {
    name: "St. Patrick's Day",
    date: '2025-03-17',
    type: 'holiday',
    impact: 'moderate',
    impactMultiplier: 1.4,
    description: 'Bar crowds and evening parties',
    recurring: true,
  },
  {
    name: 'Easter Sunday',
    date: '2025-04-20', // Varies annually
    type: 'holiday',
    impact: 'moderate',
    impactMultiplier: 1.3,
    description: 'Family dinner demand',
    recurring: true,
  },
  {
    name: "Mother's Day",
    date: '2025-05-11', // Second Sunday in May
    type: 'holiday',
    impact: 'moderate',
    impactMultiplier: 1.4,
    description: 'Strong lunch and early dinner demand',
    recurring: true,
  },
  {
    name: "Father's Day",
    date: '2025-06-15', // Third Sunday in June
    type: 'holiday',
    impact: 'moderate',
    impactMultiplier: 1.3,
    description: 'Casual dining and sports bar demand',
    recurring: true,
  },
  {
    name: 'Back to School Week',
    date: '2025-09-02', // First Tuesday after Labor Day
    type: 'local_event',
    impact: 'moderate',
    impactMultiplier: 1.2,
    description: 'Busy parents ordering convenience meals',
    recurring: true,
  },
  {
    name: 'Christmas Day',
    date: '2025-12-25',
    type: 'holiday',
    impact: 'moderate',
    impactMultiplier: 1.3,
    description: 'Limited competition, family orders',
    recurring: true,
    customizations: {
      staffingNotes: 'Consider closing or limited hours. Holiday pay applies.',
    },
  },

  // LOW IMPACT (Negative) - SLOWER THAN NORMAL
  {
    name: 'Thanksgiving Day',
    date: '2025-11-27', // Fourth Thursday in November
    type: 'holiday',
    impact: 'low',
    impactMultiplier: 0.3,
    description: 'Slowest day of the year - people cooking at home',
    recurring: true,
    customizations: {
      staffingNotes: 'Consider closing. Minimal demand expected.',
    },
  },

  // SPORTS EVENTS (Season-long impacts)
  {
    name: 'NFL Season (Sundays)',
    date: '2025-09-07', // First Sunday in September
    type: 'sports',
    impact: 'moderate',
    impactMultiplier: 1.3,
    description: 'Sunday football drives consistent demand Sept-Jan',
    recurring: true,
    customizations: {
      staffingNotes: 'Strong Sunday demand during NFL season (Sept-Feb)',
    },
  },
  {
    name: 'March Madness (Finals)',
    date: '2025-04-07', // First Monday in April
    type: 'sports',
    impact: 'high',
    impactMultiplier: 1.8,
    description: 'Championship game drives major demand',
    recurring: true,
  },
];

/**
 * Get events for a specific date range
 */
export function getEventsForDateRange(startDate: string, endDate: string): SpecialEvent[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return ANNUAL_HOLIDAYS.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= start && eventDate <= end;
  }).map((event, index) => ({
    ...event,
    id: `event_${index}_${event.name.replace(/\s+/g, '_').toLowerCase()}`,
  }));
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(date: string): SpecialEvent[] {
  return getEventsForDateRange(date, date);
}

/**
 * Get the next upcoming event
 */
export function getNextUpcomingEvent(): SpecialEvent | null {
  const today = new Date();
  const upcomingEvents = ANNUAL_HOLIDAYS.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= today;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (upcomingEvents.length === 0) return null;

  return {
    ...upcomingEvents[0],
    id: `event_next_${upcomingEvents[0].name.replace(/\s+/g, '_').toLowerCase()}`,
  };
}

/**
 * Get high-impact events in the next N days
 */
export function getHighImpactEventsInNext(days: number): SpecialEvent[] {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);

  return getEventsForDateRange(today.toISOString(), futureDate.toISOString()).filter(
    (event) => event.impact === 'very_high' || event.impact === 'high'
  );
}

/**
 * Calculate adjusted demand based on events
 */
export function calculateEventAdjustedDemand(baseOrders: number, date: string): {
  adjustedOrders: number;
  events: SpecialEvent[];
  totalMultiplier: number;
} {
  const events = getEventsForDate(date);

  if (events.length === 0) {
    return {
      adjustedOrders: baseOrders,
      events: [],
      totalMultiplier: 1.0,
    };
  }

  // If multiple events on same day, use the highest multiplier (not cumulative)
  const maxMultiplier = Math.max(...events.map((e) => e.impactMultiplier));

  return {
    adjustedOrders: Math.round(baseOrders * maxMultiplier),
    events,
    totalMultiplier: maxMultiplier,
  };
}

/**
 * Get staffing recommendations based on events
 */
export function getEventStaffingRecommendations(date: string): string[] {
  const events = getEventsForDate(date);
  const recommendations: string[] = [];

  events.forEach((event) => {
    if (event.customizations?.staffingNotes) {
      recommendations.push(`${event.name}: ${event.customizations.staffingNotes}`);
    }

    if (event.impactMultiplier > 2.0) {
      recommendations.push(`CRITICAL: ${event.name} expects ${Math.round((event.impactMultiplier - 1) * 100)}% increase in orders`);
    } else if (event.impactMultiplier > 1.5) {
      recommendations.push(`HIGH: ${event.name} expects ${Math.round((event.impactMultiplier - 1) * 100)}% increase in orders`);
    }

    if (event.customizations?.extendedHours) {
      recommendations.push(`Consider extended hours for ${event.name}`);
    }

    if (event.customizations?.recommendedRoles) {
      recommendations.push(`Priority roles for ${event.name}: ${event.customizations.recommendedRoles.join(', ')}`);
    }
  });

  return recommendations;
}

/**
 * Add custom event
 */
export function createCustomEvent(
  name: string,
  date: string,
  type: EventType,
  impactMultiplier: number,
  description?: string
): SpecialEvent {
  let impact: EventImpact;
  if (impactMultiplier >= 2.0) impact = 'very_high';
  else if (impactMultiplier >= 1.5) impact = 'high';
  else if (impactMultiplier >= 1.2) impact = 'moderate';
  else impact = 'low';

  return {
    id: `custom_${Date.now()}_${name.replace(/\s+/g, '_').toLowerCase()}`,
    name,
    date,
    type,
    impact,
    impactMultiplier,
    description: description || `Custom event: ${name}`,
    recurring: false,
  };
}
