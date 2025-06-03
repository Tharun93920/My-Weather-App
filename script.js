// --- Configuration ---
const API_KEY = '1c26a079deeb9def11e5e94ebb75c960'; // Replace with your OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'; // Current weather API endpoint
const ICON_BASE_URL = 'https://openweathermap.org/img/wn/'; // For weather icons

// --- DOM Elements ---
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherDisplay = document.getElementById('weather-display');
const errorMessage = document.getElementById('error-message');

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
    // Clear previous messages
    weatherDisplay.innerHTML = ''; // Clear weather data
    errorMessage.style.display = 'none'; // Hide error message
    weatherDisplay.classList.remove('weather-info'); // Remove dynamic class if applied

    // Display a loading message
    weatherDisplay.innerHTML = '<p class="initial-message">Loading weather data...</p>';

    const url = `${BASE_URL}?q=${city}&appid=${API_KEY}&units=metric`; // units=metric for Celsius

    try {
        const response = await fetch(url);

        if (!response.ok) {
            // Handle HTTP errors (e.g., 404 for city not found, 401 for invalid API key)
            if (response.status === 404) {
                throw new Error('City not found. Please check the spelling.');
            } else if (response.status === 401) {
                throw new Error('Invalid API Key. Please check your OpenWeatherMap API key.');
            } else {
                throw new Error(`An error occurred: ${response.statusText}`);
            }
        }

        const data = await response.json();
        displayWeatherData(data);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        displayError(error.message || 'Failed to fetch weather data. Please try again.');
    }
}

function displayWeatherData(data) {
    // Hide initial message
    weatherDisplay.innerHTML = '';
    errorMessage.style.display = 'none'; // Ensure error is hidden

    // Extract necessary data
    const cityName = data.name;
    const temperature = Math.round(data.main.temp); // Round to nearest integer
    const description = data.weather[0].description;
    const iconCode = data.weather[0].icon;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed; // meters/sec by default for metric units

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
                    <i class="fas fa-tint"></i> Humidity: ${humidity}%
                </div>
                <div class="detail-item">
                    <i class="fas fa-wind"></i> Wind: ${windSpeed} m/s
                </div>
            </div>
        </div>
    `;

    weatherDisplay.innerHTML = weatherHtml;
}

function displayError(message) {
    weatherDisplay.innerHTML = ''; // Clear any previous weather info
    errorMessage.textContent = message;
    errorMessage.style.display = 'block'; // Show the error message
    // Optionally, clear the initial message if it's still there
    const initialMessage = document.querySelector('.initial-message');
    if (initialMessage) {
        initialMessage.remove();
    }
}

// Initial state: clear error message when page loads
document.addEventListener('DOMContentLoaded', () => {
    errorMessage.style.display = 'none';
});

// Add Font Awesome for icons (optional, but good for visual detail)
// You can put this link in your <head> section of index.html as well
const fontAwesomeLink = document.createElement('link');
fontAwesomeLink.rel = 'stylesheet';
fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
document.head.appendChild(fontAwesomeLink);