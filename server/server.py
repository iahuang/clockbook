import flask
from flask import request, jsonify, send_from_directory, send_file
from weather import OpenWeatherMap
import json

app = flask.Flask(__name__)
app.config["DEBUG"] = True

with open('keys.json') as fl:
    keys = json.load(fl)
    omw = OpenWeatherMap(keys['weatherKey'])

@app.route('/', methods=['GET'])
def home():
    return send_file('../public/index.html')

@app.route('/<path:path>')
def send_js(path):
    return send_from_directory('../public', path)

@app.route('/api/weather', methods=['GET'])
def api_weather():
    return jsonify(omw.get_weather(request.remote_addr))

app.run(port=8080, host='0.0.0.0')