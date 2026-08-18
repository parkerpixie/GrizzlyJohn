(() => {
  const card = document.getElementById('weatherCard');
  if (!card) return;

  const button = document.getElementById('loadWeather');
  const status = document.getElementById('weatherStatus');
  const locationLabel = document.getElementById('weatherLocation');
  const condition = document.getElementById('weatherCondition');
  const temperature = document.getElementById('weatherTemp');
  const feelsLike = document.getElementById('weatherFeels');
  const highLow = document.getElementById('weatherHighLow');
  const rain = document.getElementById('weatherRain');
  const wind = document.getElementById('weatherWind');
  const details = document.getElementById('weatherDetails');
  const icon = document.getElementById('weatherIcon');

  const weatherCodes = {
    0: ['Clear skies', '☀️'],
    1: ['Mostly clear', '🌤️'],
    2: ['Partly cloudy', '⛅'],
    3: ['Overcast', '☁️'],
    45: ['Foggy', '🌫️'],
    48: ['Foggy', '🌫️'],
    51: ['Light drizzle', '🌦️'],
    53: ['Drizzle', '🌦️'],
    55: ['Heavy drizzle', '🌧️'],
    56: ['Freezing drizzle', '🌧️'],
    57: ['Freezing drizzle', '🌧️'],
    61: ['Light rain', '🌦️'],
    63: ['Rain', '🌧️'],
    65: ['Heavy rain', '🌧️'],
    66: ['Freezing rain', '🌧️'],
    67: ['Freezing rain', '🌧️'],
    71: ['Light snow', '🌨️'],
    73: ['Snow', '❄️'],
    75: ['Heavy snow', '❄️'],
    77: ['Snow grains', '❄️'],
    80: ['Rain showers', '🌦️'],
    81: ['Rain showers', '🌧️'],
    82: ['Heavy showers', '🌧️'],
    85: ['Snow showers', '🌨️'],
    86: ['Heavy snow showers', '❄️'],
    95: ['Thunderstorms', '⛈️'],
    96: ['Storms with hail', '⛈️'],
    99: ['Storms with hail', '⛈️']
  };

  function round(value) {
    return Number.isFinite(value) ? Math.round(value) : '—';
  }

  function setBusy(isBusy) {
    button.disabled = isBusy;
    button.textContent = isBusy ? 'Checking the sky…' : 'Update my weather';
    card.classList.toggle('is-loading', isBusy);
  }

  async function loadForecast(latitude, longitude) {
    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      temperature_unit: 'fahrenheit',
      wind_speed_unit: 'mph',
      timezone: 'auto',
      forecast_days: '1'
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) throw new Error('Weather service did not answer.');
    return response.json();
  }

  function renderWeather(data) {
    const current = data.current || {};
    const daily = data.daily || {};
    const [label, symbol] = weatherCodes[current.weather_code] || ['Weather doing weather things', '🌤️'];

    icon.textContent = symbol;
    condition.textContent = label;
    temperature.textContent = `${round(current.temperature_2m)}°`;
    feelsLike.textContent = `${round(current.apparent_temperature)}°`;
    highLow.textContent = `${round(daily.temperature_2m_max?.[0])}° / ${round(daily.temperature_2m_min?.[0])}°`;
    rain.textContent = `${round(daily.precipitation_probability_max?.[0])}%`;
    wind.textContent = `${round(current.wind_speed_10m)} mph`;
    locationLabel.textContent = 'Weather where John is right now';
    status.textContent = 'Updated from John’s current location.';
    details.hidden = false;
    button.textContent = 'Update my weather';
  }

  function requestWeather({ automatic = false } = {}) {
    if (!navigator.geolocation) {
      status.textContent = 'This device cannot share its location with the bear.';
      button.hidden = true;
      return;
    }

    setBusy(true);
    status.textContent = automatic ? 'Checking the trail outside…' : 'Finding John on the map…';

    navigator.geolocation.getCurrentPosition(async position => {
      try {
        localStorage.setItem('grizzlyjohn:weatherEnabled', 'true');
        const data = await loadForecast(position.coords.latitude, position.coords.longitude);
        renderWeather(data);
      } catch (error) {
        status.textContent = 'The weather wandered off. Try again in a minute.';
      } finally {
        setBusy(false);
      }
    }, error => {
      setBusy(false);
      if (error.code === 1) {
        status.textContent = 'Location is off. Turn it on if you want trail weather here.';
      } else {
        status.textContent = 'Couldn’t find John. Even bears lose the trail sometimes.';
      }
      button.textContent = 'Use my location';
    }, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 15 * 60 * 1000
    });
  }

  button.addEventListener('click', () => requestWeather());

  if (localStorage.getItem('grizzlyjohn:weatherEnabled') === 'true') {
    requestWeather({ automatic: true });
  }
})();
