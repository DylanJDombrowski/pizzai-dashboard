'use client'

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Cloud, CloudRain, Sun, TrendingUp, AlertCircle, CheckCircle, Calendar, Clock, DollarSign, Pizza, Sparkles } from 'lucide-react';
import { getHourlyWeather, getWeeklyWeather, type HourlyWeather, type DailyWeather } from '@/lib/weatherService';
import {
  generateAISchedule,
  exportScheduleToCSV,
  getWeekStartDate,
  getWeekDates,
  MOCK_EMPLOYEES
} from '@/lib/schedulingService';
import { getEventsForDateRange, getHighImpactEventsInNext } from '@/lib/specialEvents';
import type { Employee, Schedule, SpecialEvent } from '@/lib/schedulingTypes';
import { storageService } from '@/lib/storageService';
import { analyticsService } from '@/lib/analyticsService';

// --- ADD THESE TYPE DEFINITIONS ---
interface Forecast {
  hourly_forecast: { hour: number; predicted_orders: number; confidence: string }[];
  peak_hours: string[];
  actions: string[];
  weather_impact: string;
  revenue_estimate: number;
}

interface WeeklyForecast {
  daily_forecasts: {
    day: string;
    date: string;
    predicted_orders: number;
    revenue_estimate: number;
    peak_window: string;
    weather_impact: string;
    key_note: string;
  }[];
  week_summary: {
    total_orders: number;
    total_revenue: number;
    busiest_day: string;
    prep_priorities: string[];
  };
}

interface InventoryPlan {
  buy_list: { ingredient: string; quantity: number; unit: string; priority: string; reason: string }[];
  prep_tasks: string[];
  status: string;
  cost_estimate: number;
}

interface Promo {
  offer_name: string;
  copy_short: string;
  copy_email: string;
  discount: string;
  target_lift: string;
}
// --- END OF TYPE DEFINITIONS ---

const MOCK_DATA = {
  sales_history: [
    { date: "2025-11-20", hour: 17, sku: "Pepperoni", orders: 18, price: 14.00 },
    { date: "2025-11-20", hour: 18, sku: "Pepperoni", orders: 23, price: 14.00 },
    { date: "2025-11-20", hour: 18, sku: "Margherita", orders: 17, price: 12.00 },
    { date: "2025-11-20", hour: 19, sku: "Pepperoni", orders: 28, price: 14.00 },
    { date: "2025-11-20", hour: 19, sku: "Supreme", orders: 15, price: 16.00 },
    { date: "2025-11-20", hour: 20, sku: "Margherita", orders: 12, price: 12.00 }
  ],
  inventory: [
    { ingredient: "Mozzarella", unit: "lb", on_hand: 20, par_level: 40 },
    { ingredient: "Pepperoni", unit: "lb", on_hand: 8, par_level: 25 },
    { ingredient: "Dough", unit: "balls", on_hand: 45, par_level: 80 },
    { ingredient: "Tomato Sauce", unit: "qt", on_hand: 6, par_level: 12 },
    { ingredient: "Vegetables", unit: "lb", on_hand: 15, par_level: 20 }
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  // --- USE GENERICS FOR STATE VARIABLES ---
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [weeklyForecast, setWeeklyForecast] = useState<WeeklyForecast | null>(null);
  const [inventoryPlan, setInventoryPlan] = useState<InventoryPlan | null>(null);
  const [promo, setPromo] = useState<Promo | null>(null);
  // -----------------------------------------
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('today'); // 'today' or 'week'
  const [prepMode, setPrepMode] = useState(false);
  const [inventoryInputs, setInventoryInputs] = useState<Record<string, number>>(

    MOCK_DATA.inventory.reduce((acc, item) => ({
      ...acc,
      [item.ingredient]: item.on_hand
    }), {})
  );
  const [promoSettings, setPromoSettings] = useState({
    tone: 'classic',
    channel: 'email'
  });

  // Weather data state
  const [hourlyWeather, setHourlyWeather] = useState<HourlyWeather[]>(MOCK_DATA.weather);
  const [weeklyWeather, setWeeklyWeather] = useState<DailyWeather[]>(MOCK_DATA.weekly_weather);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Scheduling state
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<SpecialEvent[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather data on component mount
  useEffect(() => {
    const fetchWeatherData = async () => {
      setWeatherLoading(true);
      try {
        const [hourly, weekly] = await Promise.all([
          getHourlyWeather(),
          getWeeklyWeather()
        ]);
        setHourlyWeather(hourly);
        setWeeklyWeather(weekly);
      } catch (error) {
        console.error('Error loading weather data:', error);
        // Keep using mock data as fallback
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeatherData();
  }, []);

  const generateForecast = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are PizzAI, an operations assistant for a pizzeria. Analyze this data and provide a forecast.

Sales History: ${JSON.stringify(MOCK_DATA.sales_history)}
Weather Forecast: ${JSON.stringify(hourlyWeather)}
Prep Mode: ${prepMode ? 'Focus on morning prep tasks' : 'Standard mode'}

Generate a JSON response with:
{
  "hourly_forecast": [{"hour": 17, "predicted_orders": 25, "confidence": "high"}],
  "peak_hours": ["6 PM - 8 PM"],
  "actions": ["Action item 1", "Action item 2"],
  "weather_impact": "Brief analysis",
  "revenue_estimate": 850
}

${prepMode ? 'Include specific morning prep tasks in actions array.' : ''}

Respond with ONLY the JSON object, no markdown or explanation.`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.map((item: any) => item.text || "").join("\n").trim();
      const cleanText = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      setForecast(parsed);

      // Save forecast to localStorage
      storageService.saveForecast(parsed, 'daily');
    } catch (err) {
      console.error("Forecast error:", err);
      const fallbackForecast = {
        hourly_forecast: [
          { hour: 17, predicted_orders: 22, confidence: "medium" },
          { hour: 18, predicted_orders: 35, confidence: "high" },
          { hour: 19, predicted_orders: 42, confidence: "high" },
          { hour: 20, predicted_orders: 28, confidence: "medium" }
        ],
        peak_hours: ["6 PM - 8 PM"],
        actions: prepMode ? [
          "Start dough proofing by 10 AM for evening service",
          "Prep 50 dough balls for tonight's rush",
          "Pre-portion pepperoni for peak efficiency",
          "Check sauce inventory and prep stations"
        ] : [
          "Prepare extra dough for evening rush",
          "Stock pepperoni - highest demand item",
          "Weather may reduce foot traffic by 15%"
        ],
        weather_impact: "Light rain expected during peak hours may slightly reduce walk-in traffic",
        revenue_estimate: 1680
      };
      setForecast(fallbackForecast);

      // Save fallback forecast to localStorage
      storageService.saveForecast(fallbackForecast, 'daily');
    }
    setLoading(false);
  };

  const generateWeeklyForecast = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: `You are PizzAI. Generate a 7-day forecast for a pizzeria.

Historical Patterns:
- Weekday average: 80-100 orders
- Weekend (Fri-Sat): 150-180 orders
- Sunday: 120-140 orders

Weekly Weather: ${JSON.stringify(weeklyWeather)}

Generate a JSON response with:
{
  "daily_forecasts": [
    {
      "day": "Thu",
      "date": "11/21",
      "predicted_orders": 95,
      "revenue_estimate": 1300,
      "peak_window": "6-8 PM",
      "weather_impact": "moderate",
      "key_note": "Brief insight"
    }
  ],
  "week_summary": {
    "total_orders": 850,
    "total_revenue": 11500,
    "busiest_day": "Saturday",
    "prep_priorities": ["Priority 1", "Priority 2"]
  }
}

Respond with ONLY the JSON object.`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.map((item: any) => item.text || "").join("\n").trim();
      const cleanText = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      setWeeklyForecast(parsed);

      // Save weekly forecast to localStorage
      storageService.saveForecast(parsed, 'weekly');
    } catch (err) {
      console.error("Weekly forecast error:", err);
      const fallbackWeekly = {
        daily_forecasts: [
          { day: "Thu", date: "11/21", predicted_orders: 85, revenue_estimate: 1190, peak_window: "6-8 PM", weather_impact: "moderate", key_note: "Rain may reduce walk-ins" },
          { day: "Fri", date: "11/22", predicted_orders: 165, revenue_estimate: 2310, peak_window: "7-9 PM", weather_impact: "low", key_note: "Strong weekend start expected" },
          { day: "Sat", date: "11/23", predicted_orders: 180, revenue_estimate: 2520, peak_window: "6-9 PM", weather_impact: "none", key_note: "Peak weekend day - full prep needed" },
          { day: "Sun", date: "11/24", predicted_orders: 130, revenue_estimate: 1820, peak_window: "5-7 PM", weather_impact: "low", key_note: "Family dinner rush expected" },
          { day: "Mon", date: "11/25", predicted_orders: 75, revenue_estimate: 1050, peak_window: "6-7 PM", weather_impact: "moderate", key_note: "Quiet start to week" },
          { day: "Tue", date: "11/26", predicted_orders: 90, revenue_estimate: 1260, peak_window: "6-8 PM", weather_impact: "none", key_note: "Good promo opportunity" },
          { day: "Wed", date: "11/27", predicted_orders: 140, revenue_estimate: 1960, peak_window: "5-8 PM", weather_impact: "none", key_note: "Pre-holiday boost expected" }
        ],
        week_summary: {
          total_orders: 865,
          total_revenue: 12110,
          busiest_day: "Saturday",
          prep_priorities: [
            "Heavy weekend prep Thursday/Friday",
            "Monitor dough inventory for Saturday rush",
            "Plan promotional campaign for Monday-Tuesday slow days"
          ]
        }
      };
      setWeeklyForecast(fallbackWeekly);

      // Save fallback weekly forecast to localStorage
      storageService.saveForecast(fallbackWeekly, 'weekly');
    }
    setLoading(false);
  };

  const generateInventoryPlan = async () => {
    setLoading(true);
    try {
      const currentInventory = MOCK_DATA.inventory.map(item => ({
        ...item,
        on_hand: inventoryInputs[item.ingredient]
      }));

      const weekContext = weeklyForecast ? `Weekly demand: ${weeklyForecast.week_summary.total_orders} orders` : 'Single day planning';

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are PizzAI inventory planner. Analyze current inventory vs par levels and forecast demand.

Current Inventory: ${JSON.stringify(currentInventory)}
Context: ${weekContext}
Predicted Evening Rush: 40-45 orders

Generate a JSON response with:
{
  "buy_list": [{"ingredient": "Item", "quantity": 20, "unit": "lb", "priority": "high", "reason": "Brief reason"}],
  "prep_tasks": ["Task 1", "Task 2"],
  "status": "overall status",
  "cost_estimate": 450
}

Respond with ONLY the JSON object, no markdown.`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.map((item: any) => item.text || "").join("\n").trim();
      const cleanText = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      setInventoryPlan(parsed);
    } catch (err) {
      console.error("Inventory error:", err);
      setInventoryPlan({
        buy_list: [
          { ingredient: "Mozzarella", quantity: 20, unit: "lb", priority: "high", reason: "Below par level, need for evening rush" },
          { ingredient: "Pepperoni", quantity: 17, unit: "lb", priority: "critical", reason: "Critically low, top-selling item" },
          { ingredient: "Dough", quantity: 35, unit: "balls", priority: "medium", reason: "Prepare for tomorrow morning" }
        ],
        prep_tasks: [
          "Proof dough for evening service (2-hour lead time)",
          "Prep vegetable toppings for rush period",
          "Check sauce levels for weekend"
        ],
        status: "Action needed on 2 critical items",
        cost_estimate: 380
      });
    }
    setLoading(false);
  };

  const generatePromo = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are PizzAI promo studio. Create a promotional email for a slow period.

Context:
- Slow window: 5 PM - 6 PM today
- Top SKUs: Pepperoni, Margherita
- Tone: ${promoSettings.tone}
- Channel: ${promoSettings.channel}

Generate a JSON response with:
{
  "offer_name": "Campaign name",
  "copy_short": "Brief tagline",
  "copy_email": "Full email body text (2-3 sentences)",
  "discount": "Offer details",
  "target_lift": "15%"
}

Use minimal or no emojis. Professional tone. Respond with ONLY the JSON object.`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.map((item: any) => item.text || "").join("\n").trim();
      const cleanText = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      setPromo(parsed);
    } catch (err) {
      console.error("Promo error:", err);
      setPromo({
        offer_name: "Early Bird Special",
        copy_short: "Beat the rush, save on dinner",
        copy_email: "Order between 5-6 PM today and receive 15% off your entire order. Our classic Pepperoni and Margherita pizzas are made fresh to order. Perfect timing to skip the evening rush.",
        discount: "15% off orders placed 5-6 PM",
        target_lift: "20%"
      });
    }
    setLoading(false);
  };

  const generateSchedule = async () => {
    setScheduleLoading(true);
    try {
      // Get current week's Monday
      const weekStart = getWeekStartDate(new Date());
      const weekDates = getWeekDates(weekStart);

      // Get events for the week
      const events = getEventsForDateRange(weekStart, weekDates[6]);
      setUpcomingEvents(events);

      // Get or generate weekly forecast if not available
      let weeklyData = weeklyForecast;
      if (!weeklyData) {
        await generateWeeklyForecast();
        weeklyData = weeklyForecast; // Use the newly generated forecast
      }

      // Prepare forecast data in the format needed for scheduling
      const forecastData = {
        daily: weekDates.map((date, index) => {
          const dayForecast = weeklyData?.daily_forecasts?.[index];
          return {
            date,
            predictedOrders: dayForecast?.predicted_orders || 100,
            revenueEstimate: dayForecast?.revenue_estimate || 1400,
            peakWindow: dayForecast?.peak_window || '6-8 PM',
          };
        }),
      };

      // Generate schedule
      const result = await generateAISchedule({
        weekStartDate: weekStart,
        employees,
        forecasts: forecastData,
        specialEvents: events,
        constraints: {
          maxLaborCostPercent: 30, // Target 30% labor cost
          minCoverage: {
            cook: 1,
            server: 1,
            delivery: 1,
            prep: 1,
            manager: 1,
          },
          preferredShiftLengths: {
            min: 4,
            max: 8,
          },
        },
      });

      setCurrentSchedule(result.schedule);

      // Save schedule to localStorage
      storageService.saveSchedule(result.schedule);
    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleExportSchedule = () => {
    if (!currentSchedule) return;
    const csv = exportScheduleToCSV(currentSchedule, employees);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule_${currentSchedule.weekStartDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const WeatherIcon = ({ condition }) => {
    if (condition.includes('Rain')) return <CloudRain className="w-5 h-5 text-blue-500" />;
    if (condition.includes('Cloud')) return <Cloud className="w-5 h-5 text-gray-500" />;
    return <Sun className="w-5 h-5 text-yellow-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 page-transition">
      <div className="max-w-7xl mx-auto p-6">
        <header className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 rounded-2xl shadow-2xl p-8 mb-6 relative overflow-hidden animate-fade-in-down">
          <div className="absolute inset-0 bg-black opacity-5"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-full p-3 shadow-2xl transform transition-transform duration-300 hover:scale-110 hover:rotate-12 cursor-pointer">
                <Pizza className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black text-white tracking-tight text-shadow-lg">PizzAI</h1>
                  <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse-soft" />
                </div>
                <p className="text-red-100 mt-1 font-medium text-lg">AI-Powered Restaurant Operations Platform</p>
              </div>
            </div>
            <div className="glass text-right rounded-xl px-6 py-3 shadow-lg transform transition-all duration-300 hover:scale-105">
              <div className="text-lg font-bold text-white text-shadow">
                {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <div className="transform transition-transform duration-300 hover:scale-125 hover:rotate-12">
                  <WeatherIcon condition={hourlyWeather[0]?.condition || 'Sunny'} />
                </div>
                <span className="text-sm text-white font-medium">
                  {hourlyWeather[0]?.temp_f || '--'}°F - {hourlyWeather[0]?.condition || 'Loading...'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden border border-red-100 animate-fade-in">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-orange-50">
            <nav className="flex">
              {['dashboard', 'scheduler', 'inventory', 'promo', 'history'].map((tab, index) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  className={`px-8 py-4 font-bold capitalize transition-all duration-300 transform hover:scale-105 animate-fade-in ${
                    activeTab === tab
                      ? 'border-b-4 border-red-600 text-red-600 bg-white shadow-sm'
                      : 'text-gray-600 hover:text-red-600 hover:bg-white/50'
                  }`}
                >
                  {tab === 'inventory' ? 'Inventory Planner' :
                   tab === 'promo' ? 'Promo Studio' :
                   tab === 'scheduler' ? 'Staff Scheduler' :
                   tab === 'history' ? 'History & Analytics' : tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6 tab-content">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-900">Operations Forecast</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('today')}
                        className={`px-4 py-2 rounded-lg transition-all duration-300 font-semibold transform hover:scale-105 active:scale-95 ${
                          viewMode === 'today' ? 'bg-red-600 text-white shadow-lg' : 'btn-secondary'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setViewMode('week')}
                        className={`px-4 py-2 rounded-lg transition-all duration-300 font-semibold transform hover:scale-105 active:scale-95 ${
                          viewMode === 'week' ? 'bg-red-600 text-white shadow-lg' : 'btn-secondary'
                        }`}
                      >
                        7-Day
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setPrepMode(!prepMode)}
                      className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-semibold transform hover:scale-105 active:scale-95 ${
                        prepMode ? 'bg-green-600 text-white shadow-lg' : 'btn-secondary hover:border-green-200 hover:bg-green-50'
                      }`}
                    >
                      <Clock className={`w-4 h-4 ${prepMode ? 'animate-pulse-soft' : ''}`} />
                      {prepMode ? 'Prep Mode On' : 'Prep Mode'}
                    </button>
                    <button
                      onClick={viewMode === 'today' ? generateForecast : generateWeeklyForecast}
                      disabled={loading}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {loading ? 'Generating...' : `Generate ${viewMode === 'today' ? 'Forecast' : 'Weekly Forecast'}`}
                    </button>
                  </div>
                </div>

                {viewMode === 'today' && forecast && (
                  <>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="stat-card bg-blue-50 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                          <TrendingUp className="w-5 h-5 transform transition-transform duration-300 group-hover:scale-110" />
                          <span className="font-semibold">Peak Hours</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{forecast.peak_hours[0]}</p>
                      </div>
                      <div className="stat-card bg-green-50 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center gap-2 text-green-700 mb-2">
                          <CheckCircle className="w-5 h-5 transform transition-transform duration-300 group-hover:scale-110" />
                          <span className="font-semibold">Orders</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">
                          {forecast.hourly_forecast.reduce((sum, h) => sum + h.predicted_orders, 0)}
                        </p>
                      </div>
                      <div className="stat-card bg-purple-50 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <div className="flex items-center gap-2 text-purple-700 mb-2">
                          <DollarSign className="w-5 h-5 transform transition-transform duration-300 group-hover:scale-110" />
                          <span className="font-semibold">Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">${forecast.revenue_estimate}</p>
                      </div>
                      <div className="stat-card bg-amber-50 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                        <div className="flex items-center gap-2 text-amber-700 mb-2">
                          <AlertCircle className="w-5 h-5 transform transition-transform duration-300 group-hover:scale-110" />
                          <span className="font-semibold">Weather</span>
                        </div>
                        <p className="text-sm text-amber-900">{forecast.weather_impact.substring(0, 30)}...</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Hourly Demand Forecast</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={forecast.hourly_forecast}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                          <YAxis label={{ value: 'Orders', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Bar dataKey="predicted_orders" fill="#3b82f6" name="Predicted Orders" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        {prepMode ? 'Morning Prep Checklist' : 'Recommended Actions'}
                      </h3>
                      <ul className="space-y-3">
                        {forecast.actions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {viewMode === 'week' && weeklyForecast && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                          <Calendar className="w-5 h-5" />
                          <span className="font-semibold">Total Orders</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{weeklyForecast.week_summary.total_orders}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-700 mb-2">
                          <DollarSign className="w-5 h-5" />
                          <span className="font-semibold">Week Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">${weeklyForecast.week_summary.total_revenue.toLocaleString()}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-purple-700 mb-2">
                          <TrendingUp className="w-5 h-5" />
                          <span className="font-semibold">Busiest Day</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">{weeklyForecast.week_summary.busiest_day}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">7-Day Forecast Overview</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={weeklyForecast.daily_forecasts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis yAxisId="left" label={{ value: 'Orders', angle: -90, position: 'insideLeft' }} />
                          <YAxis yAxisId="right" orientation="right" label={{ value: 'Revenue ($)', angle: 90, position: 'insideRight' }} />
                          <Tooltip />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="predicted_orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
                          <Line yAxisId="right" type="monotone" dataKey="revenue_estimate" stroke="#10b981" strokeWidth={2} name="Revenue" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {weeklyForecast.daily_forecasts.map((day, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <p className="text-sm text-gray-500">{day.date}</p>
                                <p className="text-xl font-bold text-gray-900">{day.day}</p>
                              </div>
                              <div className="h-12 w-px bg-gray-200"></div>
                              <div className="flex items-center gap-6">
                                <div>
                                  <p className="text-sm text-gray-500">Orders</p>
                                  <p className="text-lg font-bold text-blue-900">{day.predicted_orders}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Revenue</p>
                                  <p className="text-lg font-bold text-green-900">${day.revenue_estimate}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Peak</p>
                                  <p className="text-lg font-semibold text-gray-900">{day.peak_window}</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right max-w-md">
                              <p className="text-sm text-gray-700">{day.key_note}</p>
                              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                day.weather_impact === 'none' ? 'bg-green-100 text-green-800' :
                                day.weather_impact === 'low' ? 'bg-blue-100 text-blue-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {day.weather_impact} weather impact
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Week Prep Priorities</h3>
                      <ul className="space-y-3">
                        {weeklyForecast.week_summary.prep_priorities.map((priority, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{priority}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {!forecast && !weeklyForecast && (
                  <div className="text-center py-12 text-gray-500">
                    Select a view mode and click "Generate" to analyze operations
                  </div>
                )}
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Inventory Planning</h2>
                  <button
                    onClick={generateInventoryPlan}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-400 transition-all shadow-lg font-semibold"
                  >
                    {loading ? 'Analyzing...' : 'Generate Plan'}
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Current Inventory Levels</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {MOCK_DATA.inventory.map((item) => (
                      <div key={item.ingredient} className="bg-white rounded-lg p-4 border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {item.ingredient} ({item.unit})
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="number"
                            value={inventoryInputs[item.ingredient]}
                            onChange={(e) => setInventoryInputs({
                              ...inventoryInputs,
                              [item.ingredient]: parseInt(e.target.value) || 0
                            })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <span className="text-sm text-gray-500">Par: {item.par_level}</span>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (inventoryInputs[item.ingredient] / item.par_level) < 0.5 ? 'bg-red-600' :
                                (inventoryInputs[item.ingredient] / item.par_level) < 0.8 ? 'bg-yellow-600' :
                                'bg-green-600'
                              }`}
                              style={{ width: `${Math.min((inventoryInputs[item.ingredient] / item.par_level) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {inventoryPlan && (
                  <>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-center">
                      <p className="text-red-900 font-semibold">{inventoryPlan.status}</p>
                      <div className="text-right">
                        <p className="text-sm text-red-700">Estimated Cost</p>
                        <p className="text-xl font-bold text-red-900">${inventoryPlan.cost_estimate}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Priority Buy List</h3>
                      <div className="space-y-3">
                        {inventoryPlan.buy_list.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                  item.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                  item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {item.priority.toUpperCase()}
                                </span>
                                <span className="font-semibold text-gray-900">{item.ingredient}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{item.reason}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-gray-900">{item.quantity} {item.unit}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Prep Tasks</h3>
                      <ul className="space-y-3">
                        {inventoryPlan.prep_tasks.map((task, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {!inventoryPlan && (
                  <div className="text-center py-12 text-gray-500">
                    Update inventory levels and click "Generate Plan"
                  </div>
                )}
              </div>
            )}

            {activeTab === 'scheduler' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Staff Scheduler</h2>
                  <div className="flex gap-3">
                    {currentSchedule && (
                      <button
                        onClick={handleExportSchedule}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                      >
                        Export CSV
                      </button>
                    )}
                    <button
                      onClick={generateSchedule}
                      disabled={scheduleLoading}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {scheduleLoading ? 'Generating...' : 'Generate Schedule'}
                    </button>
                  </div>
                </div>

                {/* Upcoming Events Alert */}
                {upcomingEvents.length > 0 && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-amber-900">Upcoming Special Events</h3>
                        <div className="mt-2 space-y-1">
                          {upcomingEvents.map((event) => (
                            <div key={event.id} className="text-sm text-amber-800">
                              <span className="font-medium">{event.name}</span> on {new Date(event.date).toLocaleDateString()} -
                              <span className={`ml-1 font-semibold ${
                                event.impact === 'very_high' ? 'text-red-600' :
                                event.impact === 'high' ? 'text-orange-600' :
                                'text-yellow-600'
                              }`}>
                                {event.impactMultiplier}x demand
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Employee Summary */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Staff Overview</h3>
                  <div className="grid grid-cols-5 gap-4">
                    {['cook', 'server', 'delivery', 'prep', 'manager'].map((role) => {
                      const count = employees.filter((emp) => emp.role === role && emp.active).length;
                      return (
                        <div key={role} className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-2xl font-bold text-gray-900">{count}</div>
                          <div className="text-sm text-gray-600 capitalize">{role}s</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule Display */}
                {currentSchedule ? (
                  <>
                    {/* Labor Cost Summary */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-blue-700 mb-1">Total Hours</div>
                        <div className="text-2xl font-bold text-blue-900">{currentSchedule.totalLaborHours}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-green-700 mb-1">Labor Cost</div>
                        <div className="text-2xl font-bold text-green-900">${currentSchedule.totalLaborCost.toFixed(0)}</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-purple-700 mb-1">Projected Revenue</div>
                        <div className="text-2xl font-bold text-purple-900">${currentSchedule.projectedRevenue.toFixed(0)}</div>
                      </div>
                      <div className={`rounded-lg p-4 ${
                        currentSchedule.laborPercentage <= 30 ? 'bg-green-50' :
                        currentSchedule.laborPercentage <= 35 ? 'bg-yellow-50' :
                        'bg-red-50'
                      }`}>
                        <div className={`text-sm mb-1 ${
                          currentSchedule.laborPercentage <= 30 ? 'text-green-700' :
                          currentSchedule.laborPercentage <= 35 ? 'text-yellow-700' :
                          'text-red-700'
                        }`}>Labor %</div>
                        <div className={`text-2xl font-bold ${
                          currentSchedule.laborPercentage <= 30 ? 'text-green-900' :
                          currentSchedule.laborPercentage <= 35 ? 'text-yellow-900' :
                          'text-red-900'
                        }`}>{currentSchedule.laborPercentage.toFixed(1)}%</div>
                      </div>
                    </div>

                    {/* Weekly Schedule Grid */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-semibold">
                          Week of {new Date(currentSchedule.weekStartDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                              {getWeekDates(currentSchedule.weekStartDate).map((date) => (
                                <th key={date} className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                                  <div>{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                  <div className="text-xs text-gray-500">{new Date(date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</div>
                                </th>
                              ))}
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Hours</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {employees.filter(emp => emp.active).map((employee) => {
                              const employeeShifts = currentSchedule.shifts.filter((s) => s.employeeId === employee.id);
                              const weekDates = getWeekDates(currentSchedule.weekStartDate);
                              const totalHours = employeeShifts.reduce((sum, shift) => {
                                const [startH, startM] = shift.startTime.split(':').map(Number);
                                const [endH, endM] = shift.endTime.split(':').map(Number);
                                return sum + (endH - startH + (endM - startM) / 60);
                              }, 0);

                              if (employeeShifts.length === 0) return null;

                              return (
                                <tr key={employee.id} className="hover:bg-gray-50 transition-colors duration-200">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{employee.name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{employee.role}</td>
                                  {weekDates.map((date) => {
                                    const shift = employeeShifts.find((s) => s.date === date);
                                    return (
                                      <td key={date} className="px-2 py-3 text-center">
                                        {shift ? (
                                          <div className="text-xs bg-blue-100 text-blue-900 rounded px-2 py-1">
                                            <div className="font-semibold">{shift.startTime}-{shift.endTime}</div>
                                            <div className="text-[10px] text-blue-700 capitalize">{shift.shiftType.replace('_', ' ')}</div>
                                          </div>
                                        ) : (
                                          <span className="text-gray-300">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                                    {totalHours.toFixed(1)}h
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Daily Breakdown */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Daily Coverage</h3>
                      <div className="grid grid-cols-7 gap-3">
                        {getWeekDates(currentSchedule.weekStartDate).map((date) => {
                          const dayShifts = currentSchedule.shifts.filter((s) => s.date === date);
                          const uniqueStaff = new Set(dayShifts.map((s) => s.employeeId)).size;
                          const totalHours = dayShifts.reduce((sum, shift) => {
                            const [startH, startM] = shift.startTime.split(':').map(Number);
                            const [endH, endM] = shift.endTime.split(':').map(Number);
                            return sum + (endH - startH + (endM - startM) / 60);
                          }, 0);

                          return (
                            <div key={date} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="text-sm font-semibold text-gray-900 mb-2">
                                {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                              </div>
                              <div className="space-y-1 text-xs text-gray-600">
                                <div>{uniqueStaff} staff</div>
                                <div>{totalHours.toFixed(1)} hours</div>
                                <div className="text-[10px] text-gray-500">
                                  {dayShifts.filter(s => s.role === 'cook').length}C {dayShifts.filter(s => s.role === 'server').length}S {dayShifts.filter(s => s.role === 'delivery').length}D
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">Click "Generate Schedule" to create an AI-optimized staff schedule</p>
                    <p className="text-sm mt-2">Schedule will account for demand forecasts, weather, and special events</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'promo' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Promotional Campaign Studio</h2>
                  <button
                    onClick={generatePromo}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-400 transition-all shadow-lg font-semibold"
                  >
                    {loading ? 'Generating...' : 'Generate Promo'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                    <select
                      value={promoSettings.tone}
                      onChange={(e) => setPromoSettings({ ...promoSettings, tone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="classic">Classic</option>
                      <option value="casual">Casual</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
                    <select
                      value={promoSettings.channel}
                      onChange={(e) => setPromoSettings({ ...promoSettings, channel: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="email">Email</option>
                      <option value="social">Social Media</option>
                    </select>
                  </div>
                </div>

                {promo && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 p-6 text-white relative overflow-hidden">
                      <div className="absolute inset-0 bg-black opacity-5"></div>
                      <div className="relative z-10">
                        <h3 className="text-2xl font-bold">{promo.offer_name}</h3>
                        <p className="text-red-100 mt-2 text-lg">{promo.copy_short}</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="mb-4 flex justify-between items-center">
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          {promo.discount}
                        </span>
                        <span className="text-sm text-gray-600">Expected Lift: {promo.target_lift}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{promo.copy_email}</p>
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-500">Ready to send via {promoSettings.channel}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!promo && (
                  <div className="text-center py-12 text-gray-500">
                    Configure settings and click "Generate Promo" to create a campaign
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PizzAIDashboard;
