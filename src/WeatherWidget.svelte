<script>
    export let weather; // weather instance
    let weatherData;
    const unsubscribe = weather.weatherData.subscribe(value => {
		weatherData = value;
    });
    
    function toFahren(kelvin) {
        return (kelvin-273.15)*9/5+32
    }
</script>

<style>
    .location {
        font-size: 2vw;
        font-family: 'Roboto';
    }
    .weather {
        font-size: 2vw;
        font-family: 'Roboto';
    }
    .weather-widget {
        padding: 1vw;
    }
    .subtext {
        font-family: 'Roboto';
        font-size: 1vw;
    }
</style>

{#if weatherData}
<div class="weather-widget">
    <div class="location">
        Weather in {weatherData.name}
    </div>
    <div class="weather">
        {Math.round(weatherData.main.temp)}ºF / {weatherData.weather[0].main}
    </div>
    <div class="subtext">
        Feels like {Math.round(weatherData.main.feels_like)}ºF
    </div>
    <div class="subtext">
        Wind speed: {Math.round(weatherData.wind.speed)} mph
    </div>
</div>
{/if}