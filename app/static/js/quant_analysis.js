/**
 * Quantitative Analysis Module
 * 
 * Provides advanced quant finance features:
 * - Fibonacci Retracements & Extensions
 * - Bollinger Bands with Squeeze Detection
 * - Mean Reversion Signals
 * - Monte Carlo Simulation
 */

// ============================================
// FIBONACCI ANALYSIS
// ============================================

async function loadFibonacciAnalysis(symbol) {
    try {
        const response = await fetch(`/api/quant/fibonacci/${encodeURIComponent(symbol)}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to load Fibonacci analysis');
        }

        return data.data;
    } catch (error) {
        console.error('Fibonacci analysis error:', error);
        return null;
    }
}

function displayFibonacciLevels(fibData, chartContainer) {
    if (!fibData) return;

    const levelsHtml = `
        <div class="fib-levels-panel">
            <div class="panel-header">
                <h4>📐 Fibonacci Levels</h4>
                <span class="trend-badge ${fibData.trend}">${fibData.trend.toUpperCase()}</span>
            </div>
            
            <div class="fib-levels-grid">
                <!-- Extension Levels -->
                <div class="fib-section">
                    <h5>🎯 Extensions (Targets)</h5>
                    <div class="fib-level extension">
                        <span class="level-label">261.8%</span>
                        <span class="level-value">${fibData.fib_ext_2618.toFixed(5)}</span>
                    </div>
                    <div class="fib-level extension">
                        <span class="level-label">200.0%</span>
                        <span class="level-value">${fibData.fib_ext_2000.toFixed(5)}</span>
                    </div>
                    <div class="fib-level extension">
                        <span class="level-label">161.8%</span>
                        <span class="level-value">${fibData.fib_ext_1618.toFixed(5)}</span>
                    </div>
                    <div class="fib-level extension">
                        <span class="level-label">127.2%</span>
                        <span class="level-value">${fibData.fib_ext_1272.toFixed(5)}</span>
                    </div>
                </div>
                
                <!-- Retracement Levels -->
                <div class="fib-section">
                    <h5>📊 Retracements (Support/Resistance)</h5>
                    <div class="fib-level ${isNearLevel(fibData.current_price, fibData.fib_0) ? 'active' : ''}">
                        <span class="level-label">0.0%</span>
                        <span class="level-value">${fibData.fib_0.toFixed(5)}</span>
                    </div>
                    <div class="fib-level ${isNearLevel(fibData.current_price, fibData.fib_236) ? 'active' : ''}">
                        <span class="level-label">23.6%</span>
                        <span class="level-value">${fibData.fib_236.toFixed(5)}</span>
                    </div>
                    <div class="fib-level golden ${isNearLevel(fibData.current_price, fibData.fib_382) ? 'active' : ''}">
                        <span class="level-label">38.2%</span>
                        <span class="level-value">${fibData.fib_382.toFixed(5)}</span>
                    </div>
                    <div class="fib-level ${isNearLevel(fibData.current_price, fibData.fib_50) ? 'active' : ''}">
                        <span class="level-label">50.0%</span>
                        <span class="level-value">${fibData.fib_50.toFixed(5)}</span>
                    </div>
                    <div class="fib-level golden ${isNearLevel(fibData.current_price, fibData.fib_618) ? 'active' : ''}">
                        <span class="level-label">61.8% ⭐</span>
                        <span class="level-value">${fibData.fib_618.toFixed(5)}</span>
                    </div>
                    <div class="fib-level ${isNearLevel(fibData.current_price, fibData.fib_786) ? 'active' : ''}">
                        <span class="level-label">78.6%</span>
                        <span class="level-value">${fibData.fib_786.toFixed(5)}</span>
                    </div>
                    <div class="fib-level ${isNearLevel(fibData.current_price, fibData.fib_100) ? 'active' : ''}">
                        <span class="level-label">100.0%</span>
                        <span class="level-value">${fibData.fib_100.toFixed(5)}</span>
                    </div>
                </div>
            </div>
            
            <div class="fib-info">
                <div class="info-item">
                    <span class="info-label">Current Price:</span>
                    <span class="info-value">${fibData.current_price.toFixed(5)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Nearest Level:</span>
                    <span class="info-value">${fibData.nearest_level} (${fibData.distance_to_nearest_pct.toFixed(2)}% away)</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Signal:</span>
                    <span class="signal-badge ${fibData.signal.toLowerCase()}">${fibData.signal}</span>
                </div>
            </div>
            
            <div class="fib-recommendation">
                <strong>💡 Analysis:</strong> ${fibData.recommendation}
            </div>
        </div>
    `;

    const container = document.getElementById(chartContainer) || document.querySelector('.quant-panel');
    if (container) {
        const fibPanel = document.createElement('div');
        fibPanel.innerHTML = levelsHtml;
        container.appendChild(fibPanel);
    }
}

function isNearLevel(currentPrice, levelPrice, threshold = 0.002) {
    const diff = Math.abs(currentPrice - levelPrice) / levelPrice;
    return diff < threshold; // Within 0.2%
}

// ============================================
// BOLLINGER BANDS ANALYSIS
// ============================================

async function loadBollingerBands(symbol) {
    try {
        const response = await fetch(`/api/quant/bollinger/${encodeURIComponent(symbol)}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to load Bollinger Bands');
        }

        return data.data;
    } catch (error) {
        console.error('Bollinger Bands error:', error);
        return null;
    }
}

function displayBollingerBands(bbData) {
    if (!bbData) return '';

    const squeezeIcon = bbData.is_squeeze ? '⚠️' : '';
    const signalColor = getSignalColor(bbData.signal);

    return `
        <div class="bb-panel quant-card">
            <div class="panel-header">
                <h4>📊 Bollinger Bands ${squeezeIcon}</h4>
                <span class="volatility-badge ${bbData.volatility}">${bbData.volatility.toUpperCase()}</span>
            </div>
            
            <div class="bb-bands">
                <div class="band-item upper">
                    <span class="band-label">Upper Band</span>
                    <span class="band-value">${bbData.upper_band.toFixed(5)}</span>
                </div>
                <div class="band-item middle">
                    <span class="band-label">Middle (SMA 20)</span>
                    <span class="band-value">${bbData.middle_band.toFixed(5)}</span>
                </div>
                <div class="band-item lower">
                    <span class="band-label">Lower Band</span>
                    <span class="band-value">${bbData.lower_band.toFixed(5)}</span>
                </div>
            </div>
            
            <div class="bb-metrics">
                <div class="metric">
                    <span class="metric-label">Current Price</span>
                    <span class="metric-value">${bbData.current_price.toFixed(5)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Bandwidth</span>
                    <span class="metric-value">${bbData.bandwidth.toFixed(2)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">%B Position</span>
                    <span class="metric-value">${(bbData.percent_b * 100).toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Position</span>
                    <span class="metric-value position-${bbData.position}">${bbData.position.replace('_', ' ').toUpperCase()}</span>
                </div>
            </div>
            
            ${bbData.is_squeeze ? `
                <div class="squeeze-alert">
                    <strong>🔥 SQUEEZE DETECTED (${bbData.squeeze_intensity})</strong>
                    <p>Low volatility - Breakout imminent! Wait for direction confirmation.</p>
                </div>
            ` : ''}
            
            <div class="bb-signal">
                <div class="signal-indicator" style="background: ${signalColor}">
                    ${bbData.signal.replace('_', ' ')}
                </div>
                <p class="signal-text">${bbData.recommendation}</p>
            </div>
        </div>
    `;
}

// ============================================
// MEAN REVERSION ANALYSIS
// ============================================

async function loadMeanReversion(symbol) {
    try {
        const response = await fetch(`/api/quant/mean-reversion/${encodeURIComponent(symbol)}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to load Mean Reversion analysis');
        }

        return data.data;
    } catch (error) {
        console.error('Mean Reversion error:', error);
        return null;
    }
}

function displayMeanReversion(mrData) {
    if (!mrData) return '';

    const zscoreColor = mrData.zscore > 2 ? '#ef4444' : mrData.zscore < -2 ? '#10b981' : '#f59e0b';
    const confidenceBadge = mrData.confidence === 'high' ? '🟢' : mrData.confidence === 'medium' ? '🟡' : '⚪';

    return `
        <div class="mr-panel quant-card">
            <div class="panel-header">
                <h4>🔄 Mean Reversion Strategy</h4>
                <span class="confidence-badge ${mrData.confidence}">${confidenceBadge} ${mrData.confidence.toUpperCase()}</span>
            </div>
            
            <div class="zscore-meter">
                <div class="zscore-label">Z-Score: <strong style="color: ${zscoreColor}">${mrData.zscore.toFixed(2)}</strong></div>
                <div class="zscore-bar">
                    <div class="zscore-fill" style="width: ${Math.min(100, Math.abs(mrData.zscore) * 25)}%; background: ${zscoreColor}"></div>
                </div>
                <div class="zscore-zones">
                    <span class="zone oversold">Oversold (&lt;-2)</span>
                    <span class="zone neutral">Neutral</span>
                    <span class="zone overbought">Overbought (&gt;2)</span>
                </div>
                <div class="zscore-signal ${mrData.zscore_signal}">${mrData.zscore_signal.toUpperCase()}</div>
            </div>
            
            <div class="mr-metrics">
                <div class="metric-row">
                    <span class="metric-label">Deviation from SMA 20:</span>
                    <span class="metric-value ${mrData.deviation_sma20_pct > 0 ? 'positive' : 'negative'}">
                        ${mrData.deviation_sma20_pct > 0 ? '+' : ''}${mrData.deviation_sma20_pct.toFixed(2)}%
                    </span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Deviation from SMA 50:</span>
                    <span class="metric-value ${mrData.deviation_sma50_pct > 0 ? 'positive' : 'negative'}">
                        ${mrData.deviation_sma50_pct > 0 ? '+' : ''}${mrData.deviation_sma50_pct.toFixed(2)}%
                    </span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">RSI:</span>
                    <span class="metric-value">${mrData.rsi.toFixed(1)}</span>
                </div>
                ${mrData.half_life_days ? `
                    <div class="metric-row">
                        <span class="metric-label">Half-Life:</span>
                        <span class="metric-value">${mrData.half_life_days.toFixed(1)} days</span>
                    </div>
                ` : ''}
                ${mrData.rsi_divergence ? `
                    <div class="divergence-alert">
                        <strong>⚡ ${mrData.rsi_divergence.replace('_', ' ').toUpperCase()}</strong>
                    </div>
                ` : ''}
            </div>
            
            <div class="reversion-probability">
                <div class="prob-label">Reversion Probability</div>
                <div class="prob-bar">
                    <div class="prob-fill" style="width: ${mrData.reversion_probability}%"></div>
                    <span class="prob-text">${mrData.reversion_probability}%</span>
                </div>
                <div class="expected-move">
                    Expected reversion: <strong>${mrData.expected_reversion_pct > 0 ? '+' : ''}${mrData.expected_reversion_pct.toFixed(2)}%</strong>
                </div>
            </div>
            
            <div class="mr-signal">
                <div class="signal-badge ${mrData.signal.toLowerCase().replace('_', '-')}">${mrData.signal.replace('_', ' ')}</div>
                <p class="recommendation-text">${mrData.recommendation}</p>
            </div>
        </div>
    `;
}

// ============================================
// MONTE CARLO SIMULATION
// ============================================

async function loadMonteCarloSimulation(symbol, days = 30) {
    try {
        const response = await fetch(`/api/quant/monte-carlo/${encodeURIComponent(symbol)}?days=${days}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to load Monte Carlo simulation');
        }

        return data.data;
    } catch (error) {
        console.error('Monte Carlo error:', error);
        return null;
    }
}

function displayMonteCarloResults(mcData) {
    if (!mcData) return '';

    const bullishProb = mcData.prob_above_current;
    const bearishProb = 100 - bullishProb;
    const expectedReturn = mcData.expected_return_pct;
    const returnColor = expectedReturn > 0 ? '#10b981' : '#ef4444';

    return `
        <div class="mc-panel quant-card">
            <div class="panel-header">
                <h4>🎲 Monte Carlo Simulation</h4>
                <span class="sim-badge">${mcData.num_simulations.toLocaleString()} simulations × ${mcData.simulation_days} days</span>
            </div>
            
            <div class="probability-chart">
                <div class="prob-section bullish" style="width: ${bullishProb}%">
                    <span class="prob-label">🟢 Bullish</span>
                    <span class="prob-value">${bullishProb.toFixed(1)}%</span>
                </div>
                <div class="prob-section bearish" style="width: ${bearishProb}%">
                    <span class="prob-label">🔴 Bearish</span>
                    <span class="prob-value">${bearishProb.toFixed(1)}%</span>
                </div>
            </div>
            
            <div class="mc-distribution">
                <h5>📊 Price Distribution (${mcData.simulation_days} days)</h5>
                <div class="distribution-bars">
                    <div class="dist-bar">
                        <span class="dist-label">5th %ile (Worst)</span>
                        <span class="dist-value negative">${mcData.percentile_5.toFixed(5)}</span>
                    </div>
                    <div class="dist-bar">
                        <span class="dist-label">25th %ile</span>
                        <span class="dist-value">${mcData.percentile_25.toFixed(5)}</span>
                    </div>
                    <div class="dist-bar current">
                        <span class="dist-label">Current</span>
                        <span class="dist-value">${mcData.current_price.toFixed(5)}</span>
                    </div>
                    <div class="dist-bar">
                        <span class="dist-label">Median</span>
                        <span class="dist-value">${mcData.median_price.toFixed(5)}</span>
                    </div>
                    <div class="dist-bar">
                        <span class="dist-label">Mean</span>
                        <span class="dist-value">${mcData.mean_price.toFixed(5)}</span>
                    </div>
                    <div class="dist-bar">
                        <span class="dist-label">75th %ile</span>
                        <span class="dist-value">${mcData.percentile_75.toFixed(5)}</span>
                    </div>
                    <div class="dist-bar">
                        <span class="dist-label">95th %ile (Best)</span>
                        <span class="dist-value positive">${mcData.percentile_95.toFixed(5)}</span>
                    </div>
                </div>
            </div>
            
            <div class="mc-metrics-grid">
                <div class="mc-metric">
                    <span class="metric-icon">📈</span>
                    <div class="metric-content">
                        <span class="metric-label">Expected Return</span>
                        <span class="metric-value" style="color: ${returnColor}">
                            ${expectedReturn > 0 ? '+' : ''}${expectedReturn.toFixed(2)}%
                        </span>
                    </div>
                </div>
                <div class="mc-metric">
                    <span class="metric-icon">🎯</span>
                    <div class="metric-content">
                        <span class="metric-label">Prob. 10%+ Gain</span>
                        <span class="metric-value">${mcData.prob_gain_10_pct.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="mc-metric">
                    <span class="metric-icon">⚠️</span>
                    <div class="metric-content">
                        <span class="metric-label">Prob. 10%+ Loss</span>
                        <span class="metric-value">${mcData.prob_loss_10_pct.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="mc-metric">
                    <span class="metric-icon">📉</span>
                    <div class="metric-content">
                        <span class="metric-label">VaR 95%</span>
                        <span class="metric-value">${mcData.var_95.toFixed(5)}</span>
                    </div>
                </div>
                <div class="mc-metric">
                    <span class="metric-icon">📊</span>
                    <div class="metric-content">
                        <span class="metric-label">Sharpe Ratio</span>
                        <span class="metric-value">${mcData.sharpe_estimate.toFixed(2)}</span>
                    </div>
                </div>
                <div class="mc-metric">
                    <span class="metric-icon">⚖️</span>
                    <div class="metric-content">
                        <span class="metric-label">Risk/Reward</span>
                        <span class="metric-value">${mcData.risk_reward_ratio.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <div class="mc-recommendation">
                <div class="confidence-badge ${mcData.confidence}">${mcData.confidence.toUpperCase()} CONFIDENCE</div>
                <p>${mcData.recommendation}</p>
            </div>
        </div>
    `;
}

// ============================================
// COMBINED QUANT ANALYSIS
// ============================================

async function loadFullQuantAnalysis(symbol) {
    try {
        const response = await fetch(`/api/quant/full/${encodeURIComponent(symbol)}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to load quant analysis');
        }

        return data.data;
    } catch (error) {
        console.error('Full quant analysis error:', error);
        return null;
    }
}

function displayFullQuantAnalysis(quantData, containerId) {
    if (!quantData) {
        console.error('No quant data to display');
        return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }

    const html = `
        <div class="quant-analysis-container">
            <div class="quant-header">
                <h2>🎯 Quantitative Analysis: ${quantData.symbol}</h2>
                <div class="quant-summary">
                    <div class="combined-signal ${quantData.combined_signal.toLowerCase().replace('_', '-')}">
                        ${quantData.combined_signal.replace('_', ' ')}
                    </div>
                    <div class="strength-meter">
                        <span>Strength:</span>
                        <div class="strength-bar">
                            <div class="strength-fill" style="width: ${quantData.combined_strength * 10}%"></div>
                        </div>
                        <span>${quantData.combined_strength}/10</span>
                    </div>
                    <div class="confidence-indicator ${quantData.confidence_level}">
                        ${quantData.confidence_level.toUpperCase()} CONFIDENCE
                    </div>
                </div>
            </div>
            
            <div class="quant-recommendation-banner">
                <strong>💡 Combined Recommendation:</strong> ${quantData.recommendation}
            </div>
            
            <div class="quant-grid">
                ${displayFibonacciCard(quantData.fibonacci)}
                ${displayBollingerBands(quantData.bollinger)}
                ${displayMeanReversion(quantData.mean_reversion)}
                ${displayMonteCarloResults(quantData.monte_carlo)}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function displayFibonacciCard(fibData) {
    return `
        <div class="quant-card fib-card">
            <h4>📐 Fibonacci</h4>
            <div class="quick-stats">
                <div class="stat">
                    <span class="label">Trend:</span>
                    <span class="value ${fibData.trend}">${fibData.trend.toUpperCase()}</span>
                </div>
                <div class="stat">
                    <span class="label">Signal:</span>
                    <span class="value signal-${fibData.signal.toLowerCase()}">${fibData.signal}</span>
                </div>
                <div class="stat">
                    <span class="label">Nearest:</span>
                    <span class="value">${fibData.nearest_level}</span>
                </div>
            </div>
            <button class="view-details-btn" onclick="showFibonacciDetails('${fibData.symbol}')">View Details</button>
        </div>
    `;
}

// Helper function
function getSignalColor(signal) {
    const colors = {
        'STRONG_BUY': '#10b981',
        'BUY': '#34d399',
        'NEUTRAL': '#f59e0b',
        'SELL': '#fb923c',
        'STRONG_SELL': '#ef4444'
    };
    return colors[signal] || '#64748b';
}

// Export functions for global access
window.quantAnalysis = {
    loadFibonacciAnalysis,
    loadBollingerBands,
    loadMeanReversion,
    loadMonteCarloSimulation,
    loadFullQuantAnalysis,
    displayFullQuantAnalysis,
    displayFibonacciLevels,
    displayBollingerBands,
    displayMeanReversion,
    displayMonteCarloResults
};
