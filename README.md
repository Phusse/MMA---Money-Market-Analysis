# Daily AI Stock Intelligence System

A production-ready, automated stock intelligence system that fetches daily market data, analyzes it using Google Gemini AI, and sends actionable insights via Email.

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🚀 Features

- **Real-time Market Data**: Fetches live data from Yahoo Finance (yfinance)
- **AI-Powered Analysis**: Uses Google Gemini to generate actionable insights
- **Beautiful Dashboard**: Modern dark-mode UI for manual report generation
- **Email Reports**: Automated HTML email reports with market summaries
- **Automation Ready**: Standalone script for cron jobs / task scheduler
- **API-First**: RESTful API endpoints for integration

## 📁 Project Structure

```
daily_stock_intel/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI Entry Point
│   ├── core/
│   │   └── config.py        # Settings management
│   ├── models/
│   │   └── schemas.py       # Pydantic models
│   ├── services/
│   │   ├── market_data.py   # Yahoo Finance logic
│   │   ├── llm_analyst.py   # Gemini AI logic
│   │   └── notifier.py      # Email dispatch
│   ├── api/
│   │   └── endpoints.py     # API Routes
│   └── static/              # Frontend Assets
│       ├── index.html
│       ├── style.css
│       └── app.js
├── scripts/
│   └── run_daily_scan.py    # Cron automation script
├── tests/
├── .env                     # Environment variables (create from .env.example)
├── .env.example             # Template for environment variables
├── requirements.txt
├── Procfile                 # Railway/Heroku deployment
└── README.md
```

## 🛠️ Quick Start

### 1. Clone & Setup

```bash
# Clone repository
git clone <repository-url>
cd daily_stock_intel

# Create virtual environment
python -m venv venv

# Activate (Windows)
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
# Required: GEMINI_API_KEY, EMAIL_ADDRESS, EMAIL_PASSWORD, RECIPIENT_EMAIL
```

#### Getting API Keys

**Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` as `GEMINI_API_KEY`

**Gmail App Password:**
1. Enable 2-Factor Authentication on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Create a new app password for "Mail"
4. Add to `.env` as `EMAIL_PASSWORD`

### 3. Run the Application

```bash
# Start the FastAPI server
uvicorn app.main:app --reload

# Or use the main.py directly
python -m app.main
```

Access the dashboard at: **http://localhost:8000**

API Documentation: **http://localhost:8000/docs**

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Dashboard UI |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/analyze` | Run full analysis |
| `GET` | `/api/market-data` | Get raw market data |

### Example: Trigger Analysis via API

```bash
curl -X POST http://localhost:8000/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"send_email": true}'
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
2. Create Basic Task → Name: "Daily Stock Intel"
3. Trigger: Daily at 9:00 AM (market open)
4. Action: Start a Program
5. Program: `python`
6. Arguments: `C:\path\to\scripts\run_daily_scan.py`
7. Start in: `C:\path\to\daily_stock_intel`

### Linux/Mac Cron

```bash
# Edit crontab
crontab -e

# Add line (runs at 9:30 AM EST on weekdays)
30 9 * * 1-5 cd /path/to/daily_stock_intel && /path/to/venv/bin/python scripts/run_daily_scan.py
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

### Docker (Optional)

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

# Test the full pipeline (dry-run)
python scripts/run_daily_scan.py --dry-run

# Test via API docs
# Navigate to http://localhost:8000/docs and use "Try it out"
```

## 🔒 Security Notes

- Never commit `.env` to version control
- Use app-specific passwords for Gmail
- Rotate API keys periodically
- Consider rate limiting for production

## 📝 License

MIT License - feel free to use and modify.

---

**Built with ❤️ using Python, FastAPI, and Google Gemini AI**
