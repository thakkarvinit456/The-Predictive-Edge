/**
 * The Predictive Edge — Frontend Logic
 * Handles form interactions, API calls, results rendering, and animations.
 */

// ─── Configuration ──────────────────────────────────────────────────────────
const API_BASE = window.location.origin;
const API_PREDICT = `${API_BASE}/predict`;
const API_HISTORY = `${API_BASE}/history`;
const API_MODEL_INFO = `${API_BASE}/model-info`;

// ─── DOM Elements ───────────────────────────────────────────────────────────
const form = document.getElementById("prediction-form");
const predictBtn = document.getElementById("predict-btn");
const btnContent = predictBtn.querySelector(".btn-content");
const btnLoading = predictBtn.querySelector(".btn-loading");

const teamSlider = document.getElementById("team-experience");
const teamValue = document.getElementById("team-value");
const fundingInput = document.getElementById("funding-amount");
const fundingDisplay = document.getElementById("funding-display");
const sentimentSlider = document.getElementById("market-sentiment");
const sentimentValue = document.getElementById("sentiment-value");
const growthSlider = document.getElementById("industry-growth");
const growthValue = document.getElementById("growth-value");

const resultsSection = document.getElementById("results-section");
const historySection = document.getElementById("history-section");

const posScore = document.getElementById("pos-score");
const posRingProgress = document.getElementById("pos-ring-progress");
const riskBadge = document.getElementById("risk-badge");
const riskText = document.getElementById("risk-text");
const predictionLabel = document.getElementById("prediction-label");
const weaknessText = document.getElementById("weakness-text");
const recommendationText = document.getElementById("recommendation-text");
const featureBars = document.getElementById("feature-bars");
const historyBody = document.getElementById("history-body");


// ─── SVG Gradient for PoS Ring (injected dynamically) ───────────────────────
(function injectSVGGradient() {
    const svg = document.querySelector(".pos-ring");
    if (!svg) return;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    grad.setAttribute("id", "posGradient");
    grad.setAttribute("x1", "0%");
    grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "100%");
    grad.setAttribute("y2", "100%");

    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("style", "stop-color:#6366f1");

    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop2.setAttribute("offset", "50%");
    stop2.setAttribute("style", "stop-color:#a855f7");

    const stop3 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop3.setAttribute("offset", "100%");
    stop3.setAttribute("style", "stop-color:#ec4899");

    grad.append(stop1, stop2, stop3);
    defs.append(grad);
    svg.prepend(defs);
})();


// ─── Slider & Input Handlers ────────────────────────────────────────────────
teamSlider.addEventListener("input", () => {
    teamValue.textContent = teamSlider.value;
});

fundingInput.addEventListener("input", () => {
    const val = parseFloat(fundingInput.value);
    if (!isNaN(val)) {
        fundingDisplay.textContent = formatCurrency(val);
    }
});

sentimentSlider.addEventListener("input", () => {
    sentimentValue.textContent = parseFloat(sentimentSlider.value).toFixed(2);
});

growthSlider.addEventListener("input", () => {
    growthValue.textContent = parseFloat(growthSlider.value).toFixed(1) + "%";
});


// ─── Format Helpers ─────────────────────────────────────────────────────────
function formatCurrency(num) {
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
    return `$${num.toLocaleString()}`;
}

function formatTimestamp(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Feature display name mapping
const FEATURE_DISPLAY_NAMES = {
    team_experience: "Team Experience",
    funding_amount: "Funding Amount",
    market_sentiment: "Market Sentiment",
    industry_growth_rate: "Industry Growth",
};

const FEATURE_BAR_COLORS = {
    team_experience: "bar-purple",
    funding_amount: "bar-green",
    market_sentiment: "bar-blue",
    industry_growth_rate: "bar-amber",
};


// ─── Form Submission ────────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Collect input values
    const payload = {
        team_experience: parseInt(teamSlider.value),
        funding_amount: parseFloat(fundingInput.value),
        market_sentiment: parseFloat(sentimentSlider.value),
        industry_growth_rate: parseFloat(growthSlider.value),
    };

    // Validate
    if (isNaN(payload.funding_amount) || payload.funding_amount < 0) {
        showError("Please enter a valid funding amount.");
        return;
    }

    // Set loading state
    setLoading(true);

    try {
        const response = await fetch(API_PREDICT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Prediction request failed");
        }

        const result = await response.json();
        renderResults(result);
        loadHistory();

    } catch (err) {
        console.error("Prediction error:", err);
        showError(err.message || "Failed to connect to the server. Ensure the backend is running.");
    } finally {
        setLoading(false);
    }
});


// ─── Render Results ─────────────────────────────────────────────────────────
function renderResults(data) {
    // Show results section with animation
    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

    // Animate PoS Score
    animateCounter(posScore, data.pos_score, 1500);

    // Animate ring
    const circumference = 2 * Math.PI * 70; // r=70
    const offset = circumference - (data.pos_score / 100) * circumference;
    posRingProgress.style.strokeDasharray = circumference;
    // Reset first then animate
    posRingProgress.style.transition = "none";
    posRingProgress.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            posRingProgress.style.transition = "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)";
            posRingProgress.style.strokeDashoffset = offset;
        });
    });

    // Update ring color based on score
    updateRingColor(data.pos_score);

    // Risk badge
    const riskClass = data.risk_category.toLowerCase().replace(" ", "-").replace("risk", "").trim();
    riskBadge.className = `risk-badge risk-${riskClass.replace(" ", "")}`;

    // Map risk categories to CSS classes
    if (data.risk_category === "Low Risk") {
        riskBadge.className = "risk-badge risk-low";
    } else if (data.risk_category === "Medium Risk") {
        riskBadge.className = "risk-badge risk-medium";
    } else {
        riskBadge.className = "risk-badge risk-high";
    }

    riskText.textContent = data.risk_category;

    // Prediction label
    predictionLabel.textContent = data.prediction === 1
        ? "✨ Predicted: Likely to Succeed"
        : "⚠️ Predicted: High Failure Risk";

    // Weakness
    weaknessText.textContent = data.weakness;

    // Recommendation
    recommendationText.textContent = data.recommendation;

    // Feature Importance
    renderFeatureImportance(data.feature_importances);
}


// ─── Animate Counter ────────────────────────────────────────────────────────
function animateCounter(element, target, duration = 1500) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * eased;

        element.textContent = current.toFixed(1);

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target.toFixed(1);
        }
    }

    requestAnimationFrame(update);
}


// ─── Update Ring Color ──────────────────────────────────────────────────────
function updateRingColor(score) {
    const svg = document.querySelector(".pos-ring");
    const grad = svg.querySelector("#posGradient");
    if (!grad) return;

    const stops = grad.querySelectorAll("stop");
    if (score >= 65) {
        // Green gradient
        stops[0].setAttribute("style", "stop-color:#10b981");
        stops[1].setAttribute("style", "stop-color:#06b6d4");
        stops[2].setAttribute("style", "stop-color:#3b82f6");
    } else if (score >= 40) {
        // Amber gradient
        stops[0].setAttribute("style", "stop-color:#f59e0b");
        stops[1].setAttribute("style", "stop-color:#f97316");
        stops[2].setAttribute("style", "stop-color:#ef4444");
    } else {
        // Red gradient
        stops[0].setAttribute("style", "stop-color:#ef4444");
        stops[1].setAttribute("style", "stop-color:#dc2626");
        stops[2].setAttribute("style", "stop-color:#b91c1c");
    }

    // Also update the score text color
    if (score >= 65) {
        posScore.style.color = "#10b981";
    } else if (score >= 40) {
        posScore.style.color = "#f59e0b";
    } else {
        posScore.style.color = "#ef4444";
    }
}


// ─── Render Feature Importance ──────────────────────────────────────────────
function renderFeatureImportance(importances) {
    if (!importances) return;

    const maxVal = Math.max(...Object.values(importances));

    featureBars.innerHTML = Object.entries(importances)
        .sort((a, b) => b[1] - a[1])
        .map(([key, val]) => {
            const pct = (val / maxVal * 100).toFixed(1);
            const displayName = FEATURE_DISPLAY_NAMES[key] || key;
            const colorClass = FEATURE_BAR_COLORS[key] || "bar-purple";

            return `
                <div class="feature-bar-item">
                    <div class="feature-bar-header">
                        <span class="feature-bar-name">${displayName}</span>
                        <span class="feature-bar-value">${(val * 100).toFixed(1)}%</span>
                    </div>
                    <div class="feature-bar-track">
                        <div class="feature-bar-fill ${colorClass}" data-width="${pct}"></div>
                    </div>
                </div>
            `;
        })
        .join("");

    // Trigger bar animations after render
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.querySelectorAll(".feature-bar-fill").forEach((bar) => {
                bar.style.width = bar.dataset.width + "%";
            });
        });
    });
}


// ─── Load History ───────────────────────────────────────────────────────────
async function loadHistory() {
    try {
        const response = await fetch(API_HISTORY);
        if (!response.ok) return;

        const history = await response.json();

        if (history.length === 0) {
            historySection.classList.add("hidden");
            return;
        }

        historySection.classList.remove("hidden");

        // Show most recent first
        const reversed = [...history].reverse().slice(0, 10);

        historyBody.innerHTML = reversed
            .map((entry) => {
                const inp = entry.inputs;
                const res = entry.result;
                const riskClass = getRiskClass(res.risk_category);

                return `
                    <tr>
                        <td>${formatTimestamp(entry.timestamp)}</td>
                        <td>${inp.team_experience}/5</td>
                        <td>${formatCurrency(inp.funding_amount)}</td>
                        <td>${inp.market_sentiment.toFixed(2)}</td>
                        <td>${inp.industry_growth_rate.toFixed(1)}%</td>
                        <td class="history-pos">${res.pos_score}%</td>
                        <td><span class="history-risk ${riskClass}">${res.risk_category}</span></td>
                    </tr>
                `;
            })
            .join("");

    } catch (err) {
        console.warn("Could not load history:", err);
    }
}

function getRiskClass(category) {
    if (category === "Low Risk") return "risk-low";
    if (category === "Medium Risk") return "risk-medium";
    return "risk-high";
}


// ─── Loading State ──────────────────────────────────────────────────────────
function setLoading(isLoading) {
    predictBtn.disabled = isLoading;

    if (isLoading) {
        btnContent.style.display = "none";
        btnLoading.style.display = "flex";
        predictBtn.style.opacity = "0.8";
    } else {
        btnContent.style.display = "flex";
        btnLoading.style.display = "none";
        predictBtn.style.opacity = "1";
    }
}


// ─── Error Toast ────────────────────────────────────────────────────────────
function showError(message) {
    // Remove existing toasts
    document.querySelectorAll(".error-toast").forEach((t) => t.remove());

    const toast = document.createElement("div");
    toast.className = "error-toast";
    toast.textContent = `⚠️ ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-10px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}


// ─── Initialize ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    // Set initial display values
    teamValue.textContent = teamSlider.value;
    fundingDisplay.textContent = formatCurrency(parseFloat(fundingInput.value));
    sentimentValue.textContent = parseFloat(sentimentSlider.value).toFixed(2);
    growthValue.textContent = parseFloat(growthSlider.value).toFixed(1) + "%";

    // Load history on startup
    loadHistory();

    // Fetch model info
    fetchModelInfo();
});


// ─── Model Info ─────────────────────────────────────────────────────────────
async function fetchModelInfo() {
    try {
        const response = await fetch(API_MODEL_INFO);
        if (!response.ok) return;
        const info = await response.json();

        const badge = document.getElementById("model-badge");
        const badgeText = badge.querySelector(".badge-text");
        if (info.accuracy) {
            badgeText.textContent = `ML Model Active · ${info.accuracy}% Accuracy`;
        }
    } catch (err) {
        // Backend might not be running yet — silent fail
        const badge = document.getElementById("model-badge");
        const badgeText = badge.querySelector(".badge-text");
        badgeText.textContent = "Backend Offline";
        badge.style.borderColor = "rgba(239, 68, 68, 0.2)";
        badge.style.background = "rgba(239, 68, 68, 0.1)";
        badge.style.color = "#ef4444";
        badge.querySelector(".badge-dot").style.background = "#ef4444";
    }
}
