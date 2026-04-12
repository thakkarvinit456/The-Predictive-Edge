"""
ML Model for The Predictive Edge.
Trains a Random Forest Classifier on the startup dataset and provides prediction utilities.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler
import joblib
import os
import json

from dataset import generate_startup_dataset


# Feature names used by the model
FEATURE_NAMES = ["team_experience", "funding_amount", "market_sentiment", "industry_growth_rate"]

# Weakness analysis thresholds
WEAKNESS_THRESHOLDS = {
    "team_experience": {"low": 2, "label": "Weak founding team experience"},
    "funding_amount": {"low": 500000, "label": "Insufficient startup funding"},
    "market_sentiment": {"low": 0.35, "label": "Low market validation"},
    "industry_growth_rate": {"low": 8, "label": "Slow industry growth trajectory"},
}

# Recommendations mapped to weaknesses
RECOMMENDATIONS = {
    "Weak founding team experience": "Recruit experienced advisors or co-founders with proven track records in your industry.",
    "Insufficient startup funding": "Pursue additional funding rounds, explore angel investors, or apply to accelerator programs.",
    "Low market validation": "Conduct extensive customer discovery interviews, run pilot programs, and validate product-market fit.",
    "Slow industry growth trajectory": "Consider pivoting to adjacent high-growth markets or developing unique competitive differentiators.",
}


class StartupPredictor:
    """Random Forest-based startup success predictor."""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_importances = None
        self.accuracy = None
        self.report = None

    def train(self, dataset_path=None):
        """Train the Random Forest model on the startup dataset."""
        # Load or generate dataset
        if dataset_path and os.path.exists(dataset_path):
            df = pd.read_csv(dataset_path)
            print(f"[OK] Loaded dataset from {dataset_path}")
        else:
            df = generate_startup_dataset(n_samples=2000)
            print("[OK] Generated synthetic dataset (2000 samples)")

        X = df[FEATURE_NAMES].values
        y = df["success"].values

        # Train-test split (80/20)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Train Random Forest Classifier
        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features="sqrt",
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X_train_scaled, y_train)

        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        self.accuracy = accuracy_score(y_test, y_pred)
        self.report = classification_report(y_test, y_pred, output_dict=True)
        self.feature_importances = dict(zip(FEATURE_NAMES, self.model.feature_importances_))

        print(f"\n[OK] Model trained successfully!")
        print(f"[>>] Accuracy: {self.accuracy * 100:.2f}%")
        print(f"[>>] Feature Importances: {json.dumps({k: round(v, 4) for k, v in self.feature_importances.items()}, indent=2)}")
        print(f"\n[>>] Classification Report:")
        print(classification_report(y_test, y_pred))

        return self.accuracy

    def predict(self, team_experience, funding_amount, market_sentiment, industry_growth_rate):
        """
        Make a prediction for a single startup.

        Returns:
            dict with pos_score, risk_category, weakness, recommendation, feature_importances, prediction
        """
        if self.model is None:
            raise ValueError("Model has not been trained yet. Call train() first.")

        # Prepare input
        features = np.array([[team_experience, funding_amount, market_sentiment, industry_growth_rate]])
        features_scaled = self.scaler.transform(features)

        # Predict
        prediction = int(self.model.predict(features_scaled)[0])
        probabilities = self.model.predict_proba(features_scaled)[0]
        pos_score = round(probabilities[1] * 100, 1)  # Probability of success as percentage

        # Risk category
        if pos_score >= 65:
            risk_category = "Low Risk"
        elif pos_score >= 40:
            risk_category = "Medium Risk"
        else:
            risk_category = "High Risk"

        # Identify biggest weakness
        input_values = {
            "team_experience": team_experience,
            "funding_amount": funding_amount,
            "market_sentiment": market_sentiment,
            "industry_growth_rate": industry_growth_rate,
        }

        weakness_scores = {}
        for feature, config in WEAKNESS_THRESHOLDS.items():
            value = input_values[feature]
            if value <= config["low"]:
                # Weight by feature importance
                importance = self.feature_importances.get(feature, 0.25)
                deficit = 1 - (value / config["low"]) if config["low"] > 0 else 0
                weakness_scores[config["label"]] = deficit * importance

        if weakness_scores:
            weakness = max(weakness_scores, key=weakness_scores.get)
        else:
            # If no clear weakness, pick the least strong feature relatively
            relative_scores = {}
            for feature, config in WEAKNESS_THRESHOLDS.items():
                value = input_values[feature]
                if feature == "funding_amount":
                    relative_scores[config["label"]] = value / 50000000
                elif feature == "team_experience":
                    relative_scores[config["label"]] = value / 5
                elif feature == "market_sentiment":
                    relative_scores[config["label"]] = value
                elif feature == "industry_growth_rate":
                    relative_scores[config["label"]] = value / 40
            weakness = min(relative_scores, key=relative_scores.get)

        recommendation = RECOMMENDATIONS.get(weakness, "Continue building strong fundamentals across all areas.")

        return {
            "prediction": prediction,
            "pos_score": pos_score,
            "risk_category": risk_category,
            "weakness": weakness,
            "recommendation": recommendation,
            "feature_importances": {k: round(v, 4) for k, v in self.feature_importances.items()},
        }

    def save(self, model_path="models/model.pkl", scaler_path="models/scaler.pkl"):
        """Save the trained model and scaler to disk."""
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)

        # Save metadata
        meta = {
            "accuracy": self.accuracy,
            "feature_importances": {k: round(v, 4) for k, v in self.feature_importances.items()},
            "feature_names": FEATURE_NAMES,
        }
        meta_path = os.path.join(os.path.dirname(model_path), "metadata.json")
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)

        print(f"[OK] Model saved to {model_path}")

    def load(self, model_path="models/model.pkl", scaler_path="models/scaler.pkl"):
        """Load a trained model and scaler from disk."""
        meta_path = os.path.join(os.path.dirname(model_path), "metadata.json")

        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)

        with open(meta_path, "r") as f:
            meta = json.load(f)

        self.accuracy = meta["accuracy"]
        self.feature_importances = meta["feature_importances"]
        print(f"[OK] Model loaded (accuracy: {self.accuracy * 100:.2f}%)")


if __name__ == "__main__":
    predictor = StartupPredictor()
    predictor.train()
    predictor.save()

    # Test prediction
    print("\n" + "=" * 60)
    print("[TEST] Prediction:")
    result = predictor.predict(
        team_experience=4,
        funding_amount=2000000,
        market_sentiment=0.7,
        industry_growth_rate=15
    )
    print(json.dumps(result, indent=2))
