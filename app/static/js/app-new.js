/**
 * Money Market Intelligence
 * New Tailwind UI JavaScript
 */

// ============================================
// DOM Elements
// ============================================
const generateBtn = document.getElementById('generateBtn');
const emailToggle = document.getElementById('emailToggle');
const loadingState = document.getElementById('loadingState');
const dashboardContent = document.getElementById('dashboardContent');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// Charts
let stockChart = null;
let sectorChart = null;

// Store last report
let lastReport = null;

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupGenerateButton();
    checkHealth();
    initMarketStatus();
});

// ============================================
// Sidebar Controls
// ============================================
function openSidebar() {
    sidebar.classList.add('open');
    sidebar.classList.remove('-translate-x-full');
    sidebarOverlay.classList.remove('hidden');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('hidden');
}

window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;

// ============================================
// Navigation
// ============================================
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.dataset.page;

            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show target page
            pages.forEach(page => {
                page.classList.remove('active');
                page.classList.add('hidden');
            });

            const pageElement = document.getElementById(`${targetPage}Page`);
            if (pageElement) {
                pageElement.classList.remove('hidden');
                pageElement.classList.add('active');
            }

            // Close mobile sidebar
            closeSidebar();

            // Auto-load content for certain pages
            if (targetPage === 'news' && newsData.length === 0) {
                loadNews();
            }
            if (targetPage === 'usMarkets') {
                loadUSMarketsData();
            }
            if (targetPage === 'nigerian') {
                loadNGXData();
            }
            if (targetPage === 'forex' && !forexData) {
                loadForexData();
            }
            if (targetPage === 'signals') {
                loadSignalsHistory();
            }
        });
    });
}

// ============================================
// API Health Check
// ============================================
async function checkHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();

        if (data.status === 'healthy') {
            setStatus('Connected', 'success');
        } else {
            setStatus('Degraded', 'warning');
        }
    } catch (error) {
        setStatus('Offline', 'error');
    }
}

function setStatus(text, type) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    statusText.textContent = text;

    statusDot.classList.remove('bg-emerald-500', 'bg-amber-500', 'bg-rose-500');

    if (type === 'success') {
        statusDot.classList.add('bg-emerald-500');
    } else if (type === 'warning') {
        statusDot.classList.add('bg-amber-500');
    } else {
        statusDot.classList.add('bg-rose-500');
    }
}

// ============================================
// Market Status
// ============================================
function initMarketStatus() {
    updateMarketStatus();
    setInterval(updateMarketStatus, 60000); // Update every minute
}

function updateMarketStatus() {
    const now = new Date();

    // US Market
    const usStatus = getUSMarketStatus(now);
    updateMarketDisplay('us', usStatus);

    // NG Market
    const ngStatus = getNGMarketStatus(now);
    updateMarketDisplay('ng', ngStatus);
}

function getUSMarketStatus(now) {
    // Convert to EST
    const estOffset = -5;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const est = new Date(utc + (3600000 * estOffset));

    const day = est.getDay();
    const hours = est.getHours();
    const minutes = est.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const marketOpen = 9 * 60 + 30;  // 9:30 AM
    const marketClose = 16 * 60;      // 4:00 PM
    const preMarket = 4 * 60;         // 4:00 AM

    // Weekend
    if (day === 0 || day === 6) {
        return { status: 'closed', text: 'Weekend', class: 'status-closed' };
    }

    // Pre-market
    if (currentMinutes >= preMarket && currentMinutes < marketOpen) {
        return { status: 'pre', text: 'Pre-Market', class: 'status-pre' };
    }

    // Open
    if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
        return { status: 'open', text: 'Open', class: 'status-open' };
    }

    // Closed
    return { status: 'closed', text: 'Closed', class: 'status-closed' };
}

function getNGMarketStatus(now) {
    // WAT is UTC+1
    const watOffset = 1;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wat = new Date(utc + (3600000 * watOffset));

    const day = wat.getDay();
    const hours = wat.getHours();
    const minutes = wat.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const marketOpen = 10 * 60;       // 10:00 AM
    const marketClose = 14 * 60 + 30; // 2:30 PM

    // Weekend
    if (day === 0 || day === 6) {
        return { status: 'closed', text: 'Weekend', class: 'status-closed' };
    }

    // Open
    if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
        return { status: 'open', text: 'Open', class: 'status-open' };
    }

    // Closed
    return { status: 'closed', text: 'Closed', class: 'status-closed' };
}

function updateMarketDisplay(market, statusData) {
    const badge = document.getElementById(`${market}StatusBadge`);
    if (!badge) return;

    badge.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusData.class}`;
    badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-current ${statusData.status === 'open' ? 'animate-pulse' : ''}"></span>
        <span>${statusData.text}</span>
    `;
}

// ============================================
// Generate Report
// ============================================
function setupGenerateButton() {
    if (generateBtn) {
        generateBtn.addEventListener('click', generateReport);
    }
}

async function generateReport() {
    const btnText = generateBtn.querySelector('.btn-text');
    const btnLoader = generateBtn.querySelector('.btn-loader');

    // Show loading
    generateBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    loadingState.classList.remove('hidden');
    dashboardContent.classList.add('hidden');

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                send_email: emailToggle?.checked || false,
                include_nigerian: true
            })
        });

        if (!response.ok) throw new Error('Analysis failed');

        const data = await response.json();

        if (data.success && data.report) {
            lastReport = data.report;
            displayReport(data.report);
            showToast('Report generated successfully!', 'success');
        } else {
            throw new Error(data.message || 'Unknown error');
        }

    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Failed to generate report', 'error');
    } finally {
        // Hide loading
        generateBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        loadingState.classList.add('hidden');
        dashboardContent.classList.remove('hidden');
    }
}

// ============================================
// Display Report
// ============================================
function displayReport(report) {
    const { market_data, analysis, nigerian_market } = report;

    console.log('Report received:', report); // Debug

    // Update timestamp
    document.getElementById('lastUpdate').textContent = `Last updated: ${report.date}`;

    // Update mood based on sector rotation or first key insight
    updateMarketMood(market_data, analysis);

    // Update stats
    updateStatCards(market_data);

    // Update AI summary
    updateAISummary(analysis);

    // Update charts
    renderStockChart(market_data);
    renderSectorChart(market_data.sector_performance);

    // Update insights
    updateInsights(analysis);

    // Update tables
    updateTables(market_data);
}

function updateMarketMood(marketData, analysis) {
    const moodEmoji = document.getElementById('moodEmoji');
    const moodLabel = document.getElementById('moodLabel');

    // Determine mood from sector_rotation or key_insights
    let sentiment = 'neutral';
    const sectorRotation = analysis?.sector_rotation?.toLowerCase() || '';

    if (sectorRotation.includes('bullish') || sectorRotation.includes('growth') || sectorRotation.includes('risk-on')) {
        sentiment = 'bullish';
    } else if (sectorRotation.includes('bearish') || sectorRotation.includes('defensive') || sectorRotation.includes('risk-off')) {
        sentiment = 'bearish';
    }

    const moods = {
        'very bullish': { emoji: '🚀', label: 'Very Bullish' },
        'bullish': { emoji: '📈', label: 'Bullish' },
        'neutral': { emoji: '🎯', label: 'Neutral' },
        'bearish': { emoji: '📉', label: 'Bearish' },
        'very bearish': { emoji: '🔻', label: 'Very Bearish' }
    };

    const mood = moods[sentiment] || moods['neutral'];
    moodEmoji.textContent = mood.emoji;
    moodLabel.textContent = mood.label;
}

function updateStatCards(marketData) {
    // API returns: gainers, losers, active (with ticker, price, change_pct)

    // Top Gainer
    if (marketData.gainers?.length > 0) {
        const gainer = marketData.gainers[0];
        document.getElementById('topGainerValue').textContent =
            `${gainer.ticker} +${gainer.change_pct?.toFixed(1) || 0}%`;
    }

    // Top Loser
    if (marketData.losers?.length > 0) {
        const loser = marketData.losers[0];
        document.getElementById('topLoserValue').textContent =
            `${loser.ticker} ${loser.change_pct?.toFixed(1) || 0}%`;
    }

    // Most Active
    if (marketData.active?.length > 0) {
        const active = marketData.active[0];
        document.getElementById('mostActiveValue').textContent = active.ticker;
    }
}

function updateAISummary(analysis) {
    const summaryEl = document.getElementById('aiSummary');

    // Use key_insights array or raw_markdown
    if (analysis?.key_insights?.length > 0) {
        const insightsHtml = analysis.key_insights.map(insight =>
            `<p class="text-slate-300 leading-relaxed mb-3">• ${insight}</p>`
        ).join('');
        summaryEl.innerHTML = insightsHtml;
    } else if (analysis?.raw_markdown) {
        summaryEl.innerHTML = `<p class="text-slate-300 leading-relaxed">${analysis.raw_markdown.substring(0, 500)}...</p>`;
    }
}

function updateInsights(analysis) {
    // Opportunities
    const oppList = document.getElementById('opportunitiesList');
    if (analysis?.opportunities?.length > 0) {
        oppList.innerHTML = analysis.opportunities.map(opp =>
            `<li class="text-slate-300 py-2 border-b border-white/5 last:border-0">${opp}</li>`
        ).join('');
    }

    // Risks (API field is red_flags)
    const riskList = document.getElementById('risksList');
    if (analysis?.red_flags?.length > 0) {
        riskList.innerHTML = analysis.red_flags.map(risk =>
            `<li class="text-slate-300 py-2 border-b border-white/5 last:border-0">${risk}</li>`
        ).join('');
    }
}

function updateTables(marketData) {
    // API returns: gainers, losers with ticker, price, change_pct

    // Gainers
    const gainersTable = document.getElementById('gainersTable');
    if (marketData.gainers?.length > 0) {
        gainersTable.innerHTML = marketData.gainers.slice(0, 5).map(stock => `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="px-6 py-3 font-semibold">${stock.ticker}</td>
                <td class="px-6 py-3">$${stock.price?.toFixed(2) || '--'}</td>
                <td class="px-6 py-3 text-emerald-400">+${stock.change_pct?.toFixed(2) || 0}%</td>
            </tr>
        `).join('');
    }

    // Losers
    const losersTable = document.getElementById('losersTable');
    if (marketData.losers?.length > 0) {
        losersTable.innerHTML = marketData.losers.slice(0, 5).map(stock => `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="px-6 py-3 font-semibold">${stock.ticker}</td>
                <td class="px-6 py-3">$${stock.price?.toFixed(2) || '--'}</td>
                <td class="px-6 py-3 text-rose-400">${stock.change_pct?.toFixed(2) || 0}%</td>
            </tr>
        `).join('');
    }
}

// ============================================
// Charts
// ============================================
function renderStockChart(marketData) {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;

    if (stockChart) stockChart.destroy();

    // API returns: gainers, losers with ticker, change_pct
    const gainers = marketData.gainers?.slice(0, 5) || [];
    const losers = marketData.losers?.slice(0, 5) || [];

    const labels = [...gainers, ...losers].map(s => s.ticker);
    const data = [...gainers, ...losers].map(s => s.change_pct || 0);
    const colors = data.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)');

    stockChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Change %',
                data,
                backgroundColor: colors,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgb(148, 163, 184)' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: 'rgb(148, 163, 184)',
                        callback: v => v + '%'
                    }
                }
            }
        }
    });
}

function renderSectorChart(sectorPerf) {
    const ctx = document.getElementById('sectorChart');
    if (!ctx || !sectorPerf) return;

    if (sectorChart) sectorChart.destroy();

    const labels = Object.keys(sectorPerf);
    const data = Object.values(sectorPerf);
    const colors = data.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)');

    sectorChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Performance %',
                data,
                backgroundColor: colors,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: 'rgb(148, 163, 184)',
                        callback: v => v + '%'
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: 'rgb(148, 163, 184)' }
                }
            }
        }
    });
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Use spinner for loading/info, SVG icons for success/error
    let icon = '';
    if (type === 'info' || type === 'loading') {
        icon = '<span class="toast-spinner"></span>';
    } else if (type === 'success') {
        icon = '<svg class="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
    } else {
        icon = '<svg class="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    }

    toast.innerHTML = `
        <div class="flex items-center gap-3">
            ${icon}
            <span class="text-sm">${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

window.showToast = showToast;

// ============================================
// Stock Search
// ============================================
let currentSearchSymbol = null;

async function searchStock(symbol) {
    // Get symbol from input if not provided
    if (!symbol) {
        symbol = document.getElementById('stockSearchInput').value.trim().toUpperCase();
    }

    if (!symbol) {
        showToast('Please enter a stock symbol', 'error');
        return;
    }

    currentSearchSymbol = symbol;

    try {
        showToast(`Searching for ${symbol}...`, 'success');

        const response = await fetch(`/api/stock/search/${symbol}`);
        const data = await response.json();

        if (!data.success || !data.data) {
            throw new Error(data.detail || `Stock ${symbol} not found`);
        }

        displayStockResults(data.data);

    } catch (error) {
        console.error('Stock search error:', error);
        showToast(error.message || 'Failed to fetch stock data', 'error');
    }
}

function displayStockResults(stock) {
    const resultsDiv = document.getElementById('stockResults');
    resultsDiv.classList.remove('hidden');

    // Symbol & Name
    document.getElementById('stockResultSymbol').textContent = stock.symbol || currentSearchSymbol;
    document.getElementById('stockResultName').textContent = stock.name || '';

    // Price & Change
    const price = stock.price || 0;
    const change = stock.change || 0;
    const changePct = stock.change_pct || 0;
    const isPositive = changePct >= 0;

    document.getElementById('stockPrice').textContent = `$${price.toFixed(2)}`;

    const changeEl = document.getElementById('stockChange');
    changeEl.textContent = `${isPositive ? '+' : ''}${change.toFixed(2)} (${isPositive ? '+' : ''}${changePct.toFixed(2)}%)`;
    changeEl.className = `ml-3 text-lg font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`;

    // Signal
    const signalDiv = document.getElementById('stockSignal');
    const signal = stock.recommendation || 'Hold';
    const signalClass = getSignalClass(signal);
    signalDiv.innerHTML = `<span class="px-4 py-2 rounded-full text-sm font-semibold ${signalClass}">${signal}</span>`;

    // Technical Indicators
    if (stock.technicals) {
        const tech = stock.technicals;

        // RSI
        const rsi = tech.rsi || 50;
        document.getElementById('stockRSI').textContent = rsi.toFixed(1);
        const rsiSignal = rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral';
        const rsiClass = rsi > 70 ? 'text-rose-400' : rsi < 30 ? 'text-emerald-400' : 'text-slate-400';
        document.getElementById('stockRSISignal').textContent = rsiSignal;
        document.getElementById('stockRSISignal').className = `text-xs mt-1 ${rsiClass}`;

        // MACD
        document.getElementById('stockMACD').textContent = (tech.macd || 0).toFixed(2);
        const macdTrend = tech.trend || 'Neutral';
        const macdClass = macdTrend === 'Bullish' ? 'text-emerald-400' : macdTrend === 'Bearish' ? 'text-rose-400' : 'text-slate-400';
        document.getElementById('stockMACDTrend').textContent = macdTrend;
        document.getElementById('stockMACDTrend').className = `text-xs mt-1 ${macdClass}`;

        // SMAs
        document.getElementById('stockSMA20').textContent = `$${(tech.sma_20 || 0).toFixed(2)}`;
        document.getElementById('stockSMA200').textContent = `$${(tech.sma_200 || 0).toFixed(2)}`;

        const above20 = price > (tech.sma_20 || 0);
        const above200 = price > (tech.sma_200 || 0);
        document.getElementById('stockAboveSMA20').textContent = above20 ? '↑ Above' : '↓ Below';
        document.getElementById('stockAboveSMA20').className = `text-xs mt-1 ${above20 ? 'text-emerald-400' : 'text-rose-400'}`;
        document.getElementById('stockAboveSMA200').textContent = above200 ? '↑ Above' : '↓ Below';
        document.getElementById('stockAboveSMA200').className = `text-xs mt-1 ${above200 ? 'text-emerald-400' : 'text-rose-400'}`;
    }

    // Stock Info
    document.getElementById('stockMarketCap').textContent = stock.market_cap || '--';
    document.getElementById('stockPE').textContent = stock.pe_ratio ? stock.pe_ratio.toFixed(2) : '--';
    document.getElementById('stock52High').textContent = stock.week_52_high ? `$${stock.week_52_high.toFixed(2)}` : '--';
    document.getElementById('stock52Low').textContent = stock.week_52_low ? `$${stock.week_52_low.toFixed(2)}` : '--';
    document.getElementById('stockVolume').textContent = stock.volume ? formatVolume(stock.volume) : '--';
    document.getElementById('stockSector').textContent = stock.sector || '--';

    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getSignalClass(signal) {
    const s = signal.toLowerCase();
    if (s.includes('strong buy')) return 'signal-strong-buy';
    if (s.includes('buy')) return 'signal-buy';
    if (s.includes('strong sell')) return 'signal-strong-sell';
    if (s.includes('sell')) return 'signal-sell';
    return 'signal-hold';
}

function formatVolume(vol) {
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
    return vol.toString();
}

function closeStockResults() {
    document.getElementById('stockResults').classList.add('hidden');
}

async function loadStockSR() {
    if (!currentSearchSymbol) return;
    showToast('Loading support/resistance levels...', 'success');

    try {
        const response = await fetch(`/api/stock/sr/${currentSearchSymbol}`);
        const data = await response.json();

        if (data.success && data.data) {
            const sr = data.data;
            let msg = `📊 ${currentSearchSymbol} S/R Levels:\n`;
            msg += `• R2: $${sr.r2?.toFixed(2) || '--'}\n`;
            msg += `• R1: $${sr.r1?.toFixed(2) || '--'}\n`;
            msg += `• Pivot: $${sr.pivot?.toFixed(2) || '--'}\n`;
            msg += `• S1: $${sr.s1?.toFixed(2) || '--'}\n`;
            msg += `• S2: $${sr.s2?.toFixed(2) || '--'}`;
            alert(msg);
        }
    } catch (error) {
        showToast('Failed to load S/R levels', 'error');
    }
}

async function loadStockBacktest() {
    if (!currentSearchSymbol) return;
    showToast('Running backtest...', 'success');

    try {
        const response = await fetch(`/api/stock/backtest/${currentSearchSymbol}`);
        const data = await response.json();

        if (data.success && data.data) {
            const bt = data.data;
            let msg = `📈 ${currentSearchSymbol} Backtest Results (2Y):\n`;
            msg += `• Win Rate: ${(bt.win_rate * 100)?.toFixed(1) || 0}%\n`;
            msg += `• Total Trades: ${bt.total_trades || 0}\n`;
            msg += `• Profit Factor: ${bt.profit_factor?.toFixed(2) || '--'}\n`;
            msg += `• Max Drawdown: ${(bt.max_drawdown * 100)?.toFixed(1) || 0}%`;
            alert(msg);
        }
    } catch (error) {
        showToast('Failed to run backtest', 'error');
    }
}

// openStockChart is defined at the end of the file (uses in-app chart modal instead of TradingView)


// Expose functions globally
window.searchStock = searchStock;
window.closeStockResults = closeStockResults;
window.loadStockSR = loadStockSR;
window.loadStockBacktest = loadStockBacktest;
window.openStockChart = openStockChart;

// ============================================
// Forex Page Functions
// ============================================
let forexData = null;
let selectedPair = 'EURUSD=X';

// Initialize session status when page loads
document.addEventListener('DOMContentLoaded', () => {
    updateForexSessions();
    setInterval(updateForexSessions, 60000); // Update every minute
});

function updateForexSessions() {
    const now = new Date();
    const gmtHour = now.getUTCHours();

    // Sydney: 10pm - 7am GMT (22-24, 0-7)
    const sydneyOpen = gmtHour >= 22 || gmtHour < 7;
    updateSessionBadge('sydneyStatus', sydneyOpen);

    // Tokyo: 12am - 9am GMT (0-9)
    const tokyoOpen = gmtHour >= 0 && gmtHour < 9;
    updateSessionBadge('tokyoStatus', tokyoOpen);

    // London: 8am - 5pm GMT (8-17)
    const londonOpen = gmtHour >= 8 && gmtHour < 17;
    updateSessionBadge('londonStatus', londonOpen);

    // New York: 1pm - 10pm GMT (13-22)
    const nyOpen = gmtHour >= 13 && gmtHour < 22;
    updateSessionBadge('nyStatus', nyOpen);
}

function updateSessionBadge(id, isOpen) {
    const badge = document.getElementById(id);
    if (!badge) return;

    if (isOpen) {
        badge.textContent = 'OPEN';
        badge.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    } else {
        badge.textContent = 'CLOSED';
        badge.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
}

async function loadForexData() {
    showToast('Loading forex data...', 'success');

    try {
        const response = await fetch('/api/forex/analyze');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to load forex data');
        }

        forexData = data.data;
        displayForexData(data.data);

        // Auto-record signals to backend
        if (typeof recordForexSignals === 'function') {
            const allPairs = [...(data.major_pairs || []), ...(data.naira_pairs || []), ...(data.commodities || [])];
            recordForexSignals(allPairs);
        }

        // Update timestamp
        document.getElementById('forexLastUpdate').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

        showToast('Forex data loaded!', 'success');

    } catch (error) {
        console.error('Forex error:', error);
        showToast(error.message || 'Failed to load forex data', 'error');
    }
}

function displayForexData(data) {
    // Find and display top signal from all pairs
    const allPairs = [...(data.major_pairs || []), ...(data.naira_pairs || []), ...(data.commodities || [])];
    displayTopSignal(allPairs);

    // Major Pairs - use the pre-categorized array from API
    renderPairCards('majorPairsGrid', data.major_pairs || []);

    // Naira Pairs - use the pre-categorized array from API
    renderPairCards('nairaPairsGrid', data.naira_pairs || []);

    // Commodities
    renderCommodities(data.commodities || []);

    console.log('Forex data loaded:', {
        major: data.major_pairs?.length || 0,
        naira: data.naira_pairs?.length || 0,
        commodities: data.commodities?.length || 0
    });
}

function displayTopSignal(pairs) {
    const heroDiv = document.getElementById('topSignalHero');
    if (!heroDiv || !pairs || pairs.length === 0) return;

    // Find strongest signal (signal_strength 5 = Strong Buy, 1 = Strong Sell)
    let topSignal = null;
    for (const pair of pairs) {
        const strength = pair.technicals?.signal_strength || 3;
        if (strength >= 4 || strength <= 2) {
            topSignal = pair;
            break;
        }
    }

    if (!topSignal) {
        topSignal = pairs[0]; // Default to first pair
    }

    if (topSignal) {
        heroDiv.classList.remove('hidden');
        heroDiv.onclick = () => selectPair(topSignal.symbol);
        heroDiv.classList.add('cursor-pointer');
        document.getElementById('topSignalPair').textContent = topSignal.symbol || '--';
        document.getElementById('topSignalPrice').textContent = `@ ${topSignal.price || '--'}`;

        const badge = document.getElementById('topSignalBadge');
        const signal = topSignal.technicals?.signal || 'Hold';
        badge.textContent = signal.toUpperCase();
        badge.className = `px-4 py-2 rounded-full text-sm font-bold ${getSignalClass(signal)}`;

        selectedPair = topSignal.symbol;
    }
}

function renderPairCards(containerId, pairs) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!pairs || pairs.length === 0) {
        container.innerHTML = `
            <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 text-center">
                <p class="text-slate-500">No data available</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pairs.map(pair => {
        const changePct = pair.change_pct || 0;
        const isPositive = changePct >= 0;
        const tech = pair.technicals || {};
        const signal = tech.signal || 'Hold';
        const signalClass = getSignalClass(signal);

        return `
            <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all cursor-pointer group" onclick="selectPair('${pair.symbol}')">
                <!-- Header -->
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="font-bold text-lg">${pair.symbol || '--'}</h3>
                        <p class="text-xs text-slate-500">${pair.name || ''}</p>
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${signalClass}">
                        ${signal}
                    </span>
                </div>
                
                <!-- Price -->
                <div class="flex items-baseline gap-2 mb-4">
                    <span class="text-2xl font-bold tabular-nums">${pair.price || '--'}</span>
                    <span class="text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}">
                        ${isPositive ? '+' : ''}${changePct.toFixed(2)}%
                    </span>
                </div>
                
                <!-- Indicators -->
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="bg-white/5 rounded-lg py-2">
                        <p class="text-xs text-slate-500">RSI</p>
                        <p class="font-semibold text-sm">${tech.rsi?.toFixed(1) || '--'}</p>
                    </div>
                    <div class="bg-white/5 rounded-lg py-2">
                        <p class="text-xs text-slate-500">MACD</p>
                        <p class="font-semibold text-sm ${tech.macd_trend?.includes('Bullish') ? 'text-emerald-400' : tech.macd_trend?.includes('Bearish') ? 'text-rose-400' : ''}">${tech.macd_trend || '--'}</p>
                    </div>
                    <div class="bg-white/5 rounded-lg py-2">
                        <p class="text-xs text-slate-500">Signal</p>
                        <p class="font-semibold text-sm">${tech.signal || '--'}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderCommodities(commodities) {
    const container = document.getElementById('commoditiesGrid');
    if (!container) return;

    if (!commodities || commodities.length === 0) {
        container.innerHTML = `
            <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 text-center">
                <p class="text-slate-500">No commodities data</p>
            </div>
        `;
        return;
    }

    container.innerHTML = commodities.map(commodity => {
        const changePct = commodity.change_pct || 0;
        const isPositive = changePct >= 0;
        const icon = commodity.symbol?.includes('GC') || commodity.name?.toLowerCase().includes('gold') ? '🪙' : '🛢️';

        return `
            <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-5 hover:border-amber-500/30 transition-all">
                <div class="flex items-center gap-4 mb-4">
                    <span class="text-3xl">${icon}</span>
                    <div>
                        <h3 class="font-bold">${commodity.name || commodity.symbol}</h3>
                        <p class="text-xs text-slate-500">${commodity.symbol}</p>
                    </div>
                </div>
                <div class="flex items-baseline gap-2">
                    <span class="text-2xl font-bold tabular-nums">$${commodity.price?.toFixed(2) || '--'}</span>
                    <span class="text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}">
                        ${isPositive ? '+' : ''}${changePct.toFixed(2)}%
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function formatPairName(symbol) {
    if (!symbol) return '--';
    // Remove =X suffix and format as XXX/YYY
    const clean = symbol.replace('=X', '');
    if (clean.length === 6) {
        return `${clean.slice(0, 3)}/${clean.slice(3)}`;
    }
    return clean;
}

// selectPair is defined at the end of the file (chart modal section)


async function loadMultiTimeframe() {
    if (!selectedPair) {
        showToast('Please select a currency pair first', 'error');
        return;
    }

    showToast('Loading multi-timeframe analysis...', 'success');

    try {
        // Convert EUR/USD to EUR-USD for URL
        const symbol = selectedPair.replace(/\//g, '-').replace('=X', '');
        const response = await fetch(`/api/forex/mtf/${symbol}`);
        const data = await response.json();

        if (data.success && data.data) {
            const mtf = data.data;
            const content = `
                <div class="space-y-4">
                    <div class="grid grid-cols-3 gap-4">
                        <div class="p-4 bg-white/5 rounded-xl text-center">
                            <p class="text-xs text-slate-500 mb-1">1 Hour</p>
                            <p class="text-lg font-bold">${mtf['1h']?.signal || 'Hold'}</p>
                            <p class="text-sm text-slate-400">RSI: ${mtf['1h']?.rsi?.toFixed(1) || '--'}</p>
                        </div>
                        <div class="p-4 bg-white/5 rounded-xl text-center">
                            <p class="text-xs text-slate-500 mb-1">4 Hour</p>
                            <p class="text-lg font-bold">${mtf['4h']?.signal || 'Hold'}</p>
                            <p class="text-sm text-slate-400">RSI: ${mtf['4h']?.rsi?.toFixed(1) || '--'}</p>
                        </div>
                        <div class="p-4 bg-white/5 rounded-xl text-center">
                            <p class="text-xs text-slate-500 mb-1">Daily</p>
                            <p class="text-lg font-bold">${mtf['1d']?.signal || 'Hold'}</p>
                            <p class="text-sm text-slate-400">RSI: ${mtf['1d']?.rsi?.toFixed(1) || '--'}</p>
                        </div>
                    </div>
                    <div class="p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl text-sm">
                        <p class="text-slate-400">When all timeframes align in the same direction, the signal is stronger.</p>
                    </div>
                </div>
            `;
            openModal(`⏰ Multi-Timeframe Analysis - ${selectedPair}`, content);
        } else {
            showToast('Could not load MTF data', 'error');
        }
    } catch (error) {
        showToast('Failed to load MTF analysis', 'error');
    }
}

async function loadSupportResistance() {
    if (!selectedPair) {
        showToast('Please select a currency pair first', 'error');
        return;
    }

    showToast('Loading S/R levels...', 'success');

    try {
        // Convert EUR/USD to EUR-USD for URL
        const symbol = selectedPair.replace(/\//g, '-').replace('=X', '');
        const response = await fetch(`/api/forex/sr/${symbol}`);
        const data = await response.json();

        if (data.success && data.data) {
            const sr = data.data;
            const content = `
                <div class="space-y-4">
                    <div class="space-y-2">
                        <div class="flex justify-between p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                            <span class="text-rose-400 font-medium">R2 (Strong Resistance)</span>
                            <span class="font-mono font-bold">${sr.r2?.toFixed(5) || '--'}</span>
                        </div>
                        <div class="flex justify-between p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                            <span class="text-rose-300">R1 (Resistance)</span>
                            <span class="font-mono font-bold">${sr.r1?.toFixed(5) || '--'}</span>
                        </div>
                        <div class="flex justify-between p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                            <span class="text-violet-400 font-medium">Pivot Point</span>
                            <span class="font-mono font-bold">${sr.pivot?.toFixed(5) || '--'}</span>
                        </div>
                        <div class="flex justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                            <span class="text-emerald-300">S1 (Support)</span>
                            <span class="font-mono font-bold">${sr.s1?.toFixed(5) || '--'}</span>
                        </div>
                        <div class="flex justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                            <span class="text-emerald-400 font-medium">S2 (Strong Support)</span>
                            <span class="font-mono font-bold">${sr.s2?.toFixed(5) || '--'}</span>
                        </div>
                    </div>
                    <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm">
                        <p class="text-amber-400 font-semibold">Trading Tip:</p>
                        <p class="text-slate-400">Buy near support levels (S1, S2), sell near resistance levels (R1, R2).</p>
                    </div>
                </div>
            `;
            openModal(`🎯 Support/Resistance - ${selectedPair}`, content);
        } else {
            showToast('Could not load S/R levels', 'error');
        }
    } catch (error) {
        showToast('Failed to load S/R levels', 'error');
    }
}

async function loadForexBacktest() {
    if (!selectedPair) {
        showToast('Please select a currency pair first', 'error');
        return;
    }

    showToast('Running backtest...', 'success');

    try {
        // Convert EUR/USD to EUR-USD for URL
        const symbol = selectedPair.replace(/\//g, '-').replace('=X', '');
        const response = await fetch(`/api/forex/backtest/${symbol}`);
        const data = await response.json();

        if (data.success && data.data) {
            const bt = data.data;
            const winRate = ((bt.win_rate || 0) * 100).toFixed(1);
            const content = `
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                            <p class="text-xs text-slate-500 mb-1">Win Rate</p>
                            <p class="text-2xl font-bold text-emerald-400">${winRate}%</p>
                        </div>
                        <div class="p-4 bg-white/5 rounded-xl text-center">
                            <p class="text-xs text-slate-500 mb-1">Total Trades</p>
                            <p class="text-2xl font-bold">${bt.total_trades || 0}</p>
                        </div>
                        <div class="p-4 bg-white/5 rounded-xl text-center">
                            <p class="text-xs text-slate-500 mb-1">Profit Factor</p>
                            <p class="text-2xl font-bold">${bt.profit_factor?.toFixed(2) || '--'}</p>
                        </div>
                        <div class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center">
                            <p class="text-xs text-slate-500 mb-1">Max Drawdown</p>
                            <p class="text-2xl font-bold text-rose-400">${((bt.max_drawdown || 0) * 100).toFixed(1)}%</p>
                        </div>
                    </div>
                    <div class="p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl text-sm">
                        <p class="text-slate-400">Backtest based on 2 years of historical data using RSI + MACD signals.</p>
                    </div>
                </div>
            `;
            openModal(`📊 Backtest Results - ${selectedPair}`, content);
        } else {
            showToast('Could not load backtest data', 'error');
        }
    } catch (error) {
        showToast('Failed to run backtest', 'error');
    }
}

async function showEconomicCalendar() {
    showToast('Loading economic calendar...', 'success');

    try {
        const response = await fetch('/api/forex/calendar');
        const data = await response.json();

        if (data.success && data.data?.events?.length > 0) {
            const events = data.data.events.slice(0, 10);
            const content = `
                <div class="space-y-3">
                    ${events.map(e => `
                        <div class="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                            <span class="text-2xl">${e.currency === 'USD' ? '🇺🇸' : e.currency === 'EUR' ? '🇪🇺' : e.currency === 'GBP' ? '🇬🇧' : '🌍'}</span>
                            <div class="flex-1">
                                <p class="font-medium">${e.name}</p>
                                <p class="text-xs text-slate-500">${e.date} | ${e.currency}</p>
                            </div>
                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${e.impact === 'High' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}">
                                ${e.impact}
                            </span>
                        </div>
                    `).join('')}
                    <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm">
                        <p class="text-amber-400">⚠️ Avoid trading during high-impact news events for safety.</p>
                    </div>
                </div>
            `;
            openModal('📅 Economic Calendar', content);
        } else {
            openModal('📅 Economic Calendar', `
                <div class="text-center py-8">
                    <span class="text-4xl mb-4 block">✅</span>
                    <p class="text-slate-400">No high-impact events scheduled in the next 24 hours.</p>
                    <p class="text-sm text-slate-500 mt-2">Safe to trade based on technicals only.</p>
                </div>
            `);
        }
    } catch (error) {
        showToast('Failed to load calendar', 'error');
    }
}

function viewTopSignal() {
    if (!selectedPair) return;
    window.open(`https://www.tradingview.com/chart/?symbol=FX:${selectedPair.replace('=X', '')}`, '_blank');
}

// Expose forex functions globally
window.loadForexData = loadForexData;
window.selectPair = selectPair;
window.loadMultiTimeframe = loadMultiTimeframe;
window.loadSupportResistance = loadSupportResistance;
window.loadForexBacktest = loadForexBacktest;
window.showEconomicCalendar = showEconomicCalendar;
window.viewTopSignal = viewTopSignal;

// ============================================
// Signals Page Functions
// ============================================
let activeSignals = [];

async function loadSignalsHistory() {
    showToast('Loading signals...', 'success');

    try {
        // First load forex data to get active signals
        const forexResponse = await fetch('/api/forex/analyze');
        const forexData = await forexResponse.json();

        if (forexData.success && forexData.data) {
            // Collect active signals from forex pairs
            activeSignals = [];

            const allPairs = [...(forexData.data.major_pairs || []), ...(forexData.data.naira_pairs || [])];

            allPairs.forEach(pair => {
                if (pair.technicals && (pair.technicals.signal_strength >= 4 || pair.technicals.signal_strength <= 2)) {
                    activeSignals.push({
                        symbol: pair.symbol,
                        name: pair.name,
                        price: pair.price,
                        signal: pair.technicals.signal,
                        signal_strength: pair.technicals.signal_strength,
                        rsi: pair.technicals.rsi,
                        macd_trend: pair.technicals.macd_trend,
                        analysis: pair.analysis,
                        category: pair.category || 'forex'
                    });
                }
            });

            displayActiveSignals();
        }

        // Also load signal history
        const historyResponse = await fetch('/api/signals/history');
        const historyData = await historyResponse.json();

        if (historyData.success && historyData.data) {
            displaySignalsHistory(historyData.data);
            updateSignalStats(historyData.data);
        }

        showToast(`Found ${activeSignals.length} active signals`, 'success');
    } catch (error) {
        console.error('Signals error:', error);
        showToast('Failed to load signals', 'error');
    }
}

function displayActiveSignals() {
    const grid = document.getElementById('activeSignalsGrid');
    if (!grid) return;

    if (activeSignals.length === 0) {
        grid.innerHTML = `
            <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 text-center col-span-full">
                <p class="text-slate-500">No active buy/sell signals right now. Check back later or click Load Signals.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = activeSignals.map((s, index) => {
        const isBuy = s.signal.includes('Buy');
        const bgColor = isBuy ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/30' : 'from-rose-500/10 to-rose-600/5 border-rose-500/30';
        const textColor = isBuy ? 'text-emerald-400' : 'text-rose-400';
        const emoji = isBuy ? '📈' : '📉';

        return `
            <div class="bg-gradient-to-br ${bgColor} border backdrop-blur-xl rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all card-glow"
                 onclick="showSignalDetails(${index})">
                <div class="flex items-start justify-between mb-3">
                    <span class="text-3xl">${emoji}</span>
                    <span class="px-3 py-1 text-xs font-bold rounded-full ${isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                        ${s.signal.toUpperCase()}
                    </span>
                </div>
                <h3 class="text-xl font-bold mb-1">${s.symbol}</h3>
                <p class="text-sm text-slate-400 mb-3">${s.name}</p>
                <div class="flex items-center justify-between">
                    <span class="text-lg font-semibold ${textColor}">${s.price}</span>
                    <span class="text-xs text-slate-500">RSI: ${s.rsi?.toFixed(0) || '--'}</span>
                </div>
                <p class="text-xs text-slate-500 mt-2">Click for entry details & position sizing</p>
            </div>
        `;
    }).join('');
}

function showSignalDetails(index) {
    const s = activeSignals[index];
    if (!s) return;

    const isBuy = s.signal.includes('Buy');
    const emoji = isBuy ? '📈' : '📉';

    // Calculate SL and TP for different budgets
    const isForex = s.category === 'forex' || s.category === 'naira' || s.symbol.includes('/');

    // Position sizing based on risk %, entry price, and SL distance
    let slPercent, tpPercent;
    if (s.signal.includes('Strong')) {
        slPercent = 2.5;
        tpPercent = 5.0;
    } else {
        slPercent = 2.0;
        tpPercent = 4.0;
    }

    const sl = isBuy ? s.price * (1 - slPercent / 100) : s.price * (1 + slPercent / 100);
    const tp = isBuy ? s.price * (1 + tpPercent / 100) : s.price * (1 - tpPercent / 100);

    // Different capital budgets
    const budgets = [
        { name: 'Micro', amount: 100, risk: 2 },
        { name: 'Small', amount: 500, risk: 2 },
        { name: 'Medium', amount: 1000, risk: 2 },
        { name: 'Large', amount: 5000, risk: 1.5 },
        { name: 'Pro', amount: 10000, risk: 1 }
    ];

    const positionSizing = budgets.map(b => {
        const riskAmount = b.amount * (b.risk / 100);
        const slDistance = Math.abs(s.price - sl);
        const lotSize = isForex ? (riskAmount / (slDistance * 10)).toFixed(2) : Math.floor(riskAmount / slDistance);
        return { ...b, riskAmount: riskAmount.toFixed(2), lotSize, potentialProfit: (riskAmount * (tpPercent / slPercent)).toFixed(2) };
    });

    const content = `
        <div class="space-y-6">
            <!-- Signal Header -->
            <div class="flex items-center justify-between p-4 rounded-xl ${isBuy ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-rose-500/10 border border-rose-500/30'}">
                <div>
                    <p class="text-sm text-slate-400">${s.name}</p>
                    <p class="text-3xl font-bold">${s.symbol}</p>
                </div>
                <div class="text-right">
                    <span class="px-4 py-2 rounded-full text-sm font-bold ${isBuy ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'}">
                        ${emoji} ${s.signal.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <!-- Entry Details -->
            <div class="grid grid-cols-3 gap-4">
                <div class="p-4 bg-white/5 rounded-xl text-center">
                    <p class="text-xs text-slate-500 mb-1">Entry Price</p>
                    <p class="text-xl font-bold">${s.price}</p>
                </div>
                <div class="p-4 bg-rose-500/10 rounded-xl text-center border border-rose-500/20">
                    <p class="text-xs text-rose-400 mb-1">Stop Loss</p>
                    <p class="text-xl font-bold text-rose-400">${sl.toFixed(isForex ? 5 : 2)}</p>
                    <p class="text-xs text-slate-500">-${slPercent}%</p>
                </div>
                <div class="p-4 bg-emerald-500/10 rounded-xl text-center border border-emerald-500/20">
                    <p class="text-xs text-emerald-400 mb-1">Take Profit</p>
                    <p class="text-xl font-bold text-emerald-400">${tp.toFixed(isForex ? 5 : 2)}</p>
                    <p class="text-xs text-slate-500">+${tpPercent}%</p>
                </div>
            </div>
            
            <!-- Technical Analysis -->
            <div class="p-4 bg-white/5 rounded-xl">
                <h4 class="font-semibold mb-2">📊 Technical Analysis</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div><span class="text-slate-500">RSI:</span> <span class="${s.rsi < 30 ? 'text-emerald-400' : s.rsi > 70 ? 'text-rose-400' : ''}">${s.rsi?.toFixed(1) || '--'}</span></div>
                    <div><span class="text-slate-500">MACD:</span> ${s.macd_trend || '--'}</div>
                </div>
                <p class="text-sm text-slate-400 mt-2">${s.analysis || 'Analysis not available'}</p>
            </div>
            
            <!-- Position Sizing Guide -->
            <div>
                <h4 class="font-semibold mb-3">💰 Position Sizing by Budget</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-xs text-slate-500">
                                <th class="py-2">Budget</th>
                                <th class="py-2">Risk $</th>
                                <th class="py-2">${isForex ? 'Lot Size' : 'Shares'}</th>
                                <th class="py-2 text-emerald-400">Potential Profit</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            ${positionSizing.map(p => `
                                <tr class="hover:bg-white/5">
                                    <td class="py-2"><span class="font-medium">$${p.amount.toLocaleString()}</span> <span class="text-xs text-slate-500">(${p.risk}% risk)</span></td>
                                    <td class="py-2">$${p.riskAmount}</td>
                                    <td class="py-2 font-mono">${p.lotSize}</td>
                                    <td class="py-2 text-emerald-400">+$${p.potentialProfit}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Risk Warning -->
            <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm">
                <p class="text-amber-400 font-semibold">⚠️ Risk Warning</p>
                <p class="text-slate-400">Never risk more than 2% of your capital per trade. Always set your stop loss!</p>
            </div>
            
            <!-- I Took This Trade Button -->
            <button onclick="iTookThisTrade('${s.symbol}', '${s.signal}', ${s.price})"
                class="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3">
                <span>📱</span> I Took This Trade
                <span class="text-xs font-normal">(Send Telegram Alert)</span>
            </button>
        </div>
    `;

    openModal(`${emoji} ${s.signal.toUpperCase()} - ${s.symbol}`, content);
}

async function iTookThisTrade(symbol, signal, price) {
    showToast('Sending to Telegram...', 'success');

    try {
        // Record the trade
        const action = signal.includes('Buy') ? 'BUY' : 'SELL';
        await fetch('/api/signals/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, action, entry_price: price })
        });

        // Send Telegram notification
        const response = await fetch('/api/telegram/trade-taken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, signal, price })
        });

        const data = await response.json();
        if (data.success) {
            showToast('✅ Trade recorded & Telegram sent!', 'success');
            closeModal();
            loadSignalsHistory();
        } else {
            // If telegram endpoint not available, try the test endpoint
            await fetch('/api/telegram/test', { method: 'POST' });
            showToast('Trade recorded! Telegram may not be configured.', 'success');
            closeModal();
        }
    } catch (error) {
        console.error('Trade record error:', error);
        showToast('Trade recorded locally', 'success');
        closeModal();
    }
}

let signalsHistory = []; // Store history data for click handlers

function displaySignalsHistory(signals) {
    const table = document.getElementById('signalsHistoryTable');
    if (!table || !signals.history || signals.history.length === 0) {
        table.innerHTML = `<tr><td colspan="6" class="px-6 py-6 text-center text-slate-500">No signals recorded yet</td></tr>`;
        return;
    }

    // Store for click handlers
    signalsHistory = signals.history;

    table.innerHTML = signals.history.slice(0, 20).map((s, index) => {
        const pl = s.profit_loss || 0;
        const isProfit = pl >= 0;
        return `
            <tr class="hover:bg-white/5 transition-colors cursor-pointer" onclick="showHistorySignalDetails(${index})">
                <td class="px-6 py-3 text-sm">${s.date || '--'}</td>
                <td class="px-6 py-3 font-semibold">${s.symbol || '--'}</td>
                <td class="px-6 py-3">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${s.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
                        ${s.action || '--'}
                    </span>
                </td>
                <td class="px-6 py-3">$${s.entry_price?.toFixed(2) || '--'}</td>
                <td class="px-6 py-3 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}">${isProfit ? '+' : ''}${pl.toFixed(2)}%</td>
                <td class="px-6 py-3">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${s.status === 'OPEN' || s.status === 'Pending' ? 'bg-amber-500/20 text-amber-400' : s.status === 'Win' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}">
                        ${s.status || 'CLOSED'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function showHistorySignalDetails(index) {
    const s = signalsHistory[index];
    if (!s) return;

    const isBuy = s.action === 'BUY';
    const pl = s.profit_loss || 0;
    const isProfit = pl >= 0;

    const content = `
        <div class="space-y-6">
            <!-- Trade Header -->
            <div class="flex items-center justify-between p-4 rounded-xl ${isBuy ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-rose-500/10 border border-rose-500/30'}">
                <div>
                    <p class="text-sm text-slate-400">Historical Trade</p>
                    <p class="text-3xl font-bold">${s.symbol}</p>
                </div>
                <div class="text-right">
                    <span class="px-4 py-2 rounded-full text-sm font-bold ${isBuy ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'}">
                        ${s.action}
                    </span>
                </div>
            </div>
            
            <!-- Trade Details -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="p-4 bg-white/5 rounded-xl text-center">
                    <p class="text-xs text-slate-500 mb-1">Entry Price</p>
                    <p class="text-xl font-bold">$${s.entry_price?.toFixed(2) || '--'}</p>
                </div>
                <div class="p-4 bg-white/5 rounded-xl text-center">
                    <p class="text-xs text-slate-500 mb-1">Exit Price</p>
                    <p class="text-xl font-bold">$${s.exit_price?.toFixed(2) || '--'}</p>
                </div>
                <div class="p-4 ${isProfit ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'} rounded-xl text-center">
                    <p class="text-xs ${isProfit ? 'text-emerald-400' : 'text-rose-400'} mb-1">P/L</p>
                    <p class="text-xl font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}">${isProfit ? '+' : ''}${pl.toFixed(2)}%</p>
                </div>
                <div class="p-4 bg-white/5 rounded-xl text-center">
                    <p class="text-xs text-slate-500 mb-1">Status</p>
                    <p class="text-xl font-bold ${s.status === 'Win' ? 'text-emerald-400' : s.status === 'Loss' ? 'text-rose-400' : 'text-amber-400'}">${s.status || 'CLOSED'}</p>
                </div>
            </div>
            
            <!-- Trade Date -->
            <div class="p-4 bg-white/5 rounded-xl">
                <div class="flex items-center justify-between">
                    <span class="text-slate-500">Trade Date</span>
                    <span class="font-medium">${s.date || 'Unknown'}</span>
                </div>
            </div>
            
            <!-- View Chart Button -->
            <button onclick="closeModal(); setTimeout(() => openChartModal('${s.symbol}'), 100);"
                class="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                View Chart
            </button>
        </div>
    `;

    openModal(`Trade Details - ${s.symbol}`, content);
}


function updateSignalStats(data) {
    document.getElementById('signalWinRate').textContent = `${((data.win_rate || 0) * 100).toFixed(1)}%`;
    document.getElementById('signalTotal').textContent = data.total_signals || 0;
    document.getElementById('signalProfitable').textContent = data.profitable || 0;
    document.getElementById('signalAvgReturn').textContent = `${(data.avg_return || 0).toFixed(2)}%`;
}

window.loadSignalsHistory = loadSignalsHistory;
window.showSignalDetails = showSignalDetails;
window.showHistorySignalDetails = showHistorySignalDetails;
window.iTookThisTrade = iTookThisTrade;

// ============================================
// Strategies Page Functions
// ============================================
let currentStrategyMarket = 'us';
let strategiesData = null;

function setStrategyMarket(market) {
    currentStrategyMarket = market;

    // Update button styles - handle all 3 market types
    const forexBtn = document.getElementById('forexStratBtn');
    const usBtn = document.getElementById('usStratBtn');
    const ngBtn = document.getElementById('ngStratBtn');

    const activeClass = 'strategy-tab px-6 py-3 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-xl font-semibold text-sm transition-all';
    const inactiveClass = 'strategy-tab px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-semibold text-sm hover:bg-white/10 transition-all';

    // Reset all to inactive
    if (forexBtn) forexBtn.className = inactiveClass;
    if (usBtn) usBtn.className = inactiveClass;
    if (ngBtn) ngBtn.className = inactiveClass;

    // Set active based on market
    if (market === 'forex' && forexBtn) {
        forexBtn.className = activeClass;
    } else if (market === 'us' && usBtn) {
        usBtn.className = activeClass;
    } else if (market === 'ng' && ngBtn) {
        ngBtn.className = activeClass;
    }

    if (strategiesData) {
        displayStrategies(strategiesData);
    }
}

async function loadStrategies() {
    showToast('Generating strategies...', 'success');

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ send_email: false, include_nigerian: true })
        });

        const data = await response.json();
        if (data.success && data.report?.analysis) {
            strategiesData = data.report.analysis;
            displayStrategies(strategiesData);
            showToast('Strategies generated!', 'success');
        }
    } catch (error) {
        showToast('Failed to generate strategies', 'error');
    }
}

function displayStrategies(analysis) {
    const container = document.getElementById('strategiesContainer');
    if (!container) return;

    let strategies;

    if (currentStrategyMarket === 'forex') {
        // Forex strategies
        strategies = [
            { name: 'High Capital ($10K+)', data: analysis.forex_high_capital_strategy, color: 'violet', type: 'forex' },
            { name: 'Medium Capital ($1K-$10K)', data: analysis.forex_medium_capital_strategy, color: 'emerald', type: 'forex' },
            { name: 'Low Capital ($100-$1K)', data: analysis.forex_low_capital_strategy, color: 'amber', type: 'forex' },
            { name: 'Micro Capital (Under $100)', data: analysis.forex_micro_capital_strategy, color: 'sky', type: 'forex' }
        ];
    } else if (currentStrategyMarket === 'us') {
        // US Stock strategies
        strategies = [
            { name: 'High Capital ($50K+)', data: analysis.high_capital_strategy, color: 'violet', type: 'stock' },
            { name: 'Medium Capital ($10K-$50K)', data: analysis.medium_capital_strategy, color: 'emerald', type: 'stock' },
            { name: 'Low Capital ($1K-$10K)', data: analysis.low_capital_strategy, color: 'amber', type: 'stock' },
            { name: 'Micro Capital (Under $1K)', data: analysis.micro_capital_strategy, color: 'sky', type: 'stock' }
        ];
    } else {
        // Nigerian stock strategies
        strategies = [
            { name: 'High Capital (₦10M+)', data: analysis.ng_high_capital_strategy, color: 'violet', type: 'stock' },
            { name: 'Medium Capital (₦1M-₦10M)', data: analysis.ng_medium_capital_strategy, color: 'emerald', type: 'stock' },
            { name: 'Low Capital (₦100K-₦1M)', data: analysis.ng_low_capital_strategy, color: 'amber', type: 'stock' },
            { name: 'Micro Capital (₦5K-₦100K)', data: analysis.ng_micro_capital_strategy, color: 'sky', type: 'stock' }
        ];
    }

    // Filter out strategies without data
    const validStrategies = strategies.filter(s => s.data);

    if (validStrategies.length === 0) {
        container.innerHTML = `
            <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 text-center col-span-full">
                <span class="text-4xl mb-3 block">💡</span>
                <p class="text-slate-400">No ${currentStrategyMarket === 'forex' ? 'forex' : 'stock'} strategies available yet.</p>
                <p class="text-slate-500 text-sm mt-2">Click "Generate Strategies" to get AI-powered recommendations.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = validStrategies.map(strat => {
        // Use 'pairs' for forex, 'stocks' for stocks
        const assetLabel = strat.type === 'forex' ? 'Recommended Pairs' : 'Recommended Stocks';
        const assets = strat.type === 'forex' ? (strat.data.pairs || strat.data.stocks || []) : (strat.data.stocks || []);

        return `
            <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-${strat.color}-500/30 transition-all">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-lg">${strat.name}</h3>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full bg-${strat.color}-500/20 text-${strat.color}-400 border border-${strat.color}-500/30">
                        ${strat.data.risk_level || 'Medium Risk'}
                    </span>
                </div>
                <div class="mb-4">
                    <p class="text-xs text-slate-500 uppercase tracking-wider mb-2">${assetLabel}</p>
                    <div class="flex flex-wrap gap-2">
                        ${assets.map(s => `
                            <span class="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm font-medium">${s}</span>
                        `).join('')}
                    </div>
                </div>
                <div class="space-y-2 text-sm text-slate-400">
                    <p><strong class="text-white">Allocation:</strong> ${strat.data.allocation || '--'}</p>
                    <p><strong class="text-white">Entry Zone:</strong> ${strat.data.entry_zone || '--'}</p>
                    <p><strong class="text-white">Target:</strong> ${strat.data.target || '--'}</p>
                    <p><strong class="text-white">Stop Loss:</strong> ${strat.data.stop_loss || '--'}</p>
                </div>
                <p class="mt-4 text-sm text-slate-400 italic">${strat.data.rationale || ''}</p>
            </div>
        `;
    }).join('');
}

window.setStrategyMarket = setStrategyMarket;
window.loadStrategies = loadStrategies;

// ============================================
// News Page Functions  
// ============================================
let newsData = [];
let displayedNews = []; // Track currently displayed news for correct click handling
let currentNewsFilter = 'all';

async function loadNews(forceRefresh = false) {
    showToast('Loading news...', 'success');

    try {
        const url = forceRefresh ? '/api/news?refresh=true' : '/api/news';
        const response = await fetch(url);
        const data = await response.json();

        // API returns "news" or "data" depending on version
        const articles = data.news || data.data || [];

        if (data.success && articles.length > 0) {
            newsData = articles;
            displayNews(newsData);
            showToast(`Loaded ${newsData.length} news articles`, 'success');
        } else {
            showToast('No news available', 'error');
        }
    } catch (error) {
        console.error('News error:', error);
        showToast('Failed to load news', 'error');
    }
}

function filterNews(category) {
    currentNewsFilter = category;

    // Update filter button styles  
    document.querySelectorAll('.news-filter').forEach(btn => {
        btn.className = 'news-filter px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-all';
    });
    event.target.className = 'news-filter px-4 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-lg text-sm font-medium transition-all';

    if (category === 'all') {
        displayNews(newsData);
    } else {
        // Filter by category (partial match for flexibility)
        const filtered = newsData.filter(n => {
            const cat = (n.category || '').toLowerCase();
            const title = (n.title || '').toLowerCase();
            const summary = (n.summary || '').toLowerCase();

            if (category === 'us_market') {
                return cat.includes('us') || cat.includes('stock') || title.includes('s&p') ||
                    title.includes('nasdaq') || title.includes('dow') || title.includes('us market');
            } else if (category === 'ngx_market') {
                return cat.includes('ng') || cat.includes('nigeria') || title.includes('ngx') ||
                    title.includes('naira') || title.includes('nigeria');
            } else if (category === 'forex') {
                return cat.includes('forex') || cat.includes('currency') || title.includes('forex') ||
                    title.includes('dollar') || title.includes('euro') || title.includes('yen');
            } else if (category === 'crypto') {
                return cat.includes('crypto') || title.includes('bitcoin') || title.includes('ethereum') ||
                    title.includes('crypto') || title.includes('btc') || title.includes('blockchain');
            }
            return cat.includes(category);
        });
        displayNews(filtered);
    }
}

function displayNews(news) {
    const container = document.getElementById('newsContainer');
    if (!container) return;

    // Store the news array being displayed for click handlers
    displayedNews = news || [];

    if (!news || news.length === 0) {
        container.innerHTML = `
            <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 text-center col-span-full">
                <span class="text-4xl mb-3 block">📭</span>
                <p class="text-slate-500">No news found for this category</p>
            </div>
        `;
        return;
    }

    container.innerHTML = news.map((article, index) => {
        const sentimentClass = article.sentiment === 'positive' ? 'text-emerald-400' :
            article.sentiment === 'negative' ? 'text-rose-400' : 'text-slate-400';

        // Sentiment SVG icons instead of emojis
        const sentimentIcon = article.sentiment === 'positive' ?
            `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>` :
            article.sentiment === 'negative' ?
                `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>` :
                `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

        // Determine market impact from ai_analysis field
        const marketImpact = getMarketImpact(article);
        const isHighImpact = marketImpact.impact === 'high' ||
            (article.ai_analysis && article.ai_analysis.includes('HIGH IMPACT'));
        const isMediumImpact = marketImpact.impact === 'medium' ||
            (article.ai_analysis && article.ai_analysis.includes('MEDIUM IMPACT'));

        // Card styling based on impact
        const cardBorder = isHighImpact ? 'border-rose-500/50 shadow-lg shadow-rose-500/20' :
            isMediumImpact ? 'border-amber-500/30' : 'border-white/5';
        const cardGlow = isHighImpact ? 'ring-1 ring-rose-500/30' : '';

        // Impact badge with dot instead of emoji
        const impactBadge = isHighImpact ?
            `<span class="px-2 py-1 text-xs font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                HIGH IMPACT
            </span>` :
            isMediumImpact ?
                `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    MEDIUM
                </span>` :
                `<span class="px-2 py-1 text-xs font-medium rounded-full bg-slate-500/20 text-slate-400 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    LOW
                </span>`;

        // Category badge color and icon
        const categoryConfig = {
            'crypto': { bg: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', icon: '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97"/></svg>' },
            'forex': { bg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', icon: '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>' },
            'us_market': { bg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', icon: '🇺🇸' },
            'ngx_market': { bg: 'bg-green-500/20 text-green-400 border border-green-500/30', icon: '🇳🇬' }
        };
        const catConfig = categoryConfig[article.category] || { bg: 'bg-white/10 text-slate-400', icon: '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Z"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/></svg>' };

        return `
            <div class="bg-surface-card/50 backdrop-blur-xl border ${cardBorder} ${cardGlow} rounded-2xl p-5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all cursor-pointer group relative ${isHighImpact ? 'overflow-hidden' : ''}"
                 onclick="showNewsDetails(${index})">
                ${isHighImpact ? `
                    <div class="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none"></div>
                ` : ''}
                
                <!-- Impact & Category Row -->
                <div class="flex items-center justify-between mb-3 relative">
                    <div class="flex items-center gap-2 flex-wrap">
                        ${impactBadge}
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${catConfig.bg} flex items-center gap-1">
                            <span>${catConfig.icon}</span>
                            <span class="capitalize">${article.category?.replace('_', ' ') || 'General'}</span>
                        </span>
                    </div>
                    <span class="${sentimentClass}">${sentimentIcon}</span>
                </div>
                
                <!-- Title -->
                <h3 class="font-semibold mb-2 line-clamp-2 group-hover:text-violet-300 transition-colors ${isHighImpact ? 'text-white' : ''}">${article.title}</h3>
                
                <!-- Summary -->
                <p class="text-sm text-slate-400 line-clamp-2 mb-3">${article.summary || ''}</p>
                
                <!-- Affected Markets (if any) -->
                ${marketImpact.markets.length > 0 ? `
                    <div class="flex flex-wrap gap-1 mb-3">
                        ${marketImpact.markets.slice(0, 3).map(m => `
                            <span class="px-2 py-0.5 text-xs rounded-full bg-violet-500/10 text-violet-300">${m}</span>
                        `).join('')}
                    </div>
                ` : ''}
                
                <!-- Footer -->
                <div class="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-white/5">
                    <span class="flex items-center gap-1">
                        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
                        ${article.source || 'Unknown'}
                    </span>
                    <span>${article.published_at || ''}</span>
                </div>
                
                <!-- Click hint for high impact -->
                ${isHighImpact ? `
                    <div class="mt-3 text-xs text-rose-400/80 flex items-center gap-1">
                        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Click for trading implications
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}


function getMarketImpact(article) {
    const title = (article.title || '').toLowerCase();
    const summary = (article.summary || '').toLowerCase();
    const text = title + ' ' + summary;

    const markets = [];
    const impacts = [];

    // Detect affected markets
    if (text.includes('s&p') || text.includes('nasdaq') || text.includes('dow') ||
        text.includes('wall street') || text.includes('us stock')) {
        markets.push('US Stocks');
    }
    if (text.includes('nigeria') || text.includes('ngx') || text.includes('naira')) {
        markets.push('NGX');
    }
    if (text.includes('forex') || text.includes('dollar') || text.includes('euro') ||
        text.includes('yen') || text.includes('currency')) {
        markets.push('Forex');
    }
    if (text.includes('bitcoin') || text.includes('ethereum') || text.includes('crypto') || text.includes('btc')) {
        markets.push('Crypto');
    }
    if (text.includes('gold') || text.includes('oil') || text.includes('commodity')) {
        markets.push('Commodities');
    }

    // Determine impact level
    if (text.includes('crash') || text.includes('surge') || text.includes('plunge') ||
        text.includes('soar') || text.includes('record')) {
        impacts.push('High');
    } else if (text.includes('rise') || text.includes('fall') || text.includes('gain') ||
        text.includes('loss') || text.includes('up') || text.includes('down')) {
        impacts.push('Medium');
    } else {
        impacts.push('Low');
    }

    return { markets, impact: impacts[0] || 'Low' };
}

function showNewsDetails(index) {
    const article = displayedNews[index];
    if (!article) return;

    const sentimentClass = article.sentiment === 'positive' ? 'text-emerald-400' :
        article.sentiment === 'negative' ? 'text-rose-400' : 'text-slate-400';

    // Use text labels instead of emojis
    const sentimentLabel = article.sentiment === 'positive' ? 'Bullish' :
        article.sentiment === 'negative' ? 'Bearish' : 'Neutral';
    const sentimentBg = article.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
        article.sentiment === 'negative' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
            'bg-slate-500/20 text-slate-400 border-slate-500/30';

    const marketImpact = getMarketImpact(article);
    const impactClass = marketImpact.impact === 'High' ? 'bg-rose-500/20 text-rose-400' :
        marketImpact.impact === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
            'bg-slate-500/20 text-slate-400';

    const content = `
        <div class="space-y-6">
            <!-- Meta -->
            <div class="flex flex-wrap gap-2">
                <span class="px-3 py-1 text-xs font-semibold rounded-full ${sentimentBg} border flex items-center gap-1">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${article.sentiment === 'positive' ? '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' :
            article.sentiment === 'negative' ? '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>' :
                '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'}
                    </svg>
                    ${sentimentLabel}
                </span>
                <span class="px-3 py-1 text-xs font-semibold rounded-full ${impactClass} flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full ${marketImpact.impact === 'High' ? 'bg-rose-400' : marketImpact.impact === 'Medium' ? 'bg-amber-400' : 'bg-slate-400'}"></span>
                    ${marketImpact.impact} Impact
                </span>
                <span class="px-3 py-1 text-xs font-semibold rounded-full bg-white/10 capitalize">${article.category?.replace('_', ' ') || 'General'}</span>
            </div>
            
            <!-- Summary -->
            <div class="p-4 bg-white/5 rounded-xl">
                <p class="text-slate-300 leading-relaxed">${article.summary || 'No summary available.'}</p>
            </div>
            
            <!-- Market Impact -->
            ${marketImpact.markets.length > 0 ? `
                <div class="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                    <h4 class="font-semibold text-sm mb-3 text-violet-400 flex items-center gap-2">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                        Affected Markets
                    </h4>
                    <div class="flex flex-wrap gap-2">
                        ${marketImpact.markets.map(m => `
                            <span class="px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10">${m}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Trading Implications -->
            <div class="p-4 ${article.sentiment === 'positive' ? 'bg-emerald-500/10 border-emerald-500/30' : article.sentiment === 'negative' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/30'} border rounded-xl">
                <h4 class="font-semibold text-sm mb-2 ${sentimentClass} flex items-center gap-2">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    Trading Implication
                </h4>
                <p class="text-sm text-slate-400">
                    ${article.sentiment === 'positive' ?
            'This news is generally bullish. Consider looking for BUY opportunities in affected markets, but always wait for technical confirmation.' :
            article.sentiment === 'negative' ?
                'This news is generally bearish. Be cautious with long positions and consider looking for SHORT opportunities or staying in cash.' :
                'This news has neutral implications. Monitor the situation and wait for clearer signals before taking positions.'
        }
                </p>
            </div>
            
            <!-- Source -->
            <div class="flex items-center justify-between text-sm text-slate-500 pt-2 border-t border-white/10">
                <span class="flex items-center gap-1">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
                    ${article.source || 'Unknown'}
                </span>
                <span>${article.published_at || ''}</span>
            </div>
            
            ${article.url ? `
                <a href="${article.url}" target="_blank" rel="noopener" 
                   class="block w-full text-center px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2">
                    Read Full Article 
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
            ` : ''}
        </div>
    `;

    openModal(article.title, content);
}

window.loadNews = loadNews;
window.filterNews = filterNews;
window.showNewsDetails = showNewsDetails;


// ============================================
// Guide Page Functions
// ============================================
function showGuideModal(topic) {
    const guides = {
        'getting-started': {
            title: 'Getting Started with Trading',
            content: `
                <h3 class="font-bold text-lg mb-3 text-white">What is Trading?</h3>
                <p class="mb-4">Trading is the buying and selling of financial instruments (stocks, forex, commodities) with the goal of making a profit from price movements.</p>
                
                <h3 class="font-bold text-lg mb-3 text-white">Key Concepts</h3>
                <ul class="list-disc pl-5 space-y-2 mb-4">
                    <li><strong class="text-white">Long Position:</strong> Buying an asset expecting the price to rise</li>
                    <li><strong class="text-white">Short Position:</strong> Selling an asset expecting the price to fall</li>
                    <li><strong class="text-white">Bid/Ask:</strong> The prices at which you can sell/buy</li>
                    <li><strong class="text-white">Spread:</strong> The difference between bid and ask prices</li>
                    <li><strong class="text-white">Leverage:</strong> Borrowing capital to increase position size (risky!)</li>
                    <li><strong class="text-white">Margin:</strong> The collateral required for leveraged trades</li>
                </ul>
                
                <h3 class="font-bold text-lg mb-3 text-white">Types of Trading</h3>
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div class="p-3 bg-white/5 rounded-lg">
                        <p class="font-semibold text-emerald-400">Day Trading</p>
                        <p class="text-sm">Open & close positions within same day</p>
                    </div>
                    <div class="p-3 bg-white/5 rounded-lg">
                        <p class="font-semibold text-violet-400">Swing Trading</p>
                        <p class="text-sm">Hold positions for days to weeks</p>
                    </div>
                    <div class="p-3 bg-white/5 rounded-lg">
                        <p class="font-semibold text-amber-400">Position Trading</p>
                        <p class="text-sm">Hold for weeks to months</p>
                    </div>
                    <div class="p-3 bg-white/5 rounded-lg">
                        <p class="font-semibold text-sky-400">Investing</p>
                        <p class="text-sm">Hold for years (buy & hold)</p>
                    </div>
                </div>
                
                <div class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p class="font-semibold text-emerald-400">Pro Tip</p>
                    <p class="text-sm">Start with paper trading (simulated) before risking real money!</p>
                </div>
            `
        },
        'technical': {
            title: 'Technical Analysis',
            content: `
                <h3 class="font-bold text-lg mb-3 text-white">RSI (Relative Strength Index)</h3>
                <p class="mb-2">RSI measures momentum on a scale of 0-100:</p>
                <ul class="list-disc pl-5 space-y-1 mb-4">
                    <li><span class="text-rose-400 font-semibold">Above 70</span> = Overbought (price may fall)</li>
                    <li><span class="text-emerald-400 font-semibold">Below 30</span> = Oversold (price may rise)</li>
                    <li><span class="text-slate-400">30-70</span> = Neutral zone</li>
                </ul>
                
                <h3 class="font-bold text-lg mb-3 text-white">MACD (Moving Average Convergence Divergence)</h3>
                <p class="mb-2">MACD shows the relationship between two moving averages:</p>
                <ul class="list-disc pl-5 space-y-1 mb-4">
                    <li><strong class="text-emerald-400">Bullish crossover:</strong> MACD crosses ABOVE signal line</li>
                    <li><strong class="text-rose-400">Bearish crossover:</strong> MACD crosses BELOW signal line</li>
                    <li>Histogram shows momentum strength</li>
                </ul>
                
                <h3 class="font-bold text-lg mb-3 text-white">Moving Averages</h3>
                <ul class="list-disc pl-5 space-y-1 mb-4">
                    <li><strong class="text-white">SMA 20:</strong> Short-term trend (20 days)</li>
                    <li><strong class="text-white">SMA 50:</strong> Medium-term trend (50 days)</li>
                    <li><strong class="text-white">SMA 200:</strong> Long-term trend (200 days)</li>
                    <li><strong class="text-emerald-400">Golden Cross:</strong> 50 SMA crosses above 200 SMA (bullish)</li>
                    <li><strong class="text-rose-400">Death Cross:</strong> 50 SMA crosses below 200 SMA (bearish)</li>
                </ul>
                
                <h3 class="font-bold text-lg mb-3 text-white">Support & Resistance</h3>
                <p class="mb-4">Key price levels where buying/selling pressure emerges. Price tends to bounce off support and reject at resistance.</p>
                
                <div class="p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                    <p class="font-semibold text-violet-400">Pro Tip</p>
                    <p class="text-sm">Use multiple indicators together for confirmation. Never rely on just one!</p>
                </div>
            `
        },
        'risk': {
            title: 'Risk Management',
            content: `
                <h3 class="font-bold text-lg mb-3 text-white">The 1-2% Rule</h3>
                <p class="mb-4">Never risk more than 1-2% of your total capital on a single trade. This protects you from catastrophic losses.</p>
                
                <div class="p-4 bg-white/5 rounded-lg mb-4">
                    <p class="font-semibold text-white mb-2">Example:</p>
                    <p class="text-sm">Account: $10,000 | Max Risk: 2% = $200 per trade</p>
                    <p class="text-sm">If stop loss is $2 away, max position = 100 shares</p>
                </div>
                
                <h3 class="font-bold text-lg mb-3 text-white">Stop Loss Types</h3>
                <ul class="list-disc pl-5 space-y-2 mb-4">
                    <li><strong class="text-white">Fixed Stop:</strong> Set at a specific price level</li>
                    <li><strong class="text-white">Trailing Stop:</strong> Moves with price to lock in profits</li>
                    <li><strong class="text-white">Time Stop:</strong> Exit if trade doesn't move in X days</li>
                    <li><strong class="text-white">ATR Stop:</strong> Based on Average True Range (volatility)</li>
                </ul>
                
                <h3 class="font-bold text-lg mb-3 text-white">Position Sizing Formula</h3>
                <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4">
                    <p class="font-mono text-amber-300">Position Size = Risk Amount ÷ (Entry - Stop Loss)</p>
                </div>
                
                <h3 class="font-bold text-lg mb-3 text-white">Risk:Reward Ratio</h3>
                <p class="mb-4">Always aim for at least 1:2 risk:reward. Risk $100 to potentially make $200.</p>
                
                <div class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                    <p class="font-semibold text-rose-400">Warning</p>
                    <p class="text-sm">Never move your stop loss further away from entry. That's how accounts blow up!</p>
                </div>
            `
        },
        'forex': {
            title: 'Forex Trading Guide',
            content: `
                <h3 class="font-bold text-lg mb-3 text-white">Currency Pairs</h3>
                <p class="mb-2">Currencies are traded in pairs. First currency is BASE, second is QUOTE:</p>
                <ul class="list-disc pl-5 space-y-1 mb-4">
                    <li><strong class="text-white">EUR/USD at 1.0850</strong> = 1 Euro costs 1.0850 USD</li>
                    <li><strong class="text-white">USD/NGN at 1550</strong> = 1 USD costs 1550 Naira</li>
                </ul>
                
                <h3 class="font-bold text-lg mb-3 text-white">Major Pairs</h3>
                <div class="grid grid-cols-2 gap-2 mb-4">
                    <div class="p-2 bg-white/5 rounded text-sm">EUR/USD (Euro/Dollar)</div>
                    <div class="p-2 bg-white/5 rounded text-sm">GBP/USD (Pound/Dollar)</div>
                    <div class="p-2 bg-white/5 rounded text-sm">USD/JPY (Dollar/Yen)</div>
                    <div class="p-2 bg-white/5 rounded text-sm">USD/CHF (Dollar/Franc)</div>
                </div>
                
                <h3 class="font-bold text-lg mb-3 text-white">Trading Sessions</h3>
                <ul class="list-disc pl-5 space-y-1 mb-4">
                    <li><strong class="text-sky-400">Sydney:</strong> 10PM - 7AM GMT</li>
                    <li><strong class="text-rose-400">Tokyo:</strong> 12AM - 9AM GMT</li>
                    <li><strong class="text-emerald-400">London:</strong> 8AM - 5PM GMT (most volatile)</li>
                    <li><strong class="text-violet-400">New York:</strong> 1PM - 10PM GMT</li>
                </ul>
                
                <h3 class="font-bold text-lg mb-3 text-white">Pip Calculation</h3>
                <p class="mb-4">A pip is the smallest price move (usually 4th decimal). For USD pairs: 1 pip = $10 per standard lot (100,000 units).</p>
                
                <div class="p-4 bg-sky-500/10 border border-sky-500/30 rounded-lg">
                    <p class="font-semibold text-sky-400">Pro Tip</p>
                    <p class="text-sm">Most volatile time is London-New York overlap (1PM-5PM GMT). Best for day trading!</p>
                </div>
            `
        },
        'stocks': {
            title: 'Stock Market Analysis',
            content: `
                <h3 class="font-bold text-lg mb-3 text-white">Fundamental Analysis</h3>
                <p class="mb-2">Evaluating a company's financial health:</p>
                <ul class="list-disc pl-5 space-y-1 mb-4">
                    <li><strong class="text-white">P/E Ratio:</strong> Price ÷ Earnings (lower = cheaper)</li>
                    <li><strong class="text-white">EPS:</strong> Earnings Per Share</li>
                    <li><strong class="text-white">Revenue Growth:</strong> Year-over-year sales increase</li>
                    <li><strong class="text-white">Debt/Equity:</strong> Financial leverage (lower = safer)</li>
                    <li><strong class="text-white">Dividend Yield:</strong> Annual dividend ÷ Stock price</li>
                </ul>
                
                <h3 class="font-bold text-lg mb-3 text-white">Earnings Reports</h3>
                <p class="mb-4">Quarterly reports move stocks! Key metrics: Revenue (beat/miss), EPS (beat/miss), Guidance (raised/lowered).</p>
                
                <h3 class="font-bold text-lg mb-3 text-white">Sector Rotation</h3>
                <div class="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div class="p-2 bg-emerald-500/10 rounded flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> Expansion: Tech, Consumer</div>
                    <div class="p-2 bg-amber-500/10 rounded flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-400"></span> Peak: Energy, Materials</div>
                    <div class="p-2 bg-rose-500/10 rounded flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-rose-400"></span> Recession: Healthcare, Utilities</div>
                    <div class="p-2 bg-sky-500/10 rounded flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-sky-400"></span> Recovery: Financials, Industrial</div>
                </div>
                
                <div class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p class="font-semibold text-emerald-400">Pro Tip</p>
                    <p class="text-sm">For Nigerian stocks, focus on banking (GTCO, Zenith) and telecoms (MTNN) for liquidity.</p>
                </div>
            `
        },
        'psychology': {
            title: 'Trading Psychology',
            content: `
                <h3 class="font-bold text-lg mb-3 text-white">Common Emotional Traps</h3>
                <ul class="list-disc pl-5 space-y-2 mb-4">
                    <li><strong class="text-rose-400">Fear:</strong> Exiting too early or not entering at all</li>
                    <li><strong class="text-rose-400">Greed:</strong> Holding too long, ignoring sell signals</li>
                    <li><strong class="text-rose-400">Revenge Trading:</strong> Chasing losses with bigger bets</li>
                    <li><strong class="text-rose-400">FOMO:</strong> Fear of missing out on "hot" trades</li>
                    <li><strong class="text-rose-400">Overconfidence:</strong> Taking excessive risk after wins</li>
                </ul>
                
                <h3 class="font-bold text-lg mb-3 text-white">Building Discipline</h3>
                <ul class="list-disc pl-5 space-y-1 mb-4">
                    <li>Create a trading plan and stick to it</li>
                    <li>Set rules for entry, exit, and position size</li>
                    <li>Keep a trading journal to review mistakes</li>
                    <li>Take breaks after losses (walk away)</li>
                    <li>Never trade when emotional or tired</li>
                </ul>
                
                <h3 class="font-bold text-lg mb-3 text-white">The Trading Journal</h3>
                <p class="mb-4">Record every trade: Entry, Exit, Size, Reason, Emotion, Screenshot. Review weekly to find patterns in your mistakes.</p>
                
                <div class="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p class="font-semibold text-purple-400">Key Insight</p>
                    <p class="text-sm">Your biggest enemy is yourself. Master your emotions before trying to master the market!</p>
                </div>
            `
        }
    };

    const guide = guides[topic] || { title: 'Guide', content: '<p>Content coming soon...</p>' };

    // Open modal with content
    openModal(guide.title, guide.content);
}

// ============================================
// Modal Functions
// ============================================
function openModal(title, content) {
    const modal = document.getElementById('globalModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    if (modal && modalTitle && modalContent) {
        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('globalModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

window.showGuideModal = showGuideModal;
window.openModal = openModal;
window.closeModal = closeModal;

// ============================================
// Settings Page Functions
// ============================================

// Telegram Connection State
let telegramDeepLink = null;

async function checkTelegramStatus() {
    if (!accessToken) return;

    try {
        const response = await fetch('/api/telegram/status', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            updateTelegramUI(data.is_connected);

            // If not connected, generate QR code
            if (!data.is_connected) {
                generateTelegramQR();
            }
        }
    } catch (error) {
        console.error('Check telegram status error:', error);
    }
}

function updateTelegramUI(isConnected) {
    const statusBadge = document.getElementById('telegramConnectionStatus');
    const connectSection = document.getElementById('telegramConnectSection');
    const connectedSection = document.getElementById('telegramConnectedSection');

    if (isConnected) {
        statusBadge.textContent = 'Connected';
        statusBadge.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400';
        connectSection?.classList.add('hidden');
        connectedSection?.classList.remove('hidden');
    } else {
        statusBadge.textContent = 'Not Connected';
        statusBadge.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400';
        connectSection?.classList.remove('hidden');
        connectedSection?.classList.add('hidden');
    }
}

async function generateTelegramQR() {
    if (!accessToken) {
        // Show login prompt in QR area
        const qrContainer = document.getElementById('telegramQRCode');
        if (qrContainer) {
            qrContainer.innerHTML = '<span class="text-slate-500 text-xs text-center">Login to connect</span>';
        }
        return;
    }

    try {
        const response = await fetch('/api/telegram/connect', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            telegramDeepLink = data.deep_link;

            // Generate QR code using qrcode-generator library
            const qrContainer = document.getElementById('telegramQRCode');
            if (qrContainer && typeof qrcode !== 'undefined') {
                const qr = qrcode(0, 'M');
                qr.addData(data.deep_link);
                qr.make();

                // Create QR image
                qrContainer.innerHTML = qr.createImgTag(3, 0);
                qrContainer.querySelector('img').style.borderRadius = '4px';
            }

            // Update status if already connected
            if (data.is_connected) {
                updateTelegramUI(true);
            }
        } else if (response.status === 503) {
            // Telegram not configured
            const qrContainer = document.getElementById('telegramQRCode');
            if (qrContainer) {
                qrContainer.innerHTML = '<span class="text-slate-500 text-xs text-center">Bot not configured</span>';
            }
        }
    } catch (error) {
        console.error('Generate QR error:', error);
    }
}

async function connectTelegram() {
    if (!accessToken) {
        showToast('Please login to connect Telegram', 'error');
        showLoginModal();
        return;
    }

    if (telegramDeepLink) {
        // Open the deep link in a new tab
        window.open(telegramDeepLink, '_blank');
        showToast('Opening Telegram... Click "Start" in the bot!', 'info');

        // Start polling for connection status
        let attempts = 0;
        const checkInterval = setInterval(async () => {
            attempts++;
            try {
                const response = await fetch('/api/telegram/status', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.is_connected) {
                        clearInterval(checkInterval);
                        updateTelegramUI(true);
                        showToast('Telegram connected successfully!', 'success');
                    }
                }
            } catch (e) {
                console.error('Polling error:', e);
            }

            // Stop polling after 60 seconds
            if (attempts > 30) {
                clearInterval(checkInterval);
            }
        }, 2000);
    } else {
        // Try to get a new deep link
        await generateTelegramQR();
        if (telegramDeepLink) {
            window.open(telegramDeepLink, '_blank');
        } else {
            showToast('Could not generate Telegram link. Is the bot configured?', 'error');
        }
    }
}

async function testTelegram() {
    showToast('Sending test message...', 'info');

    try {
        const response = await fetch('/api/telegram/test', {
            method: 'POST',
            headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
        });
        const data = await response.json();

        if (data.success) {
            showToast('Test message sent! Check your Telegram.', 'success');
        } else {
            throw new Error(data.message || 'Failed to send');
        }
    } catch (error) {
        showToast('Failed to send test message: ' + error.message, 'error');
    }
}

async function disconnectTelegram() {
    if (!accessToken) return;

    try {
        // Update preferences to clear telegram_chat_id
        const response = await fetch('/api/user/preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                telegram_enabled: false,
                telegram_chat_id: null
            })
        });

        if (response.ok) {
            updateTelegramUI(false);
            generateTelegramQR();
            showToast('Telegram disconnected', 'success');
        }
    } catch (error) {
        showToast('Failed to disconnect Telegram', 'error');
    }
}

function saveEmailSettings() {
    const email = document.getElementById('recipientEmail')?.value;
    const dailyReports = document.getElementById('dailyReportToggle')?.checked;

    // Save to localStorage for now
    if (email) localStorage.setItem('recipientEmail', email);
    if (dailyReports !== undefined) localStorage.setItem('dailyReports', dailyReports);

    showToast('Settings saved!', 'success');
}

// Initialize Telegram status when settings page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check telegram status when user is logged in
    if (accessToken) {
        setTimeout(checkTelegramStatus, 1000);
    }
});

window.testTelegram = testTelegram;
window.connectTelegram = connectTelegram;
window.disconnectTelegram = disconnectTelegram;
window.checkTelegramStatus = checkTelegramStatus;
window.saveEmailSettings = saveEmailSettings;

// ============================================
// Nigerian (NGX) Market Functions
// ============================================
async function loadNGXData() {
    showToast('Loading NGX data...', 'success');

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ send_email: false, include_nigerian: true })
        });

        const data = await response.json();
        if (data.success && data.report?.nigerian_market) {
            displayNGXData(data.report.nigerian_market);
            document.getElementById('ngxLastUpdate').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
            showToast('NGX data loaded!', 'success');
        }
    } catch (error) {
        showToast('Failed to load NGX data', 'error');
    }
}

function displayNGXData(ngx) {
    // Update stats
    if (ngx.gainers?.length > 0) {
        document.getElementById('ngxTopGainer').textContent =
            `${ngx.gainers[0].ticker} +${ngx.gainers[0].change_pct?.toFixed(1) || 0}%`;
    }
    if (ngx.losers?.length > 0) {
        document.getElementById('ngxTopLoser').textContent =
            `${ngx.losers[0].ticker} ${ngx.losers[0].change_pct?.toFixed(1) || 0}%`;
    }
    if (ngx.active?.length > 0) {
        document.getElementById('ngxMostActive').textContent = ngx.active[0].ticker || '--';
    }

    // Gainers Table
    const gainersTable = document.getElementById('ngxGainersTable');
    if (ngx.gainers?.length > 0) {
        gainersTable.innerHTML = ngx.gainers.slice(0, 5).map(s => `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="px-6 py-3 font-semibold">${s.ticker}</td>
                <td class="px-6 py-3">₦${s.price?.toFixed(2) || '--'}</td>
                <td class="px-6 py-3 text-emerald-400">+${s.change_pct?.toFixed(2) || 0}%</td>
            </tr>
        `).join('');
    }

    // Losers Table
    const losersTable = document.getElementById('ngxLosersTable');
    if (ngx.losers?.length > 0) {
        losersTable.innerHTML = ngx.losers.slice(0, 5).map(s => `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="px-6 py-3 font-semibold">${s.ticker}</td>
                <td class="px-6 py-3">₦${s.price?.toFixed(2) || '--'}</td>
                <td class="px-6 py-3 text-rose-400">${s.change_pct?.toFixed(2) || 0}%</td>
            </tr>
        `).join('');
    }

    // Active Table
    const activeTable = document.getElementById('ngxActiveTable');
    if (ngx.active?.length > 0) {
        activeTable.innerHTML = ngx.active.slice(0, 10).map(s => {
            const changePct = s.change_pct || 0;
            const isPositive = changePct >= 0;
            return `
                <tr class="hover:bg-white/5 transition-colors">
                    <td class="px-6 py-3 font-semibold">${s.ticker}</td>
                    <td class="px-6 py-3 text-slate-400">${s.name || '--'}</td>
                    <td class="px-6 py-3">₦${s.price?.toFixed(2) || '--'}</td>
                    <td class="px-6 py-3 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}">${isPositive ? '+' : ''}${changePct.toFixed(2)}%</td>
                    <td class="px-6 py-3">${formatVolume(s.volume || 0)}</td>
                </tr>
            `;
        }).join('');
    }

    // Update market status badge
    updateNGXMarketStatus();
}

function updateNGXMarketStatus() {
    const now = new Date();
    const watHour = now.getUTCHours() + 1; // WAT is UTC+1
    const day = now.getDay();
    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && watHour >= 10 && watHour < 14.5;

    const badge = document.getElementById('ngxMarketStatusBadge');
    if (badge) {
        if (isOpen) {
            badge.textContent = 'OPEN';
            badge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        } else {
            badge.textContent = 'CLOSED';
            badge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30';
        }
    }
}

window.loadNGXData = loadNGXData;
// ============================================
// US Markets Page Functions
// ============================================
async function loadUSMarketsData() {
    showToast('Loading US market data...', 'success');

    try {
        // Fetch main market data
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ send_email: false, include_nigerian: false })
        });

        const data = await response.json();
        if (data.success && data.report) {
            displayUSMarketsData(data.report.market_data);
            updateUSSectorPerformance(data.report.market_data?.sector_performance);
            document.getElementById('usMarketsLastUpdate').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }

        // Fetch major indices separately to ensure they display
        await fetchMajorIndices();

        showToast('US market data loaded!', 'success');
    } catch (error) {
        console.error('US Markets error:', error);
        showToast('Failed to load US market data', 'error');
    }

    // Update market status
    updateUSMarketStatus();
}

async function fetchMajorIndices() {
    console.log('fetchMajorIndices: Starting to fetch major indices...');

    const indices = [
        { symbol: 'SPY', priceId: 'spyPrice', changeId: 'spyChange' },
        { symbol: 'QQQ', priceId: 'qqqPrice', changeId: 'qqqChange' },
        { symbol: 'DIA', priceId: 'diaPrice', changeId: 'diaChange' },
        { symbol: 'IWM', priceId: 'iwmPrice', changeId: 'iwmChange' }
    ];

    // Fetch all in parallel
    const fetchPromises = indices.map(async (idx) => {
        try {
            console.log(`Fetching ${idx.symbol}...`);
            const response = await fetch(`/api/stock/search/${idx.symbol}`);
            const data = await response.json();

            console.log(`${idx.symbol} response:`, data.success, data.data?.price);

            if (data.success && data.data) {
                const stock = data.data;
                const priceEl = document.getElementById(idx.priceId);
                const changeEl = document.getElementById(idx.changeId);

                console.log(`${idx.symbol} priceEl:`, priceEl, 'changeEl:', changeEl);

                if (priceEl) {
                    priceEl.textContent = `$${stock.price?.toFixed(2) || '--'}`;
                    console.log(`Set ${idx.priceId} to $${stock.price?.toFixed(2)}`);
                }
                if (changeEl) {
                    const changePct = stock.change_pct || 0;
                    changeEl.textContent = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;
                    changeEl.className = `text-sm ${changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
                }
            }
        } catch (e) {
            console.error(`Failed to fetch ${idx.symbol}:`, e);
        }
    });

    await Promise.all(fetchPromises);
    console.log('fetchMajorIndices: Done fetching all indices');
}

function displayUSMarketsData(market) {
    if (!market) return;

    // Find index ETFs in the data
    const allStocks = [...(market.gainers || []), ...(market.losers || []), ...(market.active || [])];

    const spy = allStocks.find(s => s.ticker === 'SPY');
    const qqq = allStocks.find(s => s.ticker === 'QQQ');
    const dia = allStocks.find(s => s.ticker === 'DIA');
    const iwm = allStocks.find(s => s.ticker === 'IWM');

    // Update index cards
    if (spy) {
        document.getElementById('spyPrice').textContent = `$${spy.price?.toFixed(2) || '--'}`;
        const spyChange = document.getElementById('spyChange');
        spyChange.textContent = `${spy.change_pct >= 0 ? '+' : ''}${spy.change_pct?.toFixed(2) || 0}%`;
        spyChange.className = `text-sm ${spy.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }
    if (qqq) {
        document.getElementById('qqqPrice').textContent = `$${qqq.price?.toFixed(2) || '--'}`;
        const qqqChange = document.getElementById('qqqChange');
        qqqChange.textContent = `${qqq.change_pct >= 0 ? '+' : ''}${qqq.change_pct?.toFixed(2) || 0}%`;
        qqqChange.className = `text-sm ${qqq.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }
    if (dia) {
        document.getElementById('diaPrice').textContent = `$${dia.price?.toFixed(2) || '--'}`;
        const diaChange = document.getElementById('diaChange');
        diaChange.textContent = `${dia.change_pct >= 0 ? '+' : ''}${dia.change_pct?.toFixed(2) || 0}%`;
        diaChange.className = `text-sm ${dia.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }
    if (iwm) {
        document.getElementById('iwmPrice').textContent = `$${iwm.price?.toFixed(2) || '--'}`;
        const iwmChange = document.getElementById('iwmChange');
        iwmChange.textContent = `${iwm.change_pct >= 0 ? '+' : ''}${iwm.change_pct?.toFixed(2) || 0}%`;
        iwmChange.className = `text-sm ${iwm.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }

    // Update gainers table
    const gainersTable = document.getElementById('usGainersTable');
    if (market.gainers?.length > 0) {
        gainersTable.innerHTML = market.gainers.slice(0, 6).map(s => `
            <tr class="hover:bg-white/5 transition-colors cursor-pointer" onclick="searchStock('${s.ticker}')">
                <td class="px-6 py-3 font-semibold">${s.ticker}</td>
                <td class="px-6 py-3">$${s.price?.toFixed(2) || '--'}</td>
                <td class="px-6 py-3 text-emerald-400">+${s.change_pct?.toFixed(2) || 0}%</td>
            </tr>
        `).join('');
    }

    // Update losers table
    const losersTable = document.getElementById('usLosersTable');
    if (market.losers?.length > 0) {
        losersTable.innerHTML = market.losers.slice(0, 6).map(s => `
            <tr class="hover:bg-white/5 transition-colors cursor-pointer" onclick="searchStock('${s.ticker}')">
                <td class="px-6 py-3 font-semibold">${s.ticker}</td>
                <td class="px-6 py-3">$${s.price?.toFixed(2) || '--'}</td>
                <td class="px-6 py-3 text-rose-400">${s.change_pct?.toFixed(2) || 0}%</td>
            </tr>
        `).join('');
    }
}

function updateUSSectorPerformance(sectorData) {
    if (!sectorData) return;

    const container = document.getElementById('sectorPerformance');
    if (!container) return;

    const sectors = Object.entries(sectorData).map(([name, change]) => ({
        name,
        change: parseFloat(change) || 0
    })).sort((a, b) => b.change - a.change);

    container.innerHTML = sectors.map(sector => {
        const isPositive = sector.change >= 0;
        return `
            <div class="p-3 bg-white/5 rounded-xl text-center hover:bg-white/10 transition-colors">
                <p class="text-sm font-medium">${sector.name}</p>
                <p class="text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}">
                    ${isPositive ? '+' : ''}${sector.change.toFixed(2)}%
                </p>
            </div>
        `;
    }).join('');
}

function updateUSMarketStatus() {
    const now = new Date();
    const estHour = now.getUTCHours() - 5; // EST is UTC-5
    const day = now.getDay();
    const isWeekday = day >= 1 && day <= 5;

    // Market hours: 9:30 AM - 4:00 PM EST
    const marketOpen = 9.5;  // 9:30 AM
    const marketClose = 16;  // 4:00 PM

    const isOpen = isWeekday && estHour >= marketOpen && estHour < marketClose;
    const isPreMarket = isWeekday && estHour >= 4 && estHour < marketOpen;
    const isAfterHours = isWeekday && estHour >= marketClose && estHour < 20;

    const badge = document.getElementById('usMarketStatusBadge');
    if (badge) {
        if (isOpen) {
            badge.textContent = 'OPEN';
            badge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        } else if (isPreMarket) {
            badge.textContent = 'PRE-MARKET';
            badge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30';
        } else if (isAfterHours) {
            badge.textContent = 'AFTER HOURS';
            badge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30';
        } else {
            badge.textContent = 'CLOSED';
            badge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30';
        }
    }
}

window.loadUSMarketsData = loadUSMarketsData;

// ============================================
// Interactive Chart Modal
// ============================================
let priceChart = null;
let rsiChart = null;
let macdChart = null;
let currentChartSymbol = null;
let currentChartPeriod = '3mo';

function openChartModal(symbol) {
    currentChartSymbol = symbol;
    currentChartPeriod = '3mo';

    document.getElementById('chartModal').classList.remove('hidden');
    document.getElementById('chartModalTitle').textContent = symbol + ' Analysis';
    document.body.style.overflow = 'hidden';

    loadChartData(symbol, currentChartPeriod);
}

function closeChartModal() {
    document.getElementById('chartModal').classList.add('hidden');
    document.body.style.overflow = '';

    // Destroy charts to prevent memory leaks
    if (priceChart) { priceChart.destroy(); priceChart = null; }
    if (rsiChart) { rsiChart.destroy(); rsiChart = null; }
    if (macdChart) { macdChart.destroy(); macdChart = null; }
}

function changeChartPeriod(period) {
    currentChartPeriod = period;

    // Update button styles
    document.querySelectorAll('.chart-period-btn').forEach(btn => {
        btn.classList.remove('bg-violet-500/30', 'text-violet-300');
        btn.classList.add('hover:bg-white/10');
    });
    event.target.classList.add('bg-violet-500/30', 'text-violet-300');
    event.target.classList.remove('hover:bg-white/10');

    if (currentChartSymbol) {
        loadChartData(currentChartSymbol, period);
    }
}

async function loadChartData(symbol, period) {
    showToast('Loading chart data...', 'info');

    try {
        // Convert symbol format (EUR/USD to EUR-USD for URL)
        const urlSymbol = symbol.replace('/', '-');
        const response = await fetch(`/api/forex/chart/${urlSymbol}?period=${period}`);
        const data = await response.json();

        if (data.success && data.data) {
            renderCharts(data.data);
            showToast('Chart loaded!', 'success');
        } else {
            showToast('Failed to load chart data', 'error');
        }
    } catch (error) {
        console.error('Chart error:', error);
        showToast('Error loading chart', 'error');
    }
}

function renderCharts(data) {
    // Update modal header
    const priceEl = document.getElementById('chartModalPrice');
    if (priceEl) priceEl.textContent = data.current_price;

    // Get chart containers
    const priceContainer = document.getElementById('priceChart');
    const rsiContainer = document.getElementById('rsiChart');
    const macdContainer = document.getElementById('macdChart');

    if (!priceContainer) return;

    // Clear previous charts
    priceContainer.innerHTML = '';
    if (rsiContainer) rsiContainer.innerHTML = '';
    if (macdContainer) macdContainer.innerHTML = '';

    // Check if TradingView Lightweight Charts is loaded
    if (typeof LightweightCharts === 'undefined') {
        console.warn('TradingView Lightweight Charts not loaded, using fallback');
        renderChartsFallback(data);
        return;
    }

    // TradingView dark theme colors
    const chartOptions = {
        layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: '#94a3b8',
        },
        grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            timeVisible: true,
            secondsVisible: false,
        },
        crosshair: {
            mode: 1, // Normal
            vertLine: {
                color: 'rgba(139, 92, 246, 0.5)',
                width: 1,
                style: 2,
                labelBackgroundColor: '#8b5cf6',
            },
            horzLine: {
                color: 'rgba(139, 92, 246, 0.5)',
                width: 1,
                style: 2,
                labelBackgroundColor: '#8b5cf6',
            },
        },
    };

    // Create main price chart
    const priceChart = LightweightCharts.createChart(priceContainer, {
        ...chartOptions,
        height: 300,
    });

    // Convert data to TradingView format
    const lineData = data.dates.map((date, i) => ({
        time: date, // YYYY-MM-DD format 
        value: data.prices[i]
    }));

    // Add area series (like TradingView default)
    const areaSeries = priceChart.addAreaSeries({
        topColor: 'rgba(139, 92, 246, 0.4)',
        bottomColor: 'rgba(139, 92, 246, 0.0)',
        lineColor: '#8b5cf6',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '#8b5cf6',
        crosshairMarkerBackgroundColor: '#ffffff',
    });
    areaSeries.setData(lineData);

    // Add SMA 20 line
    if (data.sma_20) {
        const sma20Data = data.dates.map((date, i) => ({
            time: date,
            value: data.sma_20[i]
        })).filter(d => d.value !== null);

        const sma20Series = priceChart.addLineSeries({
            color: '#22c55e',
            lineWidth: 1,
            lineStyle: 2, // Dashed
            title: 'SMA 20',
        });
        sma20Series.setData(sma20Data);
    }

    // Add SMA 50 line
    if (data.sma_50) {
        const sma50Data = data.dates.map((date, i) => ({
            time: date,
            value: data.sma_50[i]
        })).filter(d => d.value !== null);

        const sma50Series = priceChart.addLineSeries({
            color: '#f97316',
            lineWidth: 1,
            lineStyle: 2, // Dashed
            title: 'SMA 50',
        });
        sma50Series.setData(sma50Data);
    }

    // Fit content
    priceChart.timeScale().fitContent();

    // Create RSI chart
    if (rsiContainer && data.rsi) {
        const rsiChart = LightweightCharts.createChart(rsiContainer, {
            ...chartOptions,
            height: 100,
        });

        const rsiData = data.dates.map((date, i) => ({
            time: date,
            value: data.rsi[i]
        })).filter(d => d.value !== null);

        const rsiSeries = rsiChart.addLineSeries({
            color: '#8b5cf6',
            lineWidth: 2,
            priceFormat: { type: 'custom', formatter: (p) => p.toFixed(1) },
        });
        rsiSeries.setData(rsiData);

        // Add overbought/oversold lines as price lines
        rsiSeries.createPriceLine({
            price: 70,
            color: 'rgba(239, 68, 68, 0.5)',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Overbought',
        });
        rsiSeries.createPriceLine({
            price: 30,
            color: 'rgba(34, 197, 94, 0.5)',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Oversold',
        });

        rsiChart.timeScale().fitContent();
    }

    // Create MACD chart
    if (macdContainer && data.macd_histogram) {
        const macdChartInstance = LightweightCharts.createChart(macdContainer, {
            ...chartOptions,
            height: 100,
        });

        // MACD Histogram as baseline series
        const histogramData = data.dates.map((date, i) => ({
            time: date,
            value: data.macd_histogram[i],
            color: data.macd_histogram[i] >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        })).filter(d => d.value !== null);

        const histogramSeries = macdChartInstance.addHistogramSeries({
            priceFormat: { type: 'custom', formatter: (p) => p.toFixed(6) },
        });
        histogramSeries.setData(histogramData);

        // MACD Line
        if (data.macd) {
            const macdLineData = data.dates.map((date, i) => ({
                time: date,
                value: data.macd[i]
            })).filter(d => d.value !== null);

            const macdLineSeries = macdChartInstance.addLineSeries({
                color: '#8b5cf6',
                lineWidth: 1,
            });
            macdLineSeries.setData(macdLineData);
        }

        // Signal Line
        if (data.macd_signal) {
            const signalData = data.dates.map((date, i) => ({
                time: date,
                value: data.macd_signal[i]
            })).filter(d => d.value !== null);

            const signalSeries = macdChartInstance.addLineSeries({
                color: '#f97316',
                lineWidth: 1,
            });
            signalSeries.setData(signalData);
        }

        macdChartInstance.timeScale().fitContent();
    }

    // Fibonacci Levels Display
    if (data.fibonacci) {
        const fibContainer = document.getElementById('fibonacciLevels');
        if (fibContainer) {
            const fibLabels = {
                'fib0': '0%',
                'fib236': '23.6%',
                'fib382': '38.2%',
                'fib50': '50%',
                'fib618': '61.8%',
                'fib786': '78.6%',
                'fib100': '100%'
            };

            fibContainer.innerHTML = Object.entries(data.fibonacci).map(([key, value]) => `
                <div class="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                    <p class="text-xs text-amber-400">${fibLabels[key] || key}</p>
                    <p class="font-mono text-sm font-semibold">${value.toFixed(5)}</p>
                </div>
            `).join('');
        }
    }

    // Analysis Summary
    const lastRsi = data.rsi ? data.rsi[data.rsi.length - 1] : null;
    const lastMacdHist = data.macd_histogram ? data.macd_histogram[data.macd_histogram.length - 1] : null;
    const lastPrice = data.prices[data.prices.length - 1];
    const lastSma20 = data.sma_20 ? data.sma_20[data.sma_20.length - 1] : null;
    const lastSma50 = data.sma_50 ? data.sma_50[data.sma_50.length - 1] : null;
    const priceAboveSma20 = lastSma20 ? lastPrice > lastSma20 : null;
    const priceAboveSma50 = lastSma50 ? lastPrice > lastSma50 : null;

    let analysis = [];

    // RSI Analysis
    if (lastRsi !== null) {
        if (lastRsi >= 70) {
            analysis.push('<span class="text-rose-400">⚠️ RSI is OVERBOUGHT (' + lastRsi.toFixed(1) + ') - potential reversal down</span>');
        } else if (lastRsi <= 30) {
            analysis.push('<span class="text-emerald-400">✅ RSI is OVERSOLD (' + lastRsi.toFixed(1) + ') - potential bounce opportunity</span>');
        } else {
            analysis.push('<span class="text-slate-400">📊 RSI is neutral at ' + lastRsi.toFixed(1) + '</span>');
        }
    }

    // MACD Analysis
    if (lastMacdHist !== null) {
        if (lastMacdHist > 0) {
            analysis.push('<span class="text-emerald-400">📈 MACD Histogram is positive - bullish momentum</span>');
        } else {
            analysis.push('<span class="text-rose-400">📉 MACD Histogram is negative - bearish momentum</span>');
        }
    }

    // Trend Analysis
    if (priceAboveSma20 !== null && priceAboveSma50 !== null) {
        if (priceAboveSma20 && priceAboveSma50) {
            analysis.push('<span class="text-emerald-400">🟢 Price is above SMA 20 & 50 - UPTREND confirmed</span>');
        } else if (!priceAboveSma20 && !priceAboveSma50) {
            analysis.push('<span class="text-rose-400">🔴 Price is below SMA 20 & 50 - DOWNTREND confirmed</span>');
        } else {
            analysis.push('<span class="text-amber-400">🟡 Price is between SMAs - consolidation phase</span>');
        }
    }

    const summaryEl = document.getElementById('chartAnalysisSummary');
    if (summaryEl) {
        summaryEl.innerHTML = analysis.join('<br>');
    }
}

// Fallback to Chart.js if TradingView not available
function renderChartsFallback(data) {
    const priceCtx = document.getElementById('priceChart');
    if (!priceCtx || typeof Chart === 'undefined') return;

    // Original Chart.js code as fallback
    new Chart(priceCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [{
                label: 'Price',
                data: data.prices,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

// Update selectPair to open chart modal instead
function selectPair(symbol) {
    selectedPair = symbol;
    openChartModal(symbol);
}

// Update openStockChart to use in-app chart
function openStockChart() {
    if (!currentSearchSymbol) return;
    openChartModal(currentSearchSymbol);
}

window.openChartModal = openChartModal;
window.closeChartModal = closeChartModal;
window.changeChartPeriod = changeChartPeriod;
window.selectPair = selectPair;
window.openStockChart = openStockChart;

// ============================================
// AUTHENTICATION SYSTEM
// ============================================

// Current user state
let currentUser = null;
let accessToken = localStorage.getItem('mma_access_token');
let refreshToken = localStorage.getItem('mma_refresh_token');

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupTelegramToggle();
});

async function checkAuthStatus() {
    const authStatusEl = document.getElementById('authStatus');

    try {
        // Check if auth is configured on backend
        const statusResponse = await fetch('/api/auth/status');
        const statusData = await statusResponse.json();

        if (!statusData.configured) {
            if (authStatusEl) {
                authStatusEl.textContent = 'Not Configured';
                authStatusEl.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400';
            }
            return;
        }

        // If we have a token, verify it
        if (accessToken) {
            const userResponse = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                currentUser = userData.user;

                // Store account type for role-based filtering
                if (userData.user && userData.user.account_type) {
                    localStorage.setItem('mma_account_type', userData.user.account_type);
                }

                updateUIForLoggedInUser();
                if (authStatusEl) {
                    authStatusEl.textContent = 'Logged In';
                    authStatusEl.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400';
                }
            } else {
                // Token invalid, try refresh
                await refreshSession();
            }
        } else {
            if (authStatusEl) {
                authStatusEl.textContent = 'Not Logged In';
                authStatusEl.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400';
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
        if (authStatusEl) {
            authStatusEl.textContent = 'Error';
            authStatusEl.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-400';
        }
    }
}

async function refreshSession() {
    if (!refreshToken) return false;

    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            accessToken = data.session.access_token;
            refreshToken = data.session.refresh_token;
            localStorage.setItem('mma_access_token', accessToken);
            localStorage.setItem('mma_refresh_token', refreshToken);
            await checkAuthStatus();
            return true;
        }
    } catch (error) {
        console.error('Session refresh error:', error);
    }

    // Clear invalid tokens
    logout();
    return false;
}

function updateUIForLoggedInUser() {
    const authNotice = document.getElementById('authNotice');
    const userProfileCard = document.getElementById('userProfileCard');

    if (authNotice) authNotice.classList.add('hidden');
    if (userProfileCard) userProfileCard.classList.remove('hidden');

    if (currentUser) {
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatarInitial = document.getElementById('userAvatarInitial');
        const userAvatarImage = document.getElementById('userAvatarImage');
        const userPlan = document.getElementById('userPlan');

        if (userName) userName.textContent = currentUser.name || 'User';
        if (userEmail) userEmail.textContent = currentUser.email || '';

        // Handle avatar - show image if available, otherwise show initial
        if (currentUser.avatar_url) {
            if (userAvatarImage) {
                userAvatarImage.src = currentUser.avatar_url;
                userAvatarImage.classList.remove('hidden');
            }
            if (userAvatarInitial) userAvatarInitial.classList.add('hidden');
        } else {
            if (userAvatarImage) userAvatarImage.classList.add('hidden');
            if (userAvatarInitial) {
                userAvatarInitial.classList.remove('hidden');
                userAvatarInitial.textContent = (currentUser.name || currentUser.email || 'U')[0].toUpperCase();
            }
        }

        if (userPlan) {
            const plan = currentUser.plan || 'free';
            userPlan.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
        }
    }

    // Load user preferences
    loadUserPreferences();

    // Load latest profile
    loadUserProfile();
}

async function loadUserProfile() {
    if (!accessToken) return;

    try {
        const response = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.profile) {
                // Update current user with latest profile data
                if (currentUser) {
                    currentUser = { ...currentUser, ...data.profile };
                    localStorage.setItem('mma_user', JSON.stringify(currentUser));
                }

                // Update UI directly
                const userName = document.getElementById('userName');
                const userPlan = document.getElementById('userPlan');

                if (userName) userName.textContent = currentUser.name || currentUser.email?.split('@')[0] || 'User';
                if (userPlan && currentUser.account_type) {
                    // Update account type badge if it changed
                    updateAccountTypeDisplay();
                }

                // Update avatar display
                updateAvatarDisplay(currentUser.avatar_url);
            }
        }
    } catch (error) {
        console.error('Load profile error:', error);
    }
}

function showLoginModal() {
    const content = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-400 mb-2">Email</label>
                <input type="email" id="loginEmail" placeholder="your@email.com"
                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-400 mb-2">Password</label>
                <input type="password" id="loginPassword" placeholder="••••••••"
                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50">
            </div>
            <div id="loginError" class="hidden p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm"></div>
            <button onclick="doLogin()" class="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all">
                Sign In
            </button>
            <div class="text-center text-sm text-slate-400">
                <a href="#" onclick="showForgotPasswordModal()" class="text-violet-400 hover:text-violet-300">Forgot password?</a>
                <span class="mx-2">•</span>
                <a href="#" onclick="showRegisterModal()" class="text-violet-400 hover:text-violet-300">Create account</a>
            </div>
        </div>
    `;
    openModal('Welcome Back', content);
}

function showRegisterModal() {
    const content = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-400 mb-2">Name</label>
                <input type="text" id="registerName" placeholder="Your name"
                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-400 mb-2">Email</label>
                <input type="email" id="registerEmail" placeholder="your@email.com"
                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-400 mb-2">Password</label>
                <input type="password" id="registerPassword" placeholder="Min 6 characters"
                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50">
            </div>
            <div id="registerError" class="hidden p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm"></div>
            <div id="registerSuccess" class="hidden p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm"></div>
            <button onclick="doRegister()" class="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all">
                Create Account
            </button>
            <div class="text-center text-sm text-slate-400">
                Already have an account? <a href="#" onclick="showLoginModal()" class="text-violet-400 hover:text-violet-300">Sign in</a>
            </div>
        </div>
    `;
    openModal('Create Account', content);
}

function showForgotPasswordModal() {
    const content = `
        <div class="space-y-4">
            <p class="text-slate-400 text-sm">Enter your email address and we'll send you a link to reset your password.</p>
            <div>
                <label class="block text-sm font-medium text-slate-400 mb-2">Email</label>
                <input type="email" id="resetEmail" placeholder="your@email.com"
                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50">
            </div>
            <div id="resetMessage" class="hidden p-3 rounded-lg text-sm"></div>
            <button onclick="doForgotPassword()" class="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all">
                Send Reset Link
            </button>
            <div class="text-center text-sm text-slate-400">
                <a href="#" onclick="showLoginModal()" class="text-violet-400 hover:text-violet-300">Back to login</a>
            </div>
        </div>
    `;
    openModal('Reset Password', content);
}

async function doLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password';
        errorEl.classList.remove('hidden');
        return;
    }

    errorEl.classList.add('hidden');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            accessToken = data.session.access_token;
            refreshToken = data.session.refresh_token;
            currentUser = data.user;

            localStorage.setItem('mma_access_token', accessToken);
            localStorage.setItem('mma_refresh_token', refreshToken);
            localStorage.setItem('mma_user', JSON.stringify(data.user));

            // Store account type for role-based filtering
            if (data.user.account_type) {
                localStorage.setItem('mma_account_type', data.user.account_type);
            }

            closeModal();
            updateUIForLoggedInUser();
            checkAuthStatus();

            // Apply role-based filtering after login
            if (typeof applyRoleBasedFiltering === 'function') {
                applyRoleBasedFiltering();
                updateAccountTypeDisplay();
            }

            showNotification('Welcome back!', 'success');
        } else {
            errorEl.textContent = data.detail || 'Login failed';
            errorEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function doRegister() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');
    const successEl = document.getElementById('registerSuccess');

    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password';
        errorEl.classList.remove('hidden');
        successEl.classList.add('hidden');
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        errorEl.classList.remove('hidden');
        successEl.classList.add('hidden');
        return;
    }

    errorEl.classList.add('hidden');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            successEl.textContent = data.message || 'Account created! Check your email to verify.';
            successEl.classList.remove('hidden');
            errorEl.classList.add('hidden');
        } else {
            errorEl.textContent = data.detail || 'Registration failed';
            errorEl.classList.remove('hidden');
            successEl.classList.add('hidden');
        }
    } catch (error) {
        console.error('Register error:', error);
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function doForgotPassword() {
    const email = document.getElementById('resetEmail').value;
    const messageEl = document.getElementById('resetMessage');

    if (!email) {
        messageEl.textContent = 'Please enter your email';
        messageEl.className = 'p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm';
        messageEl.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        messageEl.textContent = data.message || 'If an account exists, you will receive a reset link.';
        messageEl.className = 'p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm';
        messageEl.classList.remove('hidden');
    } catch (error) {
        messageEl.textContent = 'An error occurred. Please try again.';
        messageEl.className = 'p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm';
        messageEl.classList.remove('hidden');
    }
}

function logout() {
    accessToken = null;
    refreshToken = null;
    currentUser = null;

    localStorage.removeItem('mma_access_token');
    localStorage.removeItem('mma_refresh_token');

    // Update UI
    const authNotice = document.getElementById('authNotice');
    const userProfileCard = document.getElementById('userProfileCard');

    if (authNotice) authNotice.classList.remove('hidden');
    if (userProfileCard) userProfileCard.classList.add('hidden');

    checkAuthStatus();
    showNotification('Signed out successfully', 'success');

    // Redirect to login page after a short delay
    setTimeout(() => {
        window.location.href = '/static/login.html';
    }, 1000);
}

// Settings Management
async function loadUserPreferences() {
    if (!accessToken || !currentUser) return;

    try {
        const response = await fetch('/api/user/preferences', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            const prefs = data.preferences;

            // Apply preferences to UI
            if (prefs.telegram_enabled) {
                document.getElementById('telegramEnabled').checked = true;
                document.getElementById('telegramSettings').classList.remove('hidden');
            }
            if (prefs.telegram_chat_id) {
                document.getElementById('telegramChatId').value = prefs.telegram_chat_id;
            }
            if (prefs.email_reports !== undefined) {
                document.getElementById('emailEnabled').checked = prefs.email_reports;
            }
            if (prefs.report_frequency) {
                document.getElementById('reportFrequency').value = prefs.report_frequency;
            }
            if (prefs.risk_tolerance) {
                document.getElementById('riskTolerance').value = prefs.risk_tolerance;
            }
        }
    } catch (error) {
        console.error('Load preferences error:', error);
    }
}

async function saveSettings() {
    const preferences = {
        telegram_enabled: document.getElementById('telegramEnabled')?.checked || false,
        telegram_chat_id: document.getElementById('telegramChatId')?.value || null,
        email_reports: document.getElementById('emailEnabled')?.checked || false,
        report_frequency: document.getElementById('reportFrequency')?.value || 'daily',
        risk_tolerance: document.getElementById('riskTolerance')?.value || 'moderate',
        default_currency: document.getElementById('displayCurrency')?.value || 'USD'
    };

    // Save to localStorage for guests
    localStorage.setItem('mma_preferences', JSON.stringify(preferences));

    // If logged in, save to server
    if (accessToken && currentUser) {
        try {
            const response = await fetch('/api/user/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(preferences)
            });

            if (response.ok) {
                showNotification('Settings saved!', 'success');
            } else {
                showNotification('Failed to save settings', 'error');
            }
        } catch (error) {
            showNotification('Connection error', 'error');
        }
    } else {
        showNotification('Settings saved locally!', 'success');
    }
}

function showEditProfileModal() {
    const currentName = currentUser?.name || '';
    const content = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-400 mb-2">Display Name</label>
                <input type="text" id="editName" value="${currentName}" placeholder="Your name"
                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50">
            </div>
            <div id="profileError" class="hidden p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm"></div>
            <button onclick="doUpdateProfile()" class="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all">
                Save Changes
            </button>
        </div>
    `;
    openModal('Edit Profile', content);
}

async function doUpdateProfile() {
    const name = document.getElementById('editName').value;
    const errorEl = document.getElementById('profileError');

    if (!name) {
        errorEl.textContent = 'Please enter a name';
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Profile updated!', 'success');
            closeModal();
            loadUserProfile(); // Refresh UI
        } else {
            errorEl.textContent = data.detail || 'Failed to update profile';
            errorEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Update profile error:', error);
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

// ============================================
// Avatar Functions
// ============================================
let selectedAvatarUrl = null;

function showAvatarModal() {
    const modal = document.getElementById('avatarModal');
    if (modal) {
        modal.classList.remove('hidden');

        // Set current avatar in preview
        const currentAvatarUrl = currentUser?.avatar_url;
        if (currentAvatarUrl) {
            previewAvatarUrl(currentAvatarUrl);
        } else {
            document.getElementById('avatarPreviewInitial').textContent =
                (currentUser?.name || currentUser?.email || 'U')[0].toUpperCase();
            document.getElementById('avatarPreviewImage').classList.add('hidden');
            document.getElementById('avatarPreviewInitial').classList.remove('hidden');
        }

        // Generate avatar options
        generateAvatarOptions();
    }
}

function closeAvatarModal() {
    const modal = document.getElementById('avatarModal');
    if (modal) {
        modal.classList.add('hidden');
        selectedAvatarUrl = null;
    }
}

function previewAvatarUrl(url) {
    const previewInitial = document.getElementById('avatarPreviewInitial');
    const previewImage = document.getElementById('avatarPreviewImage');

    if (url && url.trim()) {
        selectedAvatarUrl = url.trim();
        previewImage.src = selectedAvatarUrl;
        previewImage.classList.remove('hidden');
        previewInitial.classList.add('hidden');

        // Handle image load error
        previewImage.onerror = () => {
            previewImage.classList.add('hidden');
            previewInitial.classList.remove('hidden');
            showToast('Could not load image from URL', 'error');
        };
    } else {
        previewImage.classList.add('hidden');
        previewInitial.classList.remove('hidden');
        selectedAvatarUrl = null;
    }
}

function generateAvatarOptions() {
    const container = document.getElementById('avatarOptions');
    if (!container) return;

    // Use DiceBear API to generate different avatar styles
    const seed = currentUser?.id || currentUser?.email || 'user';
    const styles = ['avataaars', 'bottts', 'identicon', 'initials', 'pixel-art'];

    container.innerHTML = styles.map((style, i) => {
        const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}${i}`;
        return `
            <button onclick="selectAvatar('${url}')" 
                class="w-12 h-12 rounded-full bg-white overflow-hidden hover:ring-2 hover:ring-violet-500 transition-all">
                <img src="${url}" alt="${style}" class="w-full h-full object-cover">
            </button>
        `;
    }).join('');
}

function selectAvatar(url) {
    selectedAvatarUrl = url;
    previewAvatarUrl(url);
}

// File upload state
let selectedAvatarFile = null;

function handleAvatarFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processAvatarFile(file);
    }
}

function handleAvatarDrop(event) {
    event.preventDefault();
    event.target.classList.remove('border-violet-500', 'bg-violet-500/10');

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processAvatarFile(file);
    } else {
        showToast('Please drop an image file', 'error');
    }
}

function processAvatarFile(file) {
    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be smaller than 2MB', 'error');
        return;
    }

    // Store file for upload
    selectedAvatarFile = file;
    selectedAvatarUrl = null;

    // Preview using FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewInitial = document.getElementById('avatarPreviewInitial');
        const previewImage = document.getElementById('avatarPreviewImage');

        previewImage.src = e.target.result;
        previewImage.classList.remove('hidden');
        previewInitial.classList.add('hidden');
    };
    reader.readAsDataURL(file);

    showToast('Image selected! Click Save to upload.', 'success');
}

async function saveAvatar() {
    if (!accessToken) {
        showToast('Please login first', 'error');
        return;
    }

    try {
        let avatarUrl = selectedAvatarUrl;

        // If we have a file to upload, upload it first
        if (selectedAvatarFile) {
            showToast('Uploading image...', 'info');

            const formData = new FormData();
            formData.append('file', selectedAvatarFile);

            const uploadResponse = await fetch('/api/user/avatar', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            });

            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok) {
                throw new Error(uploadData.detail || 'Upload failed');
            }

            avatarUrl = uploadData.avatar_url;
            selectedAvatarFile = null;
        } else if (avatarUrl) {
            // Just updating with a URL (from style options)
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ avatar_url: avatarUrl })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to update avatar');
            }
        } else {
            showToast('Please select an image first', 'error');
            return;
        }

        showToast('Avatar updated!', 'success');
        closeAvatarModal();

        // Update current user and UI
        if (currentUser) currentUser.avatar_url = avatarUrl;
        updateAvatarDisplay(avatarUrl);

    } catch (error) {
        console.error('Save avatar error:', error);
        showToast(error.message || 'Connection error. Please try again.', 'error');
    }
}

async function removeAvatar() {
    if (!accessToken) return;

    try {
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ avatar_url: null })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Avatar removed', 'success');
            closeAvatarModal();

            // Update current user and UI
            if (currentUser) currentUser.avatar_url = null;
            updateAvatarDisplay(null);
        }
    } catch (error) {
        console.error('Remove avatar error:', error);
        showToast('Connection error', 'error');
    }
}

function updateAvatarDisplay(avatarUrl) {
    const avatarInitial = document.getElementById('userAvatarInitial');
    const avatarImage = document.getElementById('userAvatarImage');

    if (avatarUrl) {
        avatarImage.src = avatarUrl;
        avatarImage.classList.remove('hidden');
        avatarInitial?.classList.add('hidden');
    } else {
        avatarImage.classList.add('hidden');
        avatarInitial?.classList.remove('hidden');
        if (avatarInitial) {
            avatarInitial.textContent = (currentUser?.name || currentUser?.email || 'U')[0].toUpperCase();
        }
    }
}

window.showAvatarModal = showAvatarModal;
window.closeAvatarModal = closeAvatarModal;
window.previewAvatarUrl = previewAvatarUrl;
window.selectAvatar = selectAvatar;
window.saveAvatar = saveAvatar;
window.removeAvatar = removeAvatar;
window.handleAvatarFileSelect = handleAvatarFileSelect;
window.handleAvatarDrop = handleAvatarDrop;

function setupTelegramToggle() {
    const toggle = document.getElementById('telegramEnabled');
    const settings = document.getElementById('telegramSettings');

    if (toggle && settings) {
        toggle.addEventListener('change', () => {
            if (toggle.checked) {
                settings.classList.remove('hidden');
            } else {
                settings.classList.add('hidden');
            }
        });
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg text-white text-sm font-medium z-50 animate-fade-in ${type === 'success' ? 'bg-emerald-600' :
        type === 'error' ? 'bg-rose-600' :
            'bg-violet-600'
        }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(10px)';
        notification.style.transition = 'all 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export auth functions to window
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.showForgotPasswordModal = showForgotPasswordModal;
window.doLogin = doLogin;
window.doRegister = doRegister;
window.doForgotPassword = doForgotPassword;
window.logout = logout;
window.saveSettings = saveSettings;
window.showEditProfileModal = showEditProfileModal;
window.doUpdateProfile = doUpdateProfile;

// ============================================
// Account Type & Role-Based Filtering
// ============================================
let selectedNewAccountType = null;
let captchaNum1 = 0;
let captchaNum2 = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Clean URL tokens
    cleanUrlTokens();

    // Apply role-based filtering
    applyRoleBasedFiltering();

    // Load settings
    loadSettingsFromStorage();

    // Update account type display
    updateAccountTypeDisplay();

    // Setup settings page listeners
    setupSettingsListeners();
});

function cleanUrlTokens() {
    // Remove tokens from URL hash if present
    if (window.location.hash && window.location.hash.includes('access_token')) {
        // Extract and store tokens
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken) {
            localStorage.setItem('mma_access_token', accessToken);
            if (refreshToken) {
                localStorage.setItem('mma_refresh_token', refreshToken);
            }
        }

        // Clean the URL - use replaceState to avoid page reload
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        console.log('🧹 URL cleaned - tokens stored in localStorage');
    }
}

function applyRoleBasedFiltering() {
    const accountType = localStorage.getItem('mma_account_type') || 'both';

    console.log(`📊 Applying role-based filtering: ${accountType}`);

    // Get navigation items
    const forexNav = document.querySelector('[data-page="forex"]');
    const usMarketsNav = document.querySelector('[data-page="usMarkets"]');
    const nigerianNav = document.querySelector('[data-page="nigerian"]');
    const signalsNav = document.querySelector('[data-page="signals"]');
    const strategiesNav = document.querySelector('[data-page="strategies"]');
    const dashboardNav = document.querySelector('[data-page="dashboard"]');

    // Get parent containers to hide - handle different nav structures
    const forexNavParent = forexNav?.closest('a') || forexNav;
    const usMarketsNavParent = usMarketsNav?.closest('a') || usMarketsNav;
    const nigerianNavParent = nigerianNav?.closest('a') || nigerianNav;
    const signalsNavParent = signalsNav?.closest('a') || signalsNav;

    // Reset all visibility first
    [forexNavParent, usMarketsNavParent, nigerianNavParent, signalsNavParent].forEach(el => {
        if (el) el.style.display = '';
    });

    // Reset dashboard content visibility
    document.querySelectorAll('.stock-search-section, .forex-section, .us-market-status, .ng-market-status').forEach(el => {
        el.style.display = '';
    });

    // Apply filtering based on account type
    if (accountType === 'forex') {
        // FOREX ONLY: Hide stock-related navigation and content
        if (usMarketsNavParent) usMarketsNavParent.style.display = 'none';
        if (nigerianNavParent) nigerianNavParent.style.display = 'none';

        // Hide stock search in dashboard
        document.querySelectorAll('.stock-search-section').forEach(el => {
            el.style.display = 'none';
        });

        // Hide US and NG market status cards on dashboard
        const usMarketStatus = document.getElementById('usMarketStatus');
        const ngMarketStatus = document.getElementById('ngMarketStatus');
        if (usMarketStatus) usMarketStatus.style.display = 'none';
        if (ngMarketStatus) ngMarketStatus.style.display = 'none';

        // Hide stock strategies buttons and content
        document.querySelectorAll('[data-strategy-type="stock"], .us-strategies, .nigerian-strategies').forEach(el => {
            el.style.display = 'none';
        });

        // Show forex strategies
        document.querySelectorAll('[data-strategy-type="forex"], .forex-strategies').forEach(el => {
            el.style.display = '';
        });

        // Auto-select forex strategy tab
        const forexStratBtn = document.getElementById('forexStratBtn');
        if (forexStratBtn && typeof setStrategyMarket === 'function') {
            activateStrategyTab('forexStratBtn');
        }

    } else if (accountType === 'stock') {
        // STOCKS ONLY: Hide forex-related navigation and content
        if (forexNavParent) forexNavParent.style.display = 'none';

        // Hide Signals (which is forex-focused)
        if (signalsNavParent) signalsNavParent.style.display = 'none';

        // Hide forex strategies button and content
        document.querySelectorAll('[data-strategy-type="forex"], .forex-strategies').forEach(el => {
            el.style.display = 'none';
        });

        // Show stock strategies
        document.querySelectorAll('[data-strategy-type="stock"], .us-strategies, .nigerian-strategies').forEach(el => {
            el.style.display = '';
        });

        // Show stock-related market status on dashboard
        const usMarketStatus = document.getElementById('usMarketStatus');
        const ngMarketStatus = document.getElementById('ngMarketStatus');
        if (usMarketStatus) usMarketStatus.style.display = '';
        if (ngMarketStatus) ngMarketStatus.style.display = '';

        // Auto-select US strategy tab (default for stocks)
        const usStratBtn = document.getElementById('usStratBtn');
        if (usStratBtn && typeof setStrategyMarket === 'function') {
            activateStrategyTab('usStratBtn');
        }
    }
    // 'both' shows everything (default)

    console.log(`✅ Role filtering applied: ${accountType}`);
}

// Helper function to activate a strategy tab
function activateStrategyTab(tabId) {
    document.querySelectorAll('.strategy-tab').forEach(btn => {
        btn.classList.remove('bg-violet-500/20', 'border-violet-500/30', 'text-violet-300');
        btn.classList.add('bg-white/5', 'border-white/10');
    });
    const activeBtn = document.getElementById(tabId);
    if (activeBtn) {
        activeBtn.classList.remove('bg-white/5', 'border-white/10');
        activeBtn.classList.add('bg-violet-500/20', 'border-violet-500/30', 'text-violet-300');
    }
}

function updateAccountTypeDisplay() {
    const accountType = localStorage.getItem('mma_account_type') || 'both';

    // Update profile badge
    const badgeEl = document.getElementById('userAccountType');
    if (badgeEl) {
        const labels = {
            'forex': '💱 Forex Only',
            'stock': '📈 Stocks Only',
            'both': '🚀 Both Markets'
        };
        badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-violet-400"></span>${labels[accountType] || labels.both}`;
    }

    // Update current type display
    const displayEl = document.getElementById('currentAccountTypeDisplay');
    if (displayEl) {
        const fullLabels = {
            'forex': 'Forex Only',
            'stock': 'Stocks Only',
            'both': 'Both (Forex & Stocks)'
        };
        displayEl.textContent = fullLabels[accountType] || fullLabels.both;
    }

    // Highlight current account type button
    document.querySelectorAll('.account-type-btn').forEach(btn => {
        const isSelected = btn.dataset.type === accountType;
        btn.classList.toggle('border-violet-500', isSelected);
        btn.classList.toggle('bg-violet-500/20', isSelected);
        btn.classList.toggle('border-white/10', !isSelected);
    });
}

function selectAccountType(type, buttonEl) {
    const currentType = localStorage.getItem('mma_account_type') || 'both';

    // Update button selection visually
    document.querySelectorAll('.account-type-btn').forEach(btn => {
        btn.classList.remove('border-violet-500', 'bg-violet-500/20');
        btn.classList.add('border-white/10');
    });
    buttonEl.classList.add('border-violet-500', 'bg-violet-500/20');
    buttonEl.classList.remove('border-white/10');

    // If same type, hide confirmation
    if (type === currentType) {
        selectedNewAccountType = null;
        document.getElementById('accountTypeConfirmation').classList.add('hidden');
        return;
    }

    // Show confirmation form with captcha
    selectedNewAccountType = type;
    showAccountTypeConfirmation();
}

function showAccountTypeConfirmation() {
    // Generate captcha
    captchaNum1 = Math.floor(Math.random() * 10) + 1;
    captchaNum2 = Math.floor(Math.random() * 10) + 1;
    document.getElementById('captchaQuestion').textContent = `${captchaNum1} + ${captchaNum2}`;

    // Clear inputs and messages
    document.getElementById('accountTypePassword').value = '';
    document.getElementById('captchaAnswer').value = '';
    document.getElementById('accountTypeError').classList.add('hidden');
    document.getElementById('accountTypeSuccess').classList.add('hidden');

    // Show form
    document.getElementById('accountTypeConfirmation').classList.remove('hidden');
}

function cancelAccountTypeChange() {
    selectedNewAccountType = null;
    document.getElementById('accountTypeConfirmation').classList.add('hidden');
    updateAccountTypeDisplay();
}

async function confirmAccountTypeChange() {
    const password = document.getElementById('accountTypePassword').value;
    const captchaAnswer = parseInt(document.getElementById('captchaAnswer').value);
    const errorEl = document.getElementById('accountTypeError');
    const successEl = document.getElementById('accountTypeSuccess');

    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    // Validate captcha
    if (isNaN(captchaAnswer) || captchaAnswer !== captchaNum1 + captchaNum2) {
        errorEl.textContent = '❌ Incorrect answer. Please solve the math problem.';
        errorEl.classList.remove('hidden');
        return;
    }

    // Validate password
    if (!password) {
        errorEl.textContent = '❌ Please enter your password.';
        errorEl.classList.remove('hidden');
        return;
    }

    if (!selectedNewAccountType) {
        errorEl.textContent = '❌ No account type selected.';
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const token = localStorage.getItem('mma_access_token');

        if (!token) {
            errorEl.textContent = '❌ Please login to change account type.';
            errorEl.classList.remove('hidden');
            return;
        }

        const response = await fetch('/api/user/account-type', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                password: password,
                new_account_type: selectedNewAccountType
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Update localStorage
            localStorage.setItem('mma_account_type', selectedNewAccountType);

            // Update user object
            try {
                const user = JSON.parse(localStorage.getItem('mma_user') || '{}');
                user.account_type = selectedNewAccountType;
                localStorage.setItem('mma_user', JSON.stringify(user));
            } catch (e) { }

            // Show success
            successEl.textContent = `✅ Account type changed to "${selectedNewAccountType}"!`;
            successEl.classList.remove('hidden');

            // Update display and apply filtering
            setTimeout(() => {
                updateAccountTypeDisplay();
                applyRoleBasedFiltering();
                document.getElementById('accountTypeConfirmation').classList.add('hidden');
                selectedNewAccountType = null;
                showToast('Account type updated successfully!', 'success');
            }, 1500);
        } else {
            errorEl.textContent = data.detail || '❌ Failed to update. Check your password.';
            errorEl.classList.remove('hidden');
        }
    } catch (error) {
        errorEl.textContent = '❌ Connection error. Please try again.';
        errorEl.classList.remove('hidden');
        console.error('Account type change error:', error);
    }
}

function loadSettingsFromStorage() {
    const prefs = JSON.parse(localStorage.getItem('mma_preferences') || '{}');

    // Risk tolerance
    const riskEl = document.getElementById('riskTolerance');
    if (riskEl && prefs.riskTolerance) {
        riskEl.value = prefs.riskTolerance;
    }

    // Display currency
    const currencyEl = document.getElementById('displayCurrency');
    if (currencyEl && prefs.displayCurrency) {
        currencyEl.value = prefs.displayCurrency;
    }

    // Report frequency
    const freqEl = document.getElementById('reportFrequency');
    if (freqEl && prefs.reportFrequency) {
        freqEl.value = prefs.reportFrequency;
    }

    // Telegram enabled
    const telegramEl = document.getElementById('telegramEnabled');
    if (telegramEl && prefs.telegramEnabled !== undefined) {
        telegramEl.checked = prefs.telegramEnabled;
    }

    // Email enabled
    const emailEl = document.getElementById('emailEnabled');
    if (emailEl && prefs.emailEnabled !== undefined) {
        emailEl.checked = prefs.emailEnabled;
    }
}

function setupSettingsListeners() {
    // Auto-save on change for select elements
    ['riskTolerance', 'displayCurrency', 'reportFrequency'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', savePreferences);
        }
    });

    // Auto-save for toggles
    ['telegramEnabled', 'emailEnabled'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', savePreferences);
        }
    });
}

function savePreferences() {
    const prefs = {
        riskTolerance: document.getElementById('riskTolerance')?.value || 'moderate',
        displayCurrency: document.getElementById('displayCurrency')?.value || 'USD',
        reportFrequency: document.getElementById('reportFrequency')?.value || 'daily',
        telegramEnabled: document.getElementById('telegramEnabled')?.checked || false,
        emailEnabled: document.getElementById('emailEnabled')?.checked || true
    };

    localStorage.setItem('mma_preferences', JSON.stringify(prefs));
    showToast('Preferences saved!', 'success');
}

// Export account type functions
window.selectAccountType = selectAccountType;
window.cancelAccountTypeChange = cancelAccountTypeChange;
window.confirmAccountTypeChange = confirmAccountTypeChange;
window.applyRoleBasedFiltering = applyRoleBasedFiltering;
window.updateAccountTypeDisplay = updateAccountTypeDisplay;

// ============================================
// Currency Strength Analysis
// ============================================
let currencyStrengthData = null;

async function loadCurrencyStrength() {
    try {
        const response = await fetch('/api/forex/strength');
        const data = await response.json();

        if (data.success && data.data) {
            currencyStrengthData = data.data;
            displayCurrencyStrength(data.data);
        }
    } catch (error) {
        console.error('Failed to load currency strength:', error);
    }
}

function displayCurrencyStrength(data) {
    const container = document.getElementById('currencyStrengthGrid');
    if (!container) return;

    const { currencies, opportunities, summary } = data;

    // Build currency strength cards
    let html = '';
    currencies.forEach((currency, index) => {
        const trendClass = currency.trend === 'bullish' ? 'bullish' :
            currency.trend === 'bearish' ? 'bearish' : 'neutral';
        const scoreColor = currency.score > 20 ? 'text-emerald-400' :
            currency.score < -20 ? 'text-rose-400' : 'text-slate-400';
        const barPosition = ((currency.score + 100) / 200) * 100;

        html += `
            <div class="currency-item ${trendClass} bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-xl p-4 stagger-item" style="animation-delay: ${index * 0.05}s">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">${currency.flag}</span>
                        <div>
                            <p class="font-semibold">${currency.currency}</p>
                            <p class="text-xs text-slate-500">${currency.name}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold ${scoreColor}">${currency.score > 0 ? '+' : ''}${currency.score}</p>
                        <p class="text-xs text-slate-500 ${currency.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                            ${currency.change_24h >= 0 ? '+' : ''}${currency.change_24h.toFixed(2)}%
                        </p>
                    </div>
                </div>
                <div class="currency-strength-bar">
                    <div class="currency-strength-indicator" style="left: ${barPosition}%"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Display opportunities if container exists
    const oppContainer = document.getElementById('strengthOpportunities');
    if (oppContainer && opportunities.length > 0) {
        oppContainer.innerHTML = opportunities.map(opp => `
            <div class="opportunity-card ${opp.action === 'SELL' ? 'sell' : ''}">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-lg">${opp.pair}</span>
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${opp.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
                        ${opp.action}
                    </span>
                </div>
                <p class="text-xs text-slate-400">${opp.reason}</p>
            </div>
        `).join('');
    }

    // Display summary
    const summaryEl = document.getElementById('strengthSummary');
    if (summaryEl) {
        summaryEl.textContent = summary;
    }
}

window.loadCurrencyStrength = loadCurrencyStrength;

// ============================================
// Enhanced Forex Sessions
// ============================================
async function loadForexSessions() {
    try {
        const response = await fetch('/api/forex/sessions');
        const data = await response.json();

        if (data.success && data.data) {
            displayForexSessions(data.data);
        }
    } catch (error) {
        console.error('Failed to load forex sessions:', error);
        // Fallback to client-side calculation
        updateForexSessions();
    }
}

function displayForexSessions(data) {
    const { sessions, overlap, active_sessions, best_pairs } = data;

    // Update session cards
    Object.entries(sessions).forEach(([key, session]) => {
        const card = document.getElementById(`${key}Session`);
        if (card) {
            card.classList.toggle('session-open', session.status === 'open');
            card.classList.toggle('session-card', true);
        }

        const status = document.getElementById(`${key}Status`);
        if (status) {
            if (session.status === 'open') {
                status.textContent = 'OPEN';
                status.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            } else {
                status.textContent = 'CLOSED';
                status.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30';
            }
        }
    });

    // Display overlap banner if exists
    const overlapBanner = document.getElementById('sessionOverlap');
    if (overlapBanner) {
        if (overlap) {
            overlapBanner.classList.remove('hidden');
            overlapBanner.innerHTML = `
                <span class="text-lg">🔥</span>
                <span class="text-sm font-medium">${overlap}</span>
            `;
        } else {
            overlapBanner.classList.add('hidden');
        }
    }
}

window.loadForexSessions = loadForexSessions;

// ============================================
// Enhanced Economic Calendar
// ============================================
async function loadEconomicCalendar() {
    try {
        showToast('Loading economic calendar...', 'success');

        const response = await fetch('/api/forex/calendar');
        const data = await response.json();

        if (data.success && data.data) {
            displayEconomicCalendar(data.data);
        }
    } catch (error) {
        console.error('Failed to load economic calendar:', error);
        showToast('Failed to load economic calendar', 'error');
    }
}

function displayEconomicCalendar(data) {
    const modal = document.getElementById('globalModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    if (!modal || !modalContent) return;

    modalTitle.textContent = '📅 Economic Calendar';

    // Warning banner if high impact today
    let warningHtml = '';
    if (data.warning) {
        warningHtml = `
            <div class="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mb-6">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">⚠️</span>
                    <div>
                        <p class="font-semibold text-rose-400">High-Impact Events Today</p>
                        <p class="text-sm text-slate-400">${data.warning}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Events list
    let eventsHtml = '<div class="space-y-3">';

    if (data.events && data.events.length > 0) {
        data.events.forEach(event => {
            const impactClass = event.impact === 'High' || event.impact === 'high' ? 'high-impact' :
                event.impact === 'Medium' || event.impact === 'medium' ? 'medium-impact' : 'low-impact';
            const impactBadgeClass = event.impact === 'High' || event.impact === 'high' ? 'high' :
                event.impact === 'Medium' || event.impact === 'medium' ? 'medium' : 'low';

            eventsHtml += `
                <div class="calendar-event ${impactClass} p-4 bg-white/5 rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-3">
                            <span class="text-lg">${getCountryFlag(event.currency)}</span>
                            <div>
                                <p class="font-semibold">${event.name}</p>
                                <p class="text-xs text-slate-500">${event.currency}</p>
                            </div>
                        </div>
                        <span class="impact-badge ${impactBadgeClass}">${event.impact}</span>
                    </div>
                    <div class="flex items-center gap-4 text-xs text-slate-500">
                        <span>📅 ${event.date}</span>
                        <span>📊 Forecast: ${event.forecast || '--'}</span>
                        <span>📈 Previous: ${event.previous || '--'}</span>
                    </div>
                </div>
            `;
        });
    } else {
        eventsHtml += '<p class="text-center text-slate-500 py-8">No upcoming events in the next 7 days</p>';
    }

    eventsHtml += '</div>';

    modalContent.innerHTML = warningHtml + eventsHtml;
    modal.classList.remove('hidden');
}

function getCountryFlag(currency) {
    const flags = {
        'USD': '🇺🇸',
        'EUR': '🇪🇺',
        'GBP': '🇬🇧',
        'JPY': '🇯🇵',
        'AUD': '🇦🇺',
        'CAD': '🇨🇦',
        'CHF': '🇨🇭',
        'NZD': '🇳🇿',
        'CNY': '🇨🇳',
        'NGN': '🇳🇬'
    };
    return flags[currency] || '🌐';
}

window.loadEconomicCalendar = loadEconomicCalendar;

// ============================================
// Forex Pair Analyzer
// ============================================
let selectedForexPair = null;

async function analyzeForexPair(pair) {
    if (!pair) {
        const input = document.getElementById('forexPairInput');
        pair = input?.value?.trim()?.toUpperCase() || 'EUR/USD';
    }

    selectedForexPair = pair;
    showToast(`Analyzing ${pair}...`, 'success');

    try {
        // Fetch multiple analysis endpoints in parallel
        const [chartData, mtfData, srData] = await Promise.all([
            fetch(`/api/forex/chart/${pair.replace('/', '-')}?period=3mo`).then(r => r.json()),
            fetch(`/api/forex/mtf/${pair.replace('/', '-')}`).then(r => r.json()),
            fetch(`/api/forex/sr/${pair.replace('/', '-')}`).then(r => r.json())
        ]);

        displayPairAnalysis(pair, {
            chart: chartData.data,
            mtf: mtfData.data,
            sr: srData.data
        });

    } catch (error) {
        console.error('Pair analysis error:', error);
        showToast('Failed to analyze pair', 'error');
    }
}

function displayPairAnalysis(pair, data) {
    const modal = document.getElementById('chartModal');
    if (!modal) return;

    const modalTitle = document.getElementById('chartModalTitle');
    if (modalTitle) {
        modalTitle.textContent = `${pair} Analysis`;
    }

    // Display current price
    const modalPrice = document.getElementById('chartModalPrice');
    if (modalPrice && data.sr) {
        const price = data.sr.current_price || 0;
        modalPrice.textContent = price.toFixed(5);
    }

    // Display Fibonacci levels
    if (data.chart?.fibonacci) {
        const fibContainer = document.getElementById('fibonacciLevels');
        if (fibContainer) {
            const fibs = data.chart.fibonacci;
            fibContainer.innerHTML = Object.entries(fibs).map(([level, price]) => `
                <div class="bg-white/5 rounded-lg p-2 text-center">
                    <p class="text-xs text-violet-400">${level}</p>
                    <p class="font-semibold text-sm">${price.toFixed(5)}</p>
                </div>
            `).join('');
        }
    }

    // Display MTF signals
    if (data.mtf) {
        const summary = document.getElementById('chartAnalysisSummary');
        if (summary) {
            let signalText = '';
            Object.entries(data.mtf).forEach(([tf, sig]) => {
                const signalColor = sig.signal?.includes('Buy') ? 'text-emerald-400' :
                    sig.signal?.includes('Sell') ? 'text-rose-400' : 'text-slate-400';
                signalText += `<span class="${signalColor} mr-4">${tf.toUpperCase()}: ${sig.signal}</span>`;
            });
            summary.innerHTML = signalText || 'Analysis data not available';
        }
    }

    // Display S/R levels
    if (data.sr) {
        const fibDisplay = document.getElementById('fibLevelsDisplay');
        if (fibDisplay) {
            fibDisplay.innerHTML = `
                <span class="text-xs text-rose-400">R2: ${data.sr.r2?.toFixed(5)}</span>
                <span class="text-xs text-rose-300">R1: ${data.sr.r1?.toFixed(5)}</span>
                <span class="text-xs text-violet-400">P: ${data.sr.pivot?.toFixed(5)}</span>
                <span class="text-xs text-emerald-300">S1: ${data.sr.s1?.toFixed(5)}</span>
                <span class="text-xs text-emerald-400">S2: ${data.sr.s2?.toFixed(5)}</span>
            `;
        }
    }

    // Render charts
    if (data.chart) {
        renderPriceChart(data.chart);
        renderRSIChart(data.chart);
        renderMACDChart(data.chart);
    }

    modal.classList.remove('hidden');
}

window.analyzeForexPair = analyzeForexPair;

// Popular forex pairs for quick access
const popularForexPairs = [
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', flag: '🇪🇺🇺🇸' },
    { symbol: 'GBP/USD', name: 'British Pound / US Dollar', flag: '🇬🇧🇺🇸' },
    { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', flag: '🇺🇸🇯🇵' },
    { symbol: 'XAU/USD', name: 'Gold / US Dollar', flag: '🪙🇺🇸' },
    { symbol: 'USD/NGN', name: 'US Dollar / Nigerian Naira', flag: '🇺🇸🇳🇬' },
    { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', flag: '🇬🇧🇯🇵' }
];

function displayPopularPairs() {
    const container = document.getElementById('popularPairsGrid');
    if (!container) return;

    container.innerHTML = popularForexPairs.map(pair => `
        <button onclick="analyzeForexPair('${pair.symbol}')" 
            class="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/30 rounded-xl transition-all text-left">
            <span class="text-lg">${pair.flag}</span>
            <div>
                <p class="font-semibold text-sm">${pair.symbol}</p>
                <p class="text-xs text-slate-500">${pair.name}</p>
            </div>
        </button>
    `).join('');
}

// ============================================
// Dashboard Initialization for Account Types
// ============================================
function initDashboardForAccountType() {
    const accountType = localStorage.getItem('mma_account_type') || 'both';

    // Apply body class for CSS filtering
    document.body.classList.remove('account-forex', 'account-stock', 'account-both');
    document.body.classList.add(`account-${accountType}`);

    // Set default page based on account type
    if (accountType === 'forex') {
        // Auto-navigate to forex on load for forex-focused users
        const forexLink = document.querySelector('[data-page="forex"]');
        if (forexLink && !lastReport) {
            forexLink.click();
        }
    }

    // Update navigation visibility
    updateNavigationForAccountType(accountType);
}

function updateNavigationForAccountType(accountType) {
    const stockNavItems = document.querySelectorAll('[data-page="usMarkets"], [data-page="nigerian"]');
    const forexNavItems = document.querySelectorAll('[data-page="forex"]');

    stockNavItems.forEach(item => {
        if (accountType === 'forex') {
            item.classList.add('opacity-50');
        } else {
            item.classList.remove('opacity-50');
        }
    });

    forexNavItems.forEach(item => {
        if (accountType === 'stock') {
            item.classList.add('opacity-50');
        } else {
            item.classList.remove('opacity-50');
        }
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initDashboardForAccountType();
    displayPopularPairs();

    // Load forex sessions status
    loadForexSessions();
    setInterval(loadForexSessions, 60000);
});

// Export all new functions
window.displayCurrencyStrength = displayCurrencyStrength;
window.displayEconomicCalendar = displayEconomicCalendar;
window.displayPairAnalysis = displayPairAnalysis;
window.initDashboardForAccountType = initDashboardForAccountType;

// ============================================
// MISSING FOREX & QUANT FUNCTIONS
// ============================================

// 1. Core Analysis Entry Point
async function analyzeForexPairDirect(symbol) {
    console.log(`📊 Analyzing forex pair: ${symbol}`);

    // Show loading modal
    showAnalysisModal(symbol, '<div class="text-center py-8"><div class="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div><p>Loading analysis...</p></div>');

    try {
        const response = await fetch(`/api/analysis/full/${encodeURIComponent(symbol)}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.message || 'Analysis failed');

        // Display comprehensive analysis
        displayPairAnalysis(symbol, data);

    } catch (error) {
        console.error('❌ Pair analysis error:', error);
        showAnalysisModal(symbol, `
            <div class="text-center py-8">
                <span class="text-4xl mb-4 block">⚠️</span>
                <p class="text-red-400 mb-4">Failed to analyze ${symbol}: ${error.message}</p>
                <button onclick="closeAnalysisModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-all">Close</button>
            </div>
        `);
    }
}

function selectPair(symbol) {
    analyzeForexPairDirect(symbol);
}

// 2. Analysis Modal Display
function showAnalysisModal(symbol, content) {
    closeAnalysisModal(); // Close existing

    const modal = document.createElement('div');
    modal.id = 'analysisModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 opacity-0 transition-opacity duration-300';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeAnalysisModal()"></div>
        <div class="relative bg-surface-card border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform scale-95 transition-transform duration-300">
            <div class="sticky top-0 bg-surface-card/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between z-10">
                <h2 class="text-xl font-bold flex items-center gap-3">
                    <span>📊</span>
                    <span>${symbol} Analysis</span>
                </h2>
                <button onclick="closeAnalysisModal()" class="p-2 hover:bg-white/10 rounded-lg transition-colors">✕</button>
            </div>
            <div id="analysisModalContent" class="p-6">${content}</div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Animate in
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div.relative').classList.remove('scale-95');
    });
}

function closeAnalysisModal() {
    const modal = document.getElementById('analysisModal');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('div.relative').classList.add('scale-95');
        setTimeout(() => modal.remove(), 200);
        document.body.style.overflow = '';
    }
}

function displayPairAnalysis(symbol, data) {
    // Map backend keys to frontend expectations safely
    const mtf = data.multi_timeframe || data.mtf || {};
    const sr = data.support_resistance || data.sr || {};

    // Extract technicals from MTF signals if available
    let technicals = data.technicals || {};
    if (mtf.signals && Array.isArray(mtf.signals)) {
        // Prefer 4H, then Daily, then 1H
        const refSignal = mtf.signals.find(s => s.timeframe === '4H') ||
            mtf.signals.find(s => s.timeframe === 'Daily') ||
            mtf.signals[0];

        if (refSignal) {
            technicals = {
                rsi: refSignal.rsi || 50,
                macd_trend: refSignal.macd_trend || 'Neutral',
                atr: 0.0020, // Default fallback
                signal: refSignal.signal
            };
        }
    }

    // Ensure fallbacks
    technicals.rsi = technicals.rsi !== undefined ? technicals.rsi : 50;
    technicals.macd_trend = technicals.macd_trend || 'Neutral';
    technicals.atr = technicals.atr || 0.0020;
    sr.pivot = sr.pivot || 0;

    const analysisText = data.analysis || data.overall_recommendation || mtf.recommendation || "Analysis not available";
    const recommendation = mtf.recommendation || "Hold";
    const isBuy = recommendation.toUpperCase().includes('BUY');
    const price = sr.current_price || data.price || 0;

    const html = `
        <div class="space-y-6">
            <!-- Signal Hero -->
            <div class="bg-gradient-to-br ${isBuy ? 'from-emerald-900/40 to-emerald-900/10' : 'from-rose-900/40 to-rose-900/10'} border border-white/5 rounded-2xl p-6 text-center relative overflow-hidden">
                <div class="relative z-10">
                    <p class="text-slate-400 mb-2 uppercase tracking-wide text-xs">AI Recommendation</p>
                    <h2 class="text-4xl font-black ${isBuy ? 'text-emerald-400' : 'text-rose-400'} mb-2">${recommendation}</h2>
                    <p class="text-lg text-slate-300 max-w-2xl mx-auto">${analysisText.substring(0, 150)}...</p>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white/5 rounded-xl p-4 text-center">
                    <p class="text-slate-500 text-xs mb-1">RSI (14)</p>
                    <p class="font-bold text-xl">${technicals.rsi.toFixed(1)}</p>
                </div>
                <div class="bg-white/5 rounded-xl p-4 text-center">
                    <p class="text-slate-500 text-xs mb-1">MACD</p>
                    <p class="font-bold text-xl ${technicals.macd_trend.includes('Bullish') ? 'text-emerald-400' : 'text-rose-400'}">${technicals.macd_trend}</p>
                </div>
                <div class="bg-white/5 rounded-xl p-4 text-center">
                    <p class="text-slate-500 text-xs mb-1">Pivot Point</p>
                    <p class="font-bold text-xl">${sr.pivot.toFixed(4)}</p>
                </div>
                <div class="bg-white/5 rounded-xl p-4 text-center">
                    <p class="text-slate-500 text-xs mb-1">Volatility</p>
                    <p class="font-bold text-xl">${(technicals.atr * 10000).toFixed(1)} pips</p>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 justify-center">
                <button onclick="takeTrade('${symbol}', '${recommendation}', ${price})" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                    <span>⚡</span> I Took This Trade
                </button>
                <button onclick="openForexChart('${symbol}')" class="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20">
                    <span>📈</span> View Chart
                </button>
                <button onclick="showQuantAnalysisModal('${symbol}')" class="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
                    <span>🧠</span> Quant Analysis
                </button>
            </div>
            
            <div class="text-xs text-center text-slate-500 pt-4">
                Full analysis generated at ${new Date().toLocaleTimeString()}
            </div>
        </div>
    `;

    const contentDiv = document.getElementById('analysisModalContent');
    if (contentDiv) contentDiv.innerHTML = html;
}

// 3. Signal Recording & Trading
async function recordForexSignals(pairs) {
    if (!pairs || !Array.isArray(pairs)) return;
    const interestingPairs = pairs.filter(p => p.technicals && (p.technicals.signal_strength >= 4 || p.technicals.signal_strength <= 2));

    for (const pair of interestingPairs) {
        try {
            const isBuy = pair.technicals.signal.includes('Buy');
            const strength = pair.technicals.signal_strength || (isBuy ? 5 : 1);
            fetch('/api/signals/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: pair.symbol,
                    pair_name: pair.name,
                    category: 'forex',
                    signal: pair.technicals.signal,
                    signal_strength: strength,
                    price: pair.price,
                    rsi: pair.technicals.rsi,
                    macd_trend: pair.technicals.macd_trend,
                    analysis: pair.analysis
                })
            }).catch(e => console.error('Signal record error:', e));
        } catch (e) { console.error('Signal processing error:', e); }
    }
}

async function takeTrade(symbol, signal, price) {
    showToast('Recording trade...', 'info');
    try {
        const response = await fetch('/api/telegram/trade-taken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, signal, price: parseFloat(price) })
        });
        const data = await response.json();
        if (data.success) showToast('Trade recorded! Telegram alert sent.', 'success');
        else showToast('Failed to send alert: ' + data.message, 'error');
    } catch (error) {
        console.error('Trade record error:', error);
        showToast('Error recording trade', 'error');
    }
}

// 4. Quant Analysis (Simplified for Briefness)
async function showQuantAnalysisModal(symbol) {
    showToast('Loading quant analysis...', 'info');
    try {
        const response = await fetch(`/api/quant/full/${encodeURIComponent(symbol)}`);
        const result = await response.json();

        // Show modal (reuse analysis modal structure or create new)
        // For simplicity, reusing analysis modal but with quant content
        const content = `
            <div class="space-y-6">
                <h3 class="text-xl font-bold mb-4">Quantitative Analysis: ${symbol}</h3>
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-white/5 p-4 rounded-xl">
                        <h4 class="font-bold text-amber-400 mb-2">Fibonacci Levels</h4>
                        ${renderDictList(result.data.fibonacci?.levels)}
                    </div>
                    <div class="bg-white/5 p-4 rounded-xl">
                        <h4 class="font-bold text-blue-400 mb-2">Bollinger Bands</h4>
                        <p>Upper: ${result.data.bollinger?.upper_band?.toFixed(4)}</p>
                        <p>Middle: ${result.data.bollinger?.middle_band?.toFixed(4)}</p>
                        <p>Lower: ${result.data.bollinger?.lower_band?.toFixed(4)}</p>
                        <p class="text-xs text-slate-400 mt-2">${result.data.bollinger?.signal}</p>
                    </div>
                    <div class="bg-white/5 p-4 rounded-xl">
                        <h4 class="font-bold text-purple-400 mb-2">Mean Reversion</h4>
                        <p>Z-Score: ${result.data.mean_reversion?.z_score?.toFixed(2)}</p>
                        <p class="font-bold mt-1">${result.data.mean_reversion?.signal}</p>
                    </div>
                    <div class="bg-white/5 p-4 rounded-xl">
                        <h4 class="font-bold text-emerald-400 mb-2">Monte Carlo (30d)</h4>
                        <p>Upside: ${result.data.monte_carlo?.percentiles?.['95th']?.toFixed(4)}</p>
                        <p>Downside: ${result.data.monte_carlo?.percentiles?.['5th']?.toFixed(4)}</p>
                        <p class="text-xs text-slate-400 mt-2">Win Prob: ${(result.data.monte_carlo?.win_probability * 100).toFixed(1)}%</p>
                    </div>
                </div>
                <button onclick="closeAnalysisModal()" class="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl">Back</button>
            </div>
        `;
        showAnalysisModal(symbol, content);
    } catch (e) {
        showToast('Quant analysis failed', 'error');
    }
}

function renderDictList(obj) {
    if (!obj) return 'No data';
    return Object.entries(obj).map(([k, v]) => `<div class="flex justify-between text-sm"><span class="text-slate-400">${k}</span><span>${Number(v).toFixed(4)}</span></div>`).join('');
}

// 5. Charting
// (Use the openForexChart from previous steps, but ensure it's here)
async function openForexChart(symbol) {
    // Just load the chart_module.js dynamically if needed, or implement here.
    // I'll implement a simple version here relying on the fact that I added chart_module.js earlier?
    // No, I'll inline it to be safe.
    if (window.openForexChart) {
        // If defined externally (e.g. I appended it to another file and it loaded), use it.
        // But referencing self is risky if overwritten.
        // Let's implement it.
        // Copied from Step 242 logic
        showToast(`Loading chart for ${symbol}...`, 'info');
        try {
            const response = await fetch(`/api/forex/chart/${encodeURIComponent(symbol)}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.detail);

            const history = result.data;
            const modal = document.createElement('div');
            modal.id = 'chartModal';
            modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="absolute inset-0 bg-black/90 backdrop-blur-sm" onclick="closeChartModal()"></div>
                <div class="relative bg-surface-card border border-white/10 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl">
                    <div class="p-4 border-b border-white/10 flex justify-between items-center bg-surface-card/50 backdrop-blur rounded-t-2xl z-20">
                        <h3 class="font-bold text-lg">${symbol} Chart</h3>
                        <button onclick="closeChartModal()" class="p-2 hover:bg-white/10 rounded-lg">✕</button>
                    </div>
                    <div class="flex-1 p-4 relative bg-slate-900/50 rounded-b-2xl overflow-hidden">
                        <canvas id="forexChartCanvas"></canvas>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const ctx = document.getElementById('forexChartCanvas').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: history.map(h => new Date(h.date).toLocaleDateString()),
                    datasets: [{
                        label: 'Price',
                        data: history.map(h => h.close),
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: true
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        } catch (e) { showToast('Chart error: ' + e.message, 'error'); }
    }
}

function closeChartModal() {
    const modal = document.getElementById('chartModal');
    if (modal) modal.remove();
}

// Exports
window.analyzeForexPairDirect = analyzeForexPairDirect;
window.selectPair = selectPair;
window.recordForexSignals = recordForexSignals;
window.takeTrade = takeTrade;
window.showQuantAnalysisModal = showQuantAnalysisModal;
window.openForexChart = openForexChart;
window.closeChartModal = closeChartModal;
window.displayPairAnalysis = displayPairAnalysis;

