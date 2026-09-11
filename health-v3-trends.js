(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CHART_WIDTH = 640;
  const CHART_HEIGHT = 220;
  const PAD = Object.freeze({ top: 18, right: 18, bottom: 34, left: 46 });

  function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function round(value, digits = 1) {
    if (!Number.isFinite(Number(value))) return null;
    const factor = 10 ** digits;
    return Math.round(Number(value) * factor) / factor;
  }

  function dateFromKey(key) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function keyFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function shiftDateKey(key, days) {
    const date = dateFromKey(key);
    if (!date) return key;
    date.setDate(date.getDate() + days);
    return keyFromDate(date);
  }

  function rangeForDays(endDate, days) {
    const count = Math.max(1, Number(days) || 1);
    return { start: shiftDateKey(endDate, -(count - 1)), end: endDate, days: count };
  }

  function daysBetween(start, end) {
    const a = dateFromKey(start);
    const b = dateFromKey(end);
    if (!a || !b) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function inRange(entry, range) {
    return Boolean(entry?.date && entry.date >= range.start && entry.date <= range.end);
  }

  function groupByDate(entries) {
    return (entries || []).reduce((map, entry) => {
      if (!entry?.date) return map;
      if (!map.has(entry.date)) map.set(entry.date, []);
      map.get(entry.date).push(entry);
      return map;
    }, new Map());
  }

  function average(values) {
    const usable = values.map(finite).filter(value => value !== null);
    if (!usable.length) return null;
    return usable.reduce((sum, value) => sum + value, 0) / usable.length;
  }

  function latestOfDay(entries) {
    return [...entries].sort((a, b) => String(b.timestamp || b.updatedAt || '').localeCompare(String(a.timestamp || a.updatedAt || '')))[0] || null;
  }

  function buildTrendData(data, days, endDate) {
    const range = rangeForDays(endDate, days);
    const within = source => (source || []).filter(entry => inRange(entry, range));

    const vitalGroups = groupByDate(within(data.vitals));
    const vitals = [...vitalGroups.entries()].map(([date, entries]) => ({
      date,
      systolic: round(average(entries.map(entry => entry.systolic)), 0),
      diastolic: round(average(entries.map(entry => entry.diastolic)), 0),
      pulse: round(average(entries.map(entry => entry.pulse)), 0),
      readings: entries.length
    })).sort((a, b) => a.date.localeCompare(b.date));

    const weightGroups = groupByDate(within(data.weights));
    const weight = [...weightGroups.entries()].map(([date, entries]) => {
      const latest = latestOfDay(entries);
      return { date, value: finite(latest?.weight) };
    }).filter(point => point.value !== null).sort((a, b) => a.date.localeCompare(b.date));

    const activityGroups = groupByDate(within(data.activities));
    const activity = [...activityGroups.entries()].map(([date, entries]) => ({
      date,
      value: round(entries.reduce((sum, entry) => sum + (finite(entry.durationMinutes) || 0), 0), 0),
      entries: entries.length
    })).sort((a, b) => a.date.localeCompare(b.date));

    const sleepGroups = groupByDate(within(data.sleep));
    const sleep = [...sleepGroups.entries()].map(([date, entries]) => {
      const latest = latestOfDay(entries);
      return { date, value: finite(latest?.hours), quality: latest?.quality || null };
    }).filter(point => point.value !== null).sort((a, b) => a.date.localeCompare(b.date));

    const medicationGroups = groupByDate(within(data.medication));
    const medication = [...medicationGroups.entries()].map(([date, entries]) => {
      const latest = latestOfDay(entries);
      const completed = ['morning', 'midday', 'evening'].filter(name => latest?.[name] === true).length;
      return { date, value: round((completed / 3) * 100, 0), completed, possible: 3 };
    }).sort((a, b) => a.date.localeCompare(b.date));

    return {
      range,
      bloodPressure: vitals.map(point => ({ date: point.date, systolic: point.systolic, diastolic: point.diastolic, readings: point.readings })),
      pulse: vitals.map(point => ({ date: point.date, value: point.pulse, readings: point.readings })).filter(point => point.value !== null),
      weight,
      activity,
      sleep,
      medication
    };
  }

  function safeAll(result) {
    return result?.ok && Array.isArray(result.entries) ? result.entries : [];
  }

  function browserData(health) {
    const sources = {
      vitals: health.vitals.all(),
      weights: health.weights.all(),
      activities: health.activities.all(),
      medication: health.medication.all(),
      sleep: health.sleep.all()
    };
    const failed = Object.entries(sources).find(([, result]) => !result?.ok);
    if (failed) return { ok: false, reason: failed[1]?.reason || `Could not read ${failed[0]} history.` };
    return {
      ok: true,
      data: {
        vitals: safeAll(sources.vitals),
        weights: safeAll(sources.weights),
        activities: safeAll(sources.activities),
        medication: safeAll(sources.medication),
        sleep: safeAll(sources.sleep)
      }
    };
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function formatDate(key, withYear = false) {
    const date = dateFromKey(key);
    if (!date) return key;
    return date.toLocaleDateString(undefined, withYear ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' });
  }

  function xForDate(date, range) {
    const width = CHART_WIDTH - PAD.left - PAD.right;
    const offset = daysBetween(range.start, date);
    const denominator = Math.max(1, range.days - 1);
    return PAD.left + (Math.max(0, Math.min(denominator, offset)) / denominator) * width;
  }

  function numericDomain(values, options = {}) {
    const usable = values.map(finite).filter(value => value !== null);
    if (!usable.length) return null;
    let min = options.min !== undefined ? Number(options.min) : Math.min(...usable);
    let max = options.max !== undefined ? Number(options.max) : Math.max(...usable);
    if (min === max) {
      const pad = Math.max(1, Math.abs(min) * 0.08);
      min -= pad;
      max += pad;
    } else if (options.min === undefined || options.max === undefined) {
      const pad = (max - min) * 0.12;
      if (options.min === undefined) min -= pad;
      if (options.max === undefined) max += pad;
    }
    if (options.floorZero) min = Math.max(0, min);
    return { min, max };
  }

  function yForValue(value, domain) {
    const height = CHART_HEIGHT - PAD.top - PAD.bottom;
    const ratio = (Number(value) - domain.min) / Math.max(0.000001, domain.max - domain.min);
    return PAD.top + (1 - ratio) * height;
  }

  function svgEl(name, attrs = {}, text = null) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== null) node.textContent = String(text);
    return node;
  }

  function addGrid(svg, domain) {
    const innerWidth = CHART_WIDTH - PAD.left - PAD.right;
    const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
    [0, 0.5, 1].forEach(ratio => {
      const y = PAD.top + innerHeight * ratio;
      svg.appendChild(svgEl('line', { x1: PAD.left, y1: y, x2: PAD.left + innerWidth, y2: y, class: 'health-trend-gridline' }));
      const value = domain.max - (domain.max - domain.min) * ratio;
      svg.appendChild(svgEl('text', { x: PAD.left - 8, y: y + 4, 'text-anchor': 'end', class: 'health-trend-axis-label' }, round(value, 0)));
    });
  }

  function addDateLabels(svg, range) {
    const marks = range.days <= 7 ? [0, range.days - 1] : [0, Math.floor((range.days - 1) / 2), range.days - 1];
    [...new Set(marks)].forEach(offset => {
      const date = shiftDateKey(range.start, offset);
      svg.appendChild(svgEl('text', {
        x: xForDate(date, range),
        y: CHART_HEIGHT - 9,
        'text-anchor': offset === 0 ? 'start' : offset === range.days - 1 ? 'end' : 'middle',
        class: 'health-trend-axis-label'
      }, formatDate(date)));
    });
  }

  function newChartSvg(label, domain, range) {
    const svg = svgEl('svg', { viewBox: `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`, role: 'img', 'aria-label': label, class: 'health-trend-svg' });
    addGrid(svg, domain);
    addDateLabels(svg, range);
    return svg;
  }

  function addLineSeries(svg, points, range, domain, className, valueKey = 'value', titleFormatter = null) {
    if (!points.length) return;
    const coordinates = points.map(point => ({
      point,
      x: xForDate(point.date, range),
      y: yForValue(point[valueKey], domain)
    }));
    if (coordinates.length > 1) {
      svg.appendChild(svgEl('polyline', {
        points: coordinates.map(({ x, y }) => `${x},${y}`).join(' '),
        fill: 'none',
        class: `health-trend-line ${className}`
      }));
    }
    coordinates.forEach(({ point, x, y }) => {
      const circle = svgEl('circle', { cx: x, cy: y, r: 5, class: `health-trend-point ${className}` });
      circle.appendChild(svgEl('title', {}, titleFormatter ? titleFormatter(point) : `${formatDate(point.date, true)}: ${point[valueKey]}`));
      svg.appendChild(circle);
    });
  }

  function addBars(svg, points, range, domain, className, titleFormatter) {
    if (!points.length) return;
    const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
    const innerWidth = CHART_WIDTH - PAD.left - PAD.right;
    const slot = innerWidth / Math.max(7, range.days);
    const width = Math.max(3, Math.min(24, slot * 0.7));
    const baseY = PAD.top + innerHeight;
    points.forEach(point => {
      const x = xForDate(point.date, range) - width / 2;
      const y = yForValue(point.value, domain);
      const rect = svgEl('rect', { x, y, width, height: Math.max(1, baseY - y), rx: Math.min(4, width / 2), class: `health-trend-bar ${className}` });
      rect.appendChild(svgEl('title', {}, titleFormatter(point)));
      svg.appendChild(rect);
    });
  }

  function cardShell(title, subtitle, legend = '') {
    const card = document.createElement('article');
    card.className = 'health-trend-card';
    card.innerHTML = `<div class="health-trend-card-head"><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></div>${legend}</div><div class="health-trend-chart"></div>`;
    return card;
  }

  function emptyChart(card, message = 'Nothing recorded in this window yet.') {
    card.querySelector('.health-trend-chart').innerHTML = `<div class="health-trend-empty"><span aria-hidden="true">· · ·</span><p>${escapeHtml(message)}</p></div>`;
  }

  function renderBloodPressure(data) {
    const card = cardShell('Blood pressure', 'Daily averages of recorded readings.', '<div class="health-trend-legend"><span><i class="series-a"></i>Systolic</span><span><i class="series-b"></i>Diastolic</span></div>');
    if (!data.bloodPressure.length) { emptyChart(card); return card; }
    const values = data.bloodPressure.flatMap(point => [point.systolic, point.diastolic]).filter(value => value !== null);
    const domain = numericDomain(values, { floorZero: true });
    const svg = newChartSvg('Blood pressure trend. Lines connect recorded dates only.', domain, data.range);
    addLineSeries(svg, data.bloodPressure.filter(point => point.systolic !== null), data.range, domain, 'series-a', 'systolic', point => `${formatDate(point.date, true)}: systolic ${point.systolic}; ${point.readings} reading${point.readings === 1 ? '' : 's'} that day`);
    addLineSeries(svg, data.bloodPressure.filter(point => point.diastolic !== null), data.range, domain, 'series-b', 'diastolic', point => `${formatDate(point.date, true)}: diastolic ${point.diastolic}; ${point.readings} reading${point.readings === 1 ? '' : 's'} that day`);
    card.querySelector('.health-trend-chart').appendChild(svg);
    return card;
  }

  function renderLineCard(title, subtitle, points, data, options = {}) {
    const card = cardShell(title, subtitle, options.legend || '');
    if (!points.length) { emptyChart(card); return card; }
    const domain = numericDomain(points.map(point => point.value), { floorZero: Boolean(options.floorZero), min: options.min, max: options.max });
    const svg = newChartSvg(options.aria || `${title} trend. Lines connect recorded dates only.`, domain, data.range);
    addLineSeries(svg, points, data.range, domain, options.className || 'series-a', 'value', options.titleFormatter);
    card.querySelector('.health-trend-chart').appendChild(svg);
    if (options.footerHtml) card.insertAdjacentHTML('beforeend', options.footerHtml);
    return card;
  }

  function renderBarCard(title, subtitle, points, data, options = {}) {
    const card = cardShell(title, subtitle, options.legend || '');
    if (!points.length) { emptyChart(card); return card; }
    const domain = numericDomain(points.map(point => point.value), { floorZero: true, min: options.min, max: options.max });
    const svg = newChartSvg(options.aria || `${title} history. Bars appear only on recorded dates.`, domain, data.range);
    addBars(svg, points, data.range, domain, options.className || 'series-a', options.titleFormatter || (point => `${formatDate(point.date, true)}: ${point.value}`));
    card.querySelector('.health-trend-chart').appendChild(svg);
    return card;
  }

  function renderSleep(data) {
    const qualityCounts = data.sleep.reduce((counts, point) => {
      if (point.quality) counts[point.quality] = (counts[point.quality] || 0) + 1;
      return counts;
    }, {});
    const qualityText = ['Poor', 'Okay', 'Good', 'Great'].filter(name => qualityCounts[name]).map(name => `${name} ${qualityCounts[name]}`).join(' · ');
    return renderLineCard('Sleep', 'Hours by recorded night. Quality stays descriptive.', data.sleep, data, {
      className: 'series-sleep',
      floorZero: true,
      aria: 'Sleep hours trend. Each point is a recorded night and includes its saved quality in the accessible label.',
      titleFormatter: point => `${formatDate(point.date, true)}: ${point.value} hours; quality ${point.quality || 'not recorded'}`,
      footerHtml: qualityText ? `<p class="health-trend-footnote"><strong>Quality in this window:</strong> ${escapeHtml(qualityText)}</p>` : ''
    });
  }

  function renderTrends(data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'health-trends-grid';
    wrapper.append(
      renderBloodPressure(data),
      renderLineCard('Pulse', 'Daily average when multiple readings were recorded.', data.pulse, data, {
        className: 'series-pulse', floorZero: true,
        titleFormatter: point => `${formatDate(point.date, true)}: ${point.value} bpm; ${point.readings} reading${point.readings === 1 ? '' : 's'} that day`
      }),
      renderLineCard('Weight', 'Only recorded weights are connected.', data.weight, data, {
        className: 'series-weight',
        titleFormatter: point => `${formatDate(point.date, true)}: ${point.value} lb`
      }),
      renderBarCard('Activity', 'Minutes on days activity was recorded.', data.activity, data, {
        className: 'series-activity',
        titleFormatter: point => `${formatDate(point.date, true)}: ${point.value} active minutes across ${point.entries} entr${point.entries === 1 ? 'y' : 'ies'}`
      }),
      renderSleep(data),
      renderBarCard('Medication windows', 'Completion on days John logged medication windows.', data.medication, data, {
        className: 'series-medication', min: 0, max: 100,
        titleFormatter: point => `${formatDate(point.date, true)}: ${point.completed} of ${point.possible} logged windows complete (${point.value}%)`
      })
    );
    return wrapper;
  }

  function installMarkup(summaryNode) {
    if (document.getElementById('healthTrendsDashboard')) return document.getElementById('healthTrendsDashboard');
    const section = document.createElement('section');
    section.id = 'healthTrendsDashboard';
    section.className = 'health-trends-dashboard';
    section.setAttribute('aria-labelledby', 'healthTrendsHeading');
    section.innerHTML = `
      <div class="health-trends-heading">
        <div>
          <p class="eyebrow">TRENDS</p>
          <h2 id="healthTrendsHeading">The shape of things over time.</h2>
          <p>Recorded days only. Missing days stay missing instead of becoming zeros, misses, or made-up data.</p>
        </div>
        <span class="health-trends-range" id="healthTrendsRange" aria-live="polite"></span>
      </div>
      <div id="healthTrendsContent"></div>`;
    summaryNode.insertAdjacentElement('afterend', section);
    return section;
  }

  function activePeriodDays() {
    const active = document.querySelector('[data-health-period].is-active');
    return [7, 30, 90].includes(Number(active?.dataset.healthPeriod)) ? Number(active.dataset.healthPeriod) : 30;
  }

  function initBrowser() {
    const health = window.GrizzlyJohnHealthV3;
    if (!health) return;
    let rendering = false;

    function render() {
      if (rendering) return;
      const summaryNode = document.getElementById('healthPeriodSummary');
      if (!summaryNode) return;
      rendering = true;
      try {
        const section = installMarkup(summaryNode);
        const content = section.querySelector('#healthTrendsContent');
        const period = activePeriodDays();
        const endDate = health.localDateKey(new Date());
        const source = browserData(health);
        section.querySelector('#healthTrendsRange').textContent = `${period} days`;
        if (!source.ok) {
          content.innerHTML = `<div class="health-trends-error">Health trends could not be read. Your saved data was left unchanged.</div>`;
          return;
        }
        const trends = buildTrendData(source.data, period, endDate);
        content.replaceChildren(renderTrends(trends));
      } finally {
        rendering = false;
      }
    }

    function connect() {
      const summaryNode = document.getElementById('healthPeriodSummary');
      if (!summaryNode) return false;
      render();
      const observer = new MutationObserver(() => window.requestAnimationFrame(render));
      observer.observe(summaryNode, { childList: true, subtree: true, characterData: true });
      document.addEventListener('click', event => {
        if (event.target.closest('[data-health-period]')) window.setTimeout(render, 0);
      });
      window.addEventListener('storage', event => {
        if (String(event.key || '').startsWith('grizzlyjohn:v3:health:')) render();
      });
      return true;
    }

    if (connect()) return;
    const observer = new MutationObserver(() => {
      if (connect()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }

  const api = Object.freeze({ rangeForDays, buildTrendData, numericDomain, daysBetween });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.GrizzlyJohnHealthTrendsV3 = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBrowser, { once: true });
    else initBrowser();
  }
})();
