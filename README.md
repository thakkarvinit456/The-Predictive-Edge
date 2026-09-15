# The Predictive Edge 🚀

**AI-Powered Startup Success Prediction System**

A full-stack web application that uses machine learning (Random Forest Classifier) to estimate the Probability of Success (PoS) for early-stage startups and provide actionable recommendations.

---

## Features

- **ML-Powered Predictions** — Random Forest Classifier with 94.5% accuracy
- **Probability of Success (PoS)** — Score from 0–100% with animated ring display
- **Risk Classification** — High / Medium / Low Risk with color indicators
- **Weakness Detection** — Identifies the startup's biggest vulnerability
- **Actionable Recommendations** — Data-driven suggestions for improvement
- **Feature Importance** — Visual breakdown of what factors matter most
- **Prediction History** — Track all past analyses

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Backend  | Python, Flask, Flask-CORS         |
| ML       | Scikit-learn (Random Forest), NumPy, Pandas |
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Serving  | Flask static file serving         |

---

## Input Features

| Feature              | Range       | Description                        |
|----------------------|-------------|------------------------------------|
| Team Experience      | 1–5 scale   | Founding team's industry expertise |
| Funding Amount       | $10K – $50M | Total secured funding in USD       |
| Market Sentiment     | 0.0 – 1.0   | Market demand & validation score   |
| Industry Growth Rate | -5% to 40%  | Annual industry growth percentage  |

---

## API Endpoints

### `POST /predict`

**Request:**
```json
{
  "team_experience": 4,
  "funding_amount": 2000000,
  "market_sentiment": 0.7,
  "industry_growth_rate": 15
}
```

**Response:**
```json
{
  "prediction": 1,
  "pos_score": 78.5,
  "risk_category": "Low Risk",
  "weakness": "Low market validation",
  "recommendation": "Conduct extensive customer discovery interviews...",
  "feature_importances": {
    "team_experience": 0.6241,
    "funding_amount": 0.1438,
    "market_sentiment": 0.1461,
    "industry_growth_rate": 0.0859
  }
}
```

### `GET /history` — Returns prediction history
### `GET /model-info` — Returns model metadata and accuracy

---

## Quick Start

```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt

# 2. Run the server (trains model on first run)
python app.py

# 3. Open dashboard
# Visit http://localhost:5000
```

---

## Project Structure

```
the-predictive-edge/
├── backend/
│   ├── app.py              # Flask API server
│   ├── model.py            # ML model (Random Forest)
│   ├── dataset.py          # Synthetic dataset generator
│   ├── requirements.txt    # Python dependencies
│   └── models/             # Saved model files (auto-generated)
│       ├── model.pkl
│       ├── scaler.pkl
│       └── metadata.json
├── frontend/
│   ├── index.html          # Dashboard UI
│   ├── style.css           # Premium dark theme styles
│   └── script.js           # Frontend logic & animations
└── README.md
```

---

## System Flow

```
User Input → Frontend → Fetch API → Flask /predict → Random Forest Model → predict_proba → Response → UI Display
```

---

## Author

Built by **Vinit Thakkar**
