'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup({denied=false, failed=false, storageFails=false, partial=false}={}) {
 const nodes={};const events=[];let url;
 const document={getElementById(id){return nodes[id] ||= {hidden:true,textContent:'',innerHTML:'',classList:{toggle(){}},addEventListener(event,fn){this[event]=fn}}}};
 const fixture={current:{time:'2026-10-01T12:15',temperature_2m:68,apparent_temperature:67,weather_code:2,wind_speed_10m:8},daily:{time:['2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05','2026-10-06'],temperature_2m_max:[72,73,74,75,76,77],temperature_2m_min:[50,51,52,53,54,55],precipitation_probability_max:[10,20,30,40,50,60],weather_code:[2,3,61,0,1,2]},hourly:{time:['2026-10-01T11:00','2026-10-01T13:00','2026-10-01T23:00','2026-10-02T00:00'],temperature_2m:[68,69,60,50],weather_code:[2,3,61,0],precipitation_probability:[0,15,30,0]}};
 const context={document,URLSearchParams,AbortController,setTimeout,clearTimeout,CustomEvent:class {constructor(type,init){this.type=type;this.detail=init.detail}},window:{dispatchEvent(e){events.push(e)}},localStorage:{getItem(){if(storageFails)throw Error();return null},setItem(){if(storageFails)throw Error()}},navigator:{geolocation:{getCurrentPosition(ok,error){if(denied)error({code:1});else ok({coords:{latitude:43,longitude:-89}})}}} ,fetch:async value=>{url=value;return {ok:!failed,json:async()=>partial?{current:fixture.current}:fixture}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../weather.js'),'utf8'),context);
 return {nodes,events,getUrl:()=>url,async load(){nodes.loadWeather.click();await new Promise(resolve=>setImmediate(resolve))}};
}
test('existing weather request provides current conditions, local remaining hours and five future days',async()=>{
 const app=setup();await app.load();const params=new URL(app.getUrl()).searchParams;
 assert.equal(params.get('forecast_days'),'6');assert.equal(params.get('timezone'),'auto');assert.match(params.get('hourly'),/precipitation_probability/);
 assert.equal(app.nodes.weatherTemp.textContent,'68°');assert.equal(app.nodes.weatherForecast.hidden,false);
 assert.equal((app.nodes.weatherDaily.innerHTML.match(/class="weather-day"/g)||[]).length,5);
 assert.equal((app.nodes.weatherHourly.innerHTML.match(/class="weather-hour"/g)||[]).length,2);
 assert.match(app.nodes.weatherHourly.innerHTML,/1 PM/);assert.doesNotMatch(app.nodes.weatherHourly.innerHTML,/11 AM/);
 assert.equal(app.events[0].type,'grizzly-weather-updated');assert.equal(app.events[0].detail.temp,68);
});
test('weather handles API failure, denied location, absent forecasts and blocked preferences',async()=>{
 const failed=setup({failed:true});await failed.load();assert.match(failed.nodes.weatherStatus.textContent,/wandered off/);assert.equal(failed.nodes.loadWeather.disabled,false);
 const denied=setup({denied:true});await denied.load();assert.match(denied.nodes.weatherStatus.textContent,/Location is off/);
 const partial=setup({partial:true});await partial.load();assert.match(partial.nodes.weatherDaily.innerHTML,/unavailable/);assert.equal(partial.nodes.weatherTemp.textContent,'68°');
 const blocked=setup({storageFails:true});await blocked.load();assert.equal(blocked.nodes.weatherTemp.textContent,'68°');
});
