"""
API Endpoints for Daily AI Stock Intelligence System
"""
from fastapi import APIRouter, HTTPException, Header, Depends
from datetime import datetime
from app.services.market_data import MarketDataService
from app.services.llm_analyst import LLMService
from app.services.notifier import NotificationService
from app.services.nigerian_market import NigerianMarketService
from app.services.news_service import news_service
from app.services.forex_service import ForexService, ForexSnapshot
from app.services.signal_service import SignalTrackingService, SignalHistory
from app.services.advanced_analysis import (
    mtf_service, sr_service, calendar_service, backtest_service,
    MultiTimeframeAnalysis, SupportResistance, EconomicCalendar, BacktestResult
)
from app.services.stock_analysis import stock_analysis_service
from app.services.auth_service import auth_service, UserCreate, UserLogin, UserPreferences
from app.models.schemas import FullReport, MarketSnapshot, AIAnalysis, NigerianMarketSnapshot, NewsArticle
from pydantic import BaseModel, EmailStr
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
# news_service is imported directly from news_service.py
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
async def get_news(limit: int = 30, category: str = None, refresh: bool = False):
    """
    Fetch latest market news with AI sentiment analysis and impact ratings.
    
    Args:
        limit: Maximum number of articles to return (default: 30)
        category: Filter by category (us_market, ngx_market, forex, crypto)
        refresh: Force refresh from sources (bypass cache)
    
    Returns news from: CryptoCompare API (crypto), Finnhub (if configured), 
    and curated market intelligence for Forex, US, and Nigeria markets.
    """
    try:
        news = news_service.get_market_news(limit=limit, force_refresh=refresh)
        
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


# ============================================
# FOREX ENDPOINTS
# ============================================
@router.get("/forex/analyze")
async def analyze_forex():
    """Get forex market analysis with technical indicators"""
    try:
        snapshot = forex_service.get_forex_snapshot()
        return {
            "success": True,
            "data": snapshot
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forex/chart/{symbol}")
async def forex_chart_data(symbol: str, period: str = "3mo"):
    """Get historical chart data for a forex pair with MACD, RSI, and Fibonacci"""
    try:
        # Convert symbol format (EUR-USD to EUR/USD)
        clean_symbol = symbol.replace("-", "/")
        result = forex_service.get_historical_data(clean_symbol, period)
        if result is None:
            raise HTTPException(status_code=404, detail=f"Unable to get chart data for {symbol}")
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forex/mtf/{symbol}")
async def forex_multi_timeframe(symbol: str):
    """Get multi-timeframe analysis for a forex pair"""
    try:
        clean_symbol = symbol.replace("-", "/")
        result = mtf_service.analyze_pair(clean_symbol)
        # Format for frontend
        signals = {}
        for sig in result.signals:
            key = sig.timeframe.lower().replace("h", "h")
            if sig.timeframe == "Daily":
                key = "1d"
            elif sig.timeframe == "1H":
                key = "1h"
            elif sig.timeframe == "4H":
                key = "4h"
            signals[key] = {
                "signal": sig.signal,
                "strength": sig.signal_strength,
                "rsi": sig.rsi,
                "macd_trend": sig.macd_trend
            }
        return {
            "success": True, 
            "data": signals
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forex/sr/{symbol}")
async def forex_support_resistance(symbol: str):
    """Get support/resistance levels for a forex pair"""
    try:
        clean_symbol = symbol.replace("-", "/")
        result = sr_service.calculate_levels(clean_symbol)
        return {
            "success": True, 
            "data": {
                "s2": result.support_2,
                "s1": result.support_1,
                "pivot": result.pivot_point,
                "r1": result.resistance_1,
                "r2": result.resistance_2,
                "current_price": result.current_price,
                "position": result.price_position,
                "caution": result.caution
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forex/backtest/{symbol}")
async def forex_backtest(symbol: str, period: str = "2y"):
    """Backtest trading signals on a forex pair"""
    try:
        clean_symbol = symbol.replace("-", "/")
        result = backtest_service.backtest_symbol(clean_symbol, period)
        return {
            "success": True, 
            "data": {
                "win_rate": result.win_rate / 100,  # Convert to decimal for frontend
                "total_trades": result.total_signals,
                "profit_factor": result.profit_factor,
                "max_drawdown": result.max_drawdown_pct / 100,
                "wins": result.wins,
                "losses": result.losses
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forex/calendar")
async def economic_calendar():
    """Get upcoming economic events"""
    try:
        calendar = calendar_service.get_calendar()
        # Format events for frontend
        events = []
        for e in calendar.events:
            events.append({
                "date": e.time,
                "name": e.event,
                "currency": e.currency,
                "impact": e.impact,
                "forecast": e.forecast,
                "previous": e.previous
            })
        return {
            "success": True, 
            "data": {
                "events": events,
                "high_impact_today": calendar.high_impact_today,
                "warning": calendar.warning
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forex/strength")
async def get_currency_strength():
    """
    Get currency strength analysis based on cross-pair performance.
    
    Returns relative strength of major currencies (USD, EUR, GBP, JPY, etc.)
    to identify strongest and weakest currencies for optimal pair selection.
    """
    try:
        from app.services.currency_strength import currency_strength_service
        
        # Get forex data first
        forex_data = forex_service.get_forex_snapshot()
        
        # Build change dict from pairs
        pair_changes = {}
        for pair in forex_data.pairs:
            pair_changes[pair.symbol] = pair.change_pct
        
        # Calculate strength
        strengths = currency_strength_service.calculate_strength(pair_changes)
        
        # Get best trading opportunities
        opportunities = currency_strength_service.get_strongest_pairs(strengths)
        
        # Generate summary
        summary = currency_strength_service.get_strength_summary(strengths)
        
        return {
            "success": True,
            "data": {
                "currencies": [
                    {
                        "currency": s.currency,
                        "name": s.name,
                        "flag": s.flag,
                        "score": s.score,
                        "change_1h": s.change_1h,
                        "change_24h": s.change_24h,
                        "trend": s.trend,
                        "rank": s.rank
                    }
                    for s in strengths
                ],
                "opportunities": [
                    {"pair": p, "action": a, "reason": r}
                    for p, a, r in opportunities
                ],
                "summary": summary,
                "last_updated": datetime.now().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forex/sessions")
async def get_forex_sessions():
    """
    Get current forex trading session status.
    
    Returns status (open/closed) for Sydney, Tokyo, London, and New York sessions
    with optimal trading windows highlighted.
    """
    try:
        from datetime import datetime, timezone
        
        now_utc = datetime.now(timezone.utc)
        hour = now_utc.hour
        
        # Forex session times (approximate, in UTC)
        sessions = {
            "sydney": {
                "name": "Sydney",
                "flag": "🇦🇺",
                "open_hour": 22,  # 10 PM UTC
                "close_hour": 7,  # 7 AM UTC
                "crosses_midnight": True,
                "volatility": "Low"
            },
            "tokyo": {
                "name": "Tokyo",
                "flag": "🇯🇵",
                "open_hour": 0,  # 12 AM UTC
                "close_hour": 9,  # 9 AM UTC
                "crosses_midnight": False,
                "volatility": "Low-Medium"
            },
            "london": {
                "name": "London",
                "flag": "🇬🇧",
                "open_hour": 8,  # 8 AM UTC
                "close_hour": 17,  # 5 PM UTC
                "crosses_midnight": False,
                "volatility": "High"
            },
            "newyork": {
                "name": "New York",
                "flag": "🇺🇸",
                "open_hour": 13,  # 1 PM UTC
                "close_hour": 22,  # 10 PM UTC
                "crosses_midnight": False,
                "volatility": "High"
            }
        }
        
        result = {}
        active_sessions = []
        
        for key, session in sessions.items():
            if session["crosses_midnight"]:
                is_open = hour >= session["open_hour"] or hour < session["close_hour"]
            else:
                is_open = session["open_hour"] <= hour < session["close_hour"]
            
            result[key] = {
                "name": session["name"],
                "flag": session["flag"],
                "status": "open" if is_open else "closed",
                "volatility": session["volatility"],
                "hours": f"{session['open_hour']:02d}:00 - {session['close_hour']:02d}:00 UTC"
            }
            
            if is_open:
                active_sessions.append(session["name"])
        
        # Determine overlap periods (highest volatility)
        overlap = None
        if "London" in active_sessions and "New York" in active_sessions:
            overlap = "London-New York Overlap (High Volatility)"
        elif "Tokyo" in active_sessions and "London" in active_sessions:
            overlap = "Tokyo-London Overlap (Medium Volatility)"
        elif "Sydney" in active_sessions and "Tokyo" in active_sessions:
            overlap = "Sydney-Tokyo Overlap (Low Volatility)"
        
        return {
            "success": True,
            "data": {
                "sessions": result,
                "active_count": len(active_sessions),
                "active_sessions": active_sessions,
                "overlap": overlap,
                "current_time_utc": now_utc.strftime("%H:%M UTC"),
                "best_pairs": {
                    "sydney": ["AUD/USD", "NZD/USD", "AUD/JPY"],
                    "tokyo": ["USD/JPY", "EUR/JPY", "GBP/JPY"],
                    "london": ["EUR/USD", "GBP/USD", "EUR/GBP"],
                    "newyork": ["EUR/USD", "USD/CAD", "USD/CHF"]
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# SIGNALS ENDPOINTS  
# ============================================
@router.get("/signals/history")
async def get_signals_history():
    """Get signal tracking history and performance stats"""
    try:
        history = signal_service.get_signal_history()
        # Convert to simpler format for frontend
        return {
            "success": True,
            "data": {
                "history": [
                    {
                        "date": s.timestamp[:10] if s.timestamp else "",
                        "symbol": s.symbol,
                        "action": "BUY" if "Buy" in s.signal else "SELL",
                        "entry_price": s.price_at_signal,
                        "exit_price": s.current_price,
                        "profit_loss": s.pnl_pct or 0,
                        "status": s.outcome or "OPEN"
                    }
                    for s in history.signals
                ],
                "win_rate": (history.performance.win_rate or 0) / 100 if history.performance else 0,
                "total_signals": history.total_signals,
                "profitable": history.performance.wins if history.performance else 0,
                "avg_return": history.performance.total_pnl_pct / max(history.total_signals, 1) if history.performance else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ============================================
# TELEGRAM ENDPOINT
# ============================================
@router.post("/telegram/test")
async def test_telegram():
    """Send a test message to Telegram"""
    try:
        success = notification_service.send_telegram("🧪 Test message from MMA - Your alerts are working!")
        return {
            "success": success,
            "message": "Test message sent!" if success else "Failed to send"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class TradeTakenRequest(BaseModel):
    symbol: str
    signal: str
    price: float


@router.post("/telegram/trade-taken")
async def trade_taken_alert(request: TradeTakenRequest):
    """Send Telegram notification when user takes a trade"""
    try:
        emoji = "🟢" if "Buy" in request.signal else "🔴"
        
        # Calculate SL/TP
        is_buy = "Buy" in request.signal
        sl_pct = 2.5 if "Strong" in request.signal else 2.0
        tp_pct = 5.0 if "Strong" in request.signal else 4.0
        
        if is_buy:
            sl = request.price * (1 - sl_pct/100)
            tp = request.price * (1 + tp_pct/100)
        else:
            sl = request.price * (1 + sl_pct/100)
            tp = request.price * (1 - tp_pct/100)
        
        from datetime import datetime
        message = f"""
{emoji} *TRADE TAKEN: {request.signal.upper()}*

📊 *{request.symbol}*

💰 Entry: `{request.price}`
🛑 Stop Loss: `{sl:.5f}` (-{sl_pct}%)
🎯 Take Profit: `{tp:.5f}` (+{tp_pct}%)

⏰ {datetime.now().strftime('%Y-%m-%d %H:%M')}

_Good luck! Remember to stick to your stop loss!_ 🍀
        """
        
        success = notification_service.send_telegram(message)
        return {
            "success": success,
            "message": "Trade alert sent to Telegram!" if success else "Telegram not configured"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# SIGNAL ENDPOINTS
# ============================================

class SignalRecordRequest(BaseModel):
    symbol: str
    pair_name: str
    category: str
    signal: str
    signal_strength: int
    price: float
    rsi: Optional[float] = None
    macd_trend: Optional[str] = None
    analysis: Optional[str] = None

@router.post("/signals/record")
async def record_signal(request: SignalRecordRequest):
    """Record a new trading signal"""
    try:
        from app.services.signal_service import signal_service
        signal = signal_service.record_signal(
            symbol=request.symbol,
            pair_name=request.pair_name,
            category=request.category,
            signal=request.signal,
            signal_strength=request.signal_strength,
            price=request.price,
            rsi=request.rsi,
            macd_trend=request.macd_trend,
            analysis=request.analysis
        )
        return {
            "success": True,
            "signal_id": signal.id,
            "message": "Signal recorded successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forex/chart/{symbol:path}")
async def get_forex_chart(symbol: str, period: str = "3mo"):
    """Get historical data for charting"""
    try:
        clean_symbol = symbol.replace("-", "/")
        data = forex_service.get_historical_data(clean_symbol, period)
        
        if not data:
            raise HTTPException(status_code=404, detail=f"Chart data not found for {symbol}")
            
        # Transform parallel arrays to list of objects for frontend
        history = [{"date": d, "close": p} for d, p in zip(data['dates'], data['prices'])]
        
        return {
            "success": True, 
            "data": history
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    account_type: str = "both"  # forex, stock, or both


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PreferencesUpdate(BaseModel):
    telegram_enabled: Optional[bool] = None
    telegram_chat_id: Optional[str] = None
    email_reports: Optional[bool] = None
    report_frequency: Optional[str] = None
    default_markets: Optional[List[str]] = None
    risk_tolerance: Optional[str] = None
    theme: Optional[str] = None
    default_currency: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


async def get_current_user(authorization: Optional[str] = Header(None)):
    """Dependency to get current user from Authorization header"""
    if not authorization:
        return None
    
    try:
        # Extract token from "Bearer <token>"
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        user = await auth_service.get_current_user(token)
        return user
    except Exception:
        return None


@router.get("/auth/status")
async def auth_status():
    """Check if authentication is configured"""
    return {
        "configured": auth_service.is_configured(),
        "message": "Supabase authentication is ready" if auth_service.is_configured() else "Authentication not configured. Set SUPABASE_URL and SUPABASE_KEY in .env"
    }


@router.post("/auth/register")
async def register(request: RegisterRequest):
    """Register a new user account"""
    if not auth_service.is_configured():
        raise HTTPException(status_code=503, detail="Authentication not configured")
    
    user_data = UserCreate(
        email=request.email,
        password=request.password,
        name=request.name,
        account_type=request.account_type
    )
    
    result = await auth_service.register(user_data)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Registration failed"))
    
    return result


@router.post("/auth/login")
async def login(request: LoginRequest):
    """Login and get access token"""
    if not auth_service.is_configured():
        raise HTTPException(status_code=503, detail="Authentication not configured")
    
    credentials = UserLogin(
        email=request.email,
        password=request.password
    )
    
    result = await auth_service.login(credentials)
    
    if not result.get("success"):
        raise HTTPException(status_code=401, detail=result.get("error", "Login failed"))
    
    return result


@router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout current user"""
    if not authorization:
        return {"success": True, "message": "Already logged out"}
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    result = await auth_service.logout(token)
    return result


@router.get("/auth/me")
async def get_me(user = Depends(get_current_user)):
    """Get current logged-in user info"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "success": True,
        "user": user
    }


@router.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token"""
    if not auth_service.is_configured():
        raise HTTPException(status_code=503, detail="Authentication not configured")
    
    result = await auth_service.refresh_session(refresh_token)
    
    if not result.get("success"):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    return result


@router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Send password reset email"""
    if not auth_service.is_configured():
        raise HTTPException(status_code=503, detail="Authentication not configured")
    
    result = await auth_service.reset_password_request(request.email)
    return result


@router.get("/user/preferences")
async def get_preferences(user = Depends(get_current_user)):
    """Get current user's preferences"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    prefs = await auth_service.get_user_preferences(user["id"])
    
    if not prefs:
        # Return defaults if no preferences exist
        prefs = {
            "telegram_enabled": False,
            "email_reports": True,
            "report_frequency": "daily",
            "default_markets": ["us_market", "forex"],
            "risk_tolerance": "moderate",
            "theme": "dark",
            "default_currency": "USD"
        }
    
    return {
        "success": True,
        "preferences": prefs
    }


@router.put("/user/preferences")
async def update_preferences(
    preferences: PreferencesUpdate,
    user = Depends(get_current_user)
):
    """Update user preferences"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Convert to dict, excluding None values
    update_data = {k: v for k, v in preferences.dict().items() if v is not None}
    
    if not update_data:
        return {"success": True, "message": "No changes to save"}
    
    result = await auth_service.update_user_preferences(user["id"], update_data)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to save preferences"))
    
    return {
        "success": True,
        "message": "Preferences saved successfully"
    }


@router.get("/user/profile")
async def get_profile(user = Depends(get_current_user)):
    """Get user profile"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    profile = await auth_service.get_user_profile(user["id"])
    
    return {
        "success": True,
        "profile": profile or {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name"),
            "plan": "free"
        }
    }


@router.put("/user/profile")
async def update_profile(
    name: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Update user profile"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    update_data = {}
    if name is not None:
        update_data["name"] = name
    
    if not update_data:
        return {"success": True, "message": "No changes to save"}
    
    result = await auth_service.update_user_profile(user["id"], update_data)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to update profile"))
    
    return {
        "success": True,
        "message": "Profile updated successfully"
    }


class UpdateAccountTypeRequest(BaseModel):
    password: str
    new_account_type: str  # forex, stock, or both


@router.post("/user/account-type")
async def update_account_type(
    request: UpdateAccountTypeRequest,
    user = Depends(get_current_user)
):
    """
    Update user's account type with password verification.
    Account types: forex, stock, or both
    """
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate account type
    if request.new_account_type not in ["forex", "stock", "both"]:
        raise HTTPException(status_code=400, detail="Invalid account type. Must be 'forex', 'stock', or 'both'")
    
    # Verify password by attempting login
    from app.services.auth_service import UserLogin
    credentials = UserLogin(email=user["email"], password=request.password)
    login_result = await auth_service.login(credentials)
    
    if not login_result.get("success"):
        raise HTTPException(status_code=403, detail="Incorrect password")
    
    # Update account type in profile
    result = await auth_service.update_user_profile(user["id"], {"account_type": request.new_account_type})
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail="Failed to update account type")
    
    return {
        "success": True,
        "message": f"Account type updated to '{request.new_account_type}'",
        "account_type": request.new_account_type
    }


# ==============================================
# QUANTITATIVE ANALYSIS ENDPOINTS
# ==============================================

@router.get("/quant/fibonacci/{symbol:path}")
async def get_fibonacci_levels(symbol: str, period: str = "3mo"):
    """
    Get Fibonacci retracement and extension levels.
    
    Args:
        symbol: Trading symbol (e.g., "EURUSD=X", "AAPL")
        period: Lookback period ("1mo", "3mo", "6mo", "1y")
    
    Returns:
        - Swing high/low detection
        - All Fibonacci levels (0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%)
        - Extension levels (127.2%, 161.8%, 200%, 261.8%)
        - Current price position relative to levels
        - Trading signal based on golden pocket
    """
    try:
        from app.services.quant_analysis import fibonacci_service
        result = fibonacci_service.calculate_levels(symbol, period)
        return {
            "success": True,
            "data": result.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quant/bollinger/{symbol:path}")
async def get_bollinger_bands(symbol: str, period: int = 20, std_dev: float = 2.0):
    """
    Get Bollinger Bands analysis with squeeze detection.
    
    Args:
        symbol: Trading symbol
        period: SMA period (default: 20)
        std_dev: Standard deviation multiplier (default: 2.0)
    
    Returns:
        - Upper, Middle, Lower bands
        - Bandwidth (volatility measure)
        - %B indicator
        - Squeeze detection (potential breakout signal)
        - Trading signal and recommendation
    """
    try:
        from app.services.quant_analysis import BollingerBandsService
        bb_service = BollingerBandsService(period=period, std_dev=std_dev)
        result = bb_service.calculate(symbol)
        return {
            "success": True,
            "data": result.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quant/mean-reversion/{symbol:path}")
async def get_mean_reversion_analysis(symbol: str):
    """
    Get mean reversion trading signals.
    
    Uses z-score analysis to identify oversold/overbought conditions
    and calculates half-life for mean reversion speed.
    
    Returns:
        - Z-score from rolling mean
        - Deviation from SMA20/SMA50
        - Half-life (days for price to revert halfway to mean)
        - RSI and divergence detection
        - Reversion probability
        - Trading signal with confidence level
    """
    try:
        from app.services.quant_analysis import mean_reversion_service
        result = mean_reversion_service.analyze(symbol)
        return {
            "success": True,
            "data": result.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quant/monte-carlo/{symbol:path}")
async def get_monte_carlo_simulation(symbol: str, days: int = 30, simulations: int = 10000):
    """
    Run Monte Carlo simulation for price forecasting.
    
    Uses Geometric Brownian Motion (GBM) based on historical volatility.
    
    Args:
        symbol: Trading symbol
        days: Number of days to simulate forward (default: 30)
        simulations: Number of simulation paths (default: 10,000)
    
    Returns:
        - Price distribution statistics (mean, median, std dev)
        - Percentile ranges (5th, 25th, 75th, 95th)
        - Probability of gain vs loss
        - Value at Risk (VaR) at 95% and 99%
        - Sharpe ratio estimate
        - Risk-reward ratio
    """
    try:
        from app.services.quant_analysis import MonteCarloService
        mc_service = MonteCarloService(num_simulations=simulations)
        result = mc_service.simulate(symbol, days)
        return {
            "success": True,
            "data": result.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quant/full/{symbol:path}")
async def get_full_quant_analysis(symbol: str):
    """
    Get complete quantitative analysis combining all methods.
    
    Runs Fibonacci, Bollinger Bands, Mean Reversion, and Monte Carlo
    analysis and provides a weighted combined signal.
    
    Signal weights:
    - Mean Reversion: 30% (best for ranging markets)
    - Bollinger Bands: 25% (volatility-based)
    - Monte Carlo: 25% (probabilistic)
    - Fibonacci: 20% (support/resistance)
    
    Returns:
        - All individual analyses
        - Combined signal (STRONG_BUY to STRONG_SELL)
        - Combined strength (1-10)
        - Confidence level based on signal agreement
    """
    try:
        from app.services.quant_analysis import quant_analysis_service
        result = quant_analysis_service.full_analysis(symbol)
        return {
            "success": True,
            "data": {
                "symbol": result.symbol,
                "timestamp": result.timestamp,
                "fibonacci": result.fibonacci.dict(),
                "bollinger": result.bollinger.dict(),
                "mean_reversion": result.mean_reversion.dict(),
                "monte_carlo": result.monte_carlo.dict(),
                "combined_signal": result.combined_signal,
                "combined_strength": result.combined_strength,
                "confidence_level": result.confidence_level,
                "recommendation": result.recommendation
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quant/summary/{symbol:path}")
async def get_quant_summary(symbol: str):
    """
    Get a quick summary of quant analysis for display.
    
    Returns condensed version suitable for UI cards/widgets.
    """
    try:
        from app.services.quant_analysis import quant_analysis_service
        result = quant_analysis_service.full_analysis(symbol)
        
        return {
            "success": True,
            "data": {
                "symbol": result.symbol,
                "combined_signal": result.combined_signal,
                "combined_strength": result.combined_strength,
                "confidence": result.confidence_level,
                
                # Key metrics summary
                "fibonacci_signal": result.fibonacci.signal,
                "fibonacci_nearest": result.fibonacci.nearest_level,
                
                "bollinger_position": result.bollinger.position,
                "bollinger_squeeze": result.bollinger.is_squeeze,
                
                "zscore": result.mean_reversion.zscore,
                "reversion_prob": result.mean_reversion.reversion_probability,
                
                "monte_carlo_prob_gain": result.monte_carlo.prob_above_current,
                "expected_return": result.monte_carlo.expected_return_pct,
                "var_95": result.monte_carlo.var_95,
                
                "recommendation": result.recommendation
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
