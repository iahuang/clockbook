# This repository has been replaced by [MyHUD](https://github.com/iahuang/myhud), an essentially better version of this project

![Day screenshot](https://github.com/iahuang/clockbook/raw/master/screenshots/day.png)
![Day screenshot](https://github.com/iahuang/clockbook/raw/master/screenshots/night.png)

- Day/night cycle with fancy colors
- Weather using the OpenWeatherMap API
- Probably the only alarm clock with its own Flask server

## Try it yourself

1. If you want to host the alarm clock yourself, you will need an [OpenWeatherMap API key](https://openweathermap.org/appid). Sorry :(

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
