import requests
import json
import time

def get_own_ip():
    return requests.get(f'https://api.ipify.org').text

def ip_lookup(ip): # return zip code, country code
    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; CrOS i686 2268.111.0) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11' # finna spoof
    }
    result = requests.get(f'https://ipapi.co/{ip}/json/', headers=headers).json()

    if result.get('reserved'): # probably a local ip
        return ip_lookup(get_own_ip())
    return result

def owm_zip_query(lookup):
    return lookup['postal']+','+lookup['country_code']

class WeatherCache:
    """ Reuse API responses to avoid ratelimiting """
    def __init__(self, expiry=120):
        self.cache = {}
        self.expiry = expiry
    
    def set(self, zipquery, data):
        self.cache[zipquery] = [time.time(), data]
    
    def get(self, zipquery):
        if zipquery in self.cache:
            timestamp, data = self.cache[zipquery]
            if time.time()-timestamp >= self.expiry:
                del self.cache[zipquery]
                return None
            
            return data

        return None

class OpenWeatherMap:
    def __init__(self, key):
        self.key = key
        self.cache = WeatherCache()

    def get_weather(self, for_ip):
        lookup = ip_lookup(for_ip)
        print(lookup, for_ip)
        zipquery = owm_zip_query(lookup)

        data = self.cache.get(zipquery)
        if not data:
            r = requests.get('https://api.openweathermap.org/data/2.5/weather', params={
                'appid': self.key,
                'zip': zipquery,
                'units': 'imperial'
            })

            data = r.json()
            self.cache.set(zipquery, data)
            
        return lookup,data
