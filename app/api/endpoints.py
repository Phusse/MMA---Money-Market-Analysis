"""
API Endpoints for Daily AI Stock Intelligence System
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.services.market_data import MarketDataService
from app.services.llm_analyst import LLMService
from app.services.notifier import NotificationService
from app.services.nigerian_market import NigerianMarketService
from app.services.news_service import NewsService
from app.services.forex_service import ForexService, ForexSnapshot
from app.services.signal_service import SignalTrackingService, SignalHistory
from app.services.advanced_analysis import (
    mtf_service, sr_service, calendar_service, backtest_service,
    MultiTimeframeAnalysis, SupportResistance, EconomicCalendar, BacktestResult
)
from app.services.stock_analysis import stock_analysis_service
from app.models.schemas import FullReport, MarketSnapshot, AIAnalysis, NigerianMarketSnapshot, NewsArticle
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api", tags=["Stock Intelligence"])


class AnalyzeRequest(BaseModel):
    send_email: bool = False
    include_nigerian: bool = True


class AnalyzeResponse(BaseModel):
    success: bool
    message: str
    report: Optional[FullReport] = None


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str


class NewsResponse(BaseModel):
    success: bool
    count: int
    news: List[NewsArticle]


class ForexResponse(BaseModel):
    success: bool
    data: ForexSnapshot


class SignalResponse(BaseModel):
    success: bool
    data: SignalHistory


# Initialize Services
market_service = MarketDataService()
llm_service = LLMService()
notification_service = NotificationService()
nigerian_service = NigerianMarketService()
news_service = NewsService()
forex_service = ForexService()
signal_service = SignalTrackingService()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API health status"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_market(request: AnalyzeRequest = AnalyzeRequest()):
    """
    Run the full market analysis pipeline:
    1. Fetch US market data
    2. Fetch Nigerian market data
    3. Analyze BOTH markets with Gemini AI (generates strategies for both)
    4. Optionally send email notification
    """
    try:
        # Step 1: Fetch US Market Data
        print("[INFO] Fetching US market data...")
        us_snapshot: MarketSnapshot = market_service.get_market_snapshot()
        
        # Step 2: Fetch Nigerian Market Data
        nigerian_data = None
        if request.include_nigerian:
            print("[INFO] Fetching Nigerian market data...")
            try:
                nigerian_data = nigerian_service.get_market_snapshot()
            except Exception as e:
                print(f"[WARN] Nigerian market fetch failed: {e}")
        
        # Step 3: AI Analysis (pass BOTH US and Nigerian data)
        print("[INFO] Analyzing both markets with Gemini AI...")
        analysis: AIAnalysis = llm_service.analyze_market(us_snapshot, nigerian_data)
        
        # Step 4: Build Full Report
        report = FullReport(
            date=datetime.now().strftime("%Y-%m-%d %H:%M"),
            market_data=us_snapshot,
            analysis=analysis,
            nigerian_market=nigerian_data
        )
        
        # Step 5: Send Email (if requested)
        email_sent = False
        if request.send_email:
            print("[INFO] Sending email report...")
            email_sent = notification_service.send_report(report)
        
        return AnalyzeResponse(
            success=True,
            message=f"Analysis complete. Email sent: {email_sent}" if request.send_email else "Analysis complete.",
            report=report
        )
        
    except Exception as e:
        print(f"[ERROR] Error during analysis: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/market-data", response_model=MarketSnapshot)
async def get_market_data():
    """Fetch current US market data without AI analysis"""
    try:
        return market_service.get_market_snapshot()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nigerian-market", response_model=NigerianMarketSnapshot)
async def get_nigerian_market():
    """Fetch Nigerian Stock Exchange market data"""
    try:
        return nigerian_service.get_market_snapshot()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/news", response_model=NewsResponse)
async def get_news(limit: int = 20, category: str = None):
    """
    Fetch latest market news with AI analysis.
    
    Args:
        limit: Maximum number of articles to return (default: 20)
        category: Filter by category (us_market, ngx_market, crypto, general)
    """
    try:
        news = news_service.get_market_news(limit=limit)
        
        # Filter by category if specified
        if category:
            news = [n for n in news if n.category == category]
        
        return NewsResponse(
            success=True,
            count=len(news),
            news=news
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forex", response_model=ForexResponse)
async def get_forex_data():
    """
    Fetch current forex market data.
    
    Returns major currency pairs, Nigerian Naira pairs, and commodities (Gold, Oil).
    Also updates pending signals with current prices.
    """
    try:
        data = forex_service.get_forex_snapshot()
        
        # Build current prices dict and update pending signals
        current_prices = {}
        for pair in data.pairs:
            current_prices[pair.symbol] = pair.price
        
        # Update pending signals with current prices
        signal_service.update_pending_signals(current_prices)
        
        return ForexResponse(
            success=True,
            data=data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forex/history/{symbol:path}")
async def get_forex_history(symbol: str, period: str = "3mo"):
    """
    Fetch historical forex data for charting.
    
    Args:
        symbol: Currency pair symbol (e.g., "EUR/USD", "XAU/USD")
        period: Time period - "1mo", "3mo", "6mo", "1y"
        
    Returns real historical prices, technical indicators, and Fibonacci levels.
    """
    try:
        data = forex_service.get_historical_data(symbol, period)
        if data is None:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
        return {
            "success": True,
            "data": data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signals", response_model=SignalResponse)
async def get_signals(category: str = None, limit: int = 50):
    """
    Get trading signal history with statistics.
    
    Args:
        category: Filter by category - "forex", "stock" (optional)
        limit: Maximum number of signals to return (default 50)
    """
    try:
        data = signal_service.get_signal_history(category=category, limit=limit)
        return SignalResponse(
            success=True,
            data=data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/signals/record")
async def record_signal(
    symbol: str,
    signal: str,
    price: float,
    pair_name: str = "",
    category: str = "forex"
):
    """
    Manually record a trading signal.
    """
    try:
        result = signal_service.record_signal(
            symbol=symbol,
            pair_name=pair_name,
            category=category,
            signal=signal,
            signal_strength=4 if signal in ['Strong Buy', 'Buy'] else 2,
            price=price
        )
        return {
            "success": True,
            "signal": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signals/performance")
async def get_signal_performance():
    """
    Get detailed signal performance statistics.
    
    Returns:
        - Win rate, average profit/loss
        - Best/worst trades
        - Current and max streaks
        - Time-based win rates (7 day, 30 day)
    """
    try:
        performance = signal_service.get_performance()
        return {
            "success": True,
            "data": performance
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/telegram/test")
async def test_telegram():
    """
    Send a test message to Telegram to verify bot configuration.
    """
    test_signal = {
        'symbol': 'TEST/USD',
        'pair_name': 'Test Signal',
        'signal': 'Strong Buy',
        'price_at_signal': 1.2345,
        'rsi': 30.5,
        'macd_trend': 'Bullish'
    }
    
    success = signal_service.send_telegram_alert(test_signal)
    
    if success:
        return {"success": True, "message": "Test message sent to Telegram!"}
    else:
        return {"success": False, "message": "Telegram not configured or send failed. Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env"}


class TradeTakenRequest(BaseModel):
    symbol: str
    pair_name: str = ""
    signal: str
    price: float


@router.post("/telegram/trade-taken")
async def trade_taken_alert(request: TradeTakenRequest):
    """
    Send a Telegram alert confirming user took a trade.
    Called when user clicks "I Took The Trade" button.
    """
    import requests
    import os
    
    TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
    TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '')
    
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return {"success": False, "message": "Telegram not configured"}
    
    # Format trade confirmation message
    emoji = "🟢" if "Buy" in request.signal else "🔴"
    message = f"""
✅ **TRADE TAKEN CONFIRMATION**
━━━━━━━━━━━━━━━━━━━━━

{emoji} **{request.signal.upper()}**

📊 Symbol: `{request.symbol}`
{f"📝 Pair: {request.pair_name}" if request.pair_name else ""}
💰 Entry Price: `{request.price}`
⏰ Time: `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`

━━━━━━━━━━━━━━━━━━━━━
🎯 Good luck with your trade!
"""
    
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        response = requests.post(url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "Markdown"
        })
        
        if response.status_code == 200:
            return {"success": True, "message": "Trade confirmation sent to Telegram!"}
        else:
            return {"success": False, "message": f"Failed to send: {response.text}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


# ==============================================
# ADVANCED ANALYSIS ENDPOINTS
# ==============================================

@router.get("/analysis/mtf/{symbol:path}")
async def get_multi_timeframe_analysis(symbol: str):
    """
    Get multi-timeframe analysis for a symbol (1H, 4H, Daily).
    
    Shows signal confluence across timeframes:
    - "Strong" = All timeframes aligned with strong signals
    - "Moderate" = All timeframes agree on direction
    - "Weak" = Mixed but similar signals
    - "Conflicting" = Timeframes disagree
    """
    try:
        result = mtf_service.analyze_pair(symbol)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/sr/{symbol:path}")
async def get_support_resistance(symbol: str):
    """
    Get support and resistance levels for a symbol.
    
    Returns:
    - Pivot point (classic formula)
    - Support 1 & 2 (nearest and strong)
    - Resistance 1 & 2 (nearest and strong)
    - Price position (Near Support, Near Resistance, Mid-Range)
    """
    try:
        result = sr_service.calculate_levels(symbol)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/calendar")
async def get_economic_calendar():
    """
    Get economic calendar with upcoming high-impact events.
    
    Shows events that could affect forex pairs:
    - NFP (Non-Farm Payrolls)
    - FOMC/Fed meetings
    - CPI inflation data
    - Central bank rate decisions
    """
    try:
        result = calendar_service.get_calendar()
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/backtest/{symbol:path}")
async def get_backtest_results(symbol: str, period: str = "2y"):
    """
    Backtest trading signals on historical data.
    
    Args:
        symbol: Currency pair (e.g., "EUR/USD")
        period: "6mo", "1y", "2y" (default: 2y)
    
    Returns:
        Win rate, profit factor, max drawdown, and trade statistics.
    """
    try:
        result = backtest_service.backtest_symbol(symbol, period)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/full/{symbol:path}")
async def get_full_analysis(symbol: str):
    """
    Get complete analysis for a symbol including:
    - Multi-timeframe signals
    - Support/Resistance levels
    - Economic calendar warnings
    - 2-year backtest results
    """
    try:
        mtf = mtf_service.analyze_pair(symbol)
        sr = sr_service.calculate_levels(symbol)
        calendar = calendar_service.get_calendar()
        backtest = backtest_service.backtest_symbol(symbol, "2y")
        
        # Check if high-impact news affects this pair
        news_warning = None
        for event in calendar.events:
            if symbol in event.affects_pairs and event.impact == "High":
                news_warning = f"⚠️ HIGH IMPACT: {event.event} ({event.currency}) at {event.time}"
                break
        
        return {
            "success": True,
            "symbol": symbol,
            "multi_timeframe": mtf,
            "support_resistance": sr,
            "economic_calendar": calendar,
            "backtest": backtest,
            "news_warning": news_warning,
            "overall_recommendation": mtf.recommendation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================
# STOCK ANALYSIS ENDPOINTS
# ==============================================

@router.get("/stock/search/{symbol}")
async def search_stock(symbol: str):
    """
    Search and analyze an individual stock.
    
    Returns:
        - Current price and change
        - Technical indicators (RSI, MACD, SMAs)
        - Trading signal (Strong Buy to Strong Sell)
        - Company info (sector, market cap, P/E, etc.)
    """
    try:
        result = stock_analysis_service.search_stock(symbol)
        if result is None:
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
        
        return {
            "success": True,
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/sr/{symbol}")
async def get_stock_support_resistance(symbol: str):
    """
    Get support/resistance levels for a stock.
    
    Returns pivot points, S1/S2, R1/R2, and 52-week levels.
    """
    try:
        result = stock_analysis_service.get_support_resistance(symbol)
        if result is None:
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
        
        return {
            "success": True,
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/backtest/{symbol}")
async def backtest_stock(symbol: str, period: str = "2y"):
    """
    Backtest trading signals on a stock.
    
    Args:
        symbol: Stock ticker (e.g., "AAPL")
        period: "6mo", "1y", "2y" (default: 2y)
    """
    try:
        result = stock_analysis_service.backtest_stock(symbol, period)
        if result is None:
            raise HTTPException(status_code=404, detail=f"Unable to backtest {symbol}")
        
        return {
            "success": True,
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/full/{symbol}")
async def get_full_stock_analysis(symbol: str):
    """
    Get complete analysis for a stock including:
    - Price and technicals
    - Support/Resistance levels
    - 2-year backtest results
    """
    try:
        stock = stock_analysis_service.search_stock(symbol)
        if stock is None:
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
        
        sr = stock_analysis_service.get_support_resistance(symbol)
        backtest = stock_analysis_service.backtest_stock(symbol, "2y")
        
        return {
            "success": True,
            "symbol": symbol.upper(),
            "stock_data": stock,
            "support_resistance": sr,
            "backtest": backtest,
            "recommendation": stock.recommendation
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
