
// ============================================
// Chart Visualization
// ============================================

async function openForexChart(symbol) {
    showToast(`Loading chart for ${symbol}...`, 'info');

    try {
        const response = await fetch(`/api/forex/chart/${encodeURIComponent(symbol)}`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.detail || 'Chart data load failed');
        }

        const history = result.data; // Expecting list of candles
        if (!history || history.length === 0) {
            throw new Error('No chart data available');
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'chartModal';
        modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/90 backdrop-blur-sm" onclick="closeChartModal()"></div>
            <div class="relative bg-surface-card border border-white/10 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl animate-fade-in">
                <div class="p-4 border-b border-white/10 flex justify-between items-center bg-surface-card/50 backdrop-blur rounded-t-2xl z-20">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">📈</span>
                        <div>
                            <h3 class="font-bold text-lg">${symbol} Chart</h3>
                            <p class="text-xs text-slate-400">Interactive Technical Analysis</p>
                        </div>
                    </div>
                    <button onclick="closeChartModal()" class="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="flex-1 p-4 relative bg-slate-900/50 rounded-b-2xl overflow-hidden">
                    <canvas id="forexChartCanvas"></canvas>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Render Chart.js
        const ctx = document.getElementById('forexChartCanvas').getContext('2d');

        // Prepare datasets
        const dates = history.map(h => new Date(h.date).toLocaleDateString());
        const closes = history.map(h => h.close);
        const sma20 = history.map(h => h.sma_20);
        const sma50 = history.map(h => h.sma_50);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Price',
                        data: closes,
                        borderColor: '#8b5cf6', // Violet
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        fill: true,
                        order: 1
                    },
                    {
                        label: 'SMA 20',
                        data: sma20,
                        borderColor: '#10b981', // Emerald
                        borderWidth: 1,
                        pointRadius: 0,
                        borderDash: [5, 5],
                        fill: false,
                        order: 2
                    },
                    {
                        label: 'SMA 50',
                        data: sma50,
                        borderColor: '#f59e0b', // Amber
                        borderWidth: 1,
                        pointRadius: 0,
                        borderDash: [5, 5],
                        fill: false,
                        order: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', maxTicksLimit: 10 }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' },
                        position: 'right'
                    }
                },
                plugins: {
                    legend: { labels: { color: '#e2e8f0' } },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true
                    },
                    zoom: {
                        pan: { enabled: true, mode: 'x' },
                        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                    }
                }
            }
        });

    } catch (error) {
        showToast('Chart load failed: ' + error.message, 'error');
        console.error(error);
    }
}

function closeChartModal() {
    const modal = document.getElementById('chartModal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 200);
    }
}

window.openForexChart = openForexChart;
window.closeChartModal = closeChartModal;
