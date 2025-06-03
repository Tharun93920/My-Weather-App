const API_KEY = '1c26a079deeb9def11e5e94ebb75c960'; // Replace with your OpenWeatherMap API key
// Use the 5-day / 3-hour forecast API endpoint
const FORECAST_BASE_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const ICON_BASE_URL = 'https://openweathermap.org/img/wn/'; // For weather icons

// --- DOM Elements ---
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherDisplay = document.getElementById('weather-display');
const errorMessage = document.getElementById('error-message');
const forecastSection = document.getElementById('forecast-section');
const forecastContainer = document.getElementById('forecast-container');
const rainEffectContainer = document.getElementById('rain-effect');

// --- Event Listeners ---
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim(); // .trim() removes leading/trailing whitespace
    if (city) { // Check if city input is not empty
        getWeatherData(city);
    } else {
        displayError('Please enter a city name.');
    }
});

// Allow searching by pressing Enter key in the input field
cityInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        searchBtn.click(); // Simulate a click on the search button
    }
});

// --- Functions ---

async function getWeatherData(city) {
    // Clear previous messages and effects
    weatherDisplay.innerHTML = ''; // Clear current weather data
    forecastContainer.innerHTML = ''; // Clear forecast data
    errorMessage.style.display = 'none'; // Hide error message
    forecastSection.style.display = 'none'; // Hide forecast section
    weatherDisplay.classList.remove('weather-info'); // Remove dynamic class if applied
    stopRainEffect(); // Stop any existing rain effect

    // Display a loading message
    weatherDisplay.innerHTML = '<p class="initial-message">Loading weather data...</p>';

    const url = `${FORECAST_BASE_URL}?q=${city}&appid=${API_KEY}&units=metric`; // units=metric for Celsius

    try {
        const response = await fetch(url);
        const data = await response.json(); // Always try to parse JSON to get error details

        if (!response.ok) {
            // Handle HTTP errors (e.g., 404 for city not found, 401 for invalid API key)
            if (data.cod === '404') {
                throw new Error('City not found. Please check the spelling.');
            } else if (data.cod === '401') {
                throw new Error('Invalid API Key. Please check your OpenWeatherMap API key.');
            } else {
                throw new Error(data.message || `An error occurred: ${response.statusText}`);
            }
        }

        // OpenWeatherMap forecast API returns 'cod' as a string for success (e.g., "200")
        if (data.cod !== "200") {
             throw new Error(data.message || 'An error occurred with the weather data.');
        }

        // Process data for current weather and 5-day forecast
        displayCurrentWeather(data);
        displayFiveDayForecast(data);
        checkAndApplyRainEffect(data);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        displayError(error.message || 'Failed to fetch weather data. Please try again.');
        stopRainEffect(); // Ensure rain effect is off on error
    }
}

function displayCurrentWeather(data) {
    // The first entry in the forecast list is usually the most current
    const currentWeatherData = data.list[0];

    // Hide initial message
    weatherDisplay.innerHTML = '';
    errorMessage.style.display = 'none'; // Ensure error is hidden

    // Extract necessary data for current weather
    const cityName = data.city.name;
    const temperature = Math.round(currentWeatherData.main.temp); // Round to nearest integer
    const description = currentWeatherData.weather[0].description;
    const iconCode = currentWeatherData.weather[0].icon;
    const humidity = currentWeatherData.main.humidity;
    const windSpeed = currentWeatherData.wind.speed; // meters/sec by default for metric units

    const iconUrl = `${ICON_BASE_URL}${iconCode}@2x.png`; // @2x for higher resolution icon

    // Create HTML elements to display the data
    const weatherHtml = `
        <div class="weather-info">
            <h2 class="city-name">${cityName}</h2>
            <img src="${iconUrl}" alt="${description}" class="weather-icon">
            <p class="temperature">${temperature}°C</p>
            <p class="description">${description}</p>
            <div class="details">
                <div class="detail-item">
                    <i class="fas fa-tint"></i>
                    <span>Humidity: ${humidity}%</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-wind"></i>
                    <span>Wind: ${windSpeed} m/s</span>
                </div>
            </div>
        </div>
    `;

    weatherDisplay.innerHTML = weatherHtml;
}

function displayFiveDayForecast(data) {
    forecastContainer.innerHTML = ''; // Clear previous forecast cards
    forecastSection.style.display = 'block'; // Show the forecast section

    const dailyForecasts = {}; // Object to store daily aggregated data

    // Group forecast data by day
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000); // Convert timestamp to Date object
        const day = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }); // e.g., "Mon 3"

        if (!dailyForecasts[day]) {
            dailyForecasts[day] = {
                temps: [],
                descriptions: [],
                icons: [],
                pops: [] // Probability of precipitation
            };
        }
        dailyForecasts[day].temps.push(item.main.temp);
        dailyForecasts[day].descriptions.push(item.weather[0].description);
        dailyForecasts[day].icons.push(item.weather[0].icon);
        dailyForecasts[day].pops.push(item.pop);
    });

    // Get the next 5 unique days (excluding the current day if it's already passed first entry)
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    const sortedDays = Object.keys(dailyForecasts).sort((a, b) => {
        // Simple sorting by comparing the date part of the string, assumes format like "Mon 3"
        const dateA = new Date(new Date().getFullYear(), new Date().getMonth(), parseInt(a.split(' ')[1]));
        const dateB = new Date(new Date().getFullYear(), new Date().getMonth(), parseInt(b.split(' ')[1]));
        return dateA - dateB;
    });

    let daysCount = 0;
    for (const day of sortedDays) {
        // Skip the current day if it's the very first entry and we're looking for *next* 5 days
        // We'll show the current day's summary as the first forecast card.
        if (daysCount >= 5) break; // Display 5 cards in total

        const temps = dailyForecasts[day].temps;
        const minTemp = Math.round(Math.min(...temps));
        const maxTemp = Math.round(Math.max(...temps));

        // Find the most common description/icon for the day (or pick one from midday)
        // For simplicity, let's pick the icon/description from the midday forecast (around 12-3 PM)
        let representativeIcon = dailyForecasts[day].icons[0];
        let representativeDesc = dailyForecasts[day].descriptions[0];
        let representativePop = Math.max(...dailyForecasts[day].pops); // Max probability of precipitation for the day

        // Try to find a midday entry for better representation
        const middayEntry = data.list.find(item => {
            const itemDate = new Date(item.dt * 1000);
            return itemDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) === day &&
                   itemDate.getHours() >= 12 && itemDate.getHours() <= 15;
        });

        if (middayEntry) {
            representativeIcon = middayEntry.weather[0].icon;
            representativeDesc = middayEntry.weather[0].description;
            representativePop = middayEntry.pop;
        }


        const forecastCardHtml = `
            <div class="forecast-card">
                <div class="day">${day === today ? 'Today' : day}</div>
                <img src="${ICON_BASE_URL}${representativeIcon}@2x.png" alt="${representativeDesc}" class="forecast-icon">
                <div class="temp-range">${minTemp}°C / ${maxTemp}°C</div>
                <div class="forecast-desc">${representativeDesc}</div>
                <div class="rain-chance">Chance: ${Math.round(representativePop * 100)}%</div>
            </div>
        `;
        forecastContainer.innerHTML += forecastCardHtml;
        daysCount++;
    }
}

function displayError(message) {
    weatherDisplay.innerHTML = ''; // Clear any previous weather info
    forecastContainer.innerHTML = ''; // Clear forecast cards
    forecastSection.style.display = 'none'; // Hide forecast section
    errorMessage.textContent = message;
    errorMessage.style.display = 'block'; // Show the error message
    stopRainEffect(); // Ensure rain effect is off on error
    // Optionally, clear the initial message if it's still there
    const initialMessage = document.querySelector('.initial-message');
    if (initialMessage) {
        initialMessage.remove();
    }
}

// --- Rain Effect Logic ---
let rainInterval; // To store the interval ID for clearing
const RAINDROP_COUNT = 70; // Number of raindrops

function checkAndApplyRainEffect(data) {
    stopRainEffect(); // Clear any existing rain before checking

    // Check current weather conditions for rain
    const currentWeatherData = data.list[0];
    const isRainingNow = currentWeatherData.weather.some(w => w.main === 'Rain' || w.main === 'Drizzle');
    const highRainChanceNow = currentWeatherData.pop > 0.3; // 30% chance or more

    // Check if any of the next 5 days have a high chance of rain (e.g., > 40%)
    const dailyForecasts = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = { pops: [] };
        }
        dailyForecasts[date].pops.push(item.pop);
    });

    let rainComingInNext5Days = false;
    let daysChecked = 0;
    const todayDate = new Date().toLocaleDateString();

    for (const dateStr in dailyForecasts) {
        if (daysChecked >= 5) break; // Check up to 5 days
        if (dateStr === todayDate && !isRainingNow && !highRainChanceNow) {
            // If today is not raining and doesn't have high chance, skip it for *future* rain check
            // We already checked current conditions with isRainingNow and highRainChanceNow
            // This ensures we don't start rain if only a very low chance is there today
            continue;
        }

        const maxPopForDay = Math.max(...dailyForecasts[dateStr].pops);
        if (maxPopForDay > 0.4) { // If any of the next 5 days has > 40% chance of rain
            rainComingInNext5Days = true;
            break;
        }
        daysChecked++;
    }


    if (isRainingNow || highRainChanceNow || rainComingInNext5Days) {
        startRainEffect();
    }
}

function startRainEffect() {
    // Clear any existing raindrops first
    rainEffectContainer.innerHTML = '';

    for (let i = 0; i < RAINDROP_COUNT; i++) {
        const raindrop = document.createElement('div');
        raindrop.classList.add('raindrop');

        // Random position (x-axis)
        raindrop.style.left = `${Math.random() * 100}vw`;
        // Random animation duration for varied fall speeds
        raindrop.style.animationDuration = `${Math.random() * 1 + 0.5}s`; // 0.5 to 1.5 seconds
        // Random delay for staggered appearance
        raindrop.style.animationDelay = `${Math.random() * 5}s`; // 0 to 5 seconds delay
        // Random opacity for varied visibility
        raindrop.style.opacity = `${Math.random() * 0.5 + 0.5}`; // 0.5 to 1 opacity

        rainEffectContainer.appendChild(raindrop);
    }
    // The CSS animation handles the falling. No JS interval needed for falling.
    // We just need to ensure the container is visible.
}

function stopRainEffect() {
    rainEffectContainer.innerHTML = ''; // Remove all raindrops
}


// Initial state: clear error message and hide forecast section when page loads
document.addEventListener('DOMContentLoaded', () => {
    errorMessage.style.display = 'none';
    forecastSection.style.display = 'none';
    stopRainEffect(); // Ensure no rain on initial load
});
