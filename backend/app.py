"""
THE PREDICTIVE EDGE
Complete Flask Backend

Replace the entire contents of:
    backend/app.py

Then run:
    python app.py
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import os
import json
import math
from datetime import datetime

from model import StartupPredictor


# ============================================================
# PATHS
# ============================================================

# backend/
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Your actual GitHub repository has index.html at the root,
# one level above backend/
PROJECT_DIR = os.path.abspath(
    os.path.join(BASE_DIR, "..")
)

FRONTEND_DIR = PROJECT_DIR

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "model.pkl"
)

SCALER_PATH = os.path.join(
    MODEL_DIR,
    "scaler.pkl"
)

HISTORY_PATH = os.path.join(
    MODEL_DIR,
    "prediction_history.json"
)


# ============================================================
# FLASK
# ============================================================

app = Flask(__name__)

CORS(app)


# ============================================================
# MODEL
# ============================================================

predictor = StartupPredictor()


def ensure_model():

    os.makedirs(
        MODEL_DIR,
        exist_ok=True
    )

    try:

        # Load existing model
        if (
            os.path.exists(MODEL_PATH)
            and
            os.path.exists(SCALER_PATH)
        ):

            print("[INFO] Loading existing model...")

            predictor.load(
                MODEL_PATH,
                SCALER_PATH
            )

            print("[OK] Model loaded successfully.")

        # Train new model
        else:

            print("[INFO] No saved model found.")
            print("[INFO] Training model...")

            predictor.train()

            predictor.save(
                MODEL_PATH,
                SCALER_PATH
            )

            print("[OK] Model trained and saved.")

    except Exception as error:

        print()
        print("============================================")
        print("MODEL ERROR")
        print("============================================")
        print(error)
        print("============================================")
        print()

        raise


# ============================================================
# HISTORY
# ============================================================

def load_history():

    if not os.path.exists(HISTORY_PATH):
        return []

    try:

        with open(
            HISTORY_PATH,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

            if isinstance(data, list):
                return data

            return []

    except Exception:

        return []


def save_history(history):

    os.makedirs(
        MODEL_DIR,
        exist_ok=True
    )

    with open(
        HISTORY_PATH,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            history,
            file,
            indent=2
        )


# ============================================================
# FRONTEND
# ============================================================

@app.route("/")
def home():

    index_path = os.path.join(
        FRONTEND_DIR,
        "index.html"
    )

    if not os.path.exists(index_path):

        return jsonify({
            "status": "ok",
            "message": "The Predictive Edge API is running.",
            "error": "index.html was not found."
        })

    # --------------------------------------------------------
    # Read HTML and automatically fix the funding input.
    #
    # Your old HTML had:
    #
    # step="50000"
    #
    # This causes the browser error:
    # "The two nearest valid values are 960000 and 1010000."
    #
    # We replace it with step="1000".
    # --------------------------------------------------------

    try:

        with open(
            index_path,
            "r",
            encoding="utf-8"
        ) as file:

            html = file.read()

        # Fix the exact old input
        html = html.replace(
            'step="50000"',
            'step="1000"'
        )

        # Fix any other common funding step
        html = html.replace(
            "step='50000'",
            "step='1000'"
        )

        return html

    except Exception as error:

        return jsonify({
            "error":
            f"Could not load frontend: {str(error)}"
        }), 500


# ============================================================
# STATIC FILES
# ============================================================

@app.route("/<path:filename>")
def static_files(filename):

    # Don't interfere with API routes
    if filename in [
        "predict",
        "history",
        "model-info",
        "health"
    ]:
        return jsonify({
            "error": "Invalid route"
        }), 404

    file_path = os.path.join(
        FRONTEND_DIR,
        filename
    )

    if os.path.isfile(file_path):

        return send_from_directory(
            FRONTEND_DIR,
            filename
        )

    return jsonify({
        "error": "File not found"
    }), 404


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route(
    "/health",
    methods=["GET"]
)
def health():

    return jsonify({

        "status": "ok",

        "message":
        "The Predictive Edge API is running."

    })


# ============================================================
# PREDICTION API
# ============================================================

@app.route(
    "/predict",
    methods=["POST"]
)
def predict():

    try:

        # ----------------------------------------------------
        # READ JSON
        # ----------------------------------------------------

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "error":
                "Please send valid JSON data."

            }), 400


        # ----------------------------------------------------
        # REQUIRED FIELDS
        # ----------------------------------------------------

        required_fields = [

            "team_experience",

            "funding_amount",

            "market_sentiment",

            "industry_growth_rate"

        ]


        missing = [

            field

            for field in required_fields

            if field not in data

        ]


        if missing:

            return jsonify({

                "error":
                "Missing required fields.",

                "missing_fields":
                missing

            }), 400


        # ----------------------------------------------------
        # CONVERT INPUTS
        # ----------------------------------------------------

        try:

            team_experience = float(
                data["team_experience"]
            )

            funding_amount = float(
                data["funding_amount"]
            )

            market_sentiment = float(
                data["market_sentiment"]
            )

            industry_growth_rate = float(
                data["industry_growth_rate"]
            )

        except (
            ValueError,
            TypeError
        ):

            return jsonify({

                "error":
                "All inputs must be valid numbers."

            }), 400


        # ----------------------------------------------------
        # CHECK NaN / INFINITY
        # ----------------------------------------------------

        values = [

            team_experience,

            funding_amount,

            market_sentiment,

            industry_growth_rate

        ]


        if not all(
            math.isfinite(value)
            for value in values
        ):

            return jsonify({

                "error":
                "All values must be finite numbers."

            }), 400


        # ----------------------------------------------------
        # VALIDATE TEAM EXPERIENCE
        # ----------------------------------------------------

        if not (
            1 <= team_experience <= 5
        ):

            return jsonify({

                "error":
                "Team experience must be between 1 and 5."

            }), 400


        # ----------------------------------------------------
        # VALIDATE FUNDING
        #
        # IMPORTANT:
        # There is NO requirement for funding to be a
        # multiple of 50,000 anymore.
        #
        # Therefore:
        #
        # 960000
        # 1000000
        # 1000123
        # 1250000
        #
        # are all accepted.
        # ----------------------------------------------------

        if funding_amount < 0:

            return jsonify({

                "error":
                "Funding amount cannot be negative."

            }), 400


        if funding_amount > 1000000000:

            return jsonify({

                "error":
                "Funding amount is too large."

            }), 400


        # ----------------------------------------------------
        # VALIDATE MARKET SENTIMENT
        # ----------------------------------------------------

        if not (
            0 <= market_sentiment <= 1
        ):

            return jsonify({

                "error":
                "Market sentiment must be between 0 and 1."

            }), 400


        # ----------------------------------------------------
        # VALIDATE INDUSTRY GROWTH
        # ----------------------------------------------------

        if not (
            -10 <= industry_growth_rate <= 50
        ):

            return jsonify({

                "error":
                "Industry growth rate must be between -10 and 50."

            }), 400


        # ====================================================
        # RUN ML MODEL
        # ====================================================

        result = predictor.predict(

            team_experience=
            team_experience,

            funding_amount=
            funding_amount,

            market_sentiment=
            market_sentiment,

            industry_growth_rate=
            industry_growth_rate

        )


        # ----------------------------------------------------
        # CHECK MODEL RESULT
        # ----------------------------------------------------

        if result is None:

            return jsonify({

                "error":
                "The ML model returned no result."

            }), 500


        # ====================================================
        # SAVE HISTORY
        # ====================================================

        history = load_history()


        history_entry = {

            "timestamp":
            datetime.now().isoformat(),

            "inputs": {

                "team_experience":
                team_experience,

                "funding_amount":
                funding_amount,

                "market_sentiment":
                market_sentiment,

                "industry_growth_rate":
                industry_growth_rate

            },

            "result":
            result

        }


        history.append(
            history_entry
        )


        # Keep only last 50
        history = history[-50:]


        save_history(
            history
        )


        # ====================================================
        # RETURN RESULT
        # ====================================================

        return jsonify(
            result
        ), 200


    except Exception as error:

        print()
        print("[ERROR] Prediction failed:")
        print(error)
        print()

        return jsonify({

            "error":
            "Prediction failed.",

            "details":
            str(error)

        }), 500


# ============================================================
# HISTORY API
# ============================================================

@app.route(
    "/history",
    methods=["GET"]
)
def get_history():

    try:

        history = load_history()

        return jsonify(
            history
        ), 200

    except Exception as error:

        return jsonify({

            "error":
            str(error)

        }), 500


# ============================================================
# MODEL INFO API
# ============================================================

@app.route(
    "/model-info",
    methods=["GET"]
)
def model_info():

    try:

        accuracy = None


        if predictor.accuracy is not None:

            accuracy = round(

                predictor.accuracy * 100,

                2

            )


        return jsonify({

            "accuracy":
            accuracy,

            "feature_importances":
            predictor.feature_importances,

            "model_type":
            "Random Forest Classifier",

            "n_estimators":
            200

        }), 200


    except Exception as error:

        return jsonify({

            "error":
            str(error)

        }), 500


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({

        "error":
        "Endpoint not found."

    }), 404


@app.errorhandler(500)
def internal_error(error):

    return jsonify({

        "error":
        "Internal server error."

    }), 500


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print()
    print("==============================================")
    print("        THE PREDICTIVE EDGE")
    print("        AI STARTUP SUCCESS PREDICTOR")
    print("==============================================")
    print()

    # Load / train model
    ensure_model()

    print()
    print("[OK] Server ready.")
    print()
    print("Dashboard:")
    print("http://localhost:5000")
    print()
    print("Prediction API:")
    print("http://localhost:5000/predict")
    print()
    print("Health Check:")
    print("http://localhost:5000/health")
    print()
    print("==============================================")
    print()

    app.run(

        host="0.0.0.0",

        port=int(
            os.environ.get(
                "PORT",
                5000
            )
        ),

        debug=False

    )