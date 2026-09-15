"""
Dataset generator for The Predictive Edge.
Generates a synthetic structured startup dataset for training the ML model.
"""

import numpy as np
import pandas as pd
import os


def generate_startup_dataset(n_samples=2000, seed=42):
    """
    Generate a synthetic startup dataset with realistic feature distributions.

    Features:
        - team_experience: 1-5 scale (integer)
        - funding_amount: in USD (continuous, 10k - 50M)
        - market_sentiment: 0-1 (continuous)
        - industry_growth_rate: percentage (continuous, -5% to 40%)

    Target:
        - success: 0 (Failure) or 1 (Success)
    """
    np.random.seed(seed)

    # Generate features with realistic distributions
    team_experience = np.random.randint(1, 6, size=n_samples)
    funding_amount = np.random.lognormal(mean=13, sigma=1.5, size=n_samples).clip(10000, 50000000)
    market_sentiment = np.random.beta(a=2, b=2, size=n_samples)
    industry_growth_rate = np.random.normal(loc=12, scale=8, size=n_samples).clip(-5, 40)

    # Create a realistic success probability based on weighted features
    # Normalize features to 0-1 range for scoring
    norm_team = (team_experience - 1) / 4.0
    norm_funding = (np.log(funding_amount) - np.log(10000)) / (np.log(50000000) - np.log(10000))
    norm_sentiment = market_sentiment
    norm_growth = (industry_growth_rate + 5) / 45.0

    # Weighted combination (team and funding matter most)
    success_score = (
        0.30 * norm_team +
        0.25 * norm_funding +
        0.20 * norm_sentiment +
        0.15 * norm_growth +
        0.10 * np.random.uniform(0, 1, size=n_samples)  # noise factor
    )

    # Add interaction effects
    success_score += 0.05 * norm_team * norm_funding  # synergy between team & funding
    success_score -= 0.03 * (1 - norm_sentiment) * (1 - norm_growth)  # double negative penalty

    # Convert to binary with threshold
    threshold = np.percentile(success_score, 45)  # ~55% success rate
    success = (success_score >= threshold).astype(int)

    # Create DataFrame
    df = pd.DataFrame({
        "team_experience": team_experience,
        "funding_amount": np.round(funding_amount, 2),
        "market_sentiment": np.round(market_sentiment, 4),
        "industry_growth_rate": np.round(industry_growth_rate, 2),
        "success": success
    })

    return df


def save_dataset(df, filepath="data/startup_dataset.csv"):
    """Save the dataset to CSV."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    df.to_csv(filepath, index=False)
    print(f"[OK] Dataset saved to {filepath} ({len(df)} samples)")
    return filepath


if __name__ == "__main__":
    df = generate_startup_dataset()
    save_dataset(df)
    print("\n[>>] Dataset Summary:")
    print(df.describe())
    print(f"\n[>>] Success Rate: {df['success'].mean() * 100:.1f}%")
