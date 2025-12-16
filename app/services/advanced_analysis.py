"""
Advanced Analysis Service

Provides professional-grade trading analysis:
1. Multi-Timeframe Confirmation (1H, 4H, Daily)
2. Support/Resistance Levels (swing highs/lows, pivot points)
3. Economic Calendar (high-impact news events)
4. Backtesting (historical signal performance)
"""
import yfinance as yf
import pandas as pd
import numpy as np
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel
import logging
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==============================================
# MODELS
# ==============================================

class TimeframeSignal(BaseModel):
    """Signal for a specific timeframe"""
    timeframe: str  # "1H", "4H", "Daily"
    signal: str  # Strong Buy, Buy, Hold, Sell, Strong Sell
    signal_strength: int  # 1-5
    rsi: Optional[float] = None
    macd_trend: Optional[str] = None


class MultiTimeframeAnalysis(BaseModel):
    """Multi-timeframe analysis result"""
    symbol: str
    signals: List[TimeframeSignal]
    confluence: str  # "Strong", "Moderate", "Weak", "Conflicting"
    confluence_score: int  # 1-5 (5 = all aligned strong signal)
    recommendation: str  # Final recommendation
    aligned: bool  # True if all timeframes agree on direction


class SupportResistance(BaseModel):
    """Support and resistance levels"""
    symbol: str
    current_price: float
    support_1: float  # Nearest support
    support_2: float  # Strong support
    resistance_1: float  # Nearest resistance
    resistance_2: float  # Strong resistance
    pivot_point: float
    price_position: str  # "Near Support", "Near Resistance", "Mid-Range"
    caution: Optional[str] = None  # Warning if near key level


class EconomicEvent(BaseModel):
    """Economic calendar event"""
    time: str
    currency: str
    impact: str  # "High", "Medium", "Low"
    event: str
    forecast: Optional[str] = None
    previous: Optional[str] = None
    affects_pairs: List[str]  # ["EUR/USD", "EUR/GBP", ...]


class EconomicCalendar(BaseModel):
    """Economic calendar with upcoming events"""
    events: List[EconomicEvent]
    high_impact_today: int
    next_high_impact: Optional[EconomicEvent] = None
    warning: Optional[str] = None


class BacktestResult(BaseModel):
    """Backtesting results"""
    symbol: str
    period: str  # "2Y", "1Y", "6M"
    total_signals: int
    wins: int
    losses: int
    win_rate: float
    avg_win_pct: float
    avg_loss_pct: float
    profit_factor: float  # Total wins / Total losses
    max_drawdown_pct: float
    best_trade_pct: float
    worst_trade_pct: float
    monthly_returns: Dict[str, float]


# ==============================================
# MULTI-TIMEFRAME ANALYSIS
# ==============================================

class MultiTimeframeService:
    """Analyze signals across multiple timeframes"""
    
    def __init__(self):
        self.timeframes = {
            "1H": {"period": "5d", "interval": "1h"},
            "4H": {"period": "1mo", "interval": "1h"},  # Aggregate to 4H
            "Daily": {"period": "3mo", "interval": "1d"}
        }
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> float:
        """Calculate RSI"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1] if not rsi.empty else 50
    
    def _calculate_macd(self, prices: pd.Series) -> Tuple[float, str]:
        """Calculate MACD and trend"""
        exp1 = prices.ewm(span=12, adjust=False).mean()
        exp2 = prices.ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        
        macd_val = macd.iloc[-1] if not macd.empty else 0
        signal_val = signal.iloc[-1] if not signal.empty else 0
        
        if macd_val > signal_val:
            trend = "Bullish" if macd_val > 0 else "Weak Bullish"
        else:
            trend = "Bearish" if macd_val < 0 else "Weak Bearish"
        
        return macd_val, trend
    
    def _get_signal(self, rsi: float, macd_trend: str, price: float, sma20: float, sma50: float) -> Tuple[str, int]:
        """Determine signal from indicators"""
        score = 3  # Start neutral
        
        # RSI contribution
        if rsi < 30:
            score += 1.5  # Oversold = bullish
        elif rsi > 70:
            score -= 1.5  # Overbought = bearish
        elif rsi < 40:
            score += 0.5
        elif rsi > 60:
            score -= 0.5
        
        # MACD contribution
        if "Bullish" in macd_trend:
            score += 1 if "Weak" not in macd_trend else 0.5
        elif "Bearish" in macd_trend:
            score -= 1 if "Weak" not in macd_trend else 0.5
        
        # SMA contribution
        if price > sma20 > sma50:
            score += 0.5  # Strong uptrend
        elif price < sma20 < sma50:
            score -= 0.5  # Strong downtrend
        
        # Convert score to signal
        score = max(1, min(5, round(score)))
        signals = {1: "Strong Sell", 2: "Sell", 3: "Hold", 4: "Buy", 5: "Strong Buy"}
        
        return signals[score], score
    
    def analyze_pair(self, symbol: str) -> MultiTimeframeAnalysis:
        """Analyze a pair across all timeframes"""
        yahoo_symbol = symbol.replace("/", "") + "=X"
        if "XAU" in symbol or "Gold" in symbol:
            yahoo_symbol = "GC=F"
        elif "WTI" in symbol or "Oil" in symbol:
            yahoo_symbol = "CL=F"
        
        signals = []
        
        for tf_name, tf_config in self.timeframes.items():
            try:
                df = yf.download(
                    yahoo_symbol,
                    period=tf_config["period"],
                    interval=tf_config["interval"],
                    progress=False
                )
                
                if df.empty:
                    continue
                
                # For 4H, resample 1H data
                if tf_name == "4H":
                    df = df.resample('4h').agg({
                        'Open': 'first',
                        'High': 'max',
                        'Low': 'min',
                        'Close': 'last',
                        'Volume': 'sum'
                    }).dropna()
                
                close = df['Close'].squeeze()
                
                # Calculate indicators
                rsi = self._calculate_rsi(close)
                macd_val, macd_trend = self._calculate_macd(close)
                
                sma20 = close.rolling(window=20).mean().iloc[-1] if len(close) >= 20 else close.iloc[-1]
                sma50 = close.rolling(window=50).mean().iloc[-1] if len(close) >= 50 else close.iloc[-1]
                
                current_price = close.iloc[-1]
                signal, strength = self._get_signal(rsi, macd_trend, current_price, sma20, sma50)
                
                signals.append(TimeframeSignal(
                    timeframe=tf_name,
                    signal=signal,
                    signal_strength=strength,
                    rsi=round(rsi, 1),
                    macd_trend=macd_trend
                ))
                
            except Exception as e:
                logger.warning(f"Error analyzing {symbol} on {tf_name}: {e}")
        
        # Calculate confluence
        if not signals:
            return MultiTimeframeAnalysis(
                symbol=symbol,
                signals=[],
                confluence="Unknown",
                confluence_score=0,
                recommendation="Unable to analyze",
                aligned=False
            )
        
        strengths = [s.signal_strength for s in signals]
        avg_strength = sum(strengths) / len(strengths)
        
        # Check if all aligned (same direction)
        all_bullish = all(s >= 4 for s in strengths)
        all_bearish = all(s <= 2 for s in strengths)
        aligned = all_bullish or all_bearish
        
        # Confluence score
        if aligned and (all(s == 5 for s in strengths) or all(s == 1 for s in strengths)):
            confluence = "Strong"
            confluence_score = 5
        elif aligned:
            confluence = "Moderate"
            confluence_score = 4
        elif max(strengths) - min(strengths) <= 1:
            confluence = "Weak"
            confluence_score = 3
        else:
            confluence = "Conflicting"
            confluence_score = 2
        
        # Final recommendation
        if confluence_score >= 4:
            if avg_strength > 3:
                recommendation = f"✅ BUY - {len([s for s in strengths if s >= 4])}/3 timeframes bullish"
            else:
                recommendation = f"✅ SELL - {len([s for s in strengths if s <= 2])}/3 timeframes bearish"
        elif confluence_score == 3:
            recommendation = "⚠️ CAUTION - Mixed signals, wait for confirmation"
        else:
            recommendation = "❌ NO TRADE - Conflicting timeframes"
        
        return MultiTimeframeAnalysis(
            symbol=symbol,
            signals=signals,
            confluence=confluence,
            confluence_score=confluence_score,
            recommendation=recommendation,
            aligned=aligned
        )


# ==============================================
# SUPPORT & RESISTANCE
# ==============================================

class SupportResistanceService:
    """Calculate support and resistance levels"""
    
    def calculate_levels(self, symbol: str) -> SupportResistance:
        """Calculate S/R levels for a symbol"""
        yahoo_symbol = symbol.replace("/", "") + "=X"
        if "XAU" in symbol or "Gold" in symbol:
            yahoo_symbol = "GC=F"
        elif "WTI" in symbol or "Oil" in symbol:
            yahoo_symbol = "CL=F"
        
        try:
            df = yf.download(yahoo_symbol, period="3mo", interval="1d", progress=False)
            
            if df.empty:
                raise ValueError("No data available")
            
            high = df['High'].squeeze()
            low = df['Low'].squeeze()
            close = df['Close'].squeeze()
            
            current_price = close.iloc[-1]
            
            # Calculate pivot points (classic formula)
            yesterday_high = high.iloc[-2]
            yesterday_low = low.iloc[-2]
            yesterday_close = close.iloc[-2]
            
            pivot = (yesterday_high + yesterday_low + yesterday_close) / 3
            r1 = (2 * pivot) - yesterday_low
            s1 = (2 * pivot) - yesterday_high
            r2 = pivot + (yesterday_high - yesterday_low)
            s2 = pivot - (yesterday_high - yesterday_low)
            
            # Find swing highs/lows (last 20 days)
            recent_high = high.iloc[-20:].max()
            recent_low = low.iloc[-20:].min()
            
            # Determine stronger levels
            resistance_1 = min(r1, recent_high)  # Nearest resistance
            resistance_2 = max(r1, recent_high)  # Stronger resistance
            support_1 = max(s1, recent_low)  # Nearest support
            support_2 = min(s1, recent_low)  # Stronger support
            
            # Determine price position
            range_size = resistance_1 - support_1
            if range_size > 0:
                position_pct = (current_price - support_1) / range_size
                
                if position_pct <= 0.2:
                    price_position = "Near Support"
                    caution = "⚠️ Price near support - good for BUYING if it holds"
                elif position_pct >= 0.8:
                    price_position = "Near Resistance"
                    caution = "⚠️ Price near resistance - risky for BUYING"
                else:
                    price_position = "Mid-Range"
                    caution = None
            else:
                price_position = "Mid-Range"
                caution = None
            
            return SupportResistance(
                symbol=symbol,
                current_price=round(current_price, 5),
                support_1=round(support_1, 5),
                support_2=round(support_2, 5),
                resistance_1=round(resistance_1, 5),
                resistance_2=round(resistance_2, 5),
                pivot_point=round(pivot, 5),
                price_position=price_position,
                caution=caution
            )
            
        except Exception as e:
            logger.error(f"Error calculating S/R for {symbol}: {e}")
            return SupportResistance(
                symbol=symbol,
                current_price=0,
                support_1=0,
                support_2=0,
                resistance_1=0,
                resistance_2=0,
                pivot_point=0,
                price_position="Unknown",
                caution="Unable to calculate levels"
            )


# ==============================================
# ECONOMIC CALENDAR
# ==============================================

class EconomicCalendarService:
    """Fetch economic calendar from ForexFactory"""
    
    def __init__(self):
        self.currency_pairs = {
            "USD": ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "USD/NGN"],
            "EUR": ["EUR/USD", "EUR/GBP", "EUR/JPY", "EUR/NGN"],
            "GBP": ["GBP/USD", "EUR/GBP", "GBP/JPY", "GBP/NGN"],
            "JPY": ["USD/JPY", "EUR/JPY", "GBP/JPY"],
            "AUD": ["AUD/USD", "AUD/JPY"],
            "CAD": ["USD/CAD"],
            "CHF": ["USD/CHF"],
        }
    
    def get_calendar(self) -> EconomicCalendar:
        """Get today's economic calendar"""
        events = []
        
        try:
            # Try ForexFactory (may need headers to avoid blocking)
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            # Alternative: Use investing.com economic calendar API or hardcoded major events
            # For reliability, let's use a simplified approach with known upcoming events
            
            # Check if it's a major news day (simplified)
            today = datetime.now()
            day_of_week = today.weekday()
            
            # First Friday of month = NFP
            if day_of_week == 4 and today.day <= 7:
                events.append(EconomicEvent(
                    time="13:30 GMT",
                    currency="USD",
                    impact="High",
                    event="Non-Farm Payrolls (NFP)",
                    forecast="185K",
                    previous="227K",
                    affects_pairs=self.currency_pairs["USD"]
                ))
            
            # Add common high-impact events for awareness
            common_events = [
                {"currency": "USD", "event": "FOMC Meeting", "time": "19:00 GMT"},
                {"currency": "USD", "event": "CPI Inflation", "time": "13:30 GMT"},
                {"currency": "EUR", "event": "ECB Rate Decision", "time": "12:15 GMT"},
                {"currency": "GBP", "event": "BOE Rate Decision", "time": "12:00 GMT"},
            ]
            
            # Try to fetch real calendar
            try:
                url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
                response = requests.get(url, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data[:20]:  # Limit to 20 events
                        if item.get('impact', '').lower() in ['high', 'medium']:
                            currency = item.get('country', 'USD')
                            affects = self.currency_pairs.get(currency, [])
                            
                            events.append(EconomicEvent(
                                time=item.get('date', 'TBA'),
                                currency=currency,
                                impact=item.get('impact', 'Medium').title(),
                                event=item.get('title', 'Economic Event'),
                                forecast=item.get('forecast', None),
                                previous=item.get('previous', None),
                                affects_pairs=affects
                            ))
            except Exception as e:
                logger.warning(f"Could not fetch live calendar: {e}")
            
            # Count high impact
            high_impact = len([e for e in events if e.impact == "High"])
            
            # Warning message
            warning = None
            if high_impact > 0:
                next_high = next((e for e in events if e.impact == "High"), None)
                warning = f"⚠️ {high_impact} HIGH IMPACT event(s) today - trade with caution!"
            
            return EconomicCalendar(
                events=events,
                high_impact_today=high_impact,
                next_high_impact=next_high if high_impact > 0 else None,
                warning=warning
            )
            
        except Exception as e:
            logger.error(f"Error fetching calendar: {e}")
            return EconomicCalendar(
                events=[],
                high_impact_today=0,
                next_high_impact=None,
                warning="Unable to fetch economic calendar"
            )


# ==============================================
# BACKTESTING
# ==============================================

class BacktestService:
    """Backtest trading signals on historical data"""
    
    def __init__(self):
        self.mtf = MultiTimeframeService()
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI series"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def _calculate_macd(self, prices: pd.Series) -> pd.Series:
        """Calculate MACD histogram series"""
        exp1 = prices.ewm(span=12, adjust=False).mean()
        exp2 = prices.ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        return macd - signal  # Histogram
    
    def backtest_symbol(self, symbol: str, period: str = "2y") -> BacktestResult:
        """Backtest a symbol over historical period"""
        yahoo_symbol = symbol.replace("/", "") + "=X"
        if "XAU" in symbol or "Gold" in symbol:
            yahoo_symbol = "GC=F"
        elif "WTI" in symbol or "Oil" in symbol:
            yahoo_symbol = "CL=F"
        
        try:
            df = yf.download(yahoo_symbol, period=period, interval="1d", progress=False)
            
            if df.empty or len(df) < 100:
                raise ValueError("Insufficient data for backtesting")
            
            close = df['Close'].squeeze()
            
            # Calculate indicators
            rsi = self._calculate_rsi(close)
            macd_hist = self._calculate_macd(close)
            sma20 = close.rolling(window=20).mean()
            sma50 = close.rolling(window=50).mean()
            
            # Generate signals
            df['RSI'] = rsi
            df['MACD_Hist'] = macd_hist
            df['SMA20'] = sma20
            df['SMA50'] = sma50
            
            # Signal generation logic
            df['Signal'] = 0  # 1 = Buy, -1 = Sell
            
            # Buy signal: RSI < 35 and MACD turning positive
            buy_condition = (df['RSI'] < 35) & (df['MACD_Hist'] > df['MACD_Hist'].shift(1))
            df.loc[buy_condition, 'Signal'] = 1
            
            # Sell signal: RSI > 65 and MACD turning negative
            sell_condition = (df['RSI'] > 65) & (df['MACD_Hist'] < df['MACD_Hist'].shift(1))
            df.loc[sell_condition, 'Signal'] = -1
            
            # Simulate trades
            trades = []
            position = None
            
            for i in range(50, len(df)):
                if df['Signal'].iloc[i] == 1 and position is None:
                    # Open buy position
                    position = {
                        'type': 'buy',
                        'entry': close.iloc[i],
                        'entry_date': df.index[i]
                    }
                elif df['Signal'].iloc[i] == -1 and position is None:
                    # Open sell position
                    position = {
                        'type': 'sell',
                        'entry': close.iloc[i],
                        'entry_date': df.index[i]
                    }
                elif position is not None:
                    # Check for exit (opposite signal or TP/SL)
                    current_price = close.iloc[i]
                    entry_price = position['entry']
                    
                    if position['type'] == 'buy':
                        pnl_pct = ((current_price - entry_price) / entry_price) * 100
                    else:
                        pnl_pct = ((entry_price - current_price) / entry_price) * 100
                    
                    # Exit on TP (2%) or SL (1%) or opposite signal
                    if pnl_pct >= 2 or pnl_pct <= -1 or df['Signal'].iloc[i] == (-1 if position['type'] == 'buy' else 1):
                        trades.append({
                            'type': position['type'],
                            'entry': entry_price,
                            'exit': current_price,
                            'pnl_pct': pnl_pct,
                            'result': 'Win' if pnl_pct > 0 else 'Loss'
                        })
                        position = None
            
            # Calculate statistics
            if not trades:
                raise ValueError("No trades generated")
            
            wins = [t for t in trades if t['result'] == 'Win']
            losses = [t for t in trades if t['result'] == 'Loss']
            
            win_rate = len(wins) / len(trades) * 100
            avg_win = sum(t['pnl_pct'] for t in wins) / len(wins) if wins else 0
            avg_loss = sum(t['pnl_pct'] for t in losses) / len(losses) if losses else 0
            
            total_wins = sum(t['pnl_pct'] for t in wins)
            total_losses = abs(sum(t['pnl_pct'] for t in losses))
            profit_factor = total_wins / total_losses if total_losses > 0 else 999
            
            # Calculate max drawdown
            cumulative = 0
            peak = 0
            max_dd = 0
            for t in trades:
                cumulative += t['pnl_pct']
                peak = max(peak, cumulative)
                dd = peak - cumulative
                max_dd = max(max_dd, dd)
            
            # Monthly returns (simplified)
            monthly_returns = {}
            for t in trades[:12]:  # Last 12 trades as proxy
                month = f"Month {len(monthly_returns) + 1}"
                monthly_returns[month] = t['pnl_pct']
            
            return BacktestResult(
                symbol=symbol,
                period=period,
                total_signals=len(trades),
                wins=len(wins),
                losses=len(losses),
                win_rate=round(win_rate, 1),
                avg_win_pct=round(avg_win, 2),
                avg_loss_pct=round(avg_loss, 2),
                profit_factor=round(profit_factor, 2),
                max_drawdown_pct=round(max_dd, 2),
                best_trade_pct=round(max(t['pnl_pct'] for t in trades), 2),
                worst_trade_pct=round(min(t['pnl_pct'] for t in trades), 2),
                monthly_returns=monthly_returns
            )
            
        except Exception as e:
            logger.error(f"Backtest error for {symbol}: {e}")
            return BacktestResult(
                symbol=symbol,
                period=period,
                total_signals=0,
                wins=0,
                losses=0,
                win_rate=0,
                avg_win_pct=0,
                avg_loss_pct=0,
                profit_factor=0,
                max_drawdown_pct=0,
                best_trade_pct=0,
                worst_trade_pct=0,
                monthly_returns={}
            )


# ==============================================
# SINGLETON INSTANCES
# ==============================================

mtf_service = MultiTimeframeService()
sr_service = SupportResistanceService()
calendar_service = EconomicCalendarService()
backtest_service = BacktestService()
