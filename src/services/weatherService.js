// src/services/weatherService.js
import axios from 'axios';

// Replace with your actual API key from OpenWeatherMap or similar service
const API_KEY = 'YOUR_WEATHER_API_KEY';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Get current weather by city name
export const getCurrentWeather = async (city) => {
  try {
    const response = await axios.get(`${BASE_URL}/weather`, {
      params: {
        q: city,
        appid: API_KEY,
        units: 'metric' // or 'imperial' for Fahrenheit
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching current weather:', error);
    throw error;
  }
};

// Get 5-day forecast by city name
export const getForecast = async (city) => {
  try {
    const response = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        q: city,
        appid: API_KEY,
        units: 'metric'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching forecast:', error);
    throw error;
  }
};

// Get weather-based item recommendations
export const getWeatherBasedRecommendations = (weatherData) => {
  if (!weatherData) return [];
  
  const temp = weatherData.main.temp;
  const weather = weatherData.weather[0].main.toLowerCase();
  const recommendations = [];
  
  // Temperature-based recommendations
  if (temp < 5) {
    recommendations.push(
      { name: 'Heavy jacket', type: 'jacket', priority: 'high' },
      { name: 'Gloves', type: 'gloves', priority: 'high' },
      { name: 'Scarf', type: 'scarf', priority: 'medium' },
      { name: 'Thermal underwear', type: 'underwear', priority: 'medium' }
    );
  } else if (temp < 15) {
    recommendations.push(
      { name: 'Light jacket', type: 'jacket', priority: 'high' },
      { name: 'Long sleeve shirt', type: 'shirt', priority: 'medium' }
    );
  } else if (temp < 25) {
    recommendations.push(
      { name: 'Light sweater', type: 'shirt', priority: 'low' },
      { name: 'Sunglasses', type: 'sunglasses', priority: 'low' }
    );
  } else {
    recommendations.push(
      { name: 'T-shirt', type: 'shirt', priority: 'high' },
      { name: 'Sunglasses', type: 'sunglasses', priority: 'high' },
      { name: 'Sunscreen', type: 'default', priority: 'high' },
      { name: 'Hat', type: 'hat', priority: 'medium' }
    );
  }
  
  // Weather condition based recommendations
  if (weather.includes('rain')) {
    recommendations.push(
      { name: 'Umbrella', type: 'umbrella', priority: 'high' },
      { name: 'Waterproof jacket', type: 'jacket', priority: 'high' },
      { name: 'Waterproof shoes', type: 'shoes', priority: 'medium' }
    );
  } else if (weather.includes('snow')) {
    recommendations.push(
      { name: 'Snow boots', type: 'boots', priority: 'high' },
      { name: 'Waterproof gloves', type: 'gloves', priority: 'high' },
      { name: 'Thermal socks', type: 'socks', priority: 'medium' }
    );
  } else if (weather.includes('clear')) {
    if (temp > 20) {
      recommendations.push(
        { name: 'Sunscreen', type: 'default', priority: 'high' },
        { name: 'Water bottle', type: 'water', priority: 'high' }
      );
    }
  }
  
  return recommendations;
};