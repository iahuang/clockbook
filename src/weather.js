import { writable } from 'svelte/store';

export default class Weather {
    constructor() {
        this.conditionCache = null;
        this.hasLocation = false;
        this.weatherData = writable(null);
    }
    
    findLocation(onResolve) {
        navigator.geolocation.getCurrentPosition((pos=>{
            this.lat = pos.coords.latitude;
            this.lon = pos.coords.longitude;
            onResolve()
        }).bind(this));
        this.hasLocation = true;
    }

    run(apiKey) {
        this.apiKey = apiKey;
        this.findLocation(()=>{
            this.getConditions()
        })
    }

    getConditions() {
        let url = `https://api.openweathermap.org/data/2.5/weather?lat=${this.lat}&lon=${this.lon}&appid=${this.apiKey}&units=imperial`;
        const request = new Request(url);
        var a = fetch(request).then(resp => {
            resp.json().then((data => {
                this.weatherData.update(previousData=>data)
                window.weatherData = data;
                console.log(this)
            }).bind(this));
        });
    }
}