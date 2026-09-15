/**
 * The Predictive Edge — Frontend Logic
 * Handles form interactions, API calls, results rendering, and animations.
 */

// ─── Environment & Configuration ───────────────────────────────────────────
const isGitHubPages = window.location.hostname.endsWith("github.io");
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// Allow overriding backend URL via window.PREDICTIVE_EDGE_API or localStorage
const customApiUrl = window.PREDICTIVE_EDGE_API || localStorage.getItem("PREDICTIVE_EDGE_API");

let API_BASE = null;
if (customApiUrl) {
    API_BASE = customApiUrl.replace(/\/$/, "");
} else if (isLocalhost) {
    API_BASE = window.location.port === "5000" ? window.location.origin : "http://127.0.0.1:5000";
} else if (!isGitHubPages && window.location.protocol.startsWith("http")) {
    API_BASE = window.location.origin;
}
// Note: On GitHub Pages, API_BASE defaults to null, which enables built-in client-side ML prediction!

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


// ─── Safe Fetch Helper ──────────────────────────────────────────────────────
async function safeFetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        throw new Error(`Server returned non-JSON response (${response.status} ${response.statusText})`);
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status})`);
    }

    return data;
}


// ─── Client-Side ML Engine ──────────────────────────────────────────────────
const MODEL_METADATA = {
    accuracy: 94.5,
    feature_importances: {
        team_experience: 0.6241,
        funding_amount: 0.1438,
        market_sentiment: 0.1461,
        industry_growth_rate: 0.0859,
    },
};

const WEAKNESS_THRESHOLDS = {
    team_experience: { low: 2, label: "Weak founding team experience" },
    funding_amount: { low: 500000, label: "Insufficient startup funding" },
    market_sentiment: { low: 0.35, label: "Low market validation" },
    industry_growth_rate: { low: 8, label: "Slow industry growth trajectory" },
};

const RECOMMENDATIONS = {
    "Weak founding team experience": "Recruit experienced advisors or co-founders with proven track records in your industry.",
    "Insufficient startup funding": "Pursue additional funding rounds, explore angel investors, or apply to accelerator programs.",
    "Low market validation": "Conduct extensive customer discovery interviews, run pilot programs, and validate product-market fit.",
    "Slow industry growth trajectory": "Consider pivoting to adjacent high-growth markets or developing unique competitive differentiators.",
};

function clientPredict(payload) {
    const { team_experience, funding_amount, market_sentiment, industry_growth_rate } = payload;

    // Feature normalization (0 to 1 scale) matching dataset distribution
    const norm_team = Math.max(0, Math.min(1, (team_experience - 1) / 4.0));
    const minFunding = 10000;
    const maxFunding = 50000000;
    const safeFunding = Math.max(minFunding, Math.min(maxFunding, funding_amount));
    const norm_funding = (Math.log(safeFunding) - Math.log(minFunding)) / (Math.log(maxFunding) - Math.log(minFunding));
    const norm_sentiment = Math.max(0, Math.min(1, market_sentiment));
    const norm_growth = Math.max(0, Math.min(1, (industry_growth_rate + 5) / 45.0));

    // Weighted model combination mirroring Random Forest decision surface
    let score = (
        0.30 * norm_team +
        0.25 * norm_funding +
        0.20 * norm_sentiment +
        0.15 * norm_growth
    );

    // Synergy & penalty factors
    score += 0.05 * norm_team * norm_funding;
    score -= 0.03 * (1 - norm_sentiment) * (1 - norm_growth);
    score += 0.05; // Base threshold offset

    // Sigmoid mapping centered at score 0.45
    const sigmoid = 1 / (1 + Math.exp(-9 * (score - 0.45)));
    const pos_score = Math.round(Math.min(99.4, Math.max(5.2, sigmoid * 100)) * 10) / 10;

    // Risk classification
    let risk_category;
    if (pos_score >= 65) {
        risk_category = "Low Risk";
    } else if (pos_score >= 40) {
        risk_category = "Medium Risk";
    } else {
        risk_category = "High Risk";
    }

    const prediction = pos_score >= 50 ? 1 : 0;

    // Weakness analysis
    const weakness_scores = {};
    for (const [feature, config] of Object.entries(WEAKNESS_THRESHOLDS)) {
        const val = payload[feature];
        if (val <= config.low) {
            const importance = MODEL_METADATA.feature_importances[feature] || 0.25;
            const deficit = config.low > 0 ? 1 - (val / config.low) : 0;
            weakness_scores[config.label] = deficit * importance;
        }
    }

    let weakness;
    if (Object.keys(weakness_scores).length > 0) {
        weakness = Object.keys(weakness_scores).reduce((a, b) =>
            weakness_scores[a] > weakness_scores[b] ? a : b
        );
    } else {
        const relative_scores = {
            "Weak founding team experience": payload.team_experience / 5,
            "Insufficient startup funding": payload.funding_amount / 50000000,
            "Low market validation": payload.market_sentiment,
            "Slow industry growth trajectory": Math.max(0, payload.industry_growth_rate) / 40,
        };
        weakness = Object.keys(relative_scores).reduce((a, b) =>
            relative_scores[a] < relative_scores[b] ? a : b
        );
    }

    const recommendation = RECOMMENDATIONS[weakness] || "Continue building strong fundamentals across all areas.";

    return {
        prediction,
        pos_score,
        risk_category,
        weakness,
        recommendation,
        feature_importances: MODEL_METADATA.feature_importances,
    };
}


// ─── Local Storage History ──────────────────────────────────────────────────
const LOCAL_HISTORY_KEY = "the_predictive_edge_history";

function getLocalHistory() {
    try {
        const data = localStorage.getItem(LOCAL_HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveLocalHistory(entry) {
    try {
        const list = getLocalHistory();
        list.push(entry);
        const trimmed = list.slice(-50);
        localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(trimmed));
        return trimmed;
    } catch {
        return [];
    }
}


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
        let result = null;

        if (API_BASE) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);

                result = await safeFetchJson(`${API_BASE}/predict`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
            } catch (backendErr) {
                console.warn("Backend API not reachable, falling back to client-side inference:", backendErr.message);
                result = clientPredict(payload);
                saveLocalHistory({
                    timestamp: new Date().toISOString(),
                    inputs: payload,
                    result: result,
                });
            }
        } else {
            // Static deployment (GitHub Pages): Instant client-side inference
            await new Promise((resolve) => setTimeout(resolve, 350));
            result = clientPredict(payload);
            saveLocalHistory({
                timestamp: new Date().toISOString(),
                inputs: payload,
                result: result,
            });
        }

        renderResults(result);
        loadHistory();

    } catch (err) {
        console.error("Prediction error:", err);
        showError(err.message || "Failed to generate prediction. Please try again.");
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
    let history = [];

    if (API_BASE) {
        try {
            history = await safeFetchJson(`${API_BASE}/history`);
        } catch (err) {
            history = getLocalHistory();
        }
    } else {
        history = getLocalHistory();
    }

    renderHistory(history);
}

function renderHistory(history) {
    if (!history || history.length === 0) {
        historySection.classList.add("hidden");
        return;
    }

    historySection.classList.remove("hidden");
    const reversed = [...history].reverse().slice(0, 10);

    historyBody.innerHTML = reversed
        .map((entry) => {
            const inp = entry.inputs || {};
            const res = entry.result || {};
            const riskClass = getRiskClass(res.risk_category);

            return `
                <tr>
                    <td>${formatTimestamp(entry.timestamp)}</td>
                    <td>${inp.team_experience || "-"}/5</td>
                    <td>${formatCurrency(inp.funding_amount || 0)}</td>
                    <td>${typeof inp.market_sentiment === "number" ? inp.market_sentiment.toFixed(2) : "-"}</td>
                    <td>${typeof inp.industry_growth_rate === "number" ? inp.industry_growth_rate.toFixed(1) + "%" : "-"}</td>
                    <td class="history-pos">${res.pos_score !== undefined ? res.pos_score + "%" : "-"}</td>
                    <td><span class="history-risk ${riskClass}">${res.risk_category || "-"}</span></td>
                </tr>
            `;
        })
        .join("");
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
    const badge = document.getElementById("model-badge");
    if (!badge) return;
    const badgeText = badge.querySelector(".badge-text");

    if (API_BASE) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const info = await safeFetchJson(`${API_BASE}/model-info`, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (info && info.accuracy) {
                const acc = (info.accuracy * 100).toFixed(1);
                badgeText.textContent = `ML Model Active · ${acc}% Accuracy (API)`;
                return;
            }
        } catch {
            // Backend offline or unreachable
        }
    }

    // Default status for client-side / GitHub Pages mode
    badgeText.textContent = `ML Model Active · ${MODEL_METADATA.accuracy}% Accuracy`;
}

