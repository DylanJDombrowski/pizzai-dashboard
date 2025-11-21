# PizzAI Dashboard

AI-Powered Restaurant Operations Platform for pizza restaurants, featuring demand forecasting, inventory planning, and promotional campaign generation powered by Claude AI.

## Features

- **Operations Dashboard**: Hourly and weekly demand forecasting with weather impact analysis
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
│   ├── page.tsx          # Main dashboard component
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── lib/
│   └── weatherService.ts # Weather API integration
├── .env.local.example    # Environment variable template
└── README.md             # This file
```

## Development Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features and development phases.

## License

Private - All rights reserved
