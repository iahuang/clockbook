# clockbook

## Try it yourself

1. The clock features a weather display, and as such requires you to obtain an [OpenWeatherMap API key](https://openweathermap.org/appid). Sorry :(

Create a file called `keys.json`, in the server folder. It should look something like this:
```json
{
    "weatherKey": "<your api key>"
}
```

2. `npm install`

3. `npm run build`

4. `python server/server.py`

### Server Dependencies

- Flask
- `requests`
