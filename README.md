# PizzAI Dashboard

AI-Powered Restaurant Operations Platform for pizza restaurants, featuring demand forecasting, inventory planning, and promotional campaign generation powered by Claude AI.

## Features

- **Operations Dashboard**: Hourly and weekly demand forecasting with weather impact analysis
- **Staff Scheduler**: AI-powered employee scheduling with holiday/event awareness
- **Inventory Planner**: AI-generated buy lists and prep task recommendations
- **Promo Studio**: Automated promotional campaign generation for slow periods
- **Real-Time Weather**: Live weather data integration for accurate forecasting

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenWeatherMap API key (free tier available)
- Anthropic Claude API key (optional, for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pizzai-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.local.example .env.local
```

4. Edit `.env.local` and add your API keys and location:

```bash
# OpenWeatherMap API Key (Required for real weather data)
# Get your free API key at: https://openweathermap.org/api
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_api_key_here

# Restaurant Location (Required for weather data)
# Find your coordinates at: https://www.latlong.net/
NEXT_PUBLIC_RESTAURANT_LAT=40.7128
NEXT_PUBLIC_RESTAURANT_LON=-74.0060
NEXT_PUBLIC_RESTAURANT_CITY=New York

# Anthropic Claude API Key (Optional, for AI forecasting)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Getting API Keys

### OpenWeatherMap (Free)

1. Sign up at [https://openweathermap.org/api](https://openweathermap.org/api)
2. Navigate to "API keys" in your account
3. Copy your default API key (may take 10 minutes to activate)
4. Free tier includes: 1,000 API calls/day, 5-day forecast

### Finding Your Location Coordinates

1. Visit [https://www.latlong.net/](https://www.latlong.net/)
2. Search for your restaurant address
3. Copy the latitude and longitude values
4. Add them to your `.env.local` file

## Weather Integration

The dashboard automatically fetches real weather data on load and uses it for:
- Demand forecasting adjustments
- Peak hour predictions
- Revenue impact analysis
- Operational recommendations

Weather data is cached for 1 hour to optimize API usage. If the API key is not configured, the system falls back to mock weather data.

## Staff Scheduling

The AI-powered scheduler creates optimal weekly staff schedules based on multiple factors:

### Scheduling Features

- **Intelligent Staffing**: Matches labor hours to forecasted demand peaks
- **Holiday Awareness**: Automatically accounts for 30+ holidays and special events
  - Super Bowl Sunday (3.0x demand multiplier)
  - Major holidays (Valentine's Day, Halloween, New Year's Eve)
  - Sports events (March Madness, NFL Sundays)
  - Local events and custom dates
- **Event Impact**: Adjusts staffing for high-impact events
- **Labor Cost Management**: Targets 30% labor cost percentage
- **Role-Based Scheduling**: Ensures minimum coverage for cooks, servers, delivery, prep, and managers
- **Employee Availability**: Respects employee availability and max hours per week
- **CSV Export**: Download schedules for external systems

### Special Events Calendar

The system includes a comprehensive calendar of holidays and events with realistic demand multipliers:

- **Very High Impact** (2.0-3.0x): Super Bowl, New Year's Eve, Halloween
- **High Impact** (1.5-2.0x): Valentine's Day, July 4th, Black Friday, Christmas Eve
- **Moderate Impact** (1.2-1.5x): St. Patrick's Day, Mother's Day, Easter
- **Negative Impact** (0.3x): Thanksgiving Day (restaurant closing recommended)

You can add custom events for local festivals, concerts, or special promotions.

### How to Use

1. Navigate to the **Staff Scheduler** tab
2. Review your employee roster and upcoming special events
3. Click **Generate Schedule** to create an AI-optimized weekly schedule
4. Review the schedule grid showing:
   - Employee shifts across the week
   - Labor hours and cost analysis
   - Daily coverage breakdown
   - Labor cost percentage vs. projected revenue
5. Export schedule as CSV for payroll or external systems

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: React 18, Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **AI**: Anthropic Claude API
- **Weather**: OpenWeatherMap API

## Project Structure

```
pizzai-dashboard/
├── app/
│   ├── page.tsx              # Main dashboard component
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── lib/
│   ├── weatherService.ts     # Weather API integration
│   ├── schedulingTypes.ts    # TypeScript types for scheduling
│   ├── schedulingService.ts  # AI-powered schedule generation
│   └── specialEvents.ts      # Holiday and event calendar
├── .env.local.example        # Environment variable template
├── ROADMAP.md                # Development roadmap
└── README.md                 # This file
```

## Development Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features and development phases.

## License

Private - All rights reserved
