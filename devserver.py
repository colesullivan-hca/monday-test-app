from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv

app = Flask(__name__)
# This allows your Live Server (port 5500) to talk to this Python server (port 5000)
CORS(app) 
load_dotenv()

# Put your secret Monday API key here locally
MONDAY_API_KEY = os.getenv("API_TOKEN")
MONDAY_URL = "https://api.monday.com/v2"

@app.route('/get-monday-data', methods=['POST'])
def get_monday_data():
    # 1. Grab the GraphQL query coming from your frontend
    frontend_data = request.json
    
    headers = {
        "Authorization": MONDAY_API_KEY,
        "Content-Type": "application/json",
        "API-Version": "2023-10" # Monday API versioning rule
    }
    
    # 2. Forward the exact query to Monday.com from the backend
    response = requests.post(MONDAY_URL, json=frontend_data, headers=headers)
    
    # 3. Send Monday's response right back to your frontend
    return jsonify(response.json()), response.status_code

if __name__ == '__main__':
    app.run(port=5000, debug=True)