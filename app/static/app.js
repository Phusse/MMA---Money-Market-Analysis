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

    // Build Yahoo Finance symbol for quant API
    const yahooSymbol = pair.symbol.replace('/', '') + '=X';

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
                    📊 Chart
                </button>
                <button class="forex-quant-btn" onclick="event.stopPropagation(); showQuantAnalysisModal('${yahooSymbol}')" title="Fibonacci, Bollinger, Mean Reversion, Monte Carlo">
                    🧠 Quant
                </button>
                ${isStrong ? `<button class="forex-trade-btn" onclick="event.stopPropagation(); tookTheTrade('${escapeHtml(pair.symbol)}', '${escapeHtml(pair.name)}', '${signal}', ${pair.price})">
                    ✅ Trade
                </button>` : ''}
                <div class="forex-card-hint">Click for full analysis →</div>
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

// ============================================
// Settings Page & Role-Based Content Filtering
// ============================================

let captchaNum1 = 0;
let captchaNum2 = 0;
let selectedNewAccountType = null;

// Initialize settings page when it becomes visible
document.addEventListener('DOMContentLoaded', () => {
    // Apply role-based filtering on page load
    applyRoleBasedFiltering();

    // Load settings when settings page is shown
    const settingsLink = document.querySelector('[data-page="settings"]');
    if (settingsLink) {
        settingsLink.addEventListener('click', loadSettingsPage);
    }
});

// Apply role-based content filtering based on account type
function applyRoleBasedFiltering() {
    const accountType = localStorage.getItem('mma_account_type') || 'both';

    // Navigation items to show/hide
    const forexNav = document.querySelector('[data-page="forex"]');
    const stockNav = document.querySelector('[data-page="dashboard"]');
    const nigerianNav = document.querySelector('[data-page="nigerian"]');

    // Pages to show/hide based on account type
    if (accountType === 'forex') {
        // Hide stock-related content
        stockNav?.closest('.nav-link, .sub-item')?.classList.add('hidden-by-role');
        nigerianNav?.closest('.nav-link, .sub-item')?.classList.add('hidden-by-role');
        document.querySelector('.stock-search-section')?.classList.add('hidden-by-role');

        // Show forex content
        forexNav?.closest('.nav-link, .sub-item')?.classList.remove('hidden-by-role');
    } else if (accountType === 'stock') {
        // Hide forex-related content
        forexNav?.closest('.nav-link, .sub-item')?.classList.add('hidden-by-role');

        // Show stock content
        stockNav?.closest('.nav-link, .sub-item')?.classList.remove('hidden-by-role');
        nigerianNav?.closest('.nav-link, .sub-item')?.classList.remove('hidden-by-role');
        document.querySelector('.stock-search-section')?.classList.remove('hidden-by-role');
    } else {
        // Show everything for 'both'
        document.querySelectorAll('.hidden-by-role').forEach(el => {
            el.classList.remove('hidden-by-role');
        });
    }

    console.log(`📊 Role-based filtering applied: ${accountType}`);
}

// Load settings page data
async function loadSettingsPage() {
    const user = JSON.parse(localStorage.getItem('mma_user') || '{}');
    const accountType = localStorage.getItem('mma_account_type') || 'both';

    // Update settings display
    document.getElementById('settingsEmail').textContent = user.email || 'Not logged in';
    document.getElementById('settingsName').textContent = user.name || '--';
    document.getElementById('settingsAccountType').textContent = accountType.charAt(0).toUpperCase() + accountType.slice(1);

    // Highlight current account type in selector
    document.querySelectorAll('.account-type-option').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.type === accountType) {
            btn.classList.add('selected');
        }
    });

    // Try to get full profile from API
    const token = localStorage.getItem('mma_access_token');
    if (token) {
        try {
            const response = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success && data.profile) {
                document.getElementById('settingsPlan').textContent = data.profile.plan || 'Free';
            }
        } catch (error) {
            console.log('Could not fetch profile:', error);
        }
    }
}

// Select new account type (before confirmation)
function selectNewAccountType(type, button) {
    const currentType = localStorage.getItem('mma_account_type') || 'both';

    // Update button selection
    document.querySelectorAll('.account-type-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');

    // If selecting a different type, show confirmation form
    if (type !== currentType) {
        selectedNewAccountType = type;
        showAccountTypeChangeForm();
    } else {
        // Same type selected, hide form
        selectedNewAccountType = null;
        document.getElementById('changeTypeForm').style.display = 'none';
    }
}

// Show the confirmation form with captcha
function showAccountTypeChangeForm() {
    // Generate captcha
    captchaNum1 = Math.floor(Math.random() * 10) + 1;
    captchaNum2 = Math.floor(Math.random() * 10) + 1;
    document.getElementById('captchaQuestion').textContent = `${captchaNum1} + ${captchaNum2}`;

    // Clear previous inputs
    document.getElementById('confirmPassword').value = '';
    document.getElementById('captchaAnswer').value = '';
    document.getElementById('changeTypeError').style.display = 'none';
    document.getElementById('changeTypeSuccess').style.display = 'none';

    // Show form
    document.getElementById('changeTypeForm').style.display = 'block';
}

// Cancel account type change
function cancelAccountTypeChange() {
    const currentType = localStorage.getItem('mma_account_type') || 'both';

    // Reset to current type
    document.querySelectorAll('.account-type-option').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.type === currentType) {
            btn.classList.add('selected');
        }
    });

    selectedNewAccountType = null;
    document.getElementById('changeTypeForm').style.display = 'none';
}

// Confirm account type change
async function confirmAccountTypeChange() {
    const password = document.getElementById('confirmPassword').value;
    const captchaAnswer = parseInt(document.getElementById('captchaAnswer').value);
    const errorEl = document.getElementById('changeTypeError');
    const successEl = document.getElementById('changeTypeSuccess');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    // Validate captcha
    if (captchaAnswer !== captchaNum1 + captchaNum2) {
        errorEl.textContent = '❌ Incorrect answer. Please solve the math problem.';
        errorEl.style.display = 'block';
        return;
    }

    // Validate password
    if (!password) {
        errorEl.textContent = '❌ Please enter your password.';
        errorEl.style.display = 'block';
        return;
    }

    if (!selectedNewAccountType) {
        errorEl.textContent = '❌ No account type selected.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const token = localStorage.getItem('mma_access_token');

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
            const user = JSON.parse(localStorage.getItem('mma_user') || '{}');
            user.account_type = selectedNewAccountType;
            localStorage.setItem('mma_user', JSON.stringify(user));

            // Show success
            successEl.textContent = `✅ Account type changed to "${selectedNewAccountType}". Refreshing...`;
            successEl.style.display = 'block';

            // Apply new filtering and refresh page after delay
            setTimeout(() => {
                applyRoleBasedFiltering();
                document.getElementById('settingsAccountType').textContent =
                    selectedNewAccountType.charAt(0).toUpperCase() + selectedNewAccountType.slice(1);
                document.getElementById('changeTypeForm').style.display = 'none';
                selectedNewAccountType = null;
            }, 1500);
        } else {
            errorEl.textContent = data.detail || '❌ Failed to update. Check your password.';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = '❌ Connection error. Please try again.';
        errorEl.style.display = 'block';
        console.error('Account type change error:', error);
    }
}

// Toggle password visibility in settings
function toggleConfirmPassword() {
    const input = document.getElementById('confirmPassword');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Logout user
function logoutUser() {
    // Clear all auth data
    localStorage.removeItem('mma_access_token');
    localStorage.removeItem('mma_refresh_token');
    localStorage.removeItem('mma_user');
    localStorage.removeItem('mma_account_type');

    // Redirect to login
    window.location.href = '/login';
}

// Expose settings functions globally
window.selectNewAccountType = selectNewAccountType;
window.cancelAccountTypeChange = cancelAccountTypeChange;
window.confirmAccountTypeChange = confirmAccountTypeChange;
window.toggleConfirmPassword = toggleConfirmPassword;
window.logoutUser = logoutUser;
window.loadSettingsPage = loadSettingsPage;
window.applyRoleBasedFiltering = applyRoleBasedFiltering;

// ============================================
// FOREX-FOCUSED DASHBOARD FEATURES
// ============================================

// ============================================
// Role-Based Content Filtering
// ============================================
function applyRoleBasedFiltering() {
    const accountType = localStorage.getItem('mma_account_type') || 'both';
    const body = document.body;

    // Remove existing account type classes
    body.classList.remove('account-forex', 'account-stock', 'account-both');

    // Add current account type class
    body.classList.add(`account-${accountType}`);

    // Update navigation visibility based on account type
    const forexNav = document.querySelector('[data-page="forex"]');
    const usMarketsNav = document.querySelector('[data-page="usMarkets"]');
    const nigerianNav = document.querySelector('[data-page="nigerian"]');

    if (accountType === 'forex') {
        // Hide stock-related navigation
        if (usMarketsNav) usMarketsNav.closest('.nav-link')?.classList.add('hidden');
        if (nigerianNav) nigerianNav.closest('.nav-link')?.classList.add('hidden');
        if (forexNav) forexNav.closest('.nav-link')?.classList.remove('hidden');
    } else if (accountType === 'stock') {
        // Hide forex-related navigation
        if (forexNav) forexNav.closest('.nav-link')?.classList.add('hidden');
        if (usMarketsNav) usMarketsNav.closest('.nav-link')?.classList.remove('hidden');
        if (nigerianNav) nigerianNav.closest('.nav-link')?.classList.remove('hidden');
    } else {
        // Show all for 'both' account type
        if (forexNav) forexNav.closest('.nav-link')?.classList.remove('hidden');
        if (usMarketsNav) usMarketsNav.closest('.nav-link')?.classList.remove('hidden');
        if (nigerianNav) nigerianNav.closest('.nav-link')?.classList.remove('hidden');
    }

    // Filter dashboard content sections
    const forexSections = document.querySelectorAll('.forex-section');
    const stockSections = document.querySelectorAll('.stock-section');

    forexSections.forEach(section => {
        section.style.display = (accountType === 'stock') ? 'none' : '';
    });

    stockSections.forEach(section => {
        section.style.display = (accountType === 'forex') ? 'none' : '';
    });

    console.log(`✅ Applied role-based filtering for account type: ${accountType}`);
}

// ============================================
// Settings Page Loader
// ============================================
function loadSettingsPage() {
    const token = localStorage.getItem('mma_access_token');
    const user = JSON.parse(localStorage.getItem('mma_user') || '{}');
    const accountType = localStorage.getItem('mma_account_type') || 'both';

    // Update auth notice visibility
    const authNotice = document.getElementById('authNotice');
    const userProfileCard = document.getElementById('userProfileCard');

    if (token && user.email) {
        // User is logged in
        if (authNotice) authNotice.style.display = 'none';
        if (userProfileCard) userProfileCard.classList.remove('hidden');

        // Update user info
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');
        const userAccountType = document.getElementById('userAccountType');

        if (userName) userName.textContent = user.name || user.email.split('@')[0];
        if (userEmail) userEmail.textContent = user.email;
        if (userAvatar) userAvatar.textContent = (user.name || user.email)[0].toUpperCase();
        if (userAccountType) {
            const typeLabels = { forex: '💱 Forex Only', stock: '📈 Stocks Only', both: '🚀 Both Markets' };
            userAccountType.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-violet-400"></span>${typeLabels[accountType] || 'Both Markets'}`;
        }
    } else {
        // User is not logged in
        if (authNotice) authNotice.style.display = 'block';
        if (userProfileCard) userProfileCard.classList.add('hidden');
    }

    // Update current account type display
    const currentTypeDisplay = document.getElementById('currentAccountTypeDisplay');
    if (currentTypeDisplay) {
        const typeLabels = { forex: 'Forex Only', stock: 'Stocks Only', both: 'Both (Forex & Stocks)' };
        currentTypeDisplay.textContent = typeLabels[accountType] || 'Both (Forex & Stocks)';
    }

    // Highlight current account type button
    document.querySelectorAll('.account-type-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.type === accountType) {
            btn.classList.add('selected');
        }
    });
}

// ============================================
// Forex Data Loader
// ============================================
async function loadForexData() {
    const refreshBtn = document.getElementById('refreshForexBtn');
    const majorGrid = document.getElementById('majorPairsGrid');
    const nairaGrid = document.getElementById('nairaPairsGrid');
    const commoditiesGrid = document.getElementById('commoditiesGrid');
    const forexLastUpdate = document.getElementById('forexLastUpdate');

    try {
        // Show loading state
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<span>⏳</span> <span class="btn-text">Loading...</span>';
        }

        // Show skeleton loaders
        [majorGrid, nairaGrid, commoditiesGrid].forEach(grid => {
            if (grid) {
                grid.innerHTML = `
                    <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 animate-pulse">
                        <div class="h-6 bg-white/10 rounded mb-3 w-24"></div>
                        <div class="h-8 bg-white/10 rounded mb-2 w-32"></div>
                        <div class="h-4 bg-white/10 rounded w-20"></div>
                    </div>
                `.repeat(3);
            }
        });

        console.log('💱 Fetching forex data...');
        const response = await fetch('/api/forex');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch forex data');
        }

        console.log('✅ Forex data loaded:', data.data);

        // Store pairs globally
        window.allForexPairs = [];

        // Display major pairs
        if (majorGrid) {
            displayForexPairs(majorGrid, data.data.major_pairs, 'major');
        }

        // Display naira pairs
        if (nairaGrid) {
            displayForexPairs(nairaGrid, data.data.naira_pairs, 'naira');
        }

        // Display commodities
        if (commoditiesGrid) {
            displayForexPairs(commoditiesGrid, data.data.commodities, 'commodity');
        }

        // Update last refresh time
        if (forexLastUpdate) {
            forexLastUpdate.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }

        // Update forex session status
        updateForexSessions();

        // Record signals
        const allPairs = [...(data.data.major_pairs || []), ...(data.data.naira_pairs || []), ...(data.data.commodities || [])];
        if (typeof recordForexSignals === 'function') {
            recordForexSignals(allPairs);
        }

        // Display top signal
        if (typeof displayTopSignal === 'function') {
            displayTopSignal(allPairs);
        }

        // Show toast
        showToast('Forex data updated successfully', 'success');

    } catch (error) {
        console.error('❌ Forex fetch error:', error);
        if (majorGrid) {
            majorGrid.innerHTML = `
                <div class="bg-surface-card/50 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 text-center col-span-full">
                    <span class="text-4xl mb-3 block">⚠️</span>
                    <p class="text-red-400">Failed to load forex data: ${error.message}</p>
                    <button onclick="loadForexData()" class="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition-all">
                        Try Again
                    </button>
                </div>
            `;
        }
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<span>📊</span> <span class="btn-text">Analyze Markets</span>';
        }
    }
}

// ============================================
// Currency Strength Loader
// ============================================
async function loadCurrencyStrength() {
    const summaryEl = document.getElementById('strengthSummary');
    const gridEl = document.getElementById('currencyStrengthGrid');
    const opportunitiesEl = document.getElementById('strengthOpportunities');

    try {
        // Show loading state
        if (summaryEl) summaryEl.innerHTML = '<span class="animate-pulse">Loading currency strength analysis...</span>';
        if (gridEl) {
            gridEl.innerHTML = `
                <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-xl p-4 animate-pulse">
                    <div class="h-6 bg-white/10 rounded mb-2 w-16"></div>
                    <div class="h-8 bg-white/10 rounded w-24"></div>
                </div>
            `.repeat(6);
        }

        console.log('💪 Fetching currency strength...');
        const response = await fetch('/api/forex/strength');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch currency strength');
        }

        console.log('✅ Currency strength loaded:', data);

        // Update summary
        if (summaryEl && data.summary) {
            summaryEl.innerHTML = `<span class="text-emerald-400 font-medium">${data.summary}</span>`;
        }

        // Display currency strength grid
        if (gridEl && data.strengths) {
            gridEl.innerHTML = data.strengths.map((currency, index) => {
                const trendIcon = currency.trend === 'bullish' ? '📈' : currency.trend === 'bearish' ? '📉' : '➡️';
                const trendColor = currency.trend === 'bullish' ? 'text-emerald-400' : currency.trend === 'bearish' ? 'text-red-400' : 'text-slate-400';
                const scoreColor = currency.score > 20 ? 'bg-emerald-500' : currency.score < -20 ? 'bg-red-500' : 'bg-slate-500';
                const scorePercent = Math.min(100, Math.max(0, (currency.score + 100) / 2));

                return `
                    <div class="currency-item ${currency.trend} bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-xl p-4 hover:border-violet-500/30 transition-all stagger-item" style="animation-delay: ${index * 0.05}s">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-2">
                                <span class="text-2xl">${currency.flag}</span>
                                <div>
                                    <span class="font-bold text-lg">${currency.currency}</span>
                                    <span class="text-xs text-slate-500 block">${currency.name}</span>
                                </div>
                            </div>
                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${currency.trend === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' : currency.trend === 'bearish' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}">
                                #${currency.rank}
                            </span>
                        </div>
                        
                        <div class="mb-2">
                            <div class="flex items-center justify-between text-sm mb-1">
                                <span class="text-slate-400">Strength</span>
                                <span class="${trendColor} font-semibold">${currency.score > 0 ? '+' : ''}${currency.score.toFixed(1)}</span>
                            </div>
                            <div class="currency-strength-bar">
                                <div class="currency-strength-indicator" style="left: ${scorePercent}%"></div>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-slate-500">24h: <span class="${currency.change_24h >= 0 ? 'text-emerald-400' : 'text-red-400'}">${currency.change_24h >= 0 ? '+' : ''}${currency.change_24h.toFixed(2)}%</span></span>
                            <span class="${trendColor}">${trendIcon} ${currency.trend.charAt(0).toUpperCase() + currency.trend.slice(1)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Display trading opportunities
        if (opportunitiesEl && data.opportunities) {
            if (data.opportunities.length > 0) {
                opportunitiesEl.innerHTML = data.opportunities.map((opp, index) => {
                    const isBuy = opp.action === 'BUY';
                    return `
                        <div class="bg-surface-card/50 backdrop-blur-xl border ${isBuy ? 'border-emerald-500/30' : 'border-red-500/30'} rounded-xl p-4 hover:scale-[1.02] transition-all cursor-pointer stagger-item" 
                             onclick="analyzeForexPairDirect('${opp.pair}')"
                             style="animation-delay: ${index * 0.1}s">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-bold text-lg">${opp.pair}</span>
                                <span class="px-3 py-1 text-xs font-bold rounded-full ${isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}">
                                    ${opp.action}
                                </span>
                            </div>
                            <p class="text-xs text-slate-400">${opp.reason}</p>
                        </div>
                    `;
                }).join('');
            } else {
                opportunitiesEl.innerHTML = `
                    <div class="text-center text-slate-500 text-sm py-4 col-span-full">
                        No strong divergence opportunities detected. Markets are balanced.
                    </div>
                `;
            }
        }

        showToast('Currency strength updated', 'success');

    } catch (error) {
        console.error('❌ Currency strength error:', error);
        if (summaryEl) summaryEl.innerHTML = `<span class="text-red-400">Error: ${error.message}</span>`;
        if (gridEl) {
            gridEl.innerHTML = `
                <div class="bg-surface-card/50 backdrop-blur-xl border border-red-500/30 rounded-xl p-6 text-center col-span-full">
                    <span class="text-4xl mb-3 block">⚠️</span>
                    <p class="text-red-400">Failed to load currency strength</p>
                    <button onclick="loadCurrencyStrength()" class="mt-3 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition-all">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

// ============================================
// Forex Pair Analyzer
// ============================================
function initForexPairAnalyzer() {
    const popularPairsGrid = document.getElementById('popularPairsGrid');

    const popularPairs = [
        { symbol: 'EUR/USD', name: 'Euro/Dollar', flag: '🇪🇺' },
        { symbol: 'GBP/USD', name: 'Pound/Dollar', flag: '🇬🇧' },
        { symbol: 'USD/JPY', name: 'Dollar/Yen', flag: '🇯🇵' },
        { symbol: 'USD/CHF', name: 'Dollar/Franc', flag: '🇨🇭' },
        { symbol: 'AUD/USD', name: 'Aussie/Dollar', flag: '🇦🇺' },
        { symbol: 'USD/NGN', name: 'Dollar/Naira', flag: '🇳🇬' }
    ];

    if (popularPairsGrid) {
        popularPairsGrid.innerHTML = popularPairs.map(pair => `
            <button onclick="analyzeForexPairDirect('${pair.symbol}')"
                class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/30 rounded-lg text-sm font-medium transition-all flex items-center gap-2">
                <span>${pair.flag}</span>
                <span>${pair.symbol}</span>
            </button>
        `).join('');
    }
}

async function analyzeForexPair() {
    const input = document.getElementById('forexPairInput');
    const symbol = input ? input.value.trim().toUpperCase() : '';

    if (!symbol) {
        showToast('Please enter a forex pair (e.g., EUR/USD)', 'error');
        return;
    }

    // Normalize the symbol format
    let normalizedSymbol = symbol;
    if (!symbol.includes('/') && symbol.length === 6) {
        normalizedSymbol = symbol.slice(0, 3) + '/' + symbol.slice(3);
    }

    await analyzeForexPairDirect(normalizedSymbol);
}

async function analyzeForexPairDirect(symbol) {
    console.log(`📊 Analyzing forex pair: ${symbol}`);

    // Show loading modal
    showAnalysisModal(symbol, 'Loading analysis...');

    try {
        // Fetch full analysis
        const response = await fetch(`/api/analysis/full/${encodeURIComponent(symbol)}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Analysis failed');
        }

        // Display comprehensive analysis
        displayPairAnalysis(symbol, data.data);

    } catch (error) {
        console.error('❌ Pair analysis error:', error);
        showAnalysisModal(symbol, `
            <div class="text-center py-8">
                <span class="text-4xl mb-4 block">⚠️</span>
                <p class="text-red-400 mb-4">Failed to analyze ${symbol}: ${error.message}</p>
                <button onclick="closeAnalysisModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-all">
                    Close
                </button>
            </div>
        `);
    }
}

function showAnalysisModal(symbol, content) {
    let modal = document.getElementById('pairAnalysisModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pairAnalysisModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm';
        modal.onclick = (e) => { if (e.target === modal) closeAnalysisModal(); };
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="bg-surface-card border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div class="sticky top-0 bg-surface-card border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">📊</span>
                    <h2 class="text-xl font-bold">${symbol} Analysis</h2>
                </div>
                <button onclick="closeAnalysisModal()" class="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="p-6" id="analysisModalContent">
                ${content}
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeAnalysisModal() {
    const modal = document.getElementById('pairAnalysisModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function displayPairAnalysis(symbol, data) {
    const mtf = data.multi_timeframe || {};
    const sr = data.support_resistance || {};
    const backtest = data.backtest || {};
    const calendar = data.calendar_warnings || [];

    const signalsHtml = (mtf.signals || []).map(s => {
        const isBuy = s.signal.includes('Buy');
        const isSell = s.signal.includes('Sell');
        return `
            <div class="bg-white/5 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-medium">${s.timeframe}</span>
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${isBuy ? 'bg-emerald-500/20 text-emerald-400' : isSell ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}">
                        ${s.signal}
                    </span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-xs">
                    <div><span class="text-slate-500">RSI:</span> <span class="${s.rsi > 70 ? 'text-red-400' : s.rsi < 30 ? 'text-emerald-400' : ''}">${s.rsi?.toFixed(1) || '--'}</span></div>
                    <div><span class="text-slate-500">MACD:</span> <span class="${s.macd_trend === 'Bullish' ? 'text-emerald-400' : 'text-red-400'}">${s.macd_trend || '--'}</span></div>
                    <div><span class="text-slate-500">Strength:</span> ${s.signal_strength}/5</div>
                </div>
            </div>
        `;
    }).join('');

    const content = `
        <!-- Confluence Score -->
        <div class="mb-6 p-4 bg-gradient-to-r ${mtf.confluence === 'Strong' ? 'from-emerald-500/20 to-green-500/20 border-emerald-500/30' : mtf.confluence === 'Conflicting' ? 'from-red-500/20 to-orange-500/20 border-red-500/30' : 'from-violet-500/20 to-purple-500/20 border-violet-500/30'} border rounded-xl">
            <div class="flex items-center justify-between">
                <div>
                    <span class="text-sm text-slate-400">Multi-Timeframe Confluence</span>
                    <p class="text-2xl font-bold">${mtf.confluence || 'N/A'}</p>
                </div>
                <div class="text-right">
                    <span class="text-sm text-slate-400">Recommendation</span>
                    <p class="font-semibold">${mtf.recommendation || 'No clear signal'}</p>
                </div>
            </div>
        </div>
        
        <!-- Multi-Timeframe Signals -->
        <div class="mb-6">
            <h3 class="font-bold mb-3 flex items-center gap-2"><span>⏰</span> Timeframe Analysis</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                ${signalsHtml || '<p class="text-slate-500 col-span-full">No timeframe data available</p>'}
            </div>
        </div>
        
        <!-- Support/Resistance -->
        <div class="mb-6">
            <h3 class="font-bold mb-3 flex items-center gap-2"><span>🎯</span> Support & Resistance</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                    <span class="text-xs text-red-400 block mb-1">Resistance 2</span>
                    <span class="font-bold text-red-400">${sr.resistance_2?.toFixed(5) || '--'}</span>
                </div>
                <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                    <span class="text-xs text-red-400 block mb-1">Resistance 1</span>
                    <span class="font-bold text-red-400">${sr.resistance_1?.toFixed(5) || '--'}</span>
                </div>
                <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                    <span class="text-xs text-emerald-400 block mb-1">Support 1</span>
                    <span class="font-bold text-emerald-400">${sr.support_1?.toFixed(5) || '--'}</span>
                </div>
                <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                    <span class="text-xs text-emerald-400 block mb-1">Support 2</span>
                    <span class="font-bold text-emerald-400">${sr.support_2?.toFixed(5) || '--'}</span>
                </div>
            </div>
            <div class="mt-3 text-center text-sm">
                <span class="text-slate-400">Pivot Point: </span>
                <span class="font-bold">${sr.pivot?.toFixed(5) || '--'}</span>
                <span class="mx-3">|</span>
                <span class="text-slate-400">Position: </span>
                <span class="font-semibold ${sr.price_position === 'Near Support' ? 'text-emerald-400' : sr.price_position === 'Near Resistance' ? 'text-red-400' : ''}">${sr.price_position || '--'}</span>
            </div>
        </div>
        
        <!-- Backtest Results -->
        <div class="mb-6">
            <h3 class="font-bold mb-3 flex items-center gap-2"><span>📊</span> 2-Year Backtest</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-white/5 rounded-xl p-3 text-center">
                    <span class="text-xs text-slate-500 block mb-1">Win Rate</span>
                    <span class="font-bold text-xl ${backtest.win_rate >= 50 ? 'text-emerald-400' : 'text-red-400'}">${backtest.win_rate?.toFixed(1) || '--'}%</span>
                </div>
                <div class="bg-white/5 rounded-xl p-3 text-center">
                    <span class="text-xs text-slate-500 block mb-1">Total Trades</span>
                    <span class="font-bold text-xl">${backtest.total_trades || '--'}</span>
                </div>
                <div class="bg-white/5 rounded-xl p-3 text-center">
                    <span class="text-xs text-slate-500 block mb-1">Profit Factor</span>
                    <span class="font-bold text-xl ${backtest.profit_factor >= 1 ? 'text-emerald-400' : 'text-red-400'}">${backtest.profit_factor?.toFixed(2) || '--'}</span>
                </div>
                <div class="bg-white/5 rounded-xl p-3 text-center">
                    <span class="text-xs text-slate-500 block mb-1">Max Drawdown</span>
                    <span class="font-bold text-xl text-orange-400">${backtest.max_drawdown?.toFixed(1) || '--'}%</span>
                </div>
            </div>
        </div>
        
        <!-- Calendar Warnings -->
        ${calendar.length > 0 ? `
            <div class="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <h3 class="font-bold mb-2 flex items-center gap-2 text-amber-400"><span>⚠️</span> Economic Calendar Warnings</h3>
                <ul class="text-sm space-y-1">
                    ${calendar.map(w => `<li class="text-amber-300">• ${w}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        <!-- Action Buttons -->
        <div class="flex gap-3 justify-center">
            <button onclick="takeTrade('${symbol}', '${mtf.recommendation || 'Signal'}', ${sr.pivot || 0})" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                <span>⚡</span> I Took This Trade
            </button>
            <button onclick="openForexChart('${symbol}')" class="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20">
                <span>📈</span> View Chart
            </button>
            <button onclick="closeAnalysisModal()" class="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-sm transition-all">
                Close
            </button>
        </div>
    `;

    const contentEl = document.getElementById('analysisModalContent');
    if (contentEl) {
        contentEl.innerHTML = content;
    }
}

// ============================================
// Economic Calendar Modal
// ============================================
async function showEconomicCalendarModal() {
    showAnalysisModal('📅 Economic Calendar', '<div class="text-center py-8"><div class="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div><p>Loading economic events...</p></div>');

    try {
        const response = await fetch('/api/analysis/calendar');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to load calendar');
        }

        const events = data.data.events || [];
        const highImpactCount = data.data.high_impact_count || 0;
        const tradingWarnings = data.data.trading_warnings || [];

        let eventsHtml = '';
        if (events.length === 0) {
            eventsHtml = '<p class="text-center text-slate-500 py-8">No high-impact events scheduled for this week</p>';
        } else {
            eventsHtml = events.map(event => {
                const impactClass = event.impact === 'High' ? 'high-impact' : event.impact === 'Medium' ? 'medium-impact' : 'low-impact';
                const impactColor = event.impact === 'High' ? 'bg-red-500/20 text-red-400' : event.impact === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400';

                return `
                    <div class="calendar-event ${impactClass} bg-white/5 rounded-xl p-4 mb-3">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="text-xl">${event.country_flag || '🌐'}</span>
                                <span class="font-semibold">${event.event}</span>
                            </div>
                            <span class="impact-badge ${event.impact?.toLowerCase()}">${event.impact}</span>
                        </div>
                        <div class="flex items-center justify-between text-sm text-slate-400">
                            <span>${event.date} ${event.time}</span>
                            <span>Affects: ${event.currencies?.join(', ') || 'Multiple'}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        const content = `
            <!-- Summary Banner -->
            <div class="mb-6 p-4 ${highImpactCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} border rounded-xl">
                <div class="flex items-center gap-3">
                    <span class="text-3xl">${highImpactCount > 0 ? '⚠️' : '✅'}</span>
                    <div>
                        <p class="font-bold">${highImpactCount} High-Impact Events This Week</p>
                        <p class="text-sm text-slate-400">${highImpactCount > 0 ? 'Consider reducing position sizes during these events' : 'Relatively calm week ahead'}</p>
                    </div>
                </div>
            </div>
            
            ${tradingWarnings.length > 0 ? `
                <div class="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <h4 class="font-semibold text-amber-400 mb-2">⏰ Trading Warnings</h4>
                    <ul class="text-sm text-amber-300 space-y-1">
                        ${tradingWarnings.map(w => `<li>• ${w}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <!-- Events List -->
            <div class="mb-4">
                <h3 class="font-bold mb-3">Upcoming Events</h3>
                ${eventsHtml}
            </div>
            
            <p class="text-center text-xs text-slate-500 mt-4">
                ⚠️ Avoid trading during high-impact news - spreads widen and volatility increases
            </p>
        `;

        const contentEl = document.getElementById('analysisModalContent');
        if (contentEl) {
            contentEl.innerHTML = content;
        }

    } catch (error) {
        console.error('❌ Calendar error:', error);
        const contentEl = document.getElementById('analysisModalContent');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="text-center py-8">
                    <span class="text-4xl mb-4 block">⚠️</span>
                    <p class="text-red-400 mb-4">Failed to load calendar: ${error.message}</p>
                    <button onclick="closeAnalysisModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-all">
                        Close
                    </button>
                </div>
            `;
        }
    }
}

// ============================================
// Forex Sessions Status Update
// ============================================
function updateForexSessions() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const dayOfWeek = now.getUTCDay();

    // Forex market is closed on weekends
    const isWeekend = (dayOfWeek === 0 && utcHour < 22) || (dayOfWeek === 6) || (dayOfWeek === 5 && utcHour >= 22);

    // Session times in UTC
    const sessions = {
        sydney: { open: 22, close: 7, element: 'sydneyStatus', card: 'sydneySession' },
        tokyo: { open: 0, close: 9, element: 'tokyoStatus', card: 'tokyoSession' },
        london: { open: 8, close: 17, element: 'londonStatus', card: 'londonSession' },
        ny: { open: 13, close: 22, element: 'nyStatus', card: 'nySession' }
    };

    const openSessions = [];

    Object.entries(sessions).forEach(([name, session]) => {
        const statusEl = document.getElementById(session.element);
        const cardEl = document.getElementById(session.card);

        if (!statusEl || !cardEl) return;

        let isOpen = false;

        if (!isWeekend) {
            if (session.open < session.close) {
                // Normal session (doesn't cross midnight)
                isOpen = utcHour >= session.open && utcHour < session.close;
            } else {
                // Session crosses midnight (e.g., Sydney)
                isOpen = utcHour >= session.open || utcHour < session.close;
            }
        }

        if (isOpen) {
            openSessions.push(name.charAt(0).toUpperCase() + name.slice(1));
            statusEl.textContent = 'OPEN';
            statusEl.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400';
            cardEl.classList.add('session-open');
            cardEl.classList.remove('session-closed');
        } else {
            statusEl.textContent = isWeekend ? 'WEEKEND' : 'CLOSED';
            statusEl.className = `px-2 py-1 text-xs font-semibold rounded-full ${isWeekend ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`;
            cardEl.classList.remove('session-open');
            cardEl.classList.add('session-closed');
        }
    });

    // Update session overlap banner
    const overlapBanner = document.getElementById('sessionOverlap');
    if (overlapBanner) {
        if (openSessions.length >= 2) {
            overlapBanner.classList.remove('hidden');
            overlapBanner.innerHTML = `
                <span class="text-lg">🔥</span>
                <span class="text-sm font-medium">${openSessions.join(' & ')} overlap - Optimal trading conditions!</span>
            `;
        } else if (openSessions.length === 1) {
            overlapBanner.classList.add('hidden');
        } else {
            overlapBanner.classList.add('hidden');
        }
    }
}

// ============================================
// Toast Notification Helper
// ============================================
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    // Use CSS spinner for loading/info, icons for success/error
    if (type === 'info' || type === 'loading') {
        toast.innerHTML = `<span class="toast-spinner"></span> ${message}`;
    } else if (type === 'success') {
        toast.innerHTML = `<svg class="w-4 h-4 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>${message}`;
    } else if (type === 'error') {
        toast.innerHTML = `<svg class="w-4 h-4 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>${message}`;
    } else {
        toast.textContent = message;
    }
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// Account Type Selection (for settings)
// ============================================
function selectAccountType(type, button) {
    const currentType = localStorage.getItem('mma_account_type') || 'both';

    // Update button selection visually
    document.querySelectorAll('.account-type-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');

    // If selecting a different type, show confirmation
    if (type !== currentType) {
        selectedNewAccountType = type;
        showAccountTypeConfirmation();
    } else {
        selectedNewAccountType = null;
        hideAccountTypeConfirmation();
    }
}

function showAccountTypeConfirmation() {
    const confirmSection = document.getElementById('accountTypeConfirmation');
    if (confirmSection) {
        confirmSection.classList.remove('hidden');
        // Generate new captcha
        captchaNum1 = Math.floor(Math.random() * 9) + 1;
        captchaNum2 = Math.floor(Math.random() * 9) + 1;
        const captchaQuestion = document.getElementById('captchaQuestion');
        if (captchaQuestion) {
            captchaQuestion.textContent = `${captchaNum1} + ${captchaNum2}`;
        }
    }
}

function hideAccountTypeConfirmation() {
    const confirmSection = document.getElementById('accountTypeConfirmation');
    if (confirmSection) {
        confirmSection.classList.add('hidden');
    }
}

function cancelAccountTypeChange() {
    selectedNewAccountType = null;
    hideAccountTypeConfirmation();

    // Reset button selection to current type
    const currentType = localStorage.getItem('mma_account_type') || 'both';
    document.querySelectorAll('.account-type-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.type === currentType) {
            btn.classList.add('selected');
        }
    });
}

// ============================================
// Initialize on DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Apply role-based filtering
    applyRoleBasedFiltering();

    // Initialize forex pair analyzer popular pairs
    initForexPairAnalyzer();

    // Update forex sessions every second
    setInterval(updateForexSessions, 1000);
    updateForexSessions();

    // Load settings page when navigating to settings
    const settingsLink = document.querySelector('[data-page="settings"]');
    if (settingsLink) {
        settingsLink.addEventListener('click', loadSettingsPage);
    }
});

// ============================================
// Expose Functions Globally
// ============================================
window.loadForexData = loadForexData;
window.loadCurrencyStrength = loadCurrencyStrength;
window.analyzeForexPair = analyzeForexPair;
window.analyzeForexPairDirect = analyzeForexPairDirect;
window.closeAnalysisModal = closeAnalysisModal;
window.showEconomicCalendarModal = showEconomicCalendarModal;
window.selectAccountType = selectAccountType;
window.cancelAccountTypeChange = cancelAccountTypeChange;
window.showToast = showToast;

// ============================================
// QUANTITATIVE ANALYSIS FUNCTIONS
// ============================================

// Fetch full quant analysis for a symbol
async function fetchQuantAnalysis(symbol) {
    try {
        const response = await fetch(`/api/quant/full/${encodeURIComponent(symbol)}`);
        const result = await response.json();
        if (result.success) {
            return result.data;
        }
        throw new Error(result.detail || 'Failed to fetch quant analysis');
    } catch (error) {
        console.error('Quant analysis error:', error);
        return null;
    }
}

// Display Fibonacci levels in UI
function displayFibonacciLevels(fibonacci, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !fibonacci) return;

    const trendColor = fibonacci.trend === 'uptrend' ? 'text-emerald-400' : 'text-red-400';
    const trendIcon = fibonacci.trend === 'uptrend' ? '📈' : '📉';

    container.innerHTML = `
        <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-bold flex items-center gap-2">
                    <span>📐</span> Fibonacci Levels
                </h4>
                <span class="px-2 py-1 rounded-lg text-xs font-medium ${fibonacci.signal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : fibonacci.signal === 'SELL' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}">
                    ${fibonacci.signal}
                </span>
            </div>
            
            <div class="flex items-center gap-2 mb-3 text-sm">
                <span>${trendIcon}</span>
                <span class="${trendColor} font-medium">${fibonacci.trend.toUpperCase()}</span>
                <span class="text-slate-500">|</span>
                <span class="text-slate-400">Near ${fibonacci.nearest_level}</span>
            </div>
            
            <div class="space-y-2 text-xs">
                <div class="flex justify-between items-center">
                    <span class="text-red-400">R3 (261.8%)</span>
                    <span class="font-mono">${fibonacci.fib_ext_2618?.toFixed(5) || '-'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-red-400">R2 (161.8%)</span>
                    <span class="font-mono">${fibonacci.fib_ext_1618?.toFixed(5) || '-'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-amber-400">R1 (127.2%)</span>
                    <span class="font-mono">${fibonacci.fib_ext_1272?.toFixed(5) || '-'}</span>
                </div>
                <div class="flex justify-between items-center bg-violet-500/10 rounded px-2 py-1">
                    <span class="text-violet-400 font-medium">0% (Swing)</span>
                    <span class="font-mono">${fibonacci.fib_0?.toFixed(5) || '-'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">23.6%</span>
                    <span class="font-mono">${fibonacci.fib_236?.toFixed(5) || '-'}</span>
                </div>
                <div class="flex justify-between items-center bg-amber-500/10 rounded px-2 py-1">
                    <span class="text-amber-400 font-medium">38.2%</span>
                    <span class="font-mono">${fibonacci.fib_382?.toFixed(5) || '-'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">50%</span>
                    <span class="font-mono">${fibonacci.fib_50?.toFixed(5) || '-'}</span>
                </div>
                <div class="flex justify-between items-center bg-emerald-500/10 rounded px-2 py-1">
                    <span class="text-emerald-400 font-medium">61.8% (Golden)</span>
                    <span class="font-mono">${fibonacci.fib_618?.toFixed(5) || '-'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">78.6%</span>
                    <span class="font-mono">${fibonacci.fib_786?.toFixed(5) || '-'}</span>
                </div>
                <div class="flex justify-between items-center bg-violet-500/10 rounded px-2 py-1">
                    <span class="text-violet-400 font-medium">100% (Swing)</span>
                    <span class="font-mono">${fibonacci.fib_100?.toFixed(5) || '-'}</span>
                </div>
            </div>
            
            <p class="text-xs text-slate-400 mt-3 leading-relaxed">${fibonacci.recommendation}</p>
        </div>
    `;
}

// Display Bollinger Bands in UI
function displayBollingerBands(bollinger, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !bollinger) return;

    const signalColor = {
        'STRONG_BUY': 'bg-emerald-500/20 text-emerald-400',
        'BUY': 'bg-emerald-500/20 text-emerald-400',
        'NEUTRAL': 'bg-slate-500/20 text-slate-400',
        'SELL': 'bg-red-500/20 text-red-400',
        'STRONG_SELL': 'bg-red-500/20 text-red-400'
    }[bollinger.signal] || 'bg-slate-500/20 text-slate-400';

    const volatilityColor = {
        'extreme': 'text-red-400',
        'high': 'text-amber-400',
        'normal': 'text-slate-400',
        'low': 'text-sky-400'
    }[bollinger.volatility] || 'text-slate-400';

    // Calculate %B position for visual bar
    const percentB = Math.max(0, Math.min(100, bollinger.percent_b * 100));

    container.innerHTML = `
        <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-bold flex items-center gap-2">
                    <span>📊</span> Bollinger Bands
                </h4>
                <span class="px-2 py-1 rounded-lg text-xs font-medium ${signalColor}">
                    ${bollinger.signal.replace('_', ' ')}
                </span>
            </div>
            
            ${bollinger.is_squeeze ? `
                <div class="bg-amber-500/20 border border-amber-500/30 rounded-lg p-2 mb-3 flex items-center gap-2">
                    <span>⚠️</span>
                    <span class="text-amber-400 text-xs font-medium">SQUEEZE DETECTED (${bollinger.squeeze_intensity}) - Breakout imminent!</span>
                </div>
            ` : ''}
            
            <div class="space-y-3 text-sm">
                <div class="flex justify-between items-center">
                    <span class="text-red-400">Upper Band</span>
                    <span class="font-mono">${bollinger.upper_band?.toFixed(5)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">Middle (SMA20)</span>
                    <span class="font-mono">${bollinger.middle_band?.toFixed(5)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-emerald-400">Lower Band</span>
                    <span class="font-mono">${bollinger.lower_band?.toFixed(5)}</span>
                </div>
            </div>
            
            <!-- %B Visual Bar -->
            <div class="mt-4">
                <div class="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Oversold</span>
                    <span>%B: ${(bollinger.percent_b * 100).toFixed(1)}%</span>
                    <span>Overbought</span>
                </div>
                <div class="h-3 bg-slate-700 rounded-full relative overflow-hidden">
                    <div class="absolute inset-0 flex">
                        <div class="w-1/5 bg-emerald-500/30"></div>
                        <div class="w-3/5 bg-slate-600/30"></div>
                        <div class="w-1/5 bg-red-500/30"></div>
                    </div>
                    <div class="absolute top-0 h-full w-2 bg-white rounded-full shadow-lg transition-all" 
                         style="left: calc(${percentB}% - 4px)"></div>
                </div>
            </div>
            
            <div class="flex justify-between mt-3 text-xs">
                <div>
                    <span class="text-slate-500">Bandwidth:</span>
                    <span class="${volatilityColor} font-medium ml-1">${bollinger.bandwidth?.toFixed(2)}%</span>
                </div>
                <div>
                    <span class="text-slate-500">Volatility:</span>
                    <span class="${volatilityColor} font-medium ml-1">${bollinger.volatility?.toUpperCase()}</span>
                </div>
            </div>
        </div>
    `;
}

// Display Mean Reversion in UI
function displayMeanReversion(mr, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !mr) return;

    const signalColor = {
        'STRONG_BUY': 'bg-emerald-500/20 text-emerald-400',
        'BUY': 'bg-emerald-500/20 text-emerald-400',
        'NEUTRAL': 'bg-slate-500/20 text-slate-400',
        'SELL': 'bg-red-500/20 text-red-400',
        'STRONG_SELL': 'bg-red-500/20 text-red-400'
    }[mr.signal] || 'bg-slate-500/20 text-slate-400';

    const zscoreColor = mr.zscore > 2 ? 'text-red-400' : mr.zscore < -2 ? 'text-emerald-400' : 'text-slate-400';
    const zscorePosition = Math.max(0, Math.min(100, (mr.zscore + 3) / 6 * 100));

    container.innerHTML = `
        <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-bold flex items-center gap-2">
                    <span>🔄</span> Mean Reversion
                </h4>
                <span class="px-2 py-1 rounded-lg text-xs font-medium ${signalColor}">
                    ${mr.signal.replace('_', ' ')}
                </span>
            </div>
            
            ${mr.rsi_divergence ? `
                <div class="bg-violet-500/20 border border-violet-500/30 rounded-lg p-2 mb-3 flex items-center gap-2">
                    <span>${mr.rsi_divergence === 'bullish_divergence' ? '📈' : '📉'}</span>
                    <span class="text-violet-400 text-xs font-medium">${mr.rsi_divergence.replace('_', ' ').toUpperCase()} detected!</span>
                </div>
            ` : ''}
            
            <!-- Z-Score Visual -->
            <div class="mb-4">
                <div class="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Oversold (-3σ)</span>
                    <span class="${zscoreColor} font-medium">Z: ${mr.zscore?.toFixed(2)}</span>
                    <span>Overbought (+3σ)</span>
                </div>
                <div class="h-3 bg-slate-700 rounded-full relative overflow-hidden">
                    <div class="absolute inset-0 flex">
                        <div class="w-1/6 bg-emerald-500/40"></div>
                        <div class="w-1/6 bg-emerald-500/20"></div>
                        <div class="w-2/6 bg-slate-600/30"></div>
                        <div class="w-1/6 bg-red-500/20"></div>
                        <div class="w-1/6 bg-red-500/40"></div>
                    </div>
                    <div class="absolute top-0 h-full w-2 bg-white rounded-full shadow-lg transition-all" 
                         style="left: calc(${zscorePosition}% - 4px)"></div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="bg-slate-800/50 rounded-lg p-2">
                    <div class="text-slate-500 text-xs">Deviation SMA20</div>
                    <div class="font-bold ${mr.deviation_sma20_pct > 0 ? 'text-red-400' : 'text-emerald-400'}">
                        ${mr.deviation_sma20_pct > 0 ? '+' : ''}${mr.deviation_sma20_pct?.toFixed(2)}%
                    </div>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-2">
                    <div class="text-slate-500 text-xs">Half-Life</div>
                    <div class="font-bold">${mr.half_life_days ? mr.half_life_days + ' days' : 'N/A'}</div>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-2">
                    <div class="text-slate-500 text-xs">Reversion Prob</div>
                    <div class="font-bold text-violet-400">${mr.reversion_probability}%</div>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-2">
                    <div class="text-slate-500 text-xs">RSI</div>
                    <div class="font-bold ${mr.rsi > 70 ? 'text-red-400' : mr.rsi < 30 ? 'text-emerald-400' : ''}">${mr.rsi?.toFixed(1)}</div>
                </div>
            </div>
            
            <div class="mt-3 px-2 py-1 bg-slate-800/50 rounded text-xs">
                <span class="text-slate-500">Confidence:</span>
                <span class="ml-1 font-medium ${mr.confidence === 'high' ? 'text-emerald-400' : mr.confidence === 'medium' ? 'text-amber-400' : 'text-slate-400'}">
                    ${mr.confidence?.toUpperCase()}
                </span>
            </div>
        </div>
    `;
}

// Display Monte Carlo Simulation in UI
function displayMonteCarlo(mc, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !mc) return;

    const bullish = mc.prob_above_current > 55;
    const bearish = mc.prob_above_current < 45;

    container.innerHTML = `
        <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-bold flex items-center gap-2">
                    <span>🎲</span> Monte Carlo (${mc.simulation_days}d)
                </h4>
                <span class="px-2 py-1 rounded-lg text-xs font-medium ${bullish ? 'bg-emerald-500/20 text-emerald-400' : bearish ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}">
                    ${mc.prob_above_current?.toFixed(0)}% Bullish
                </span>
            </div>
            
            <!-- Price Distribution Visual -->
            <div class="relative h-16 mb-4 bg-slate-800/50 rounded-lg overflow-hidden">
                <div class="absolute inset-0 flex items-end px-2">
                    <!-- 5th percentile -->
                    <div class="flex-1 flex flex-col items-center">
                        <div class="w-full bg-red-500/30 rounded-t" style="height: 20%"></div>
                        <span class="text-[10px] text-red-400 mt-1">${mc.percentile_5?.toFixed(2)}</span>
                    </div>
                    <!-- 25th percentile -->
                    <div class="flex-1 flex flex-col items-center">
                        <div class="w-full bg-amber-500/30 rounded-t" style="height: 40%"></div>
                        <span class="text-[10px] text-amber-400 mt-1">${mc.percentile_25?.toFixed(2)}</span>
                    </div>
                    <!-- Mean -->
                    <div class="flex-1 flex flex-col items-center">
                        <div class="w-full bg-violet-500/50 rounded-t" style="height: 70%"></div>
                        <span class="text-[10px] text-violet-400 mt-1 font-bold">${mc.mean_price?.toFixed(2)}</span>
                    </div>
                    <!-- 75th percentile -->
                    <div class="flex-1 flex flex-col items-center">
                        <div class="w-full bg-emerald-500/30 rounded-t" style="height: 40%"></div>
                        <span class="text-[10px] text-emerald-400 mt-1">${mc.percentile_75?.toFixed(2)}</span>
                    </div>
                    <!-- 95th percentile -->
                    <div class="flex-1 flex flex-col items-center">
                        <div class="w-full bg-emerald-500/30 rounded-t" style="height: 20%"></div>
                        <span class="text-[10px] text-emerald-400 mt-1">${mc.percentile_95?.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-2 text-xs">
                <div class="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div class="text-slate-500">Expected</div>
                    <div class="font-bold ${mc.expected_return_pct > 0 ? 'text-emerald-400' : 'text-red-400'}">
                        ${mc.expected_return_pct > 0 ? '+' : ''}${mc.expected_return_pct?.toFixed(2)}%
                    </div>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div class="text-slate-500">VaR (95%)</div>
                    <div class="font-bold text-red-400">-${Math.abs(mc.var_95)?.toFixed(2)}</div>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div class="text-slate-500">Sharpe</div>
                    <div class="font-bold ${mc.sharpe_estimate > 1 ? 'text-emerald-400' : mc.sharpe_estimate > 0 ? 'text-amber-400' : 'text-red-400'}">
                        ${mc.sharpe_estimate?.toFixed(2)}
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div class="flex justify-between bg-emerald-500/10 rounded px-2 py-1">
                    <span class="text-slate-400">+10% Prob:</span>
                    <span class="text-emerald-400 font-medium">${mc.prob_gain_10_pct?.toFixed(1)}%</span>
                </div>
                <div class="flex justify-between bg-red-500/10 rounded px-2 py-1">
                    <span class="text-slate-400">-10% Prob:</span>
                    <span class="text-red-400 font-medium">${mc.prob_loss_10_pct?.toFixed(1)}%</span>
                </div>
            </div>
            
            <p class="text-xs text-slate-400 mt-3 leading-relaxed">${mc.recommendation}</p>
        </div>
    `;
}

// Display combined quant analysis summary
function displayQuantSummary(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !data) return;

    const signalColors = {
        'STRONG_BUY': { bg: 'bg-emerald-500', text: 'text-white', glow: 'shadow-emerald-500/50' },
        'BUY': { bg: 'bg-emerald-500/80', text: 'text-white', glow: 'shadow-emerald-500/30' },
        'NEUTRAL': { bg: 'bg-slate-500', text: 'text-white', glow: '' },
        'SELL': { bg: 'bg-red-500/80', text: 'text-white', glow: 'shadow-red-500/30' },
        'STRONG_SELL': { bg: 'bg-red-500', text: 'text-white', glow: 'shadow-red-500/50' }
    };
    const colors = signalColors[data.combined_signal] || signalColors['NEUTRAL'];

    container.innerHTML = `
        <div class="bg-gradient-to-br from-violet-900/30 to-indigo-900/30 border border-violet-500/20 rounded-2xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold flex items-center gap-2">
                    <span>🧠</span> AI Quant Analysis
                </h3>
                <span class="text-xs text-slate-500">${data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : ''}</span>
            </div>
            
            <!-- Combined Signal Badge -->
            <div class="flex items-center gap-4 mb-6">
                <div class="${colors.bg} ${colors.glow} shadow-lg px-6 py-3 rounded-xl">
                    <div class="text-xs ${colors.text} opacity-80">Combined Signal</div>
                    <div class="text-2xl font-bold ${colors.text}">${data.combined_signal?.replace('_', ' ')}</div>
                </div>
                
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-sm text-slate-400">Strength</span>
                        <span class="font-bold">${data.combined_strength}/10</span>
                    </div>
                    <div class="h-3 bg-slate-700 rounded-full overflow-hidden">
                        <div class="h-full ${colors.bg} rounded-full transition-all" style="width: ${data.combined_strength * 10}%"></div>
                    </div>
                    <div class="text-right text-xs mt-1">
                        <span class="text-slate-500">Confidence:</span>
                        <span class="${data.confidence_level === 'high' ? 'text-emerald-400' : data.confidence_level === 'medium' ? 'text-amber-400' : 'text-slate-400'} font-medium ml-1">
                            ${data.confidence_level?.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Individual Signals Grid -->
            <div class="grid grid-cols-4 gap-2 mb-4">
                <div class="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div class="text-lg mb-1">📐</div>
                    <div class="text-[10px] text-slate-500">Fibonacci</div>
                    <div class="text-xs font-bold">${data.fibonacci?.signal || '-'}</div>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div class="text-lg mb-1">📊</div>
                    <div class="text-[10px] text-slate-500">Bollinger</div>
                    <div class="text-xs font-bold">${data.bollinger?.signal?.replace('_', ' ') || '-'}</div>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div class="text-lg mb-1">🔄</div>
                    <div class="text-[10px] text-slate-500">Mean Rev</div>
                    <div class="text-xs font-bold">${data.mean_reversion?.signal?.replace('_', ' ') || '-'}</div>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div class="text-lg mb-1">🎲</div>
                    <div class="text-[10px] text-slate-500">Monte Carlo</div>
                    <div class="text-xs font-bold ${data.monte_carlo?.prob_above_current > 55 ? 'text-emerald-400' : data.monte_carlo?.prob_above_current < 45 ? 'text-red-400' : ''}">${data.monte_carlo?.prob_above_current?.toFixed(0)}%</div>
                </div>
            </div>
            
            <p class="text-sm text-slate-300 leading-relaxed">${data.recommendation || ''}</p>
        </div>
    `;
}

// Full quant analysis modal
async function showQuantAnalysisModal(symbol) {
    showToast('Loading quant analysis...', 'info');

    const data = await fetchQuantAnalysis(symbol);
    if (!data) {
        showToast('Failed to load quant analysis', 'error');
        return;
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'quantModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeQuantModal()"></div>
        <div class="relative bg-surface-card border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-surface-card/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between z-10">
                <h2 class="text-xl font-bold flex items-center gap-3">
                    <span>🧠</span>
                    <span>Quant Analysis: ${symbol}</span>
                </h2>
                <button onclick="closeQuantModal()" class="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <div class="p-6 space-y-6">
                <!-- Summary -->
                <div id="quantSummarySection"></div>
                
                <!-- Detailed Analysis Grid -->
                <div class="grid md:grid-cols-2 gap-6">
                    <div id="fibonacciSection"></div>
                    <div id="bollingerSection"></div>
                    <div id="meanReversionSection"></div>
                    <div id="monteCarloSection"></div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Populate sections
    displayQuantSummary(data, 'quantSummarySection');
    displayFibonacciLevels(data.fibonacci, 'fibonacciSection');
    displayBollingerBands(data.bollinger, 'bollingerSection');
    displayMeanReversion(data.mean_reversion, 'meanReversionSection');
    displayMonteCarlo(data.monte_carlo, 'monteCarloSection');
}

function closeQuantModal() {
    const modal = document.getElementById('quantModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Enhanced pair analysis with quant data
async function enhancedPairAnalysis(symbol) {
    try {
        // Fetch both regular and quant analysis in parallel
        const [regularResponse, quantData] = await Promise.all([
            fetch(`/api/analysis/full/${encodeURIComponent(symbol)}`).then(r => r.json()),
            fetchQuantAnalysis(symbol)
        ]);

        return {
            regular: regularResponse.success ? regularResponse : null,
            quant: quantData
        };
    } catch (error) {
        console.error('Enhanced analysis error:', error);
        return { regular: null, quant: null };
    }
}

// Stock search with quant analysis
async function searchStockWithQuant(symbol) {
    showToast(`Analyzing ${symbol}...`, 'info');

    try {
        const [stockResponse, quantData] = await Promise.all([
            fetch(`/api/stock/full/${encodeURIComponent(symbol)}`).then(r => r.json()),
            fetchQuantAnalysis(symbol)
        ]);

        if (!stockResponse.success) {
            showToast(`Stock ${symbol} not found`, 'error');
            return;
        }

        // Show combined modal
        showStockQuantModal(stockResponse, quantData);

    } catch (error) {
        showToast('Analysis failed: ' + error.message, 'error');
    }
}

function showStockQuantModal(stockData, quantData) {
    const stock = stockData.stock_data;

    const modal = document.createElement('div');
    modal.id = 'stockQuantModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeStockQuantModal()"></div>
        <div class="relative bg-surface-card border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-surface-card/95 backdrop-blur-xl border-b border-white/10 p-4 z-10">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
                            <span class="text-2xl">📈</span>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold">${stock.symbol} - ${stock.name}</h2>
                            <div class="flex items-center gap-3 text-sm">
                                <span class="font-mono text-lg">$${stock.price?.toFixed(2)}</span>
                                <span class="${stock.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                                    ${stock.change_pct >= 0 ? '+' : ''}${stock.change_pct?.toFixed(2)}%
                                </span>
                                ${stock.sector ? `<span class="text-slate-500">| ${stock.sector}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <button onclick="closeStockQuantModal()" class="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="p-6 space-y-6">
                <!-- Quant Summary -->
                ${quantData ? `<div id="stockQuantSummary"></div>` : ''}
                
                <!-- Technical Signal -->
                <div class="bg-surface-hover/50 rounded-xl p-4">
                    <h3 class="font-bold mb-3 flex items-center gap-2"><span>📊</span> Technical Analysis</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div class="bg-slate-800/50 rounded-lg p-3">
                            <div class="text-slate-500">RSI (14)</div>
                            <div class="font-bold text-lg ${stock.technicals?.rsi > 70 ? 'text-red-400' : stock.technicals?.rsi < 30 ? 'text-emerald-400' : ''}">${stock.technicals?.rsi?.toFixed(1) || '-'}</div>
                        </div>
                        <div class="bg-slate-800/50 rounded-lg p-3">
                            <div class="text-slate-500">MACD</div>
                            <div class="font-bold ${stock.technicals?.macd_trend === 'bullish' ? 'text-emerald-400' : 'text-red-400'}">${stock.technicals?.macd_trend?.toUpperCase() || '-'}</div>
                        </div>
                        <div class="bg-slate-800/50 rounded-lg p-3">
                            <div class="text-slate-500">Signal</div>
                            <div class="font-bold">${stock.technicals?.signal || '-'}</div>
                        </div>
                        <div class="bg-slate-800/50 rounded-lg p-3">
                            <div class="text-slate-500">Strength</div>
                            <div class="font-bold">${stock.technicals?.signal_strength || '-'}/5</div>
                        </div>
                    </div>
                </div>
                
                <!-- Quant Details -->
                ${quantData ? `
                    <div class="grid md:grid-cols-2 gap-6">
                        <div id="stockFibonacci"></div>
                        <div id="stockBollinger"></div>
                        <div id="stockMeanReversion"></div>
                        <div id="stockMonteCarlo"></div>
                    </div>
                ` : ''}
                
                <!-- Recommendation -->
                <div class="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                    <h3 class="font-bold mb-2">📋 Recommendation</h3>
                    <p class="text-slate-300">${stock.recommendation || stock.analysis || 'No recommendation available'}</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Populate quant sections if available
    if (quantData) {
        displayQuantSummary(quantData, 'stockQuantSummary');
        displayFibonacciLevels(quantData.fibonacci, 'stockFibonacci');
        displayBollingerBands(quantData.bollinger, 'stockBollinger');
        displayMeanReversion(quantData.mean_reversion, 'stockMeanReversion');
        displayMonteCarlo(quantData.monte_carlo, 'stockMonteCarlo');
    }
}

function closeStockQuantModal() {
    const modal = document.getElementById('stockQuantModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Expose quant functions globally
window.fetchQuantAnalysis = fetchQuantAnalysis;
window.showQuantAnalysisModal = showQuantAnalysisModal;
window.closeQuantModal = closeQuantModal;
window.searchStockWithQuant = searchStockWithQuant;
window.closeStockQuantModal = closeStockQuantModal;
window.displayFibonacciLevels = displayFibonacciLevels;
window.displayBollingerBands = displayBollingerBands;
window.displayMeanReversion = displayMeanReversion;
window.displayMonteCarlo = displayMonteCarlo;
window.displayQuantSummary = displayQuantSummary;

// Quick quant analysis from input field
function runQuickQuantAnalysis() {
    const input = document.getElementById('quantSymbolInput');
    let symbol = input ? input.value.trim().toUpperCase() : '';

    if (!symbol) {
        symbol = 'AAPL'; // Default to AAPL
    }

    // Normalize forex symbols
    if (symbol.includes('/')) {
        symbol = symbol.replace('/', '') + '=X';
    }

    showQuantAnalysisModal(symbol);
}

// Show individual quant tool modal
async function showQuantToolModal(tool) {
    const input = document.getElementById('quantSymbolInput');
    let symbol = input ? input.value.trim().toUpperCase() : 'AAPL';

    // Normalize forex symbols
    if (symbol.includes('/')) {
        symbol = symbol.replace('/', '') + '=X';
    }

    showToast(`Loading ${tool} analysis for ${symbol}...`, 'info');

    try {
        let endpoint = '';
        let title = '';
        let displayFn = null;

        switch (tool) {
            case 'fibonacci':
                endpoint = `/api/quant/fibonacci/${encodeURIComponent(symbol)}`;
                title = `📐 Fibonacci Analysis - ${symbol}`;
                displayFn = displayFibonacciLevels;
                break;
            case 'bollinger':
                endpoint = `/api/quant/bollinger/${encodeURIComponent(symbol)}`;
                title = `📊 Bollinger Bands - ${symbol}`;
                displayFn = displayBollingerBands;
                break;
            case 'meanreversion':
                endpoint = `/api/quant/mean-reversion/${encodeURIComponent(symbol)}`;
                title = `🔄 Mean Reversion - ${symbol}`;
                displayFn = displayMeanReversion;
                break;
            case 'montecarlo':
                endpoint = `/api/quant/monte-carlo/${encodeURIComponent(symbol)}`;
                title = `🎲 Monte Carlo Simulation - ${symbol}`;
                displayFn = displayMonteCarlo;
                break;
            default:
                showQuantAnalysisModal(symbol);
                return;
        }

        const response = await fetch(endpoint);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.detail || 'Analysis failed');
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'singleQuantModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeSingleQuantModal()"></div>
            <div class="relative bg-surface-card border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div class="sticky top-0 bg-surface-card/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between z-10">
                    <h2 class="text-lg font-bold">${title}</h2>
                    <button onclick="closeSingleQuantModal()" class="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="p-4" id="singleQuantContent"></div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Display the data
        displayFn(result.data, 'singleQuantContent');

    } catch (error) {
        showToast('Analysis failed: ' + error.message, 'error');
    }
}

function closeSingleQuantModal() {
    const modal = document.getElementById('singleQuantModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Expose new functions globally
window.runQuickQuantAnalysis = runQuickQuantAnalysis;
window.showQuantToolModal = showQuantToolModal;
window.closeSingleQuantModal = closeSingleQuantModal;


// ============================================
// Signal Recording & Trading Functions
// ============================================

// Record signals to backend automagically
async function recordForexSignals(pairs) {
    if (!pairs || !Array.isArray(pairs)) return;

    // Process in chunks to avoid overwhelming the server/browser
    const interestingPairs = pairs.filter(p =>
        p.technicals && (p.technicals.signal_strength >= 4 || p.technicals.signal_strength <= 2)
    );

    for (const pair of interestingPairs) {
        try {
            const isBuy = pair.technicals.signal.includes('Buy');
            const strength = pair.technicals.signal_strength || (isBuy ? 5 : 1);

            // Fire and forget - don't await response to keep UI snappy
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
            }).catch(err => console.error('Signal record error:', err));

        } catch (e) {
            console.error('Failed to record signal:', e);
        }
    }
}

// Display top signal in the dashboard
function displayTopSignal(pairs) {
    const signalContainer = document.getElementById('topSignalContainer');
    if (!signalContainer || !pairs || pairs.length === 0) return;

    // Find the strongest signal
    const sortedPairs = [...pairs].sort((a, b) => {
        const strA = a.technicals?.signal_strength || 0;
        const strB = b.technicals?.signal_strength || 0;
        // Prioritize strength 5 and 1 (strong buy/sell)
        const scoreA = strA === 5 || strA === 1 ? 10 : 0;
        const scoreB = strB === 5 || strB === 1 ? 10 : 0;
        return scoreB - scoreA;
    });

    const best = sortedPairs[0];
    if (!best || !best.technicals) return;

    const isBuy = best.technicals.signal.includes('Buy');

    // Auto-update the "Active Signals" card if it exists
    const activeSignalsGrid = document.getElementById('activeSignalsGrid');
    if (activeSignalsGrid) {
        activeSignalsGrid.innerHTML = `
            <div class="bg-surface-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden group cursor-pointer"
                 onclick="analyzeForexPairDirect('${best.symbol}')">
                <div class="absolute top-0 right-0 p-4 opacity-50 text-6xl transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                    ${isBuy ? '📈' : '📉'}
                </div>
                <div class="relative z-10">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-bold">${best.symbol}</h3>
                        <span class="px-3 py-1 rounded-full text-xs font-bold ${isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}">
                            ${best.technicals.signal}
                        </span>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-slate-500 text-xs">Price</p>
                            <p class="font-mono font-bold">${best.price}</p>
                        </div>
                        <div>
                            <p class="text-slate-500 text-xs">RSI</p>
                            <p class="font-mono ${best.technicals.rsi > 70 ? 'text-red-400' : best.technicals.rsi < 30 ? 'text-emerald-400' : 'text-slate-300'}">${best.technicals.rsi.toFixed(1)}</p>
                        </div>
                    </div>
                    <button class="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all">
                        View Analysis
                    </button>
                </div>
            </div>
        `;
    }
}

// User Action: Take Trade
async function takeTrade(symbol, signal, price) {
    showToast('Recording trade...', 'info');

    try {
        const response = await fetch('/api/telegram/trade-taken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                symbol: symbol,
                signal: signal,
                price: parseFloat(price)
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Trade recorded! Telegram alert sent.', 'success');
        } else {
            showToast('Failed to send alert: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Trade record error:', error);
        showToast('Error recording trade', 'error');
    }
}

// Expose functions specially
window.recordForexSignals = recordForexSignals;
window.displayTopSignal = displayTopSignal;
window.takeTrade = takeTrade;

// ============================================
// Charts Page Functions
// ============================================

let currentChartSymbol = '';
let currentChartTimeframe = 'D'; // Default to Daily

// Symbol mapping for TradingView
const chartSymbolMap = {
    'EUR/USD': 'FX:EURUSD',
    'EURUSD': 'FX:EURUSD',
    'GBP/USD': 'FX:GBPUSD',
    'GBPUSD': 'FX:GBPUSD',
    'USD/JPY': 'FX:USDJPY',
    'USDJPY': 'FX:USDJPY',
    'AUD/USD': 'FX:AUDUSD',
    'AUDUSD': 'FX:AUDUSD',
    'USD/CHF': 'FX:USDCHF',
    'USDCHF': 'FX:USDCHF',
    'EUR/GBP': 'FX:EURGBP',
    'EURGBP': 'FX:EURGBP',
    'GBP/JPY': 'FX:GBPJPY',
    'GBPJPY': 'FX:GBPJPY',
    'EUR/JPY': 'FX:EURJPY',
    'EURJPY': 'FX:EURJPY',
    'USD/CAD': 'FX:USDCAD',
    'USDCAD': 'FX:USDCAD',
    'NZD/USD': 'FX:NZDUSD',
    'NZDUSD': 'FX:NZDUSD',
    // Commodities
    'XAUUSD': 'OANDA:XAUUSD',
    'XAU/USD': 'OANDA:XAUUSD',
    'GOLD': 'OANDA:XAUUSD',
    'XAGUSD': 'OANDA:XAGUSD',
    'XAG/USD': 'OANDA:XAGUSD',
    'SILVER': 'OANDA:XAGUSD',
    'USOIL': 'TVC:USOIL',
    'OIL': 'TVC:USOIL',
    'CRUDE': 'TVC:USOIL',
    // Crypto
    'BTCUSD': 'BINANCE:BTCUSDT',
    'BTC/USD': 'BINANCE:BTCUSDT',
    'BITCOIN': 'BINANCE:BTCUSDT',
    'ETHUSD': 'BINANCE:ETHUSDT',
    'ETH/USD': 'BINANCE:ETHUSDT',
    'ETHEREUM': 'BINANCE:ETHUSDT'
};

// Convert symbol to TradingView format
function getTradingViewSymbol(symbol) {
    const normalizedSymbol = symbol.toUpperCase().replace(/\s/g, '');

    // Check if it's in our map
    if (chartSymbolMap[normalizedSymbol]) {
        return chartSymbolMap[normalizedSymbol];
    }

    // Check if it's a forex pair (6 letters)
    if (/^[A-Z]{6}$/.test(normalizedSymbol)) {
        return `FX:${normalizedSymbol}`;
    }

    // Check if it's a forex pair with slash
    if (/^[A-Z]{3}\/[A-Z]{3}$/.test(normalizedSymbol)) {
        return `FX:${normalizedSymbol.replace('/', '')}`;
    }

    // Assume it's a stock
    return normalizedSymbol;
}

// Load chart for a specific symbol
function loadChartForSymbol(symbol) {
    // Get symbol from input if not provided
    if (!symbol) {
        const input = document.getElementById('chartSearchInput');
        symbol = input ? input.value.trim() : '';
    }

    if (!symbol) {
        showToast('Please enter a symbol', 'error');
        return;
    }

    currentChartSymbol = symbol.toUpperCase();
    const tvSymbol = getTradingViewSymbol(currentChartSymbol);

    // Update input with the symbol
    const input = document.getElementById('chartSearchInput');
    if (input) {
        input.value = currentChartSymbol;
    }

    // Update title
    const titleEl = document.getElementById('chartSymbolTitle');
    if (titleEl) {
        titleEl.textContent = `${currentChartSymbol} Chart`;
    }

    // Show live badge
    const liveBadge = document.getElementById('chartLiveBadge');
    if (liveBadge) {
        liveBadge.classList.remove('hidden');
    }

    // Map timeframe to TradingView interval
    const tfMap = {
        '1': '60',     // 1 hour
        '4': '240',    // 4 hours
        'D': 'D',      // Daily
        'W': 'W'       // Weekly
    };
    const tvInterval = tfMap[currentChartTimeframe] || 'D';

    // Load TradingView widget
    const container = document.getElementById('chartsPageWidget');
    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full">
            <div class="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4"></div>
            <p class="text-slate-400">Loading ${currentChartSymbol} chart...</p>
        </div>
    `;

    // Create TradingView widget iframe
    setTimeout(() => {
        container.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${tvInterval}&theme=dark&style=1&locale=en&toolbar_bg=%23121212&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&saveimage=false&container_id=chartsPageWidget`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.allowFullscreen = true;
        container.appendChild(iframe);
    }, 300);

    showToast(`Loading ${currentChartSymbol} chart`, 'info');
}

// Change chart timeframe
function changeChartTimeframe(tf) {
    currentChartTimeframe = tf;

    // Update active button styling
    document.querySelectorAll('.chart-tf-btn').forEach(btn => {
        if (btn.dataset.tf === tf) {
            btn.classList.add('bg-violet-500/30', 'text-violet-300', 'active');
            btn.classList.remove('hover:bg-white/10');
        } else {
            btn.classList.remove('bg-violet-500/30', 'text-violet-300', 'active');
            btn.classList.add('hover:bg-white/10');
        }
    });

    // Reload chart if we have a symbol
    if (currentChartSymbol) {
        loadChartForSymbol(currentChartSymbol);
    }
}

// Navigate to Charts page with a specific symbol
function navigateToCharts(symbol) {
    // Update URL hash to charts page (this will trigger navigation)
    const chartsNav = document.querySelector('[data-page="charts"]');
    if (chartsNav) {
        chartsNav.click();
    }

    // Load the chart after a brief delay to ensure page renders
    setTimeout(() => {
        if (symbol) {
            loadChartForSymbol(symbol);
        }
    }, 100);
}

// Expose Charts page functions globally
window.loadChartForSymbol = loadChartForSymbol;
window.changeChartTimeframe = changeChartTimeframe;
window.navigateToCharts = navigateToCharts;
