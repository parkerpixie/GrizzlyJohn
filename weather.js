(() => {
  const card = document.getElementById('weatherCard');
  if (!card) return;

  const button = document.getElementById('loadWeather');
  const changeLocationButton = document.getElementById('changeWeatherLocation');
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
    0: ['Clear skies', '☀️'], 1: ['Mostly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
    45: ['Foggy', '🌫️'], 48: ['Foggy', '🌫️'], 51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'],
    55: ['Heavy drizzle', '🌧️'], 56: ['Freezing drizzle', '🌧️'], 57: ['Freezing drizzle', '🌧️'], 61: ['Light rain', '🌦️'],
    63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'], 66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'],
    71: ['Light snow', '🌨️'], 73: ['Snow', '❄️'], 75: ['Heavy snow', '❄️'], 77: ['Snow grains', '❄️'],
    80: ['Rain showers', '🌦️'], 81: ['Rain showers', '🌧️'], 82: ['Heavy showers', '🌧️'], 85: ['Snow showers', '🌨️'],
    86: ['Heavy snow showers', '❄️'], 95: ['Thunderstorms', '⛈️'], 96: ['Storms with hail', '⛈️'], 99: ['Storms with hail', '⛈️']
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
      latitude: latitude.toFixed(4), longitude: longitude.toFixed(4),
      current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      hourly: 'temperature_2m,weather_code,precipitation_probability',
      temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', timezone: 'auto', forecast_days: '6'
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Weather service did not answer.');
      return await response.json();
    } finally { clearTimeout(timeout); }
  }

  function renderForecast(data) {
    const hourly = data.hourly || {};
    const daily = data.daily || {};
    // Open-Meteo supplies wall-clock times in the requested location's timezone.
    const now = data.current.time;
    const today = now.slice(0, 10);
    const hours = (Array.isArray(hourly.time) ? hourly.time : []).flatMap((time, i) => {
      if (typeof time !== 'string' || time.slice(0, 10) !== today || time < now) return [];
      const hour = Number(time.slice(11, 13));
      if (!Number.isInteger(hour) || hour > 23) return [];
      const [label, symbol] = weatherCodes[hourly.weather_code?.[i]] || ['Unavailable', '—'];
      return [`<div class="weather-hour"><strong>${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}</strong><span aria-hidden="true">${symbol}</span><small>${label}</small><strong>${round(hourly.temperature_2m?.[i])}°</strong><small>Rain ${round(hourly.precipitation_probability?.[i])}%</small></div>`];
    });
    document.getElementById('weatherHourly').innerHTML = hours.join('') || '<p>No more hourly forecasts available today.</p>';
    const days = (Array.isArray(daily.time) ? daily.time : []).flatMap((date, i) => {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= today) return [];
      const [label, symbol] = weatherCodes[daily.weather_code?.[i]] || ['Unavailable', '—'];
      const day = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      return [`<div class="weather-day"><strong>${day}</strong><span><span aria-hidden="true">${symbol}</span> ${label}</span><strong>H ${round(daily.temperature_2m_max?.[i])}° / L ${round(daily.temperature_2m_min?.[i])}°</strong><small>Rain ${round(daily.precipitation_probability_max?.[i])}%</small></div>`];
    }).slice(0, 5);
    document.getElementById('weatherDaily').innerHTML = days.join('') || '<p>Daily forecast unavailable.</p>';
    document.getElementById('weatherForecast').hidden = false;
  }

  function renderWeather(data) {
    if (!Number.isFinite(data?.current?.temperature_2m) || typeof data.current.time !== 'string') throw new Error('Current weather unavailable.');
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
    renderForecast(data);
    button.textContent = 'Update my weather';

    window.dispatchEvent(new CustomEvent('grizzly-weather-updated', {
      detail: {
        code: Number(current.weather_code),
        temp: Number(current.temperature_2m),
        rainChance: Number(daily.precipitation_probability_max?.[0]),
        condition: label
      }
    }));
  }


  const SAVED_LOCATION = 'grizzlyjohn:weatherLocation';

  function getSavedLocation() {
    try {
      const p = JSON.parse(localStorage.getItem(SAVED_LOCATION) || 'null');
      if (p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) &&
          Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180) return p;
    } catch {}
    return null;
  }

  function syncButtons() {
    const saved = Boolean(getSavedLocation());
    button.textContent = saved ? 'Refresh forecast' : 'Use my location';
    if (changeLocationButton) changeLocationButton.hidden = !saved || !navigator.geolocation;
  }

  async function updateWeather({ coords = null, save = false } = {}) {
    const position = coords || getSavedLocation();
    if (!position) return;
    setBusy(true);
    if (changeLocationButton) changeLocationButton.disabled = true;
    status.textContent = save ? 'Finding the weather at your new location…' : 'Updating the forecast from your saved location…';
    try {
      const data = await loadForecast(position.latitude, position.longitude);
      if (save) {
        try {
          // Approximately 1 km precision is enough for a forecast; keep it on this device.
          localStorage.setItem(SAVED_LOCATION, JSON.stringify({
            latitude: Number(position.latitude.toFixed(2)),
            longitude: Number(position.longitude.toFixed(2))
          }));
          localStorage.setItem('grizzlyjohn:weatherEnabled', 'true');
        } catch {}
      }
      renderWeather(data);
      if (getSavedLocation()) {
        locationLabel.textContent = 'Weather near John’s saved location';
        status.textContent = save
          ? 'Location saved. Future forecasts will not ask for location permission.'
          : 'Updated without checking your location. Traveling? Tap Change location.';
      } else {
        status.textContent = 'Updated. Browser storage is off, so this location cannot be remembered.';
      }
    } catch {
      status.textContent = details.hidden
        ? 'Weather is unavailable right now. Please try again.'
        : 'Could not update. Showing the previous forecast.';
    } finally {
      setBusy(false);
      if (changeLocationButton) changeLocationButton.disabled = false;
      syncButtons();
    }
  }

  function askForLocation() {
    if (!navigator.geolocation) {
      status.textContent = 'This device cannot share its location with the bear.';
      return;
    }
    setBusy(true);
    if (changeLocationButton) changeLocationButton.disabled = true;
    status.textContent = 'Finding John on the map…';
    navigator.geolocation.getCurrentPosition(
      position => updateWeather({ coords: position.coords, save: true }),
      error => {
        setBusy(false);
        if (changeLocationButton) changeLocationButton.disabled = false;
        syncButtons();
        status.textContent = error.code === 1
          ? getSavedLocation()
            ? 'Location not allowed. The saved weather location still works.'
            : 'Location is off. Allow it once to save your weather location.'
          : 'Couldn’t find John. Even bears lose the trail sometimes.';
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 }
    );
  }

  button.addEventListener('click', () => {
    if (getSavedLocation()) updateWeather();
    else askForLocation();
  });
  if (changeLocationButton) changeLocationButton.addEventListener('click', askForLocation);

  syncButtons();
  // Never request geolocation automatically, including for prior weatherEnabled users.
  if (getSavedLocation()) updateWeather();
  else status.textContent = 'Tap Use my location once. GrizzlyJohn will save it and stop asking on startup.';
})();
