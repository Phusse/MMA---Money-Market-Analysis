/**
 * StockPulse AI - Premium Dashboard JavaScript
 */

// ============================================
// DOM Elements
// ============================================
const generateBtn = document.getElementById('generateBtn');
const emailToggle = document.getElementById('emailToggle');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorText = document.getElementById('errorText');
const dashboardContent = document.getElementById('dashboardContent');
const lastUpdate = document.getElementById('lastUpdate');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Mood elements
const moodEmoji = document.getElementById('moodEmoji');
const moodLabel = document.getElementById('moodLabel');
const moodDescription = document.getElementById('moodDescription');
const gaugeFill = document.getElementById('gaugeFill');

// Stat elements
const topGainerValue = document.getElementById('topGainerValue');
const topLoserValue = document.getElementById('topLoserValue');
const mostActiveValue = document.getElementById('mostActiveValue');

// Navigation
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');

// Charts
let stockChart = null;
let sectorChart = null;
let ngxSectorChart = null;

// Store last report for cross-page access
let lastReport = null;

// Onboarding flag
let hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    generateBtn.addEventListener('click', generateReport);
    setupNavigation();
    setupNavSections();
    checkHealth();
    initMarketStatus();

    // Show onboarding for new users
    if (!hasSeenOnboarding) {
        showOnboarding();
    }
});

// Toggle collapsible nav sections
function toggleNavSection(sectionId) {
    const section = document.getElementById(sectionId)?.parentElement;
    if (section) {
        section.classList.toggle('collapsed');
    }
}

// Expose toggleNavSection globally
window.toggleNavSection = toggleNavSection;

// Setup nav sections
function setupNavSections() {
    // Expand markets section by default
    const marketsSection = document.getElementById('marketsNav')?.parentElement;
    if (marketsSection) {
        marketsSection.classList.remove('collapsed');
    }

    // Collapse learn section by default
    const learnSection = document.getElementById('learnNav')?.parentElement;
    if (learnSection) {
        learnSection.classList.add('collapsed');
    }
}

// Stub function (no-op on desktop)
function closeMobileMenu() { }

// ============================================
// Onboarding for New Users
// ============================================
function showOnboarding() {
    const modal = document.getElementById('onboardingModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function dismissOnboarding() {
    const modal = document.getElementById('onboardingModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    localStorage.setItem('hasSeenOnboarding', 'true');
    hasSeenOnboarding = true;

    // Navigate to forex page to start
    showPage('forex');
}

// Expose to window
window.dismissOnboarding = dismissOnboarding;

// ============================================
// Improved Empty States
// ============================================
function createEmptyState(icon, title, message, buttonText, buttonAction) {
    return `
        <div class="empty-state">
            <span class="empty-state-icon">${icon}</span>
            <h3>${title}</h3>
            <p>${message}</p>
            ${buttonText ? `<button class="empty-state-btn" onclick="${buttonAction}">${buttonText}</button>` : ''}
        </div>
    `;
}

// ============================================
// Market Status & Countdown
// ============================================
function initMarketStatus() {
    try {
        console.log('🕐 Initializing market status...');
        updateMarketStatus();
        // Update every second for live countdown
        setInterval(updateMarketStatus, 1000);
        console.log('✅ Market status initialized');
    } catch (e) {
        console.error('❌ Market status init error:', e);
    }
}

function updateMarketStatus() {
    const now = new Date();

    // US Market (NYSE) - 9:30 AM - 4:00 PM EST (UTC-5)
    const usStatus = getUSMarketStatus(now);
    updateMarketDisplay('us', usStatus);

    // Nigerian Market (NGX) - 10:00 AM - 2:30 PM WAT (UTC+1)
    const ngStatus = getNGMarketStatus(now);
    updateMarketDisplay('ng', ngStatus);
}

function getUSMarketStatus(now) {
    // EST is UTC-5 (not accounting for DST)
    const estOffset = -5 * 60; // minutes
    const estNow = new Date(now.getTime() + (now.getTimezoneOffset() + estOffset) * 60000);

    const day = estNow.getDay(); // 0=Sun, 6=Sat
    const hours = estNow.getHours();
    const minutes = estNow.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const openTime = 9 * 60 + 30;  // 9:30 AM
    const closeTime = 16 * 60;      // 4:00 PM

    // Weekend
    if (day === 0 || day === 6) {
        const msUntilOpen = getTimeUntilNextOpen(estNow, day, openTime);
        return { status: 'closed', label: 'Weekend', countdown: msUntilOpen, isWeekend: true, opensAt: '9:30 AM EST' };
    }

    // Before market open - show when it opens
    if (totalMinutes < openTime) {
        const msUntilOpen = (openTime - totalMinutes) * 60 * 1000;
        return { status: 'closed', label: 'Opens 9:30 AM', countdown: msUntilOpen, isWeekend: false, opensAt: '9:30 AM EST' };
    }

    // Market open
    if (totalMinutes >= openTime && totalMinutes < closeTime) {
        const msUntilClose = (closeTime - totalMinutes) * 60 * 1000;
        return { status: 'open', label: 'Market Open', countdown: msUntilClose, isWeekend: false };
    }

    // After close
    const msUntilOpen = getTimeUntilNextOpen(estNow, day, openTime);
    return { status: 'closed', label: 'Closed', countdown: msUntilOpen, isWeekend: false, opensAt: '9:30 AM EST' };
}

function getNGMarketStatus(now) {
    // WAT is UTC+1
    const watOffset = 1 * 60; // minutes
    const watNow = new Date(now.getTime() + (now.getTimezoneOffset() + watOffset) * 60000);

    const day = watNow.getDay();
    const hours = watNow.getHours();
    const minutes = watNow.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const openTime = 10 * 60;       // 10:00 AM
    const closeTime = 14 * 60 + 30; // 2:30 PM

    // Weekend
    if (day === 0 || day === 6) {
        const msUntilOpen = getTimeUntilNextOpen(watNow, day, openTime);
        return { status: 'closed', label: 'Weekend', countdown: msUntilOpen, isWeekend: true, opensAt: '10:00 AM WAT' };
    }

    // Before market open - show when it opens
    if (totalMinutes < openTime) {
        const msUntilOpen = (openTime - totalMinutes) * 60 * 1000;
        return { status: 'closed', label: 'Opens 10:00 AM', countdown: msUntilOpen, isWeekend: false, opensAt: '10:00 AM WAT' };
    }

    // Market open
    if (totalMinutes >= openTime && totalMinutes < closeTime) {
        const msUntilClose = (closeTime - totalMinutes) * 60 * 1000;
        return { status: 'open', label: 'Market Open', countdown: msUntilClose, isWeekend: false };
    }

    // After close
    const msUntilOpen = getTimeUntilNextOpen(watNow, day, openTime);
    return { status: 'closed', label: 'Closed', countdown: msUntilOpen, isWeekend: false, opensAt: '10:00 AM WAT' };
}

function getTimeUntilNextOpen(localNow, currentDay, openTimeMinutes) {
    // Calculate days until next trading day
    let daysUntilOpen;
    if (currentDay === 6) { // Saturday
        daysUntilOpen = 2; // Monday
    } else if (currentDay === 0) { // Sunday
        daysUntilOpen = 1; // Monday
    } else if (currentDay === 5) { // Friday after close
        daysUntilOpen = 3; // Monday
    } else {
        daysUntilOpen = 1; // Tomorrow
    }

    // Get current time in minutes from midnight
    const currentMinutes = localNow.getHours() * 60 + localNow.getMinutes();

    // Calculate milliseconds until next open
    // First, add the remaining time today until midnight
    const minutesToMidnight = (24 * 60) - currentMinutes;

    // Then add full days (minus 1 since we counted to midnight)
    const fullDaysMs = (daysUntilOpen - 1) * 24 * 60 * 60 * 1000;

    // Then add time from midnight to market open
    const openTimeMs = openTimeMinutes * 60 * 1000;

    // Total
    const totalMs = (minutesToMidnight * 60 * 1000) + fullDaysMs + openTimeMs;

    return totalMs;
}



function updateMarketDisplay(market, statusData) {
    const statusItem = document.getElementById(`${market}MarketStatus`);
    const statusBadge = document.getElementById(`${market}StatusBadge`);
    const countdown = document.getElementById(`${market}Countdown`);

    if (!statusItem || !statusBadge || !countdown) return;

    // Update item class
    statusItem.classList.remove('market-open', 'market-closed');
    statusItem.classList.add(statusData.status === 'open' ? 'market-open' : 'market-closed');

    // Update badge
    statusBadge.className = `market-status-badge ${statusData.status}`;
    statusBadge.querySelector('.status-text').textContent = statusData.label;

    // Update countdown
    if (statusData.status === 'open') {
        countdown.innerHTML = `
            <span class="countdown-label">Closes in</span>
            <span class="countdown-time">${formatCountdown(statusData.countdown)}</span>
        `;
        countdown.classList.remove('weekend');
    } else {
        countdown.innerHTML = `
            <span class="countdown-label">Opens in</span>
            <span class="countdown-time">${formatCountdown(statusData.countdown)}</span>
        `;
        countdown.classList.toggle('weekend', statusData.isWeekend);
    }
}

function formatCountdown(ms) {
    if (ms <= 0) return '00:00:00';

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h ${minutes.toString().padStart(2, '0')}m`;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================
// Navigation
// ============================================
function setupNavigation() {
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
                if (page.id === `${targetPage}Page`) {
                    page.classList.add('active');
                }
            });

            // Close mobile menu if open
            closeMobileMenu();
        });
    });
}

// ============================================
// API Health Check
// ============================================
async function checkHealth() {
    try {
        const res = await fetch('/api/health');
        if (res.ok) {
            setStatus('Connected', 'success');
        } else {
            setStatus('Offline', 'error');
        }
    } catch {
        setStatus('Offline', 'error');
    }
}

function setStatus(text, type) {
    statusText.textContent = text;
    statusDot.style.background = type === 'success' ? '#10b981' :
        type === 'error' ? '#ef4444' : '#f59e0b';
    statusDot.style.boxShadow = type === 'success' ? '0 0 10px #10b981' :
        type === 'error' ? '0 0 10px #ef4444' : '0 0 10px #f59e0b';
}

// ============================================
// Generate Report
// ============================================
async function generateReport() {
    showLoading(true);
    hideError();
    setStatus('Analyzing...', 'loading');

    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                send_email: emailToggle.checked,
                include_nigerian: true
            })
        });

        // Handle non-JSON responses (like "Internal Server Error")
        let data;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            // Response is not JSON - likely an error page
            const textResponse = await res.text();
            console.error('Non-JSON response:', textResponse);
            throw new Error(`Server Error (${res.status}): The server returned an unexpected response. Please try again.`);
        }

        if (!res.ok) throw new Error(data.detail || 'Request failed');
        if (!data.success) throw new Error(data.message || 'Analysis failed');

        lastReport = data.report;

        // Display US Market data
        displayReport(data.report);

        // Display Nigerian data if available
        if (data.report.nigerian_market) {
            displayNigerianData(data.report.nigerian_market);
        }

        // Display Investment Strategies
        if (data.report.analysis) {
            displayStrategies(data.report.analysis);
        }

        setStatus('Connected', 'success');

    } catch (err) {
        console.error('Report generation error:', err);
        // Provide user-friendly error messages
        let errorMessage = err.message;
        if (err.message.includes('Failed to fetch')) {
            errorMessage = 'Network error: Could not connect to the server. Please check your connection.';
        } else if (err.message.includes('Unexpected token')) {
            errorMessage = 'Server error: The server returned an invalid response. This may be a temporary issue.';
        }
        showError(errorMessage);
        setStatus('Error', 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// Display US Market Report
// ============================================
function displayReport(report) {
    lastUpdate.textContent = `Last updated: ${report.date}`;
    updateMarketMood(report.market_data, report.analysis);
    updateStatCards(report.market_data);
    updateAISummary(report.analysis);
    renderStockChart(report.market_data);
    renderSectorChart(report.market_data.sector_performance);
    updateInsights(report.analysis);
    updateTables(report.market_data);
    dashboardContent.style.display = 'grid';
}

// ============================================
// Market Mood
// ============================================
function updateMarketMood(marketData, analysis) {
    const gainers = marketData.gainers;
    const losers = marketData.losers;

    let avgGain = gainers.reduce((a, b) => a + b.change_pct, 0) / (gainers.length || 1);
    let avgLoss = Math.abs(losers.reduce((a, b) => a + b.change_pct, 0) / (losers.length || 1));

    let moodScore = 50;
    if (avgGain > avgLoss * 1.3) {
        moodScore = 65 + Math.min(avgGain * 3, 25);
    } else if (avgLoss > avgGain * 1.3) {
        moodScore = 35 - Math.min(avgLoss * 3, 25);
    }
    moodScore = Math.max(10, Math.min(90, moodScore));

    const dashOffset = 339.292 - (339.292 * moodScore / 100);
    gaugeFill.style.strokeDashoffset = dashOffset;

    if (moodScore >= 60) {
        gaugeFill.style.stroke = '#10b981';
        moodEmoji.textContent = '🐂';
        moodLabel.textContent = 'Bullish';
        moodDescription.textContent = 'Markets showing strength. Money flowing into risk assets.';
    } else if (moodScore <= 40) {
        gaugeFill.style.stroke = '#ef4444';
        moodEmoji.textContent = '🐻';
        moodLabel.textContent = 'Bearish';
        moodDescription.textContent = 'Markets under pressure. Defensive positioning recommended.';
    } else {
        gaugeFill.style.stroke = '#f59e0b';
        moodEmoji.textContent = '🔄';
        moodLabel.textContent = 'Mixed';
        moodDescription.textContent = 'Markets showing mixed signals. Selective opportunities exist.';
    }
}

// ============================================
// Stat Cards
// ============================================
function updateStatCards(marketData) {
    if (marketData.gainers.length > 0) {
        const top = marketData.gainers[0];
        topGainerValue.textContent = `${top.ticker} +${top.change_pct.toFixed(1)}%`;
    }

    if (marketData.losers.length > 0) {
        const bottom = marketData.losers[marketData.losers.length - 1];
        topLoserValue.textContent = `${bottom.ticker} ${bottom.change_pct.toFixed(1)}%`;
    }

    if (marketData.active.length > 0) {
        const active = marketData.active[0];
        mostActiveValue.textContent = `${active.ticker} ${active.volume_ratio}x`;
    }
}

// ============================================
// AI Summary
// ============================================
function updateAISummary(analysis) {
    const container = document.getElementById('aiSummary');
    const insights = analysis.key_insights.slice(0, 3);

    if (insights.length > 0) {
        let html = '<div class="ai-summary-text">';
        insights.forEach((insight, i) => {
            html += `<p style="margin-bottom: ${i < insights.length - 1 ? '16px' : '0'}">${escapeHtml(insight)}</p>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }
}

// ============================================
// Charts
// ============================================
function renderStockChart(marketData) {
    const ctx = document.getElementById('stockChart').getContext('2d');

    const allStocks = [...marketData.gainers, ...marketData.losers]
        .sort((a, b) => b.change_pct - a.change_pct)
        .slice(0, 8);

    const labels = allStocks.map(s => s.ticker);
    const values = allStocks.map(s => s.change_pct);
    const colors = values.map(v => v >= 0 ? '#10b981' : '#ef4444');

    if (stockChart) stockChart.destroy();

    stockChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1000, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1c1c28',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `${ctx.raw >= 0 ? '+' : ''}${ctx.raw.toFixed(2)}%`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 11, weight: 600 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#64748b', callback: (v) => `${v}%` }
                }
            }
        }
    });
}

function renderSectorChart(sectorPerf) {
    const ctx = document.getElementById('sectorChart').getContext('2d');

    const sectors = Object.entries(sectorPerf);
    const labels = sectors.map(([name]) => name);
    const values = sectors.map(([, val]) => Math.abs(val));

    const colorPalette = ['#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

    if (sectorChart) sectorChart.destroy();

    sectorChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colorPalette.slice(0, sectors.length),
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', font: { size: 11 }, padding: 16, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: '#1c1c28',
                    callbacks: {
                        label: (ctx) => {
                            const sectorData = sectors[ctx.dataIndex];
                            return `${sectorData[1] >= 0 ? '+' : ''}${sectorData[1].toFixed(2)}%`;
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// Insights
// ============================================
function updateInsights(analysis) {
    const opsList = document.getElementById('opportunitiesList');
    opsList.innerHTML = analysis.opportunities.length > 0
        ? analysis.opportunities.slice(0, 4).map(o => `<li>${escapeHtml(o)}</li>`).join('')
        : '<li class="placeholder-item">No specific opportunities identified</li>';

    const risksList = document.getElementById('risksList');
    risksList.innerHTML = analysis.red_flags.length > 0
        ? analysis.red_flags.slice(0, 4).map(r => `<li>${escapeHtml(r)}</li>`).join('')
        : '<li class="placeholder-item">No significant risks detected</li>';
}

// ============================================
// Tables
// ============================================
function updateTables(marketData) {
    document.getElementById('gainersTable').innerHTML = marketData.gainers.slice(0, 5).map(s => `
        <tr>
            <td class="ticker">${s.ticker}</td>
            <td>$${s.price.toFixed(2)}</td>
            <td class="positive">+${s.change_pct.toFixed(2)}%</td>
        </tr>
    `).join('');

    document.getElementById('losersTable').innerHTML = marketData.losers.slice(0, 5).map(s => `
        <tr>
            <td class="ticker">${s.ticker}</td>
            <td>$${s.price.toFixed(2)}</td>
            <td class="negative">${s.change_pct.toFixed(2)}%</td>
        </tr>
    `).join('');
}

// ============================================
// Nigerian Market Display
// ============================================
function displayNigerianData(ngxData) {
    // Update summary
    document.getElementById('ngxSummaryTitle').textContent = 'Nigerian Market Overview';
    document.getElementById('ngxSummaryText').textContent = ngxData.market_summary || 'NGX data loaded successfully';
    document.getElementById('ngxLastUpdate').textContent = lastReport ? `Updated: ${lastReport.date}` : '';

    // Gainers table
    document.getElementById('ngxGainersTable').innerHTML = ngxData.gainers.slice(0, 5).map(s => `
        <tr>
            <td class="ticker">${s.ticker}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>₦${s.price.toLocaleString()}</td>
            <td class="positive">+${s.change_pct.toFixed(2)}%</td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="empty-row">No gainers</td></tr>';

    // Losers table
    document.getElementById('ngxLosersTable').innerHTML = ngxData.losers.slice(0, 5).map(s => `
        <tr>
            <td class="ticker">${s.ticker}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>₦${s.price.toLocaleString()}</td>
            <td class="negative">${s.change_pct.toFixed(2)}%</td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="empty-row">No losers</td></tr>';

    // Active table
    document.getElementById('ngxActiveTable').innerHTML = ngxData.active.slice(0, 5).map(s => `
        <tr>
            <td class="ticker">${s.ticker}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${(s.volume / 1000000).toFixed(2)}M</td>
            <td class="${s.change_pct >= 0 ? 'positive' : 'negative'}">${s.change_pct >= 0 ? '+' : ''}${s.change_pct.toFixed(2)}%</td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="empty-row">No data</td></tr>';

    // Sector chart
    renderNgxSectorChart(ngxData.sector_performance);
}

function renderNgxSectorChart(sectorPerf) {
    const ctx = document.getElementById('ngxSectorChart').getContext('2d');

    const sectors = Object.entries(sectorPerf);
    const labels = sectors.map(([name]) => name);
    const values = sectors.map(([, val]) => val);
    const colors = values.map(v => v >= 0 ? '#10b981' : '#ef4444');

    if (ngxSectorChart) ngxSectorChart.destroy();

    ngxSectorChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.raw >= 0 ? '+' : ''}${ctx.raw.toFixed(2)}%`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#64748b', callback: (v) => `${v}%` }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 11 } }
                }
            }
        }
    });
}

// ============================================
// Investment Strategies Display
// ============================================
function displayStrategies(analysis) {
    console.log('📊 Displaying strategies...');
    console.log('US High Strategy:', analysis.high_capital_strategy);
    console.log('NG High Strategy:', analysis.ng_high_capital_strategy);
    console.log('Is Fallback:', analysis.is_fallback);
    console.log('Data Source:', analysis.data_source);

    // Show or hide fallback disclaimer
    const fallbackBanner = document.getElementById('fallbackBanner');
    const dataSourceBadge = document.getElementById('dataSourceBadge');

    if (analysis.is_fallback) {
        // Show fallback warning banner
        if (!fallbackBanner) {
            const strategiesSection = document.querySelector('.strategies-section');
            if (strategiesSection) {
                const banner = document.createElement('div');
                banner.id = 'fallbackBanner';
                banner.className = 'fallback-banner';
                banner.innerHTML = `
                    <div class="fallback-content">
                        <span class="fallback-icon">⚠️</span>
                        <div class="fallback-text">
                            <strong>FALLBACK MODE</strong> - AI API quota exceeded. Showing template strategies, not personalized analysis.
                            <br><small>These are educational examples. Wait for AI quota reset for real-time recommendations.</small>
                        </div>
                    </div>
                `;
                strategiesSection.insertBefore(banner, strategiesSection.firstChild);
            }
        } else {
            fallbackBanner.style.display = 'block';
        }
    } else {
        // Hide fallback banner if exists
        if (fallbackBanner) {
            fallbackBanner.style.display = 'none';
        }
    }

    // Update data source badge
    if (dataSourceBadge) {
        dataSourceBadge.textContent = analysis.data_source || 'AI';
        dataSourceBadge.className = 'data-source-badge ' + (analysis.is_fallback ? 'fallback' : 'ai');
    }

    // US Strategies
    displayStrategy('highCapitalStrategy', analysis.high_capital_strategy, 'us');
    displayStrategy('mediumCapitalStrategy', analysis.medium_capital_strategy, 'us');
    displayStrategy('lowCapitalStrategy', analysis.low_capital_strategy, 'us');
    displayStrategy('microCapitalStrategy', analysis.micro_capital_strategy, 'us');

    // Nigerian Strategies
    displayStrategy('ngHighCapitalStrategy', analysis.ng_high_capital_strategy, 'ng');
    displayStrategy('ngMediumCapitalStrategy', analysis.ng_medium_capital_strategy, 'ng');
    displayStrategy('ngLowCapitalStrategy', analysis.ng_low_capital_strategy, 'ng');
    displayStrategy('ngMicroCapitalStrategy', analysis.ng_micro_capital_strategy, 'ng');

    console.log('✅ Strategies display complete');
}

function displayStrategy(elementId, strategy, market) {
    const container = document.getElementById(elementId);

    if (!container) {
        console.warn(`Element ${elementId} not found`);
        return;
    }

    if (!strategy) {
        container.innerHTML = '<p class="placeholder-text">Strategy not available. Generate a new report.</p>';
        return;
    }

    const riskClass = strategy.risk_level.toLowerCase().includes('conservative') ? 'conservative' :
        strategy.risk_level.toLowerCase().includes('aggressive') ? 'aggressive' : 'moderate';

    const currencySymbol = market === 'ng' ? '₦' : '$';

    // Build trading info section if available
    let tradingInfo = '';
    if (strategy.entry_zone || strategy.target || strategy.stop_loss || strategy.timeframe) {
        tradingInfo = `
        <div class="strategy-trading">
            <h4>📊 Trading Setup</h4>
            <div class="trading-grid">
                ${strategy.entry_zone ? `<div class="trading-item entry"><span class="trading-label">Entry Zone</span><span class="trading-value">${escapeHtml(strategy.entry_zone)}</span></div>` : ''}
                ${strategy.target ? `<div class="trading-item target"><span class="trading-label">Target</span><span class="trading-value">${escapeHtml(strategy.target)}</span></div>` : ''}
                ${strategy.stop_loss ? `<div class="trading-item stoploss"><span class="trading-label">Stop-Loss</span><span class="trading-value">${escapeHtml(strategy.stop_loss)}</span></div>` : ''}
                ${strategy.timeframe ? `<div class="trading-item timeframe"><span class="trading-label">Timeframe</span><span class="trading-value">${escapeHtml(strategy.timeframe)}</span></div>` : ''}
            </div>
        </div>`;
    }

    container.innerHTML = `
        <div class="strategy-stocks">
            <h4>Recommended Stocks</h4>
            <div class="stock-pills">
                ${strategy.stocks.map(s => `<span class="stock-pill">${escapeHtml(s)}</span>`).join('')}
            </div>
        </div>
        <div class="strategy-allocation">
            <h4>Suggested Allocation</h4>
            <p>${escapeHtml(strategy.allocation)}</p>
        </div>
        ${tradingInfo}
        <div class="strategy-rationale">
            <h4>Rationale</h4>
            <p>${escapeHtml(strategy.rationale)}</p>
        </div>
        <span class="risk-badge ${riskClass}">${escapeHtml(strategy.risk_level)}</span>
    `;
}

// ============================================
// UI Helpers
// ============================================
function showLoading(show) {
    if (show) {
        loadingState.classList.add('active');
        dashboardContent.style.display = 'none';
        generateBtn.classList.add('loading');
        generateBtn.disabled = true;
    } else {
        loadingState.classList.remove('active');
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
    }
}

function showError(message) {
    errorText.textContent = message;
    errorState.classList.add('active');
}

function hideError() {
    errorState.classList.remove('active');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Modal Functions
// ============================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scroll
    }
}

function closeModalOnOverlay(event) {
    // Close only if clicking the overlay, not the content
    if (event.target.classList.contains('modal-overlay')) {
        event.target.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
            activeModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

// Expose functions globally
window.hideError = hideError;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalOnOverlay = closeModalOnOverlay;

// ============================================
// News Functionality
// ============================================
let newsData = [];
let currentNewsCategory = 'all';

// Initialize news page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupNewsPage();
});

function setupNewsPage() {
    // Refresh button
    const refreshNewsBtn = document.getElementById('refreshNewsBtn');
    if (refreshNewsBtn) {
        refreshNewsBtn.addEventListener('click', fetchNews);
    }

    // Category buttons
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentNewsCategory = btn.dataset.category;
            displayNews(newsData);
        });
    });
}

async function fetchNews() {
    const loadingEl = document.getElementById('newsLoading');
    const feedEl = document.getElementById('newsFeed');
    const refreshBtn = document.getElementById('refreshNewsBtn');

    try {
        // Show loading state
        loadingEl.style.display = 'block';
        feedEl.innerHTML = '';
        refreshBtn.disabled = true;
        refreshBtn.querySelector('.btn-text') || refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<span class="btn-loader"></span> Loading...';

        console.log('📰 Fetching news...');

        const response = await fetch('/api/news?limit=20');

        if (!response.ok) {
            throw new Error('Failed to fetch news');
        }

        const data = await response.json();
        console.log('📰 News received:', data.count, 'articles');

        newsData = data.news;
        displayNews(newsData);

    } catch (error) {
        console.error('❌ News fetch error:', error);
        feedEl.innerHTML = `
            <div class="news-placeholder">
                <span class="news-placeholder-icon">⚠️</span>
                <h3>Failed to Load News</h3>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        loadingEl.style.display = 'none';
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
        `;
    }
}

function displayNews(news) {
    const feedEl = document.getElementById('newsFeed');

    if (!news || news.length === 0) {
        feedEl.innerHTML = `
            <div class="news-placeholder">
                <span class="news-placeholder-icon">📰</span>
                <h3>No News Available</h3>
                <p>Click Refresh to load the latest market news</p>
            </div>
        `;
        return;
    }

    // Filter by category
    let filteredNews = news;
    if (currentNewsCategory !== 'all') {
        filteredNews = news.filter(n => n.category === currentNewsCategory);
    }

    if (filteredNews.length === 0) {
        feedEl.innerHTML = `
            <div class="news-placeholder">
                <span class="news-placeholder-icon">🔍</span>
                <h3>No News in This Category</h3>
                <p>Try selecting a different category or click "All News"</p>
            </div>
        `;
        return;
    }

    feedEl.innerHTML = filteredNews.map(article => createNewsCard(article)).join('');
}

function createNewsCard(article) {
    const sentimentClass = article.sentiment || 'neutral';
    const sentimentLabel = {
        'positive': '📈 Bullish',
        'negative': '📉 Bearish',
        'neutral': '📊 Neutral'
    }[sentimentClass] || '📊 Neutral';

    const categoryLabel = {
        'us_market': '🇺🇸 US Market',
        'ngx_market': '🇳🇬 Nigerian Market',
        'crypto': '🪙 Crypto',
        'general': '📊 General'
    }[article.category] || article.category;

    const tickersHtml = article.related_tickers && article.related_tickers.length > 0
        ? `<div class="news-tickers">
            ${article.related_tickers.map(t => `<span class="ticker-badge">${escapeHtml(t)}</span>`).join('')}
           </div>`
        : '';

    const aiAnalysisHtml = article.ai_analysis
        ? `<div class="news-ai-analysis">
            <div class="news-ai-analysis-header">
                🤖 AI Market Impact Analysis
            </div>
            <p>${escapeHtml(article.ai_analysis)}</p>
           </div>`
        : '';

    const titleHtml = article.url
        ? `<a href="${escapeHtml(article.url)}" target="_blank" rel="noopener">${escapeHtml(article.title)}</a>`
        : escapeHtml(article.title);

    return `
        <div class="news-card">
            <div class="news-card-header">
                <h3 class="news-card-title">${titleHtml}</h3>
                <span class="news-sentiment ${sentimentClass}">${sentimentLabel}</span>
            </div>
            <div class="news-card-meta">
                <span class="news-source">${escapeHtml(article.source)}</span>
                <span class="news-category-badge">${categoryLabel}</span>
                ${article.published_at ? `<span class="news-date">${formatNewsDate(article.published_at)}</span>` : ''}
            </div>
            ${article.summary ? `<p class="news-card-summary">${escapeHtml(article.summary)}</p>` : ''}
            ${tickersHtml}
            ${aiAnalysisHtml}
        </div>
    `;
}

function formatNewsDate(dateStr) {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) {
            return 'Just now';
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d ago`;
        }
    } catch {
        return dateStr;
    }
}

// Auto-load news when navigating to news page
const originalSetupNavigation = setupNavigation;
if (typeof setupNavigation !== 'undefined') {
    // Navigation is already set up, add news page handling
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (link.dataset.page === 'news' && newsData.length === 0) {
                // Auto-fetch news when first visiting the page
                setTimeout(fetchNews, 100);
            }
            if (link.dataset.page === 'forex' && !forexDataLoaded) {
                // Auto-fetch forex when first visiting the page
                setTimeout(fetchForex, 100);
            }
        });
    });
}

// ============================================
// Forex Functionality
// ============================================
let forexDataLoaded = false;

// Initialize forex page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupForexPage();
});

function setupForexPage() {
    const refreshForexBtn = document.getElementById('refreshForexBtn');
    if (refreshForexBtn) {
        refreshForexBtn.addEventListener('click', fetchForex);
    }
}

async function fetchForex() {
    const refreshBtn = document.getElementById('refreshForexBtn');
    const majorGrid = document.getElementById('majorPairsGrid');
    const nairaGrid = document.getElementById('nairaPairsGrid');
    const commoditiesGrid = document.getElementById('commoditiesGrid');
    const forexMood = document.getElementById('forexMood');
    const forexLastUpdate = document.getElementById('forexLastUpdate');

    try {
        // Show loading state
        refreshBtn.disabled = true;
        refreshBtn.classList.add('loading');

        console.log('💱 Fetching forex data...');

        const response = await fetch('/api/forex');

        if (!response.ok) {
            throw new Error('Failed to fetch forex data');
        }

        const result = await response.json();
        console.log('💱 Forex data received:', result.data.pairs.length, 'pairs');

        const data = result.data;
        forexDataLoaded = true;

        // Update market mood
        forexMood.textContent = data.market_summary;
        forexLastUpdate.textContent = `Last updated: ${data.last_updated}`;

        // Clear forex pairs array before populating
        allForexPairs = [];

        // Display major pairs
        displayForexPairs(majorGrid, data.major_pairs, 'major');

        // Display Naira pairs
        displayForexPairs(nairaGrid, data.naira_pairs, 'naira');

        // Display commodities
        displayForexPairs(commoditiesGrid, data.commodities, 'commodity');

        // Auto-record strong signals
        const allPairs = [...data.major_pairs, ...data.naira_pairs, ...data.commodities];
        recordForexSignals(allPairs);

        // Show top signal in hero banner
        displayTopSignal(allPairs);

    } catch (error) {
        console.error('❌ Forex fetch error:', error);
        majorGrid.innerHTML = `
            <div class="forex-placeholder">
                <span>⚠️</span>
                <p>Failed to load forex data: ${error.message}</p>
            </div>
        `;
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('loading');
    }
}

// Store forex pairs globally for chart modal access
let allForexPairs = [];
let topSignalPair = null;

// Display the strongest signal in hero banner
function displayTopSignal(pairs) {
    const hero = document.getElementById('topSignalHero');
    if (!hero) return;

    // Find the strongest signal (highest or lowest signal_strength)
    let strongest = null;
    let strongestScore = 3; // neutral

    for (const pair of pairs) {
        if (pair.technicals && pair.technicals.signal_strength !== undefined) {
            const strength = pair.technicals.signal_strength;
            // Strong buy (5) or Strong sell (1) are best
            const distance = Math.abs(strength - 3);
            if (distance > Math.abs(strongestScore - 3)) {
                strongest = pair;
                strongestScore = strength;
            }
        }
    }

    if (!strongest || strongestScore === 3) {
        hero.style.display = 'none';
        return;
    }

    topSignalPair = strongest;

    // Format price
    let priceDisplay = strongest.price;
    if (strongest.category === 'commodity') {
        priceDisplay = '$' + strongest.price.toFixed(2);
    } else if (strongest.symbol.includes('NGN')) {
        priceDisplay = '₦' + strongest.price.toFixed(2);
    } else {
        priceDisplay = strongest.price.toFixed(strongest.price > 100 ? 2 : 5);
    }

    const signal = strongest.technicals.signal;
    const isSell = signal.includes('Sell');

    document.getElementById('topSignalPair').textContent = strongest.symbol;
    document.getElementById('topSignalType').textContent = signal.toUpperCase();
    document.getElementById('topSignalType').className = `top-signal-type ${isSell ? 'sell' : ''}`;
    document.getElementById('topSignalPrice').textContent = `@ ${priceDisplay}`;

    hero.style.display = 'flex';
}

// View the top signal in chart modal
function viewTopSignal() {
    if (topSignalPair) {
        const index = allForexPairs.findIndex(p => p.symbol === topSignalPair.symbol);
        if (index !== -1) {
            openForexChartByIndex(index);
        }
    }
}

// Expose to window
window.viewTopSignal = viewTopSignal;

function displayForexPairs(container, pairs, category) {
    if (!pairs || pairs.length === 0) {
        container.innerHTML = `
            <div class="forex-placeholder">
                <span>💱</span>
                <p>No data available</p>
            </div>
        `;
        return;
    }

    // Store pairs globally with indices
    const startIndex = allForexPairs.length;
    pairs.forEach(pair => allForexPairs.push(pair));

    container.innerHTML = pairs.map((pair, idx) => createForexCard(pair, category, startIndex + idx)).join('');
}

function createForexCard(pair, category, pairIndex) {
    const changeClass = pair.change_pct > 0.05 ? 'positive' : pair.change_pct < -0.05 ? 'negative' : 'neutral';
    const trendClass = (pair.trend || 'Neutral').toLowerCase();
    const changeSymbol = pair.change_pct >= 0 ? '+' : '';

    // Format price based on category
    let priceDisplay = pair.price;
    if (category === 'commodity') {
        priceDisplay = '$' + pair.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (pair.symbol.includes('NGN')) {
        priceDisplay = '₦' + pair.price.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        priceDisplay = pair.price.toFixed(pair.price > 100 ? 2 : 5);
    }

    // Get signal info
    const signal = pair.technicals?.signal || 'Hold';
    const signalClass = signal.toLowerCase().replace(' ', '-');
    const signalStrength = pair.technicals?.signal_strength || 3;

    // Highlight strong signals
    const isStrong = signalStrength >= 4 || signalStrength <= 2;
    const strongClass = isStrong ? 'strong-signal' : '';

    // Quick indicators (minimal display)
    const rsi = pair.technicals?.rsi;
    const rsiText = rsi ? `RSI ${rsi.toFixed(0)}` : '';
    const macdTrend = pair.technicals?.macd_trend || '';

    return `
        <div class="forex-card ${category} ${strongClass}" onclick="openForexChartByIndex(${pairIndex})">
            <div class="forex-card-main">
                <div class="forex-pair-info">
                    <div class="forex-pair-symbol">${escapeHtml(pair.symbol)}</div>
                    <div class="forex-pair-name">${escapeHtml(pair.name)}</div>
                </div>
                <div class="forex-price-block">
                    <span class="forex-price">${priceDisplay}</span>
                    <span class="forex-change ${changeClass}">
                        ${changeSymbol}${pair.change_pct.toFixed(2)}%
                    </span>
                </div>
            </div>
            <div class="forex-card-footer">
                <div class="forex-quick-indicators">
                    ${rsiText ? `<span class="quick-indicator">${rsiText}</span>` : ''}
                    ${macdTrend ? `<span class="quick-indicator ${macdTrend.includes('Bullish') ? 'bullish' : 'bearish'}">${macdTrend}</span>` : ''}
                </div>
                <div class="forex-signal-badge ${signalClass}">
                    ${getSignalEmoji(signal)} ${signal}
                </div>
            </div>
            <div class="forex-card-actions">
                <button class="forex-chart-btn" onclick="event.stopPropagation(); openTradingViewModal('${escapeHtml(pair.symbol)}', '${escapeHtml(pair.name)}')">
                    📊 View Chart
                </button>
                ${isStrong ? `<button class="forex-trade-btn" onclick="event.stopPropagation(); tookTheTrade('${escapeHtml(pair.symbol)}', '${escapeHtml(pair.name)}', '${signal}', ${pair.price})">
                    ✅ I Took The Trade
                </button>` : ''}
                <div class="forex-card-hint">Click for analysis →</div>
            </div>
        </div>
    `;
}

function getSignalEmoji(signal) {
    const emojis = {
        'Strong Buy': '🟢🟢',
        'Buy': '🟢',
        'Hold': '🟡',
        'Sell': '🔴',
        'Strong Sell': '🔴🔴'
    };
    return emojis[signal] || '🟡';
}

// ============================================
// Forex Session Status & Countdown
// ============================================

// Initialize forex sessions on page load
document.addEventListener('DOMContentLoaded', () => {
    updateForexSessions();
    setInterval(updateForexSessions, 1000); // Update every second
});

function updateForexSessions() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday

    // Forex market is closed on weekends (Friday 10pm UTC to Sunday 10pm UTC)
    const isWeekend = (dayOfWeek === 0 && utcHour < 22) ||
        (dayOfWeek === 6) ||
        (dayOfWeek === 5 && utcHour >= 22);

    // Session times (in UTC/GMT)
    const sessions = {
        sydney: { open: 22, close: 7, name: 'Sydney' },  // 10pm - 7am
        tokyo: { open: 0, close: 9, name: 'Tokyo' },     // 12am - 9am
        london: { open: 8, close: 17, name: 'London' },  // 8am - 5pm
        ny: { open: 13, close: 22, name: 'New York' }    // 1pm - 10pm
    };

    let openSessions = [];
    let nextSession = null;
    let countdownText = '';

    // Check each session
    for (const [key, session] of Object.entries(sessions)) {
        const isOpen = isSessionOpen(utcHour, session.open, session.close) && !isWeekend;
        const statusEl = document.getElementById(`${key}Status`);
        const sessionEl = document.getElementById(`${key}Session`);

        if (statusEl && sessionEl) {
            if (isWeekend) {
                statusEl.textContent = 'Weekend';
                statusEl.className = 'session-status closed';
                sessionEl.classList.remove('open');
                sessionEl.classList.add('closed');
            } else if (isOpen) {
                statusEl.textContent = 'OPEN';
                statusEl.className = 'session-status open';
                sessionEl.classList.add('open');
                sessionEl.classList.remove('closed');
                openSessions.push(session.name);
            } else {
                statusEl.textContent = 'Closed';
                statusEl.className = 'session-status closed';
                sessionEl.classList.remove('open');
                sessionEl.classList.add('closed');

                // Calculate time until this session opens
                if (!nextSession) {
                    const hoursUntil = getHoursUntilOpen(utcHour, session.open);
                    nextSession = { name: session.name, hours: hoursUntil };
                }
            }
        }
    }

    // Update countdown text
    const countdownEl = document.getElementById('forexCountdownText');
    if (countdownEl) {
        if (isWeekend) {
            // Calculate time until Sunday 10pm UTC
            const hoursUntilOpen = getHoursUntilSundayOpen(now);
            countdownText = `Market closed for weekend. Opens in <span class="countdown-time">${formatCountdown(hoursUntilOpen)}</span>`;
        } else if (openSessions.length > 0) {
            countdownText = `<span class="countdown-time">${openSessions.join(' & ')}</span> session${openSessions.length > 1 ? 's' : ''} active - Best time to trade!`;
        } else if (nextSession) {
            countdownText = `All sessions closed. <span class="countdown-time">${nextSession.name}</span> opens in ${formatCountdown(nextSession.hours)}`;
        }
        countdownEl.innerHTML = countdownText;
    }
}

function isSessionOpen(currentHour, openHour, closeHour) {
    // Handle sessions that span midnight (e.g., Sydney 22-7)
    if (openHour > closeHour) {
        return currentHour >= openHour || currentHour < closeHour;
    }
    return currentHour >= openHour && currentHour < closeHour;
}

function getHoursUntilOpen(currentHour, openHour) {
    if (currentHour < openHour) {
        return openHour - currentHour;
    }
    return 24 - currentHour + openHour;
}

function getHoursUntilSundayOpen(now) {
    const dayOfWeek = now.getUTCDay();
    const utcHour = now.getUTCHours();

    // Sunday 10pm UTC = market opens
    let hoursUntil = 0;

    if (dayOfWeek === 6) { // Saturday
        hoursUntil = (24 - utcHour) + 22; // Rest of Saturday + Sunday until 10pm
    } else if (dayOfWeek === 0) { // Sunday
        if (utcHour < 22) {
            hoursUntil = 22 - utcHour;
        } else {
            hoursUntil = 0; // Market is open
        }
    } else if (dayOfWeek === 5 && utcHour >= 22) { // Friday after close
        hoursUntil = (24 - utcHour) + 24 + 22; // Rest of Friday + Saturday + Sunday until 10pm
    }

    return hoursUntil;
}

function formatCountdown(hours) {
    if (hours < 1) {
        return 'less than 1 hour';
    } else if (hours < 24) {
        return `${Math.round(hours)} hour${hours !== 1 ? 's' : ''}`;
    } else {
        const days = Math.floor(hours / 24);
        const remainingHours = Math.round(hours % 24);
        return `${days}d ${remainingHours}h`;
    }
}

// ============================================
// Forex Chart Modal
// ============================================

let forexPriceChart = null;
let forexRsiChart = null;
let forexMacdChart = null;
let currentForexPair = null;

// Wrapper function that uses index to get pair from global array
function openForexChartByIndex(index) {
    if (allForexPairs && allForexPairs[index]) {
        openForexChart(allForexPairs[index]);
    } else {
        console.error('Forex pair not found at index:', index);
    }
}

function openForexChart(pair) {
    currentForexPair = pair;
    const modal = document.getElementById('forexChartModal');

    // Update modal header
    document.getElementById('chartModalSymbol').textContent = pair.symbol;
    document.getElementById('chartModalName').textContent = pair.name;

    // Update price display
    let priceDisplay = pair.price;
    if (pair.category === 'commodity') {
        priceDisplay = '$' + pair.price.toFixed(2);
    } else if (pair.symbol.includes('NGN')) {
        priceDisplay = '₦' + pair.price.toFixed(2);
    } else {
        priceDisplay = pair.price.toFixed(pair.price > 100 ? 2 : 5);
    }

    document.getElementById('chartCurrentPrice').textContent = priceDisplay;

    const changeEl = document.getElementById('chartPriceChange');
    const changeClass = pair.change_pct >= 0 ? 'positive' : 'negative';
    const changeSymbol = pair.change_pct >= 0 ? '+' : '';
    changeEl.textContent = `${changeSymbol}${pair.change_pct.toFixed(2)}%`;
    changeEl.className = `chart-price-change ${changeClass}`;

    // Update signal badge
    const signalDisplay = document.getElementById('chartSignalDisplay');
    const signal = pair.technicals?.signal || 'Hold';
    const signalClass = signal.toLowerCase().replace(' ', '-');
    signalDisplay.innerHTML = `<span class="chart-signal-badge ${signalClass}">${getSignalEmoji(signal)} ${signal}</span>`;

    // Update analysis text
    document.getElementById('chartAnalysisText').textContent = pair.analysis || 'Loading analysis...';

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Fetch REAL historical data from API
    fetchAndRenderRealCharts(pair);
}

async function fetchAndRenderRealCharts(pair) {
    const priceChartContainer = document.getElementById('forexPriceChart').parentElement;

    // Show loading state
    priceChartContainer.innerHTML = `
        <h3 class="chart-section-title">📈 Price Chart with MAs & Fibonacci</h3>
        <div class="chart-loading">
            <div class="loading-pulse">📊</div>
            <p>Loading real market data...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/forex/history/${encodeURIComponent(pair.symbol)}`);

        if (!response.ok) {
            throw new Error('Failed to fetch historical data');
        }

        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;

            // Restore canvas
            priceChartContainer.innerHTML = `
                <h3 class="chart-section-title">📈 Price Chart with MAs & Fibonacci <span style="font-size:11px;color:var(--green);">✓ REAL DATA</span></h3>
                <canvas id="forexPriceChart"></canvas>
            `;

            // Update Fibonacci display with real data
            updateFibonacciDisplay(data.fibonacci, pair.category);

            // Render charts with REAL data
            renderPriceChart(data.dates, data.prices, data.sma_20, data.sma_50, data.fibonacci);
            renderRsiChart(data.dates, data.rsi);
            renderMacdChart(data.dates, data.macd, data.macd_signal, data.macd_histogram);

            // Update analysis with data timestamp
            document.getElementById('chartAnalysisText').innerHTML =
                `${pair.analysis || 'Technical analysis based on real market data.'}<br><br>` +
                `<small style="color:var(--text-muted);">📊 Data: ${data.data_points} points | Last updated: ${data.fetched_at}</small>`;

            console.log('✅ Rendered charts with REAL historical data');
        } else {
            throw new Error('Invalid data format');
        }
    } catch (error) {
        console.error('Error fetching real data, falling back to simulation:', error);

        // Restore canvas and fallback to simulated data
        priceChartContainer.innerHTML = `
            <h3 class="chart-section-title">📈 Price Chart with MAs & Fibonacci <span style="font-size:11px;color:var(--orange);">⚠ Simulated</span></h3>
            <canvas id="forexPriceChart"></canvas>
        `;

        renderForexCharts(pair);
    }
}

function closeForexChartModal(event) {
    if (event && event.target !== event.currentTarget) return;

    const modal = document.getElementById('forexChartModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';

    // Destroy charts to prevent memory leaks
    if (forexPriceChart) {
        forexPriceChart.destroy();
        forexPriceChart = null;
    }
    if (forexRsiChart) {
        forexRsiChart.destroy();
        forexRsiChart = null;
    }
    if (forexMacdChart) {
        forexMacdChart.destroy();
        forexMacdChart = null;
    }
}

function renderForexCharts(pair) {
    // Generate simulated historical data based on current price
    const dataPoints = 60; // 60 data points (e.g., hourly for 2.5 days)
    const labels = [];
    const prices = [];
    const sma20 = [];
    const sma50 = [];
    const rsiData = [];
    const macdLine = [];
    const signalLine = [];
    const histogram = [];

    // Starting from past and moving to current
    const currentPrice = pair.price;
    const volatility = pair.category === 'commodity' ? 0.005 : 0.0015;

    // Generate price history (working backwards)
    let price = currentPrice;
    const priceHistory = [price];

    for (let i = 1; i < dataPoints; i++) {
        // Random walk with slight trend
        const change = price * volatility * (Math.random() - 0.48);
        price = price - change; // Going backwards in time
        priceHistory.unshift(price);
    }

    // Generate labels (dates)
    const now = new Date();
    for (let i = dataPoints - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setHours(date.getHours() - i);
        labels.push(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }

    // Calculate SMAs
    for (let i = 0; i < priceHistory.length; i++) {
        prices.push(priceHistory[i]);

        // SMA 20
        if (i >= 19) {
            const sum20 = priceHistory.slice(i - 19, i + 1).reduce((a, b) => a + b, 0);
            sma20.push(sum20 / 20);
        } else {
            sma20.push(null);
        }

        // SMA 50 (use less for display)
        if (i >= 49) {
            const sum50 = priceHistory.slice(i - 49, i + 1).reduce((a, b) => a + b, 0);
            sma50.push(sum50 / 50);
        } else {
            sma50.push(null);
        }
    }

    // Generate RSI data (simulated based on current RSI)
    const currentRsi = pair.technicals?.rsi || 50;
    for (let i = 0; i < dataPoints; i++) {
        const variation = (Math.random() - 0.5) * 20;
        let rsi = currentRsi + variation * (1 - i / dataPoints);
        rsi = Math.max(10, Math.min(90, rsi));
        rsiData.push(rsi);
    }
    rsiData[rsiData.length - 1] = currentRsi; // Ensure last point matches current

    // Generate MACD data (simulated)
    const currentMacd = pair.technicals?.macd || 0;
    const currentSignal = pair.technicals?.macd_signal || 0;

    for (let i = 0; i < dataPoints; i++) {
        const progress = i / dataPoints;
        const macdVariation = (Math.random() - 0.5) * 0.002;
        const macd = currentMacd * progress + macdVariation;
        const signal = currentSignal * progress + macdVariation * 0.8;

        macdLine.push(macd);
        signalLine.push(signal);
        histogram.push(macd - signal);
    }

    // Calculate Fibonacci retracement levels
    const highPrice = Math.max(...priceHistory);
    const lowPrice = Math.min(...priceHistory);
    const range = highPrice - lowPrice;

    const fibLevels = {
        fib0: highPrice,              // 0% (High)
        fib236: highPrice - range * 0.236,
        fib382: highPrice - range * 0.382,
        fib50: highPrice - range * 0.5,
        fib618: highPrice - range * 0.618,
        fib786: highPrice - range * 0.786,
        fib100: lowPrice              // 100% (Low)
    };

    // Update Fibonacci display
    updateFibonacciDisplay(fibLevels, pair.category);

    // Render Price Chart with Fibonacci
    renderPriceChart(labels, prices, sma20, sma50, fibLevels);

    // Render RSI Chart
    renderRsiChart(labels, rsiData);

    // Render MACD Chart
    renderMacdChart(labels, macdLine, signalLine, histogram);
}

// Update Fibonacci levels display panel
function updateFibonacciDisplay(fibLevels, category) {
    const formatPrice = (price) => {
        if (category === 'commodity') {
            return '$' + price.toFixed(2);
        } else if (currentForexPair && currentForexPair.symbol.includes('NGN')) {
            return '₦' + price.toFixed(2);
        } else {
            return price.toFixed(price > 100 ? 2 : 5);
        }
    };

    document.getElementById('fib0').textContent = formatPrice(fibLevels.fib0);
    document.getElementById('fib236').textContent = formatPrice(fibLevels.fib236);
    document.getElementById('fib382').textContent = formatPrice(fibLevels.fib382);
    document.getElementById('fib50').textContent = formatPrice(fibLevels.fib50);
    document.getElementById('fib618').textContent = formatPrice(fibLevels.fib618);
    document.getElementById('fib786').textContent = formatPrice(fibLevels.fib786);
    document.getElementById('fib100').textContent = formatPrice(fibLevels.fib100);
}

function renderPriceChart(labels, prices, sma20, sma50, fibLevels) {
    const ctx = document.getElementById('forexPriceChart').getContext('2d');

    if (forexPriceChart) {
        forexPriceChart.destroy();
    }

    // Create Fibonacci level datasets (horizontal lines)
    const fibColors = {
        fib0: '#ef4444',    // Red
        fib236: '#f97316',  // Orange
        fib382: '#eab308',  // Yellow
        fib50: '#22c55e',   // Green
        fib618: '#3b82f6',  // Blue
        fib786: '#8b5cf6',  // Purple
        fib100: '#ec4899'   // Pink
    };

    const fibDatasets = fibLevels ? [
        {
            label: 'Fib 0%',
            data: Array(labels.length).fill(fibLevels.fib0),
            borderColor: fibColors.fib0,
            borderWidth: 1,
            borderDash: [2, 2],
            pointRadius: 0,
            fill: false
        },
        {
            label: 'Fib 38.2%',
            data: Array(labels.length).fill(fibLevels.fib382),
            borderColor: fibColors.fib382,
            borderWidth: 1,
            borderDash: [2, 2],
            pointRadius: 0,
            fill: false
        },
        {
            label: 'Fib 50%',
            data: Array(labels.length).fill(fibLevels.fib50),
            borderColor: fibColors.fib50,
            borderWidth: 1,
            borderDash: [2, 2],
            pointRadius: 0,
            fill: false
        },
        {
            label: 'Fib 61.8%',
            data: Array(labels.length).fill(fibLevels.fib618),
            borderColor: fibColors.fib618,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false
        },
        {
            label: 'Fib 100%',
            data: Array(labels.length).fill(fibLevels.fib100),
            borderColor: fibColors.fib100,
            borderWidth: 1,
            borderDash: [2, 2],
            pointRadius: 0,
            fill: false
        }
    ] : [];

    forexPriceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Price',
                    data: prices,
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: 'SMA 20',
                    data: sma20,
                    borderColor: '#10b981',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    borderDash: [5, 5]
                },
                {
                    label: 'SMA 50',
                    data: sma50,
                    borderColor: '#f59e0b',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    borderDash: [3, 3]
                },
                ...fibDatasets
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 10 },
                        filter: function (item) {
                            // Only show main indicators in legend, hide fib levels
                            return !item.text.startsWith('Fib');
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 10 } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                y: {
                    display: true,
                    ticks: { color: '#64748b', font: { size: 10 } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            }
        }
    });
}

function renderRsiChart(labels, rsiData) {
    const ctx = document.getElementById('forexRsiChart').getContext('2d');

    if (forexRsiChart) {
        forexRsiChart.destroy();
    }

    forexRsiChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'RSI',
                    data: rsiData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                annotation: {
                    annotations: {
                        overbought: {
                            type: 'line',
                            yMin: 70,
                            yMax: 70,
                            borderColor: '#ef4444',
                            borderWidth: 1,
                            borderDash: [5, 5]
                        },
                        oversold: {
                            type: 'line',
                            yMin: 30,
                            yMax: 30,
                            borderColor: '#10b981',
                            borderWidth: 1,
                            borderDash: [5, 5]
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 10 } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                y: {
                    display: true,
                    min: 0,
                    max: 100,
                    ticks: {
                        color: '#64748b',
                        font: { size: 10 },
                        callback: function (value) {
                            if (value === 70) return '70 (OB)';
                            if (value === 30) return '30 (OS)';
                            return value;
                        }
                    },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            }
        }
    });
}

function renderMacdChart(labels, macdLine, signalLine, histogram) {
    const ctx = document.getElementById('forexMacdChart').getContext('2d');

    if (forexMacdChart) {
        forexMacdChart.destroy();
    }

    // Color histogram based on positive/negative
    const histogramColors = histogram.map(val => val >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)');

    forexMacdChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Histogram',
                    data: histogram,
                    backgroundColor: histogramColors,
                    borderWidth: 0,
                    order: 2
                },
                {
                    label: 'MACD',
                    data: macdLine,
                    type: 'line',
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointRadius: 0,
                    order: 1
                },
                {
                    label: 'Signal',
                    data: signalLine,
                    type: 'line',
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    pointRadius: 0,
                    borderDash: [3, 3],
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: '#94a3b8', font: { size: 11 } }
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 10 } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                y: {
                    display: true,
                    ticks: { color: '#64748b', font: { size: 10 } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            }
        }
    });
}

// Expose chart functions globally
window.openForexChart = openForexChart;
window.openForexChartByIndex = openForexChartByIndex;
window.closeForexChartModal = closeForexChartModal;

// ============================================
// Signal History Page
// ============================================

let allSignalsData = [];
let signalsLoaded = false;

function setupSignalsPage() {
    const refreshBtn = document.getElementById('refreshSignalsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchSignals);
    }

    // Setup filter buttons
    document.querySelectorAll('.signal-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.signal-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterSignals(btn.dataset.filter);
        });
    });
}

async function fetchSignals() {
    const refreshBtn = document.getElementById('refreshSignalsBtn');
    const signalsList = document.getElementById('signalsList');

    refreshBtn.disabled = true;
    refreshBtn.classList.add('loading');

    try {
        const response = await fetch('/api/signals');
        const data = await response.json();

        if (data.success && data.data) {
            allSignalsData = data.data.signals || [];

            // Update stats
            document.getElementById('totalSignals').textContent = data.data.total_signals || 0;
            document.getElementById('buySignals').textContent = data.data.buy_signals || 0;
            document.getElementById('sellSignals').textContent = data.data.sell_signals || 0;
            document.getElementById('winRate').textContent = data.data.win_rate ? `${data.data.win_rate}%` : '--%';
            document.getElementById('signalsLastUpdate').textContent = `Last updated: ${data.data.last_updated}`;

            // Update performance dashboard
            updatePerformanceDashboard(data.data.performance);

            displaySignals(allSignalsData);
            signalsLoaded = true;
        }
    } catch (error) {
        console.error('Error fetching signals:', error);
        signalsList.innerHTML = `
            <div class="signal-placeholder">
                <span>⚠️</span>
                <p>Error loading signals: ${error.message}</p>
            </div>
        `;
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('loading');
    }
}

function updatePerformanceDashboard(performance) {
    if (!performance) return;

    const setEl = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    const setElClass = (id, value, isPositive) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
            el.classList.remove('green', 'red');
            if (isPositive === true) el.classList.add('green');
            if (isPositive === false) el.classList.add('red');
        }
    };

    // Main stats
    setEl('perfWinRate', performance.win_rate ? `${performance.win_rate}%` : '--%');

    // Total P&L
    const pnl = performance.total_pnl_pct || 0;
    setElClass('perfTotalPnl', (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + '%', pnl >= 0);

    // Avg Win/Loss
    setElClass('perfAvgWin', performance.avg_profit_pct ? `+${performance.avg_profit_pct}%` : '--', true);
    setElClass('perfAvgLoss', performance.avg_loss_pct ? `${performance.avg_loss_pct}%` : '--', false);

    // Streak
    const streak = performance.current_streak || 0;
    const streakDisplay = streak >= 0 ? `🔥 ${streak}W` : `❄️ ${Math.abs(streak)}L`;
    setEl('perfStreak', streak === 0 ? '0' : streakDisplay);

    // Win trend (compare 7-day to overall)
    if (performance.win_rate && performance.last_7_days_win_rate) {
        const diff = performance.last_7_days_win_rate - performance.win_rate;
        const trendEl = document.getElementById('perfWinTrend');
        if (trendEl) {
            if (diff > 0) {
                trendEl.textContent = `↑ ${diff.toFixed(1)}% vs avg`;
                trendEl.className = 'perf-change positive';
            } else if (diff < 0) {
                trendEl.textContent = `↓ ${Math.abs(diff).toFixed(1)}% vs avg`;
                trendEl.className = 'perf-change negative';
            } else {
                trendEl.textContent = '→ Same as avg';
                trendEl.className = 'perf-change';
            }
        }
    }

    // Counts
    setEl('perfWins', performance.wins || 0);
    setEl('perfLosses', performance.losses || 0);
    setEl('perfPending', performance.pending || 0);

    // Breakdown
    setEl('perf7Day', performance.last_7_days_win_rate ? `${performance.last_7_days_win_rate}%` : '--%');
    setEl('perf30Day', performance.last_30_days_win_rate ? `${performance.last_30_days_win_rate}%` : '--%');
    setElClass('perfBest', performance.best_trade_pct ? `+${performance.best_trade_pct}%` : '+0%', true);
    setElClass('perfWorst', performance.worst_trade_pct ? `${performance.worst_trade_pct}%` : '0%', false);
}

function displaySignals(signals) {
    const signalsList = document.getElementById('signalsList');

    if (!signals || signals.length === 0) {
        signalsList.innerHTML = createEmptyState(
            '📊',
            'No Signals Yet',
            'Analyze the forex market to generate trading signals. Strong signals will be automatically tracked here.',
            '💱 Analyze Forex',
            "showPage('forex')"
        );
        return;
    }

    signalsList.innerHTML = signals.map(signal => createSignalCard(signal)).join('');
}

function createSignalCard(signal) {
    const isBuy = signal.signal.includes('Buy');
    const isSell = signal.signal.includes('Sell');
    const cardClass = isBuy ? 'buy' : isSell ? 'sell' : 'hold';
    const emoji = isBuy ? '🟢' : isSell ? '🔴' : '🟡';

    const priceDisplay = signal.price_at_signal?.toFixed(signal.price_at_signal > 100 ? 2 : 5) || '-';
    const timeStr = signal.timestamp ? new Date(signal.timestamp).toLocaleString() : '-';

    const outcomeClass = (signal.outcome || 'pending').toLowerCase();
    const pnlClass = signal.pnl_pct >= 0 ? 'positive' : 'negative';
    const pnlDisplay = signal.pnl_pct !== null && signal.pnl_pct !== undefined
        ? `${signal.pnl_pct >= 0 ? '+' : ''}${signal.pnl_pct.toFixed(2)}%`
        : '';

    // Check if user took this trade
    const takenTrades = JSON.parse(localStorage.getItem('takenTrades') || '[]');
    const hasTaken = takenTrades.includes(signal.id);
    const takeButtonClass = hasTaken ? 'taken' : '';
    const takeButtonText = hasTaken ? '✓ You traded this' : '📝 I took this trade';

    // Encode signal data for onclick
    const signalDataAttr = encodeURIComponent(JSON.stringify(signal));

    return `
        <div class="signal-card ${cardClass}" onclick="openSignalDetailsModal('${signalDataAttr}')" style="cursor: pointer;">
            <div class="signal-type">${emoji}</div>
            <div class="signal-info">
                <div class="signal-symbol">${escapeHtml(signal.symbol)}</div>
                <div class="signal-name">${escapeHtml(signal.pair_name || signal.category)}</div>
                <button class="take-trade-btn ${takeButtonClass}" 
                    data-signal-id="${signal.id}"
                    data-symbol="${escapeHtml(signal.symbol)}"
                    data-pair-name="${escapeHtml(signal.pair_name || '')}"
                    data-signal="${escapeHtml(signal.signal)}"
                    data-price="${signal.price_at_signal || 0}"
                    onclick="event.stopPropagation(); handleTakeTrade(this)" 
                    ${hasTaken ? 'disabled' : ''}>
                    ${takeButtonText}
                </button>
            </div>
            <div class="signal-details">
                <div class="signal-price">@ ${priceDisplay}</div>
                <div class="signal-time">${timeStr}</div>
            </div>
            <div>
                <div class="signal-outcome ${outcomeClass}">${signal.outcome || 'Pending'}</div>
                ${pnlDisplay ? `<div class="signal-pnl ${pnlClass}">${pnlDisplay}</div>` : ''}
            </div>
            <div class="signal-click-hint">Click for SL/TP →</div>
        </div>
    `;
}

// Mark a trade as taken by user
function markTradeAsTaken(signalId, button) {
    const takenTrades = JSON.parse(localStorage.getItem('takenTrades') || '[]');
    if (!takenTrades.includes(signalId)) {
        takenTrades.push(signalId);
        localStorage.setItem('takenTrades', JSON.stringify(takenTrades));

        // Update button appearance
        button.classList.add('taken');
        button.textContent = '✓ You traded this';
        button.disabled = true;

        // Show toast notification
        showToast('Trade marked! Track your performance in the Signals tab.');
    }
}

// Simple toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--accent);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 3000;
        animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Handle "I took this trade" button click
async function handleTakeTrade(button) {
    const signalId = button.dataset.signalId;
    const symbol = button.dataset.symbol;
    const pairName = button.dataset.pairName;
    const signal = button.dataset.signal;
    const price = parseFloat(button.dataset.price);

    console.log('Taking trade:', { signalId, symbol, pairName, signal, price });

    // Mark as taken in localStorage
    const takenTrades = JSON.parse(localStorage.getItem('takenTrades') || '[]');
    if (!takenTrades.includes(signalId)) {
        takenTrades.push(signalId);
        localStorage.setItem('takenTrades', JSON.stringify(takenTrades));
    }

    // Update button immediately
    button.classList.add('taken');
    button.textContent = '✓ Sending alert...';
    button.disabled = true;

    // Send Telegram alert
    try {
        const response = await fetch('/api/telegram/trade-taken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                symbol: symbol,
                pair_name: pairName,
                signal: signal,
                price: price
            })
        });

        const result = await response.json();
        console.log('Telegram response:', result);

        if (result.success) {
            button.textContent = '✓ You traded this';
            showToast('✅ Trade marked & Telegram alert sent!');
        } else {
            button.textContent = '✓ You traded this';
            showToast('Trade marked! (Telegram: ' + result.message + ')');
        }
    } catch (error) {
        console.error('Error sending trade alert:', error);
        button.textContent = '✓ You traded this';
        showToast('Trade marked! (Network error)');
    }
}

// Expose function globally
window.handleTakeTrade = handleTakeTrade;

// Expose functions
window.markTradeAsTaken = markTradeAsTaken;


function filterSignals(filter) {
    if (!allSignalsData) return;

    let filtered = allSignalsData;

    switch (filter) {
        case 'forex':
            filtered = allSignalsData.filter(s => s.category === 'forex');
            break;
        case 'stock':
            filtered = allSignalsData.filter(s => s.category === 'stock');
            break;
        case 'buy':
            filtered = allSignalsData.filter(s => s.signal.includes('Buy'));
            break;
        case 'sell':
            filtered = allSignalsData.filter(s => s.signal.includes('Sell'));
            break;
    }

    displaySignals(filtered);
}

// Auto-record signals from forex data
function recordForexSignals(forexPairs) {
    if (!forexPairs || forexPairs.length === 0) return;

    forexPairs.forEach(async pair => {
        if (pair.technicals && pair.technicals.signal_strength) {
            // Only record strong signals (>=4 for buy, <=2 for sell)
            if (pair.technicals.signal_strength >= 4 || pair.technicals.signal_strength <= 2) {
                try {
                    await fetch(`/api/signals/record?symbol=${encodeURIComponent(pair.symbol)}&signal=${encodeURIComponent(pair.technicals.signal)}&price=${pair.price}&pair_name=${encodeURIComponent(pair.name)}&category=forex`, {
                        method: 'POST'
                    });
                    console.log(`📊 Recorded signal: ${pair.technicals.signal} for ${pair.symbol}`);
                } catch (e) {
                    console.error('Error recording signal:', e);
                }
            }
        }
    });
}

// Initialize signals page on load
document.addEventListener('DOMContentLoaded', () => {
    setupSignalsPage();
});

// Auto-load signals when navigating to signals page
const originalShowPage = window.showPage;
if (originalShowPage) {
    window.showPage = function (pageId) {
        originalShowPage(pageId);
        if (pageId === 'signals' && !signalsLoaded) {
            fetchSignals();
        }
    };
}

// ============================================
// Signal Details Modal with SL/TP by Budget
// ============================================

function openSignalDetailsModal(encodedSignalData) {
    const signal = JSON.parse(decodeURIComponent(encodedSignalData));
    const modal = document.getElementById('signalDetailsModal');

    if (!modal) return;

    const isBuy = signal.signal.includes('Buy');
    const isSell = signal.signal.includes('Sell');
    const emoji = isBuy ? '🟢' : isSell ? '🔴' : '🟡';
    const signalType = isBuy ? 'BUY' : isSell ? 'SELL' : 'HOLD';

    // Update modal header
    document.getElementById('modalSignalType').innerHTML = `${emoji} ${signalType}`;
    document.getElementById('modalSignalType').className = `signal-modal-type ${isBuy ? 'buy' : isSell ? 'sell' : 'hold'}`;
    document.getElementById('modalSignalPair').textContent = signal.symbol;
    document.getElementById('modalEntryPrice').textContent = signal.price_at_signal?.toFixed(signal.price_at_signal > 100 ? 2 : 5) || '-';

    // Analysis text
    const analysisText = signal.analysis ||
        `${signal.rsi ? `RSI: ${signal.rsi.toFixed(1)}` : ''} ${signal.macd_trend ? `| MACD: ${signal.macd_trend}` : ''} | Signal Strength: ${signal.signal_strength}/5`;
    document.getElementById('modalAnalysis').textContent = analysisText;

    // Calculate SL/TP for 5 budget ranges
    const budgetLevels = calculateBudgetLevels(signal);
    document.getElementById('budgetLevelsContainer').innerHTML = budgetLevels;

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSignalDetailsModal() {
    const modal = document.getElementById('signalDetailsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function calculateBudgetLevels(signal) {
    const entryPrice = signal.price_at_signal;
    const isBuy = signal.signal.includes('Buy');
    const isForex = signal.category === 'forex';

    // Define 5 budget ranges
    const budgets = [
        { name: 'Micro', range: '$100 - $500', amount: 300, riskPct: 2, rewardRatio: 1.5, color: '#10b981' },
        { name: 'Small', range: '$500 - $2,000', amount: 1000, riskPct: 1.5, rewardRatio: 2, color: '#3b82f6' },
        { name: 'Medium', range: '$2,000 - $10,000', amount: 5000, riskPct: 1, rewardRatio: 2.5, color: '#8b5cf6' },
        { name: 'Large', range: '$10,000 - $50,000', amount: 25000, riskPct: 0.75, rewardRatio: 3, color: '#f59e0b' },
        { name: 'Professional', range: '$50,000+', amount: 75000, riskPct: 0.5, rewardRatio: 3, color: '#ef4444' }
    ];

    // Calculate pip value based on asset type
    const pipMultiplier = isForex ? (entryPrice > 100 ? 0.01 : 0.0001) : entryPrice * 0.01;

    return budgets.map(budget => {
        // Calculate position size based on risk
        const riskAmount = (budget.amount * budget.riskPct) / 100;

        // SL distance: 1-2% of entry price depending on volatility
        const slPips = entryPrice > 100 ? 50 : (entryPrice > 10 ? 20 : 30);
        const slDistance = slPips * pipMultiplier;

        // Calculate SL and TP prices
        let slPrice, tp1Price, tp2Price, tp3Price;

        if (isBuy) {
            slPrice = entryPrice - slDistance;
            tp1Price = entryPrice + (slDistance * budget.rewardRatio * 0.5);
            tp2Price = entryPrice + (slDistance * budget.rewardRatio);
            tp3Price = entryPrice + (slDistance * budget.rewardRatio * 1.5);
        } else {
            slPrice = entryPrice + slDistance;
            tp1Price = entryPrice - (slDistance * budget.rewardRatio * 0.5);
            tp2Price = entryPrice - (slDistance * budget.rewardRatio);
            tp3Price = entryPrice - (slDistance * budget.rewardRatio * 1.5);
        }

        // Format prices
        const decimals = entryPrice > 100 ? 2 : (entryPrice > 10 ? 4 : 5);
        const formatPrice = (p) => p.toFixed(decimals);

        // Calculate lot size / position size
        const positionSize = riskAmount / slDistance;
        const lotSize = isForex ? (positionSize / 100000).toFixed(2) : Math.floor(positionSize / entryPrice);

        return `
            <div class="budget-level" style="border-left: 4px solid ${budget.color}">
                <div class="budget-header">
                    <span class="budget-name">${budget.name}</span>
                    <span class="budget-range">${budget.range}</span>
                </div>
                <div class="budget-details">
                    <div class="budget-row">
                        <span class="label">Position Size:</span>
                        <span class="value">${isForex ? lotSize + ' lots' : lotSize + ' shares'}</span>
                    </div>
                    <div class="budget-row">
                        <span class="label">Risk Amount:</span>
                        <span class="value risk">$${riskAmount.toFixed(0)} (${budget.riskPct}%)</span>
                    </div>
                    <div class="budget-row sl">
                        <span class="label">🛑 Stop Loss:</span>
                        <span class="value sl-value">${formatPrice(slPrice)}</span>
                    </div>
                    <div class="budget-row tp">
                        <span class="label">🎯 Take Profit 1:</span>
                        <span class="value tp-value">${formatPrice(tp1Price)}</span>
                    </div>
                    <div class="budget-row tp">
                        <span class="label">🎯 Take Profit 2:</span>
                        <span class="value tp-value">${formatPrice(tp2Price)}</span>
                    </div>
                    <div class="budget-row tp">
                        <span class="label">🎯 Take Profit 3:</span>
                        <span class="value tp-value">${formatPrice(tp3Price)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('signalDetailsModal');
    if (modal && e.target === modal) {
        closeSignalDetailsModal();
    }

    const tvModal = document.getElementById('tradingViewModal');
    if (tvModal && e.target === tvModal) {
        closeTradingViewModal();
    }
});

// Expose functions globally
window.openSignalDetailsModal = openSignalDetailsModal;
window.closeSignalDetailsModal = closeSignalDetailsModal;

// ============================================
// TradingView Chart Modal
// ============================================

let currentTVSymbol = 'FX:EURUSD';
let currentTVTimeframe = '60';

// Symbol mapping for TradingView
const tvSymbolMap = {
    'EUR/USD': 'FX:EURUSD',
    'GBP/USD': 'FX:GBPUSD',
    'USD/JPY': 'FX:USDJPY',
    'USD/CHF': 'FX:USDCHF',
    'AUD/USD': 'FX:AUDUSD',
    'USD/CAD': 'FX:USDCAD',
    'USD/NGN': 'FX_IDC:USDNGN',
    'EUR/NGN': 'FX_IDC:EURNGN',
    'GBP/NGN': 'FX_IDC:GBPNGN',
    'XAU/USD': 'TVC:GOLD',
    'XAG/USD': 'TVC:SILVER',
    'WTI Oil': 'TVC:USOIL'
};

function openTradingViewModal(symbol, name) {
    const modal = document.getElementById('tradingViewModal');
    const titleEl = document.getElementById('tvModalTitle');
    const container = document.getElementById('tvChartContainer');

    if (!modal) return;

    // Set title
    titleEl.textContent = `${symbol} Chart`;

    // Get TradingView symbol
    currentTVSymbol = tvSymbolMap[symbol] || 'FX:EURUSD';
    currentTVTimeframe = '60'; // Default to 1H

    // Create TradingView widget
    loadTradingViewWidget();

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset timeframe buttons
    document.querySelectorAll('.tv-tf-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.tv-tf-btn')?.classList.add('active');
}

function closeTradingViewModal() {
    const modal = document.getElementById('tradingViewModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';

        // Clear the widget
        const container = document.getElementById('tradingview_widget');
        if (container) container.innerHTML = '';
    }
}

function changeTVTimeframe(tf) {
    // Map timeframe to TradingView interval
    const tfMap = {
        '1': '60',     // 1 hour
        '4': '240',    // 4 hours
        'D': 'D',      // Daily
        'W': 'W'       // Weekly
    };

    currentTVTimeframe = tfMap[tf] || '60';

    // Update active button
    document.querySelectorAll('.tv-tf-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Reload widget
    loadTradingViewWidget();
}

function loadTradingViewWidget() {
    const container = document.getElementById('tradingview_widget');
    if (!container) return;

    // Clear existing widget
    container.innerHTML = '';

    // Create iframe with TradingView embed
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(currentTVSymbol)}&interval=${currentTVTimeframe}&theme=dark&style=1&locale=en&toolbar_bg=%23121212&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&saveimage=false&studies=[]&container_id=tradingview_widget`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allowFullscreen = true;

    container.appendChild(iframe);
}

// Expose TradingView functions globally
window.openTradingViewModal = openTradingViewModal;
window.closeTradingViewModal = closeTradingViewModal;
window.changeTVTimeframe = changeTVTimeframe;

// ============================================
// Advanced Analysis Functions
// ============================================

let selectedAnalysisSymbol = 'EUR/USD';
let symbolInputCallback = null;  // Stores the callback function after symbol is selected

// Symbol Input Modal Functions
function openSymbolInput(icon, title, description, callback) {
    const modal = document.getElementById('symbolInputModal');
    const iconEl = document.getElementById('symbolModalIcon');
    const titleEl = document.getElementById('symbolModalTitle');
    const descEl = document.getElementById('symbolModalDesc');
    const inputEl = document.getElementById('customSymbolInput');

    if (modal) {
        iconEl.textContent = icon || '📊';
        titleEl.textContent = title || 'Select Symbol';
        descEl.textContent = description || 'Choose a currency pair or commodity to analyze';
        inputEl.value = selectedAnalysisSymbol;

        symbolInputCallback = callback;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        inputEl.focus();
    }
}

function closeSymbolInput() {
    const modal = document.getElementById('symbolInputModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        symbolInputCallback = null;
    }
}

function selectQuickSymbol(symbol) {
    const inputEl = document.getElementById('customSymbolInput');
    if (inputEl) {
        inputEl.value = symbol;
    }
    confirmSymbolInput();
}

function confirmSymbolInput() {
    const inputEl = document.getElementById('customSymbolInput');
    const symbol = inputEl ? inputEl.value.trim() : '';

    console.log('🔍 confirmSymbolInput called, symbol:', symbol);

    if (!symbol) {
        inputEl.focus();
        return;
    }

    selectedAnalysisSymbol = symbol;

    // IMPORTANT: Save callback before closing (closeSymbolInput nullifies it)
    const callback = symbolInputCallback;

    closeSymbolInput();

    console.log('📞 Calling callback with symbol:', symbol, 'Callback exists:', !!callback);

    if (callback) {
        callback(symbol);
    } else {
        console.error('❌ No callback function set!');
    }
}

// Handle Enter key in input
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('customSymbolInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                confirmSymbolInput();
            }
        });
    }
});

// Load Economic Calendar on forex page load
async function loadEconomicCalendarWarning() {
    try {
        const response = await fetch('/api/analysis/calendar');
        const data = await response.json();

        if (data.success && data.data.high_impact_today > 0) {
            const banner = document.getElementById('calendarWarning');
            const text = document.getElementById('calendarWarningText');

            if (banner && text) {
                text.textContent = data.data.warning || `${data.data.high_impact_today} high-impact news event(s) today - trade with caution!`;
                banner.style.display = 'flex';
            }
        }
    } catch (error) {
        console.log('Could not load calendar warning:', error);
    }
}

// Show analysis results panel
function showAnalysisResults(title, content) {
    console.log('📊 showAnalysisResults called:', title);

    const container = document.getElementById('analysisResults');
    const titleEl = document.getElementById('analysisResultsTitle');
    const contentEl = document.getElementById('analysisResultsContent');

    console.log('Container found:', !!container, 'Title found:', !!titleEl, 'Content found:', !!contentEl);

    if (container && titleEl && contentEl) {
        titleEl.textContent = title;
        contentEl.innerHTML = content;
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth' });
        console.log('✅ Analysis results displayed');
    } else {
        // Fallback: Show in an alert if container not found
        console.error('❌ Analysis results container not found! Check if you are on Forex page.');
        alert(`Analysis Results:\n\n${title}\n\n(Open browser console for full details)`);
    }
}

function closeAnalysisResults() {
    const container = document.getElementById('analysisResults');
    if (container) {
        container.style.display = 'none';
    }
}

// Multi-Timeframe Analysis
function loadMultiTimeframe() {
    openSymbolInput(
        '⏰',
        'Multi-Timeframe Analysis',
        'Analyze signals across 1H, 4H, and Daily timeframes',
        runMultiTimeframeAnalysis
    );
}

async function runMultiTimeframeAnalysis(symbol) {
    showAnalysisResults('⏰ Multi-Timeframe Analysis', '<div class="loading-spinner">Analyzing...</div>');

    try {
        const response = await fetch(`/api/analysis/mtf/${encodeURIComponent(symbol)}`);
        const data = await response.json();

        if (data.success) {
            const mtf = data.data;

            const signalsHtml = mtf.signals.map(s => {
                const isBuy = s.signal.includes('Buy');
                const isSell = s.signal.includes('Sell');
                const cardClass = isBuy ? 'bullish' : isSell ? 'bearish' : '';
                const signalClass = isBuy ? 'buy' : isSell ? 'sell' : 'hold';

                return `
                    <div class="mtf-signal-card ${cardClass}">
                        <div class="mtf-timeframe">${s.timeframe}</div>
                        <div class="mtf-signal-type ${signalClass}">${s.signal}</div>
                        <div class="mtf-indicators">RSI: ${s.rsi || 'N/A'} | ${s.macd_trend || 'N/A'}</div>
                    </div>
                `;
            }).join('');

            const confluenceClass = mtf.confluence.toLowerCase();

            const content = `
                <h4 style="margin-bottom: 16px;">📊 ${symbol} - Timeframe Signals</h4>
                <div class="mtf-signals-grid">
                    ${signalsHtml}
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <div class="confluence-badge ${confluenceClass}">
                        Confluence: ${mtf.confluence}
                    </div>
                    <p style="margin-top: 12px; font-size: 14px;">${mtf.recommendation}</p>
                </div>
            `;

            showAnalysisResults(`⏰ Multi-Timeframe: ${symbol}`, content);
        } else {
            showAnalysisResults('Error', 'Failed to load analysis');
        }
    } catch (error) {
        showAnalysisResults('Error', `Analysis failed: ${error.message}`);
    }
}

// Support/Resistance Levels
function loadSupportResistance() {
    openSymbolInput(
        '🎯',
        'Support/Resistance Levels',
        'Calculate key support and resistance price levels',
        runSupportResistanceAnalysis
    );
}

async function runSupportResistanceAnalysis(symbol) {
    showAnalysisResults('🎯 Support/Resistance', '<div class="loading-spinner">Calculating levels...</div>');

    try {
        const response = await fetch(`/api/analysis/sr/${encodeURIComponent(symbol)}`);
        const data = await response.json();

        if (data.success) {
            const sr = data.data;

            const content = `
                <h4 style="margin-bottom: 16px;">📊 ${symbol} - Key Price Levels</h4>
                <div class="sr-levels-list">
                    <div class="sr-level resistance">
                        <span class="sr-label">🔴 Resistance 2 (Strong)</span>
                        <span class="sr-value">${sr.resistance_2}</span>
                    </div>
                    <div class="sr-level resistance">
                        <span class="sr-label">🔴 Resistance 1 (Nearest)</span>
                        <span class="sr-value">${sr.resistance_1}</span>
                    </div>
                    <div class="sr-level current">
                        <span class="sr-label">📍 Current Price</span>
                        <span class="sr-value">${sr.current_price}</span>
                    </div>
                    <div class="sr-level">
                        <span class="sr-label">⚖️ Pivot Point</span>
                        <span class="sr-value">${sr.pivot_point}</span>
                    </div>
                    <div class="sr-level support">
                        <span class="sr-label">🟢 Support 1 (Nearest)</span>
                        <span class="sr-value">${sr.support_1}</span>
                    </div>
                    <div class="sr-level support">
                        <span class="sr-label">🟢 Support 2 (Strong)</span>
                        <span class="sr-value">${sr.support_2}</span>
                    </div>
                </div>
                <div style="margin-top: 16px; padding: 12px; background: var(--glass); border-radius: 8px;">
                    <strong>Position:</strong> ${sr.price_position}
                    ${sr.caution ? `<br><span style="color: var(--orange);">${sr.caution}</span>` : ''}
                </div>
            `;

            showAnalysisResults(`🎯 Support/Resistance: ${symbol}`, content);
        }
    } catch (error) {
        showAnalysisResults('Error', `Failed to load S/R levels: ${error.message}`);
    }
}

// Backtesting
function loadBacktest() {
    openSymbolInput(
        '📊',
        '2-Year Backtesting',
        'Test signal performance on 2 years of historical data',
        runBacktestAnalysis
    );
}

async function runBacktestAnalysis(symbol) {
    showAnalysisResults('📊 Backtesting', '<div class="loading-spinner">Running backtest on 2 years of data...</div>');

    try {
        const response = await fetch(`/api/analysis/backtest/${encodeURIComponent(symbol)}?period=2y`);
        const data = await response.json();

        if (data.success) {
            const bt = data.data;

            const winRateClass = bt.win_rate >= 55 ? 'good' : bt.win_rate >= 45 ? 'neutral' : 'bad';
            const pfClass = bt.profit_factor >= 1.5 ? 'good' : bt.profit_factor >= 1 ? 'neutral' : 'bad';

            const content = `
                <h4 style="margin-bottom: 16px;">📊 ${symbol} - 2 Year Backtest Results</h4>
                <div class="backtest-stats-grid">
                    <div class="backtest-stat">
                        <div class="backtest-value ${winRateClass}">${bt.win_rate}%</div>
                        <div class="backtest-label">Win Rate</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value neutral">${bt.total_signals}</div>
                        <div class="backtest-label">Total Trades</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value good">${bt.wins}</div>
                        <div class="backtest-label">Wins</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value bad">${bt.losses}</div>
                        <div class="backtest-label">Losses</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value ${pfClass}">${bt.profit_factor}x</div>
                        <div class="backtest-label">Profit Factor</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value good">+${bt.avg_win_pct}%</div>
                        <div class="backtest-label">Avg Win</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value bad">${bt.avg_loss_pct}%</div>
                        <div class="backtest-label">Avg Loss</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value bad">-${bt.max_drawdown_pct}%</div>
                        <div class="backtest-label">Max Drawdown</div>
                    </div>
                </div>
                <div style="margin-top: 20px; padding: 16px; background: var(--glass); border-radius: 8px; text-align: center;">
                    ${bt.win_rate >= 55
                    ? '✅ <strong style="color: var(--green);">VIABLE STRATEGY</strong> - Win rate above 55%'
                    : bt.win_rate >= 45
                        ? '⚠️ <strong style="color: var(--orange);">MARGINAL</strong> - Win rate between 45-55%'
                        : '❌ <strong style="color: var(--red);">NOT RECOMMENDED</strong> - Win rate below 45%'}
                </div>
            `;

            showAnalysisResults(`📊 Backtest: ${symbol}`, content);
        }
    } catch (error) {
        showAnalysisResults('Error', `Backtest failed: ${error.message}`);
    }
}

// Economic Calendar
async function showEconomicCalendar() {
    showAnalysisResults('📅 Economic Calendar', '<div class="loading-spinner">Loading events...</div>');

    try {
        const response = await fetch('/api/analysis/calendar');
        const data = await response.json();

        if (data.success) {
            const cal = data.data;

            let eventsHtml = '';
            if (cal.events.length === 0) {
                eventsHtml = '<p style="text-align: center; color: var(--text-muted);">No high-impact events scheduled</p>';
            } else {
                eventsHtml = cal.events.map(e => `
                    <div class="calendar-event ${e.impact.toLowerCase()}">
                        <span class="event-time">${e.time}</span>
                        <span class="event-currency">${e.currency}</span>
                        <span class="event-name">${e.event}</span>
                        <span class="event-impact ${e.impact.toLowerCase()}">${e.impact}</span>
                    </div>
                `).join('');
            }

            const content = `
                ${cal.warning ? `<div style="padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--red); border-radius: 8px; margin-bottom: 16px; color: var(--red);">${cal.warning}</div>` : ''}
                <div class="calendar-events-list">
                    ${eventsHtml}
                </div>
                <p style="margin-top: 16px; font-size: 12px; color: var(--text-muted); text-align: center;">
                    ⚠️ Avoid trading during high-impact news - spreads widen and volatility increases
                </p>
            `;

            showAnalysisResults('📅 Economic Calendar', content);
        }
    } catch (error) {
        showAnalysisResults('Error', `Failed to load calendar: ${error.message}`);
    }
}

// Load calendar warning when forex page is shown
document.addEventListener('DOMContentLoaded', () => {
    // Check calendar on load
    setTimeout(loadEconomicCalendarWarning, 2000);
});

// Expose advanced analysis functions globally
window.loadMultiTimeframe = loadMultiTimeframe;
window.loadSupportResistance = loadSupportResistance;
window.loadBacktest = loadBacktest;
window.showEconomicCalendar = showEconomicCalendar;
window.closeAnalysisResults = closeAnalysisResults;
window.openSymbolInput = openSymbolInput;
window.closeSymbolInput = closeSymbolInput;
window.selectQuickSymbol = selectQuickSymbol;
window.confirmSymbolInput = confirmSymbolInput;

// ============================================
// Stock Search Functions
// ============================================

let currentStockSymbol = '';

async function searchStock(symbol) {
    // If no symbol passed, get from input
    if (!symbol) {
        const input = document.getElementById('stockSearchInput');
        symbol = input ? input.value.trim().toUpperCase() : '';
    }

    if (!symbol) {
        alert('Please enter a stock symbol');
        return;
    }

    currentStockSymbol = symbol;

    // Show loading state
    const resultsPanel = document.getElementById('stockResults');
    if (resultsPanel) {
        resultsPanel.style.display = 'block';
        document.getElementById('stockResultSymbol').textContent = symbol;
        document.getElementById('stockResultName').textContent = 'Loading...';
    }

    try {
        const response = await fetch(`/api/stock/search/${encodeURIComponent(symbol)}`);
        const data = await response.json();

        if (data.success) {
            displayStockResults(data.data);
        } else {
            alert(`Stock ${symbol} not found`);
            closeStockResults();
        }
    } catch (error) {
        console.error('Stock search error:', error);
        alert(`Error searching for ${symbol}: ${error.message}`);
        closeStockResults();
    }
}

function displayStockResults(stock) {
    // Symbol and Name
    document.getElementById('stockResultSymbol').textContent = stock.symbol;
    document.getElementById('stockResultName').textContent = stock.name;

    // Price
    document.getElementById('stockPrice').textContent = `$${stock.price.toFixed(2)}`;

    const changeEl = document.getElementById('stockChange');
    const changeSign = stock.change >= 0 ? '+' : '';
    changeEl.textContent = `${changeSign}${stock.change.toFixed(2)} (${changeSign}${stock.change_pct.toFixed(2)}%)`;
    changeEl.className = `price-change ${stock.change >= 0 ? 'positive' : 'negative'}`;

    // Signal
    const signalEl = document.getElementById('stockSignal');
    const signal = stock.technicals?.signal || 'Hold';
    const signalClass = signal.includes('Buy') ? 'buy' : signal.includes('Sell') ? 'sell' : 'hold';
    signalEl.innerHTML = `<span class="signal-badge ${signalClass}">${signal}</span>`;

    // Technicals
    if (stock.technicals) {
        const t = stock.technicals;

        document.getElementById('stockRSI').textContent = t.rsi?.toFixed(1) || '--';
        const rsiSignalEl = document.getElementById('stockRSISignal');
        rsiSignalEl.textContent = t.rsi_signal || 'Neutral';
        rsiSignalEl.className = `tech-signal ${t.rsi_signal === 'Oversold' ? 'bullish' : t.rsi_signal === 'Overbought' ? 'bearish' : 'neutral'}`;

        document.getElementById('stockMACD').textContent = t.macd?.toFixed(4) || '--';
        const macdTrendEl = document.getElementById('stockMACDTrend');
        macdTrendEl.textContent = t.macd_trend || 'Neutral';
        macdTrendEl.className = `tech-signal ${t.macd_trend?.includes('Bullish') ? 'bullish' : t.macd_trend?.includes('Bearish') ? 'bearish' : 'neutral'}`;

        document.getElementById('stockSMA20').textContent = `$${t.sma_20?.toFixed(2) || '--'}`;
        const sma20SignalEl = document.getElementById('stockAboveSMA20');
        sma20SignalEl.textContent = t.above_sma_20 ? 'Above ✓' : 'Below ✗';
        sma20SignalEl.className = `tech-signal ${t.above_sma_20 ? 'bullish' : 'bearish'}`;

        document.getElementById('stockSMA200').textContent = `$${t.sma_200?.toFixed(2) || '--'}`;
        const sma200SignalEl = document.getElementById('stockAboveSMA200');
        sma200SignalEl.textContent = t.above_sma_200 ? 'Above ✓' : 'Below ✗';
        sma200SignalEl.className = `tech-signal ${t.above_sma_200 ? 'bullish' : 'bearish'}`;
    }

    // Stock Info
    document.getElementById('stockMarketCap').textContent = formatMarketCap(stock.market_cap);
    document.getElementById('stockPE').textContent = stock.pe_ratio?.toFixed(2) || '--';
    document.getElementById('stock52High').textContent = stock.high_52w ? `$${stock.high_52w.toFixed(2)}` : '--';
    document.getElementById('stock52Low').textContent = stock.low_52w ? `$${stock.low_52w.toFixed(2)}` : '--';
    document.getElementById('stockVolume').textContent = formatVolume(stock.volume);
    document.getElementById('stockSector').textContent = stock.sector || '--';

    // Analysis
    document.getElementById('stockAnalysisText').textContent = stock.analysis || 'No analysis available.';

    // Show results
    document.getElementById('stockResults').style.display = 'block';
}

function formatMarketCap(cap) {
    if (!cap) return '--';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
}

function formatVolume(vol) {
    if (!vol) return '--';
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
    return vol.toLocaleString();
}

function closeStockResults() {
    const resultsPanel = document.getElementById('stockResults');
    if (resultsPanel) {
        resultsPanel.style.display = 'none';
    }
}

async function loadStockSR() {
    if (!currentStockSymbol) return;

    try {
        const response = await fetch(`/api/stock/sr/${encodeURIComponent(currentStockSymbol)}`);
        const data = await response.json();

        if (data.success) {
            const sr = data.data;
            const content = `
                <h4 style="margin-bottom: 16px;">📊 ${currentStockSymbol} - Support/Resistance Levels</h4>
                <div class="sr-levels-list">
                    <div class="sr-level resistance">
                        <span class="sr-label">🔴 52W High</span>
                        <span class="sr-value">$${sr.high_52w}</span>
                    </div>
                    <div class="sr-level resistance">
                        <span class="sr-label">🔴 Resistance 1</span>
                        <span class="sr-value">$${sr.resistance_1}</span>
                    </div>
                    <div class="sr-level current">
                        <span class="sr-label">📍 Current Price</span>
                        <span class="sr-value">$${sr.current_price}</span>
                    </div>
                    <div class="sr-level">
                        <span class="sr-label">⚖️ Pivot Point</span>
                        <span class="sr-value">$${sr.pivot_point}</span>
                    </div>
                    <div class="sr-level support">
                        <span class="sr-label">🟢 Support 1</span>
                        <span class="sr-value">$${sr.support_1}</span>
                    </div>
                    <div class="sr-level support">
                        <span class="sr-label">🟢 52W Low</span>
                        <span class="sr-value">$${sr.low_52w}</span>
                    </div>
                </div>
                <div style="margin-top: 16px; padding: 12px; background: var(--glass); border-radius: 8px;">
                    <strong>Position:</strong> ${sr.price_position}<br>
                    <span style="color: var(--text-muted);">
                        Distance to 52W High: ${sr.distance_to_52w_high_pct}% | 
                        Distance to 52W Low: ${sr.distance_to_52w_low_pct}%
                    </span>
                </div>
            `;
            showAnalysisResults(`🎯 S/R: ${currentStockSymbol}`, content);
        }
    } catch (error) {
        alert(`Error loading S/R levels: ${error.message}`);
    }
}

async function loadStockBacktest() {
    if (!currentStockSymbol) return;

    showAnalysisResults('📊 Backtesting', '<div class="loading-spinner">Running 2-year backtest...</div>');

    try {
        const response = await fetch(`/api/stock/backtest/${encodeURIComponent(currentStockSymbol)}?period=2y`);
        const data = await response.json();

        if (data.success) {
            const bt = data.data;
            const winRateClass = bt.win_rate >= 55 ? 'good' : bt.win_rate >= 45 ? 'neutral' : 'bad';
            const pfClass = bt.profit_factor >= 1.5 ? 'good' : bt.profit_factor >= 1 ? 'neutral' : 'bad';

            const content = `
                <h4 style="margin-bottom: 16px;">📊 ${currentStockSymbol} - 2 Year Backtest</h4>
                <div class="backtest-stats-grid">
                    <div class="backtest-stat">
                        <div class="backtest-value ${winRateClass}">${bt.win_rate}%</div>
                        <div class="backtest-label">Win Rate</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value neutral">${bt.total_signals}</div>
                        <div class="backtest-label">Total Trades</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value good">${bt.wins}</div>
                        <div class="backtest-label">Wins</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value bad">${bt.losses}</div>
                        <div class="backtest-label">Losses</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value ${pfClass}">${bt.profit_factor}x</div>
                        <div class="backtest-label">Profit Factor</div>
                    </div>
                    <div class="backtest-stat">
                        <div class="backtest-value ${bt.total_return_pct >= 0 ? 'good' : 'bad'}">${bt.total_return_pct >= 0 ? '+' : ''}${bt.total_return_pct}%</div>
                        <div class="backtest-label">Total Return</div>
                    </div>
                </div>
            `;
            showAnalysisResults(`📊 Backtest: ${currentStockSymbol}`, content);
        }
    } catch (error) {
        alert(`Backtest error: ${error.message}`);
    }
}

function openStockChart() {
    if (!currentStockSymbol) return;
    openTradingViewModal(currentStockSymbol, currentStockSymbol);
}

// Handle Enter key in stock search
document.addEventListener('DOMContentLoaded', () => {
    const stockInput = document.getElementById('stockSearchInput');
    if (stockInput) {
        stockInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                searchStock();
            }
        });
    }
});

// Expose stock functions globally
window.searchStock = searchStock;
window.closeStockResults = closeStockResults;
window.loadStockSR = loadStockSR;
window.loadStockBacktest = loadStockBacktest;
window.openStockChart = openStockChart;

// ============================================
// "I Took The Trade" Function
// ============================================

async function tookTheTrade(symbol, pairName, signal, price) {
    try {
        const response = await fetch('/api/telegram/trade-taken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                symbol: symbol,
                pair_name: pairName,
                signal: signal,
                price: price
            })
        });

        const data = await response.json();

        if (data.success) {
            // Show success feedback
            alert(`✅ Trade recorded!\n\n${signal} on ${symbol} at ${price}\n\nTelegram alert sent.`);
        } else {
            alert('Failed to send alert. Check Telegram configuration.');
        }
    } catch (error) {
        console.error('Error sending trade alert:', error);
        alert('Error: ' + error.message);
    }
}

// Expose function globally
window.tookTheTrade = tookTheTrade;
