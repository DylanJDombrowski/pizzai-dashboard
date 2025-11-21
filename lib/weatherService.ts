// Weather API Service using OpenWeatherMap
// API Documentation: https://openweathermap.org/api

export interface HourlyWeather {
  date: string;
  hour: number;
  temp_f: number;
  precip_chance: number;
  condition: string;
}

export interface DailyWeather {
  day: string;
  date: string;
  temp: number;
  condition: string;
  precip: number;
}

interface OpenWeatherResponse {
  list: Array<{
    dt: number;
    dt_txt: string;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    pop: number; // Probability of precipitation
    clouds: {
      all: number;
    };
  }>;
}

/**
 * Converts Celsius to Fahrenheit
 */
function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9/5) + 32);
}

/**
 * Maps OpenWeatherMap condition codes to simplified conditions
 */
function mapWeatherCondition(weatherId: number, description: string): string {
  if (weatherId >= 200 && weatherId < 300) return 'Thunderstorm';
  if (weatherId >= 300 && weatherId < 400) return 'Drizzle';
  if (weatherId >= 500 && weatherId < 600) {
    if (weatherId === 500 || weatherId === 501) return 'Light Rain';
    return 'Rain';
  }
  if (weatherId >= 600 && weatherId < 700) return 'Snow';
  if (weatherId >= 700 && weatherId < 800) return 'Fog';
  if (weatherId === 800) return 'Sunny';
  if (weatherId === 801 || weatherId === 802) return 'Cloudy';
  if (weatherId === 803 || weatherId === 804) return 'Overcast';
  return description;
}

/**
 * Fetches hourly weather forecast for the next 24 hours
 */
export async function getHourlyWeather(): Promise<HourlyWeather[]> {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  const lat = process.env.NEXT_PUBLIC_RESTAURANT_LAT || '40.7128';
  const lon = process.env.NEXT_PUBLIC_RESTAURANT_LON || '-74.0060';

  if (!apiKey) {
    console.warn('OpenWeatherMap API key not configured, using mock data');
    return getMockHourlyWeather();
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: OpenWeatherResponse = await response.json();

    // Get today's date for filtering
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Convert to our format - get next 8 readings (24 hours at 3-hour intervals)
    const hourlyData: HourlyWeather[] = data.list.slice(0, 8).map(item => {
      const dt = new Date(item.dt * 1000);
      const hour = dt.getHours();
      const dateStr = dt.toISOString().split('T')[0];

      return {
        date: dateStr,
        hour: hour,
        temp_f: celsiusToFahrenheit(item.main.temp),
        precip_chance: Math.round(item.pop * 100),
        condition: mapWeatherCondition(item.weather[0].id, item.weather[0].description)
      };
    });

    return hourlyData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return getMockHourlyWeather();
  }
}

/**
 * Fetches weekly weather forecast
 */
export async function getWeeklyWeather(): Promise<DailyWeather[]> {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  const lat = process.env.NEXT_PUBLIC_RESTAURANT_LAT || '40.7128';
  const lon = process.env.NEXT_PUBLIC_RESTAURANT_LON || '-74.0060';

  if (!apiKey) {
    console.warn('OpenWeatherMap API key not configured, using mock data');
    return getMockWeeklyWeather();
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: OpenWeatherResponse = await response.json();

    // Group by day and calculate daily averages
    const dailyMap = new Map<string, {
      temps: number[];
      precips: number[];
      conditions: string[];
      date: Date;
    }>();

    data.list.forEach(item => {
      const dt = new Date(item.dt * 1000);
      const dateKey = dt.toISOString().split('T')[0];

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          temps: [],
          precips: [],
          conditions: [],
          date: dt
        });
      }

      const dayData = dailyMap.get(dateKey)!;
      dayData.temps.push(item.main.temp);
      dayData.precips.push(item.pop * 100);
      dayData.conditions.push(mapWeatherCondition(item.weather[0].id, item.weather[0].description));
    });

    // Convert to daily format (take up to 7 days)
    const weeklyData: DailyWeather[] = Array.from(dailyMap.entries())
      .slice(0, 7)
      .map(([dateKey, data]) => {
        const avgTemp = data.temps.reduce((a, b) => a + b, 0) / data.temps.length;
        const maxPrecip = Math.max(...data.precips);
        // Use most common condition
        const condition = data.conditions.sort((a, b) =>
          data.conditions.filter(c => c === a).length - data.conditions.filter(c => c === b).length
        ).pop() || 'Cloudy';

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayOfWeek = dayNames[data.date.getDay()];
        const dateFormatted = `${data.date.getMonth() + 1}/${data.date.getDate()}`;

        return {
          day: dayOfWeek,
          date: dateFormatted,
          temp: celsiusToFahrenheit(avgTemp),
          condition: condition,
          precip: Math.round(maxPrecip)
        };
      });

    return weeklyData;
  } catch (error) {
    console.error('Error fetching weekly weather data:', error);
    return getMockWeeklyWeather();
  }
}

/**
 * Mock data fallback for hourly weather
 */
function getMockHourlyWeather(): HourlyWeather[] {
  return [
    { date: "2025-11-21", hour: 17, temp_f: 41, precip_chance: 70, condition: "Light Rain" },
    { date: "2025-11-21", hour: 18, temp_f: 40, precip_chance: 75, condition: "Light Rain" },
    { date: "2025-11-21", hour: 19, temp_f: 39, precip_chance: 65, condition: "Cloudy" },
    { date: "2025-11-21", hour: 20, temp_f: 38, precip_chance: 50, condition: "Cloudy" }
  ];
}

/**
 * Mock data fallback for weekly weather
 */
function getMockWeeklyWeather(): DailyWeather[] {
  return [
    { day: "Thu", date: "11/21", temp: 41, condition: "Rain", precip: 70 },
    { day: "Fri", date: "11/22", temp: 45, condition: "Cloudy", precip: 30 },
    { day: "Sat", date: "11/23", temp: 52, condition: "Sunny", precip: 10 },
    { day: "Sun", date: "11/24", temp: 48, condition: "Cloudy", precip: 20 },
    { day: "Mon", date: "11/25", temp: 43, condition: "Rain", precip: 60 },
    { day: "Tue", date: "11/26", temp: 50, condition: "Sunny", precip: 5 },
    { day: "Wed", date: "11/27", temp: 55, condition: "Sunny", precip: 5 }
  ];
}
