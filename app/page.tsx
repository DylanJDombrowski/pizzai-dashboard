'use client'

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Cloud, CloudRain, Sun, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, DollarSign, Pizza, Package, ClipboardCheck, BarChart3, ChevronRight, Minus } from 'lucide-react';
import { getHourlyWeather, getWeeklyWeather, type HourlyWeather, type DailyWeather } from '@/lib/weatherService';
import { getHighImpactEventsInNext } from '@/lib/specialEvents';
import type { SpecialEvent } from '@/lib/schedulingTypes';
import { storageService } from '@/lib/storageService';
import { analyticsService } from '@/lib/analyticsService';

// Simplified type definitions
interface DailyForecast {
  expected_orders: number;
  revenue_estimate: number;
  peak_hours: string;
  weather_impact: string;
  weather_boost: number; // percentage, can be negative
  prep_items: string[];
  staffing_note: string;
  confidence: 'low' | 'medium' | 'high';
  basedOnDays: number; // How many historical days this is based on
}

const MOCK_DATA = {
  inventory: [
    { ingredient: "Mozzarella", unit: "lb", on_hand: 20, par_level: 40, cost_per_unit: 4.50 },
    { ingredient: "Pepperoni", unit: "lb", on_hand: 8, par_level: 25, cost_per_unit: 6.00 },
    { ingredient: "Dough", unit: "balls", on_hand: 45, par_level: 80, cost_per_unit: 0.75 },
    { ingredient: "Tomato Sauce", unit: "qt", on_hand: 6, par_level: 12, cost_per_unit: 3.00 },
    { ingredient: "Vegetables", unit: "lb", on_hand: 15, par_level: 20, cost_per_unit: 2.50 }
  ],
  weather: [
    { date: "2025-11-21", hour: 17, temp_f: 41, precip_chance: 70, condition: "Light Rain" },
    { date: "2025-11-21", hour: 18, temp_f: 40, precip_chance: 75, condition: "Light Rain" },
    { date: "2025-11-21", hour: 19, temp_f: 39, precip_chance: 65, condition: "Cloudy" },
    { date: "2025-11-21", hour: 20, temp_f: 38, precip_chance: 50, condition: "Cloudy" }
  ],
  weekly_weather: [
    { day: "Thu", date: "11/21", temp: 41, condition: "Rain", precip: 70 },
    { day: "Fri", date: "11/22", temp: 45, condition: "Cloudy", precip: 30 },
    { day: "Sat", date: "11/23", temp: 52, condition: "Sunny", precip: 10 },
    { day: "Sun", date: "11/24", temp: 48, condition: "Cloudy", precip: 20 },
    { day: "Mon", date: "11/25", temp: 43, condition: "Rain", precip: 60 },
    { day: "Tue", date: "11/26", temp: 50, condition: "Sunny", precip: 5 },
    { day: "Wed", date: "11/27", temp: 55, condition: "Sunny", precip: 5 }
  ]
};

const PizzAIDashboard = () => {
  const [activeTab, setActiveTab] = useState('today');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [forecast, setForecast] = useState<DailyForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [inventoryInputs, setInventoryInputs] = useState<Record<string, number>>(
    MOCK_DATA.inventory.reduce((acc, item) => ({
      ...acc,
      [item.ingredient]: item.on_hand
    }), {})
  );

  // Weather data state
  const [hourlyWeather, setHourlyWeather] = useState<HourlyWeather[]>(MOCK_DATA.weather);
  const [weeklyWeather, setWeeklyWeather] = useState<DailyWeather[]>(MOCK_DATA.weekly_weather);
  const [upcomingEvents, setUpcomingEvents] = useState<SpecialEvent[]>([]);

  // Close Day state
  const [closeForm, setCloseForm] = useState({
    orders: '',
    revenue: '',
    laborHours: '',
    notes: ''
  });
  const [showCloseSuccess, setShowCloseSuccess] = useState(false);
  const [lastCloseResult, setLastCloseResult] = useState<{
    laborPercent: number;
    vsTarget: string;
  } | null>(null);

  // Default hourly rate for labor cost calculation
  const AVG_HOURLY_RATE = 15; // $15/hour average
  const TARGET_LABOR_PERCENT = 28; // Target 28% labor cost

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather and events on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hourly, weekly] = await Promise.all([
          getHourlyWeather(),
          getWeeklyWeather()
        ]);
        setHourlyWeather(hourly);
        setWeeklyWeather(weekly);
      } catch (error) {
        console.error('Error loading weather:', error);
      }

      // Get upcoming events
      const events = getHighImpactEventsInNext(7);
      setUpcomingEvents(events);
    };

    fetchData();
  }, []);

  // Auto-generate forecast on mount
  useEffect(() => {
    if (!forecast) {
      generateTodayForecast();
    }
  }, []);

  const generateTodayForecast = async () => {
    setLoading(true);
    try {
      // Get day of week for baseline
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Fri or Sat
      const isSunday = dayOfWeek === 0;

      // Check for historical data for this day of week
      const historicalAverages = storageService.getAveragesByDayOfWeek();
      const dayData = historicalAverages[dayOfWeek];

      // Use historical data if available, otherwise use defaults
      let baseOrders: number;
      let avgTicket: number;
      let confidence: 'low' | 'medium' | 'high';
      let basedOnDays: number;

      if (dayData && dayData.count >= 2) {
        // We have enough data to use historical averages
        baseOrders = dayData.avgOrders;
        avgTicket = dayData.avgRevenue / dayData.avgOrders;
        basedOnDays = dayData.count;
        confidence = dayData.count >= 4 ? 'high' : 'medium';
      } else {
        // Fall back to defaults
        baseOrders = isWeekend ? 165 : isSunday ? 130 : 90;
        avgTicket = 14;
        basedOnDays = dayData?.count || 0;
        confidence = 'low';
      }

      // Weather adjustment
      const avgPrecip = hourlyWeather.reduce((sum, h) => sum + h.precip_chance, 0) / hourlyWeather.length;
      const isRainy = avgPrecip > 50;
      const weatherBoost = isRainy ? 15 : 0; // Rain = more delivery orders

      // Check for special events
      const todayEvents = upcomingEvents.filter(e => {
        const eventDate = new Date(e.date).toDateString();
        return eventDate === currentDate.toDateString();
      });

      let eventMultiplier = 1;
      if (todayEvents.length > 0) {
        eventMultiplier = todayEvents[0].impactMultiplier;
      }

      const expectedOrders = Math.round(baseOrders * (1 + weatherBoost / 100) * eventMultiplier);

      const forecastData: DailyForecast = {
        expected_orders: expectedOrders,
        revenue_estimate: Math.round(expectedOrders * avgTicket),
        peak_hours: isWeekend ? "6:00 PM - 9:00 PM" : "5:30 PM - 8:00 PM",
        weather_impact: isRainy
          ? "Rain expected - delivery orders typically up 15%"
          : "Clear weather - normal walk-in/delivery mix",
        weather_boost: weatherBoost,
        prep_items: [
          `Prep ${Math.round(expectedOrders * 0.6)} dough balls`,
          `Portion ${Math.round(expectedOrders * 0.4)} lb pepperoni`,
          `Check sauce levels (need ~${Math.round(expectedOrders * 0.1)} qt)`,
          isWeekend ? "Full weekend prep - extra cheese ready" : "Standard prep levels"
        ],
        staffing_note: isWeekend
          ? "Weekend shift - ensure full coverage 5-9 PM"
          : "Weekday - standard evening crew",
        confidence,
        basedOnDays
      };

      setForecast(forecastData);

      // Save to storage
      storageService.saveForecast({
        hourly_forecast: [{ hour: 18, predicted_orders: expectedOrders, confidence: 'high' }],
        peak_hours: [forecastData.peak_hours],
        actions: forecastData.prep_items,
        weather_impact: forecastData.weather_impact,
        revenue_estimate: forecastData.revenue_estimate
      }, 'daily');

    } catch (error) {
      console.error('Forecast error:', error);
    }
    setLoading(false);
  };

  const handleCloseDay = () => {
    if (!closeForm.orders || !closeForm.revenue) {
      alert('Please enter orders and revenue');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const orders = parseInt(closeForm.orders);
    const revenue = parseFloat(closeForm.revenue);
    const laborHours = closeForm.laborHours ? parseFloat(closeForm.laborHours) : undefined;
    const laborCost = laborHours ? laborHours * AVG_HOURLY_RATE : undefined;

    storageService.saveActualData(
      today,
      orders,
      revenue,
      laborHours,
      laborCost,
      closeForm.notes
    );

    // Calculate labor % for feedback
    if (laborHours && revenue > 0) {
      const laborPercent = (laborCost! / revenue) * 100;
      const diff = laborPercent - TARGET_LABOR_PERCENT;
      const vsTarget = diff > 0
        ? `${diff.toFixed(1)}% over target`
        : diff < 0
        ? `${Math.abs(diff).toFixed(1)}% under target`
        : 'Right on target';
      setLastCloseResult({ laborPercent, vsTarget });
    } else {
      setLastCloseResult(null);
    }

    setCloseForm({ orders: '', revenue: '', laborHours: '', notes: '' });
    setShowCloseSuccess(true);
    setTimeout(() => {
      setShowCloseSuccess(false);
      setLastCloseResult(null);
    }, 5000);
  };

  const getInventoryStatus = (item: typeof MOCK_DATA.inventory[0]) => {
    const onHand = inventoryInputs[item.ingredient];
    const ratio = onHand / item.par_level;
    if (ratio < 0.3) return { status: 'critical', color: 'red', label: 'ORDER NOW' };
    if (ratio < 0.5) return { status: 'low', color: 'orange', label: 'Low' };
    if (ratio < 0.8) return { status: 'watch', color: 'yellow', label: 'Watch' };
    return { status: 'good', color: 'green', label: 'Good' };
  };

  const WeatherIcon = ({ condition }: { condition: string }) => {
    if (condition.includes('Rain')) return <CloudRain className="w-6 h-6 text-blue-500" />;
    if (condition.includes('Cloud')) return <Cloud className="w-6 h-6 text-gray-500" />;
    return <Sun className="w-6 h-6 text-yellow-500" />;
  };

  // Get recent performance for Trends
  const getRecentPerformance = () => {
    const actuals = storageService.getActualData();
    if (actuals.length === 0) return null;

    const sorted = [...actuals].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Last 7 days
    const lastWeek = sorted.slice(0, 7);
    const prevWeek = sorted.slice(7, 14);

    if (lastWeek.length === 0) return null;

    const lastWeekOrders = lastWeek.reduce((sum, d) => sum + d.actualOrders, 0);
    const lastWeekRevenue = lastWeek.reduce((sum, d) => sum + d.actualRevenue, 0);
    const prevWeekOrders = prevWeek.reduce((sum, d) => sum + d.actualOrders, 0);
    const prevWeekRevenue = prevWeek.reduce((sum, d) => sum + d.actualRevenue, 0);

    // Calculate labor stats
    const daysWithLabor = lastWeek.filter(d => d.laborHours && d.laborCost);
    const totalLaborCost = daysWithLabor.reduce((sum, d) => sum + (d.laborCost || 0), 0);
    const totalRevenueWithLabor = daysWithLabor.reduce((sum, d) => sum + d.actualRevenue, 0);
    const avgLaborPercent = totalRevenueWithLabor > 0
      ? (totalLaborCost / totalRevenueWithLabor) * 100
      : null;

    const orderChange = prevWeekOrders > 0
      ? ((lastWeekOrders - prevWeekOrders) / prevWeekOrders) * 100
      : 0;
    const revenueChange = prevWeekRevenue > 0
      ? ((lastWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
      : 0;

    return {
      lastWeek: {
        orders: lastWeekOrders,
        revenue: lastWeekRevenue,
        days: lastWeek.length
      },
      orderChange,
      revenueChange,
      avgLaborPercent,
      daysWithLaborTracked: daysWithLabor.length,
      recentDays: lastWeek.map(d => ({
        date: d.date,
        orders: d.actualOrders,
        revenue: d.actualRevenue,
        laborPercent: d.laborCost && d.actualRevenue > 0
          ? (d.laborCost / d.actualRevenue) * 100
          : null
      }))
    };
  };

  const tabs = [
    { id: 'today', label: 'Today', icon: Clock },
    { id: 'prep', label: 'Prep & Stock', icon: Package },
    { id: 'close', label: 'Close Day', icon: ClipboardCheck },
    { id: 'trends', label: 'Trends', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Simple Header */}
        <header className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl shadow-lg p-5 mb-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-2">
                <Pizza className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">PizzAI</h1>
                <p className="text-red-100 text-sm">Know what's coming</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-semibold">
                {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <div className="flex items-center gap-2 text-red-100 text-sm mt-1">
                <WeatherIcon condition={hourlyWeather[0]?.condition || 'Sunny'} />
                <span>{hourlyWeather[0]?.temp_f || '--'}°F</span>
              </div>
            </div>
          </div>
        </header>

        {/* Simple Tab Navigation */}
        <nav className="flex gap-2 mb-5 bg-white rounded-lg p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* TODAY TAB */}
        {activeTab === 'today' && (
          <div className="space-y-4">
            {/* Main Forecast Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-700">Today's Forecast</h2>
                <button
                  onClick={generateTodayForecast}
                  disabled={loading}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  {loading ? 'Updating...' : 'Refresh'}
                </button>
              </div>

              {forecast ? (
                <div className="space-y-6">
                  {/* Big Numbers */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-4xl font-bold text-blue-900">{forecast.expected_orders}</div>
                      <div className="text-sm text-blue-700 mt-1">Expected Orders</div>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        {forecast.weather_boost !== 0 && (
                          <span className="text-xs text-blue-600">
                            {forecast.weather_boost > 0 ? '+' : ''}{forecast.weather_boost}% weather
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          forecast.confidence === 'high' ? 'bg-green-100 text-green-700' :
                          forecast.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {forecast.confidence === 'high' ? 'High confidence' :
                           forecast.confidence === 'medium' ? 'Learning...' :
                           'Estimate'}
                        </span>
                      </div>
                      {forecast.basedOnDays > 0 && (
                        <div className="text-xs text-blue-500 mt-1">
                          Based on {forecast.basedOnDays} {forecast.basedOnDays === 1 ? 'day' : 'days'} of data
                        </div>
                      )}
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-4xl font-bold text-green-900">${forecast.revenue_estimate.toLocaleString()}</div>
                      <div className="text-sm text-green-700 mt-1">Est. Revenue</div>
                    </div>
                  </div>

                  {/* Peak Hours & Weather */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-700 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Peak Hours</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">{forecast.peak_hours}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-700 mb-1">
                        <WeatherIcon condition={hourlyWeather[0]?.condition || 'Sunny'} />
                        <span className="font-medium">Weather Impact</span>
                      </div>
                      <div className="text-sm text-gray-900">{forecast.weather_impact}</div>
                    </div>
                  </div>

                  {/* Prep Checklist */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Prep Checklist</h3>
                    <ul className="space-y-2">
                      {forecast.prep_items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-gray-700">
                          <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Staffing Note */}
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-amber-900">Staffing</div>
                        <div className="text-sm text-amber-800">{forecast.staffing_note}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Loading today's forecast...</p>
                </div>
              )}
            </div>

            {/* Upcoming Events Alert */}
            {upcomingEvents.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h3 className="font-semibold text-purple-900 mb-2">Coming Up</h3>
                {upcomingEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex justify-between items-center py-2 border-b border-purple-100 last:border-0">
                    <span className="text-purple-800">{event.name}</span>
                    <div className="text-right">
                      <span className="text-sm text-purple-600">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded ${
                        event.impactMultiplier >= 2 ? 'bg-red-100 text-red-700' :
                        event.impactMultiplier >= 1.5 ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {event.impactMultiplier}x
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Week Preview */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Week at a Glance</h3>
              <div className="grid grid-cols-7 gap-2">
                {weeklyWeather.map((day, idx) => (
                  <div
                    key={idx}
                    className={`text-center p-2 rounded-lg ${idx === 0 ? 'bg-red-50 ring-2 ring-red-200' : 'bg-gray-50'}`}
                  >
                    <div className="text-xs font-medium text-gray-600">{day.day}</div>
                    <WeatherIcon condition={day.condition} />
                    <div className="text-xs text-gray-500">{day.temp}°</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PREP & STOCK TAB */}
        {activeTab === 'prep' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Inventory Check</h2>

              {/* Alerts First */}
              {MOCK_DATA.inventory.filter(item => getInventoryStatus(item).status === 'critical').length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                    <AlertCircle className="w-5 h-5" />
                    Order Needed Today
                  </div>
                  {MOCK_DATA.inventory
                    .filter(item => getInventoryStatus(item).status === 'critical')
                    .map(item => (
                      <div key={item.ingredient} className="flex justify-between py-1 text-red-700">
                        <span>{item.ingredient}</span>
                        <span className="font-semibold">{item.par_level - inventoryInputs[item.ingredient]} {item.unit} needed</span>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* Inventory List */}
              <div className="space-y-3">
                {MOCK_DATA.inventory.map((item) => {
                  const status = getInventoryStatus(item);
                  const onHand = inventoryInputs[item.ingredient];
                  const percentage = Math.round((onHand / item.par_level) * 100);

                  return (
                    <div key={item.ingredient} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900">{item.ingredient}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            status.color === 'red' ? 'bg-red-100 text-red-700' :
                            status.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                            status.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {status.label}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">Par: {item.par_level} {item.unit}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                status.color === 'red' ? 'bg-red-500' :
                                status.color === 'orange' ? 'bg-orange-500' :
                                status.color === 'yellow' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={onHand}
                            onChange={(e) => setInventoryInputs({
                              ...inventoryInputs,
                              [item.ingredient]: parseInt(e.target.value) || 0
                            })}
                            className="w-16 px-2 py-1 text-center border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                          <span className="text-sm text-gray-500">{item.unit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Today's Prep Tasks */}
            {forecast && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Today's Prep</h2>
                <ul className="space-y-3">
                  {forecast.prep_items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 cursor-pointer hover:bg-green-100 hover:border-green-500 transition-colors" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* CLOSE DAY TAB */}
        {activeTab === 'close' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Close Out Today</h2>
              <p className="text-gray-500 text-sm mb-6">Track your actual numbers to improve future predictions</p>

              {showCloseSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">Day closed! Numbers saved.</span>
                  </div>
                  {lastCloseResult && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="text-green-700">Today's Labor Cost:</span>
                        <span className={`font-bold ${
                          lastCloseResult.laborPercent <= TARGET_LABOR_PERCENT ? 'text-green-700' : 'text-amber-600'
                        }`}>
                          {lastCloseResult.laborPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm text-green-600 mt-1">{lastCloseResult.vsTarget}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Comparison with forecast */}
              {forecast && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="text-sm text-blue-700 mb-1">Today's Forecast</div>
                  <div className="flex gap-6">
                    <div>
                      <span className="text-2xl font-bold text-blue-900">{forecast.expected_orders}</span>
                      <span className="text-blue-700 ml-1">orders</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-blue-900">${forecast.revenue_estimate.toLocaleString()}</span>
                      <span className="text-blue-700 ml-1">revenue</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Simple Input Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Orders</label>
                  <input
                    type="number"
                    value={closeForm.orders}
                    onChange={(e) => setCloseForm({ ...closeForm, orders: e.target.value })}
                    placeholder="How many orders today?"
                    className="w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Revenue ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeForm.revenue}
                    onChange={(e) => setCloseForm({ ...closeForm, revenue: e.target.value })}
                    placeholder="Total sales"
                    className="w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <label className="block text-sm font-medium text-amber-800 mb-2">
                    Total Labor Hours (optional)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={closeForm.laborHours}
                    onChange={(e) => setCloseForm({ ...closeForm, laborHours: e.target.value })}
                    placeholder="e.g., 32 (all staff combined)"
                    className="w-full px-4 py-3 text-lg border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                  />
                  <p className="text-xs text-amber-600 mt-2">
                    Add up all staff hours. We'll calculate labor % at ${AVG_HOURLY_RATE}/hr avg.
                    Target: {TARGET_LABOR_PERCENT}%
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                  <input
                    type="text"
                    value={closeForm.notes}
                    onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
                    placeholder="Any notes? (e.g., event nearby, staff shortage)"
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleCloseDay}
                  className="w-full bg-red-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-red-700 transition-colors shadow-lg"
                >
                  Close Day
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TRENDS TAB */}
        {activeTab === 'trends' && (
          <div className="space-y-4">
            {(() => {
              const perf = getRecentPerformance();

              if (!perf) {
                return (
                  <div className="bg-white rounded-xl shadow-md p-8 text-center">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Yet</h3>
                    <p className="text-gray-500">
                      Close out a few days to see your trends here.
                    </p>
                    <button
                      onClick={() => setActiveTab('close')}
                      className="mt-4 text-red-600 font-medium hover:text-red-700 inline-flex items-center gap-1"
                    >
                      Close today's numbers <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              }

              return (
                <>
                  {/* Week Performance */}
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">This Week vs Last Week</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Orders ({perf.lastWeek.days} days)</div>
                        <div className="text-3xl font-bold text-gray-900">{perf.lastWeek.orders}</div>
                        <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                          perf.orderChange >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {perf.orderChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {perf.orderChange >= 0 ? '+' : ''}{perf.orderChange.toFixed(1)}% vs last week
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Revenue</div>
                        <div className="text-3xl font-bold text-gray-900">${perf.lastWeek.revenue.toLocaleString()}</div>
                        <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                          perf.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {perf.revenueChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {perf.revenueChange >= 0 ? '+' : ''}{perf.revenueChange.toFixed(1)}% vs last week
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Labor Cost Card */}
                  {perf.avgLaborPercent !== null && (
                    <div className={`rounded-xl shadow-md p-6 ${
                      perf.avgLaborPercent <= TARGET_LABOR_PERCENT ? 'bg-green-50' : 'bg-amber-50'
                    }`}>
                      <h2 className="text-lg font-semibold text-gray-700 mb-4">Labor Cost</h2>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-4xl font-bold ${
                            perf.avgLaborPercent <= TARGET_LABOR_PERCENT ? 'text-green-700' : 'text-amber-700'
                          }`}>
                            {perf.avgLaborPercent.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Average labor cost ({perf.daysWithLaborTracked} days tracked)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-semibold ${
                            perf.avgLaborPercent <= TARGET_LABOR_PERCENT ? 'text-green-600' : 'text-amber-600'
                          }`}>
                            {perf.avgLaborPercent <= TARGET_LABOR_PERCENT
                              ? `${(TARGET_LABOR_PERCENT - perf.avgLaborPercent).toFixed(1)}% under target`
                              : `${(perf.avgLaborPercent - TARGET_LABOR_PERCENT).toFixed(1)}% over target`
                            }
                          </div>
                          <div className="text-sm text-gray-500">Target: {TARGET_LABOR_PERCENT}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Days */}
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Days</h3>
                    <div className="space-y-2">
                      {perf.recentDays.map((day, idx) => (
                        <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">
                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex gap-4 text-right items-center">
                            <div>
                              <span className="font-semibold text-gray-900">{day.orders}</span>
                              <span className="text-gray-500 text-sm ml-1">orders</span>
                            </div>
                            <div className="w-20">
                              <span className="font-semibold text-gray-900">${day.revenue.toLocaleString()}</span>
                            </div>
                            <div className="w-16 text-right">
                              {day.laborPercent !== null ? (
                                <span className={`text-sm font-semibold px-2 py-1 rounded ${
                                  day.laborPercent <= TARGET_LABOR_PERCENT
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {day.laborPercent.toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">--</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Simple Chart */}
                  {perf.recentDays.length >= 3 && (
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">Order Trend</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[...perf.recentDays].reverse()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                          />
                          <YAxis />
                          <Tooltip
                            labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          />
                          <Bar dataKey="orders" fill="#dc2626" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Forecast Accuracy - Simple */}
                  {(() => {
                    const accuracy = analyticsService.getAccuracyStats();
                    if (accuracy.totalForecasts === 0) return null;

                    return (
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Forecast Accuracy</h3>
                        <div className="flex items-center gap-4">
                          <div className="text-4xl font-bold text-gray-900">{accuracy.averageAccuracy.toFixed(0)}%</div>
                          <div className="text-gray-600">
                            <div className="text-sm">Average accuracy</div>
                            <div className="text-xs text-gray-500">{accuracy.totalForecasts} forecasts tracked</div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-4">
                          The more you track, the better predictions get.
                        </p>
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-gray-400 text-sm mt-8 pb-4">
          PizzAI - Helping you prep smarter
        </footer>
      </div>
    </div>
  );
};

export default PizzAIDashboard;
