# 💹 Money Market Intelligence

A comprehensive, AI-powered market intelligence system that provides real-time analysis of US stocks, Nigerian stocks (NGX), Forex pairs, and commodities. Built with FastAPI and Google Gemini AI.

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.124+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🚀 Features

### Markets Covered
- **US Stocks** - Real-time data from Yahoo Finance with AI-powered analysis
- **Nigerian Stocks (NGX)** - Local market data and insights
- **Forex Trading** - Major pairs, Naira pairs, and cross currencies
- **Commodities** - Gold (XAU/USD), Oil (CL=F), and more

### Key Capabilities
- **🤖 AI-Powered Analysis** - Google Gemini generates actionable market insights and strategies
- **📊 Multi-Timeframe Analysis** - 1H, 4H, and Daily timeframe confluence signals
- **📈 Technical Indicators** - RSI, MACD, SMA 20/50/200, Fibonacci levels
- **🎯 Trading Signals** - Automated Buy/Sell signals with strength ratings
- **💡 Support/Resistance Levels** - Dynamic pivot points, S1/S2, R1/R2
- **📅 Economic Calendar** - High-impact event warnings (NFP, FOMC, CPI)
- **📉 Backtesting** - Historical signal performance analysis
- **📧 Email Reports** - Automated HTML reports with market summaries
- **📱 Telegram Alerts** - Real-time signal notifications
- **📰 Market News** - Curated news with AI sentiment analysis

## 📁 Project Structure

```
MMA---Money-Market-Analysis/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI Entry Point
│   ├── api/
│   │   └── endpoints.py         # All API Routes
│   ├── core/
│   │   └── config.py            # Settings management
│   ├── models/
│   │   └── schemas.py           # Pydantic models
│   ├── services/
│   │   ├── market_data.py       # US market data (Yahoo Finance)
│   │   ├── nigerian_market.py   # NGX market data
│   │   ├── forex_service.py     # Forex pairs & commodities
│   │   ├── llm_analyst.py       # Gemini AI analysis
│   │   ├── news_service.py      # Market news aggregation
│   │   ├── signal_service.py    # Trading signal tracking
│   │   ├── advanced_analysis.py # MTF, S/R, Calendar, Backtest
│   │   ├── stock_analysis.py    # Individual stock analysis
│   │   └── notifier.py          # Email dispatch
│   └── static/                  # Frontend Dashboard
│       ├── index.html
│       ├── style.css
│       └── app.js
├── scripts/
│   └── run_daily_scan.py        # Automation script
├── data/
│   └── signals_history.json     # Signal tracking data
├── .env                         # Environment variables
├── .env.example                 # Template for env vars
├── .gitignore
├── requirements.txt
├── Procfile                     # Railway/Heroku deployment
└── README.md
```

## 🛠️ Quick Start

### 1. Clone & Setup

```bash
# Clone repository
git clone https://github.com/Phusse/MMA---Money-Market-Analysis.git
cd MMA---Money-Market-Analysis

# Create virtual environment
python -m venv venv

# Activate (Windows - Git Bash)
source venv/Scripts/activate

# Activate (Windows - CMD)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
```

#### Required API Keys

| Key | Description | How to Get |
|-----|-------------|------------|
| `GEMINI_API_KEY` | Google AI analysis | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `EMAIL_ADDRESS` | Sender email | Your Gmail address |
| `EMAIL_PASSWORD` | Gmail app password | [App Passwords](https://myaccount.google.com/apppasswords) |
| `RECIPIENT_EMAIL` | Report recipient | Any email address |
| `TELEGRAM_BOT_TOKEN` | Telegram alerts | [@BotFather](https://t.me/botfather) |
| `TELEGRAM_CHAT_ID` | Your chat ID | [@userinfobot](https://t.me/userinfobot) |

### 3. Run the Application

```bash
# Start the FastAPI server
uvicorn app.main:app --reload
```

Access the application:
- **Dashboard:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## 📊 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Dashboard UI |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/analyze` | Run full AI analysis |
| `GET` | `/api/market-data` | US market snapshot |
| `GET` | `/api/nigerian-market` | NGX market snapshot |
| `GET` | `/api/news` | Market news with AI analysis |

### Forex Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/forex` | All forex pairs & commodities |
| `GET` | `/api/forex/history/{symbol}` | Historical data with indicators |

### Trading Signals

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/signals` | Signal history with stats |
| `POST` | `/api/signals/record` | Record a manual signal |
| `GET` | `/api/signals/performance` | Win rate & performance stats |

### Advanced Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analysis/mtf/{symbol}` | Multi-timeframe analysis |
| `GET` | `/api/analysis/sr/{symbol}` | Support/Resistance levels |
| `GET` | `/api/analysis/calendar` | Economic calendar |
| `GET` | `/api/analysis/backtest/{symbol}` | Signal backtesting |
| `GET` | `/api/analysis/full/{symbol}` | Complete analysis (all above) |

### Stock Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stock/search/{symbol}` | Search & analyze a stock |
| `GET` | `/api/stock/sr/{symbol}` | Stock support/resistance |
| `GET` | `/api/stock/backtest/{symbol}` | Stock signal backtest |
| `GET` | `/api/stock/full/{symbol}` | Complete stock analysis |

### Telegram Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/telegram/test` | Send test message |
| `POST` | `/api/telegram/trade-taken` | Confirm trade taken |

## 💡 Example API Usage

### Trigger Full Analysis

```bash
curl -X POST http://localhost:8000/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"send_email": true, "include_nigerian": true}'
```

### Get Forex Data

```bash
curl http://localhost:8000/api/forex
```

### Get EUR/USD Full Analysis

```bash
curl http://localhost:8000/api/analysis/full/EUR/USD
```

## ⏰ Automation (Cron Setup)

### Using the Standalone Script

```bash
# Dry run (no email)
python scripts/run_daily_scan.py --dry-run

# Production run
python scripts/run_daily_scan.py

# Skip email
python scripts/run_daily_scan.py --no-email
```

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task → Name: "MMA Daily Scan"
3. Trigger: Daily at 9:00 AM
4. Action: Start a Program
5. Program: `python`
6. Arguments: `C:\path\to\scripts\run_daily_scan.py`
7. Start in: `C:\path\to\MMA---Money-Market-Analysis`

### Linux/Mac Cron

```bash
# Edit crontab
crontab -e

# Add line (runs at 9:30 AM on weekdays)
30 9 * * 1-5 cd /path/to/MMA---Money-Market-Analysis && /path/to/venv/bin/python scripts/run_daily_scan.py
```

## 🌐 Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically

### Heroku

```bash
# Login and create app
heroku login
heroku create your-app-name

# Set config vars
heroku config:set GEMINI_API_KEY=your_key
heroku config:set EMAIL_ADDRESS=your_email
heroku config:set EMAIL_PASSWORD=your_password
heroku config:set RECIPIENT_EMAIL=recipient_email

# Deploy
git push heroku main
```

### Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🧪 Testing

```bash
# Test market data service
python -c "from app.services.market_data import MarketDataService; print(MarketDataService().get_market_snapshot())"

# Test forex service
python -c "from app.services.forex_service import ForexService; print(ForexService().get_forex_snapshot())"

# Test the full pipeline (dry-run)
python scripts/run_daily_scan.py --dry-run

# Test via API docs
# Navigate to http://localhost:8000/docs and use "Try it out"
```

## 🔒 Security Notes

- ⚠️ Never commit `.env` to version control
- Use app-specific passwords for Gmail
- Rotate API keys periodically
- Consider rate limiting for production

## 📝 License

MIT License - feel free to use and modify.

---

**Built with ❤️ using Python, FastAPI, and Google Gemini AI**
