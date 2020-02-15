<script>
	import { onMount } from 'svelte';
	import Weather from './weather.js';
	import Cookies from 'js-cookie';

	import Welcome from './Welcome.svelte';
	import WeatherWidget from './WeatherWidget.svelte';

	sleep.prevent();
	
	let time = new Date();

	let weather = new Weather();
	let key = Cookies.get('apiKey');
	if (key) {
		weather.run(key);
	}

	onMount(() => {
		const interval = setInterval(() => {
			time = new Date();
		}, 1000);

		return () => {
			clearInterval(interval);
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

</script>

<style>
	.time {
		font-size: 300pt;
		text-align: start;
		display: inline-block;
		font-family: 'Roboto';
		user-select: none;
	}
	.date {
		font-size: 40pt;
		font-family: 'Roboto';
		user-select: none;
	}
	.ampm {
		display: inline-block;
		font-family: 'Roboto';
		font-size: 30pt;
		user-select: none;
	}
	.footer {
		position: absolute;
		bottom:0;
	}
</style>

<div class="time">{getTimeString(time)}</div>
<div class="ampm">{get12hrSuffix(time)}</div>
<div class="date">{getDateString(time)}</div>
<WeatherWidget weather={weather}></WeatherWidget>
<div class="footer">
	<button on:click={function(){document.body.requestFullscreen();}}>fullscreen</button>
	<button on:click={function(){weather.apiKey=null}}>reset api key</button>
</div>
{#if !weather.apiKey}
	<Welcome onSetApiKey={onSetApiKey}></Welcome>
{/if}