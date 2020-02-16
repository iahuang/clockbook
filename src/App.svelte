<script>
	import { onMount } from 'svelte';
	import WeatherWidget from './WeatherWidget.svelte';
	import Cookies from 'js-cookie';
	import { writable } from 'svelte/store';
	import getTheme from './daycycle.js';


	function normTime(time) { // current time (Date object) converted to a number between 0 and 1, 1 being 11:59 pm
		return time.getHours()/24+time.getMinutes()/24/60
	}

	window._nt = normTime;
	
	let time = new Date();

	function getWeather(callback) {
		let r = new Request('api/weather');
		fetch(r).then(
			resp=>{
				resp.json().then(
					json=>callback(json)
				)
			}
		);
	}

	let weatherData = writable(null);
	let locationData = writable(null);

	onMount(() => {
		const clockInterval = setInterval(() => {
			time = new Date();
		}, 500);

		const dateRefreshInterval = setInterval(() => {
			time = new Date();
		}, 60*1000);

		getWeather(resp=>{
			locationData.set(resp[0]);
			weatherData.set(resp[1]);
		});
		return () => {
			clearInterval(clockInterval);
		};
		
	});

	function getTimeString(time) {
		return time.format('h:MM')
	}

	function get12hrSuffix(time) {
		return time.format('TT')
	}

	function getDateString(time) {
		return time.toLocaleDateString("en-US", {
			weekday: 'long', month: 'long', day: 'numeric' 
		})
	}

	function onSetApiKey(key) {
		Cookies.set('apiKey', key);
		weather.run(key);
	}

	$: theme = getTheme(normTime(time));

</script>

<style>
	.time {
		font-size: 30vw;
		text-align: start;
		display: inline-block;
		user-select: none;
		line-height: 1;
	}
	.date {
		font-size: 3vw;
		user-select: none;
		letter-spacing: 4px;
	}
	.ampm {
		display: inline-block;
		font-size: 5vw;
		user-select: none;
	}
	.footer {
		align-self: flex-end;
	}
	.bg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		/* background: rgb(216,158,188);
background: linear-gradient(0deg, rgba(216,158,188,1) 0%, rgba(222,174,135,1) 100%); */
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
	.date-time {
		align-self: center;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.footer > button {
		background: none;
		border: none;
		color: rgb(218, 218, 218);
		text-decoration: none;
		font-size: 16pt;
		margin:10px;
		cursor: pointer;
		outline: none;
	}
</style>
<div class="bg" style="background: {theme.bgGradient}">
	<div class="date-time" style="color: {theme.textColor}">
		<div>
			<div class="time">{getTimeString(time)}</div>
			<div class="ampm">{get12hrSuffix(time).toLowerCase()}</div>
		</div>
		<div class="date">{getDateString(time).toLowerCase()}</div>
	</div>
	
	<WeatherWidget weatherData={weatherData} locationData={locationData}></WeatherWidget>
	<div class="footer">
		<button on:click={function(){document.body.requestFullscreen()}}>Fullscreen</button>
		<button on:click={function(){sleep.prevent()}}>Prevent Sleep</button>
	</div>
</div>

