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
		font-size: 30vw;
		text-align: start;
		display: inline-block;
		user-select: none;
	}
	.date {
		font-size: 4vw;
		user-select: none;
	}
	.ampm {
		display: inline-block;
		font-size: 5vw;
		user-select: none;
	}
	.footer {
		position: absolute;
		bottom:0;
	}
	.bg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgb(25,13,37);
		background: linear-gradient(0deg, rgba(25,13,37,1) 0%, rgba(23,29,56,1) 100%);
	}
	button {
		background: none;
		border: none;
		color: rgb(168, 168, 168);
		text-decoration: none;
		font-size: 16pt;
		margin:10px;
	}
</style>
<div class="bg">
	<div class="time">{getTimeString(time)}</div>
	<div class="ampm">{get12hrSuffix(time)}</div>
	<div class="date">{getDateString(time)}</div>
	<WeatherWidget weather={weather}></WeatherWidget>
	<div class="footer">
		<button on:click={function(){document.body.requestFullscreen();}}>Fullscreen</button>
		<button on:click={function(){weather.apiKey=null}}>Reset API key</button>
	</div>
	{#if !weather.apiKey}
		<Welcome onSetApiKey={onSetApiKey}></Welcome>
	{/if}
</div>

