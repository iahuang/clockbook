import flask
from flask import request, jsonify, send_from_directory

app = flask.Flask(__name__)
app.config["DEBUG"] = True


@app.route('/', methods=['GET'])
def home():
    return "<h1>Distant Reading Archive</h1><p>This site is a prototype API for distant reading of science fiction novels.</p>"

@app.route('/<path:path>')
def send_js(path):
    return send_from_directory('../docs', path)

app.run(port=8080)