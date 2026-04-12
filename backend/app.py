"""
Flask API for The Predictive Edge.
Serves the ML model predictions and the frontend dashboard.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from datetime import datetime

from model import StartupPredictor

# Initialize Flask app
app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

# Initialize and load (or train) the predictor
predictor = StartupPredictor()

MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
HISTORY_PATH = os.path.join(MODEL_DIR, "prediction_history.json")


def ensure_model():
    """Load existing model or train a new one."""
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        predictor.load(MODEL_PATH, SCALER_PATH)
    else:
        print("[>>] No saved model found. Training new model...")
        predictor.train()
        predictor.save(MODEL_PATH, SCALER_PATH)


def load_history():
    """Load prediction history from disk."""
    if os.path.exists(HISTORY_PATH):
        with open(HISTORY_PATH, "r") as f:
            return json.load(f)
    return []


def save_history(history):
    """Save prediction history to disk."""
    os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)
    with open(HISTORY_PATH, "w") as f:
        json.dump(history, f, indent=2)


# ─── Routes ──────────────────────────────────────────────────────────────────


@app.route("/")
def serve_frontend():
    """Serve the frontend dashboard."""
    return send_from_directory(app.static_folder, "index.html")


@app.route("/predict", methods=["POST"])
def predict():
    """
    Predict startup success probability.

    Expects JSON:
    {
        "team_experience": 4,
        "funding_amount": 2000000,
        "market_sentiment": 0.7,
        "industry_growth_rate": 15
    }

    Returns JSON:
    {
        "pos_score": 78.5,
        "risk_category": "Low Risk",
        "weakness": "Low market validation",
        "recommendation": "Improve customer demand testing",
        "prediction": 1,
        "feature_importances": {...}
    }
    """
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ["team_experience", "funding_amount", "market_sentiment", "industry_growth_rate"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Parse and validate inputs
        team_experience = float(data["team_experience"])
        funding_amount = float(data["funding_amount"])
        market_sentiment = float(data["market_sentiment"])
        industry_growth_rate = float(data["industry_growth_rate"])

        # Validation ranges
        if not (1 <= team_experience <= 5):
            return jsonify({"error": "team_experience must be between 1 and 5"}), 400
        if funding_amount < 0:
            return jsonify({"error": "funding_amount must be non-negative"}), 400
        if not (0 <= market_sentiment <= 1):
            return jsonify({"error": "market_sentiment must be between 0 and 1"}), 400
        if not (-10 <= industry_growth_rate <= 50):
            return jsonify({"error": "industry_growth_rate must be between -10 and 50"}), 400

        # Make prediction
        result = predictor.predict(
            team_experience=team_experience,
            funding_amount=funding_amount,
            market_sentiment=market_sentiment,
            industry_growth_rate=industry_growth_rate,
        )

        # Save to history
        history = load_history()
        history_entry = {
            "timestamp": datetime.now().isoformat(),
            "inputs": {
                "team_experience": team_experience,
                "funding_amount": funding_amount,
                "market_sentiment": market_sentiment,
                "industry_growth_rate": industry_growth_rate,
            },
            "result": result,
        }
        history.append(history_entry)
        # Keep only last 50 predictions
        history = history[-50:]
        save_history(history)

        return jsonify(result)

    except ValueError as e:
        return jsonify({"error": f"Invalid input: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


@app.route("/history", methods=["GET"])
def get_history():
    """Return prediction history."""
    history = load_history()
    return jsonify(history)


@app.route("/model-info", methods=["GET"])
def model_info():
    """Return model metadata."""
    return jsonify({
        "accuracy": round(predictor.accuracy * 100, 2) if predictor.accuracy else None,
        "feature_importances": predictor.feature_importances,
        "model_type": "Random Forest Classifier",
        "n_estimators": 200,
    })


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ensure_model()
    print("\n[>>] The Predictive Edge API is running!")
    print("[>>] Dashboard: http://localhost:5000")
    print("[>>] API Endpoint: http://localhost:5000/predict")
    app.run(debug=True, port=5000)
