<script>
    export let weatherData;
    export let locationData;
    
    function toFahren(kelvin) {
        return (kelvin-273.15)*9/5+32
    }
</script>

<style>
    .weather {
        font-size: 5vh;
        display: flex;
        flex-direction: row;
        align-content: center;
    }
    .weather > img {
        align-self: center;
    }
    .weather-widget {
        padding: 3vh;
        display: flex;
        flex-direction: column;
    }
    .subtext {
        font-size: 3vh;
    }
</style>

{#if $weatherData}
<div class="weather-widget">
    <div>
        Weather in {$locationData.city}, {$locationData.region_code}
    </div>
    <div class="weather">
        <p>{Math.round($weatherData.main.temp)}ºF</p>
        <img src={`http://openweathermap.org/img/wn/${$weatherData.weather[0].icon}@2x.png`} alt="ok so remind me again why i need to add alt text">
    </div>
    <div class="subtext">
        Feels like {Math.round($weatherData.main.feels_like)}ºF
    </div>
    <div class="subtext">
        Wind speed: {Math.round($weatherData.wind.speed)} mph
    </div>
</div>
{/if}