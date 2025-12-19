"""
Stock Analysis Service

Provides individual stock analysis similar to forex:
- Real-time stock data via yfinance
- Technical analysis (RSI, MACD, SMA)
- AI-powered signals
- Support/Resistance levels
- Multi-timeframe analysis
- Backtesting
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pydantic import BaseModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==============================================
# MODELS
# ==============================================

class StockTechnicals(BaseModel):
    """Technical indicators for a stock"""
    rsi: Optional[float] = None
    rsi_signal: Optional[str] = None
    macd: Optional[float] = None
    macd_signal_line: Optional[float] = None
    macd_histogram: Optional[float] = None
    macd_trend: Optional[str] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    above_sma_20: Optional[bool] = None
    above_sma_50: Optional[bool] = None
    above_sma_200: Optional[bool] = None
    signal: Optional[str] = None  # Strong Buy, Buy, Hold, Sell, Strong Sell
    signal_strength: Optional[int] = None  # 1-5


class StockData(BaseModel):
    """Stock data with analysis"""
    symbol: str
    name: str
    price: float
    change: float
    change_pct: float
    volume: Optional[int] = None
    avg_volume: Optional[int] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    prev_close: Optional[float] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    technicals: Optional[StockTechnicals] = None
    analysis: Optional[str] = None
    recommendation: Optional[str] = None


class StockSupportResistance(BaseModel):
    """Support and resistance levels for stocks"""
    symbol: str
    current_price: float
    support_1: float
    support_2: float
    resistance_1: float
    resistance_2: float
    pivot_point: float
    high_52w: float
    low_52w: float
    price_position: str
    distance_to_52w_high_pct: float
    distance_to_52w_low_pct: float


class StockBacktest(BaseModel):
    """Stock backtesting results"""
    symbol: str
    period: str
    total_signals: int
    wins: int
    losses: int
    win_rate: float
    avg_win_pct: float
    avg_loss_pct: float
    profit_factor: float
    max_drawdown_pct: float
    total_return_pct: float


# ==============================================
# STOCK ANALYSIS SERVICE
# ==============================================

class StockAnalysisService:
    """Analyze individual stocks with technical indicators"""
    
    def __init__(self):
        self.popular_stocks = [
            "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
            "JPM", "V", "JNJ", "WMT", "PG", "XOM", "BAC", "DIS"
        ]
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> float:
        """Calculate RSI"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1] if not rsi.empty and not pd.isna(rsi.iloc[-1]) else 50
    
    def _calculate_macd(self, prices: pd.Series) -> Dict:
        """Calculate MACD"""
        exp1 = prices.ewm(span=12, adjust=False).mean()
        exp2 = prices.ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        histogram = macd - signal
        
        macd_val = macd.iloc[-1] if not macd.empty else 0
        signal_val = signal.iloc[-1] if not signal.empty else 0
        hist_val = histogram.iloc[-1] if not histogram.empty else 0
        
        if macd_val > signal_val:
            trend = "Bullish" if macd_val > 0 else "Weak Bullish"
        else:
            trend = "Bearish" if macd_val < 0 else "Weak Bearish"
        
        return {
            "macd": macd_val,
            "signal": signal_val,
            "histogram": hist_val,
            "trend": trend
        }
    
    def _get_signal(self, rsi: float, macd_trend: str, price: float, 
                    sma20: float, sma50: float, sma200: float) -> tuple:
        """Determine signal from indicators"""
        score = 3  # Start neutral
        
        # RSI contribution (stocks use different thresholds than forex)
        if rsi < 30:
            score += 1.5  # Oversold
        elif rsi > 70:
            score -= 1.5  # Overbought
        elif rsi < 40:
            score += 0.5
        elif rsi > 60:
            score -= 0.5
        
        # MACD contribution
        if "Bullish" in macd_trend:
            score += 1 if "Weak" not in macd_trend else 0.5
        elif "Bearish" in macd_trend:
            score -= 1 if "Weak" not in macd_trend else 0.5
        
        # SMA contribution (trend analysis)
        if price > sma20 > sma50:
            score += 0.5  # Uptrend
        elif price < sma20 < sma50:
            score -= 0.5  # Downtrend
        
        # Long-term trend (200 SMA is important for stocks)
        if price > sma200:
            score += 0.5  # Above 200 SMA is bullish
        else:
            score -= 0.5  # Below 200 SMA is bearish
        
        score = max(1, min(5, round(score)))
        signals = {1: "Strong Sell", 2: "Sell", 3: "Hold", 4: "Buy", 5: "Strong Buy"}
        
        return signals[score], score
    
    def search_stock(self, symbol: str) -> Optional[StockData]:
        """Search and analyze a stock by symbol"""
        try:
            symbol = symbol.upper().strip()
            ticker = yf.Ticker(symbol)
            
            # Get stock info
            info = ticker.info
            if not info or 'regularMarketPrice' not in info:
                # Try to get basic data
                hist = ticker.history(period="5d")
                if hist.empty:
                    logger.warning(f"No data found for {symbol}")
                    return None
            
            # Get historical data for technicals
            hist = ticker.history(period="1y")
            if hist.empty:
                return None
            
            close = hist['Close']
            current_price = close.iloc[-1]
            prev_close = info.get('previousClose', close.iloc[-2] if len(close) > 1 else current_price)
            
            change = current_price - prev_close
            change_pct = (change / prev_close) * 100 if prev_close else 0
            
            # Calculate technical indicators
            rsi = self._calculate_rsi(close)
            macd_data = self._calculate_macd(close)
            
            sma20 = close.rolling(window=20).mean().iloc[-1] if len(close) >= 20 else current_price
            sma50 = close.rolling(window=50).mean().iloc[-1] if len(close) >= 50 else current_price
            sma200 = close.rolling(window=200).mean().iloc[-1] if len(close) >= 200 else current_price
            
            # Get signal
            signal, strength = self._get_signal(rsi, macd_data['trend'], current_price, sma20, sma50, sma200)
            
            # RSI signal
            if rsi < 30:
                rsi_signal = "Oversold"
            elif rsi > 70:
                rsi_signal = "Overbought"
            else:
                rsi_signal = "Neutral"
            
            technicals = StockTechnicals(
                rsi=round(rsi, 1),
                rsi_signal=rsi_signal,
                macd=round(macd_data['macd'], 4),
                macd_signal_line=round(macd_data['signal'], 4),
                macd_histogram=round(macd_data['histogram'], 4),
                macd_trend=macd_data['trend'],
                sma_20=round(sma20, 2),
                sma_50=round(sma50, 2),
                sma_200=round(sma200, 2),
                above_sma_20=current_price > sma20,
                above_sma_50=current_price > sma50,
                above_sma_200=current_price > sma200,
                signal=signal,
                signal_strength=strength
            )
            
            # Generate analysis text
            analysis_parts = []
            analysis_parts.append(f"RSI at {rsi:.1f} indicates {rsi_signal.lower()} conditions.")
            analysis_parts.append(f"MACD shows {macd_data['trend'].lower()} momentum.")
            
            if current_price > sma200:
                analysis_parts.append("Trading above 200 SMA - long-term bullish.")
            else:
                analysis_parts.append("Trading below 200 SMA - long-term bearish.")
            
            return StockData(
                symbol=symbol,
                name=info.get('longName', info.get('shortName', symbol)),
                price=round(current_price, 2),
                change=round(change, 2),
                change_pct=round(change_pct, 2),
                volume=info.get('volume'),
                avg_volume=info.get('averageVolume'),
                market_cap=info.get('marketCap'),
                pe_ratio=info.get('trailingPE'),
                dividend_yield=info.get('dividendYield'),
                high_52w=info.get('fiftyTwoWeekHigh'),
                low_52w=info.get('fiftyTwoWeekLow'),
                day_high=info.get('dayHigh'),
                day_low=info.get('dayLow'),
                prev_close=prev_close,
                sector=info.get('sector'),
                industry=info.get('industry'),
                technicals=technicals,
                analysis=" ".join(analysis_parts),
                recommendation=signal
            )
            
        except Exception as e:
            logger.error(f"Error searching stock {symbol}: {e}")
            return None
    
    def get_support_resistance(self, symbol: str) -> Optional[StockSupportResistance]:
        """Calculate support/resistance levels for a stock"""
        try:
            ticker = yf.Ticker(symbol.upper())
            hist = ticker.history(period="3mo")
            info = ticker.info
            
            if hist.empty:
                return None
            
            high = hist['High']
            low = hist['Low']
            close = hist['Close']
            
            current_price = close.iloc[-1]
            
            # Pivot points
            yesterday_high = high.iloc[-2]
            yesterday_low = low.iloc[-2]
            yesterday_close = close.iloc[-2]
            
            pivot = (yesterday_high + yesterday_low + yesterday_close) / 3
            r1 = (2 * pivot) - yesterday_low
            s1 = (2 * pivot) - yesterday_high
            r2 = pivot + (yesterday_high - yesterday_low)
            s2 = pivot - (yesterday_high - yesterday_low)
            
            # 52-week levels
            high_52w = info.get('fiftyTwoWeekHigh', high.max())
            low_52w = info.get('fiftyTwoWeekLow', low.min())
            
            # Distance calculations
            dist_high = ((high_52w - current_price) / current_price) * 100
            dist_low = ((current_price - low_52w) / current_price) * 100
            
            # Position
            range_size = r1 - s1
            if range_size > 0:
                position_pct = (current_price - s1) / range_size
                if position_pct <= 0.2:
                    position = "Near Support"
                elif position_pct >= 0.8:
                    position = "Near Resistance"
                else:
                    position = "Mid-Range"
            else:
                position = "Mid-Range"
            
            return StockSupportResistance(
                symbol=symbol.upper(),
                current_price=round(current_price, 2),
                support_1=round(s1, 2),
                support_2=round(s2, 2),
                resistance_1=round(r1, 2),
                resistance_2=round(r2, 2),
                pivot_point=round(pivot, 2),
                high_52w=round(high_52w, 2),
                low_52w=round(low_52w, 2),
                price_position=position,
                distance_to_52w_high_pct=round(dist_high, 2),
                distance_to_52w_low_pct=round(dist_low, 2)
            )
            
        except Exception as e:
            logger.error(f"Error getting S/R for {symbol}: {e}")
            return None
    
    def backtest_stock(self, symbol: str, period: str = "2y") -> Optional[StockBacktest]:
        """Backtest trading signals on stock"""
        try:
            ticker = yf.Ticker(symbol.upper())
            hist = ticker.history(period=period)
            
            if hist.empty or len(hist) < 100:
                return None
            
            close = hist['Close']
            
            # Calculate indicators
            rsi = self._calculate_rsi_series(close)
            macd_hist = self._calculate_macd_series(close)
            
            # Generate signals
            trades = []
            position = None
            
            for i in range(50, len(close)):
                current_rsi = rsi.iloc[i] if not pd.isna(rsi.iloc[i]) else 50
                current_macd = macd_hist.iloc[i] if not pd.isna(macd_hist.iloc[i]) else 0
                prev_macd = macd_hist.iloc[i-1] if not pd.isna(macd_hist.iloc[i-1]) else 0
                
                # Buy signal
                if position is None and current_rsi < 35 and current_macd > prev_macd:
                    position = {'entry': close.iloc[i], 'type': 'long'}
                
                # Sell signal
                elif position is None and current_rsi > 65 and current_macd < prev_macd:
                    position = {'entry': close.iloc[i], 'type': 'short'}
                
                # Exit conditions
                elif position is not None:
                    entry = position['entry']
                    current = close.iloc[i]
                    
                    if position['type'] == 'long':
                        pnl = ((current - entry) / entry) * 100
                    else:
                        pnl = ((entry - current) / entry) * 100
                    
                    # Exit on 5% TP or 3% SL (stocks have wider ranges)
                    if pnl >= 5 or pnl <= -3:
                        trades.append({
                            'pnl': pnl,
                            'result': 'Win' if pnl > 0 else 'Loss'
                        })
                        position = None
            
            if not trades:
                return StockBacktest(
                    symbol=symbol.upper(),
                    period=period,
                    total_signals=0,
                    wins=0,
                    losses=0,
                    win_rate=0,
                    avg_win_pct=0,
                    avg_loss_pct=0,
                    profit_factor=0,
                    max_drawdown_pct=0,
                    total_return_pct=0
                )
            
            wins = [t for t in trades if t['result'] == 'Win']
            losses = [t for t in trades if t['result'] == 'Loss']
            
            win_rate = (len(wins) / len(trades)) * 100
            avg_win = sum(t['pnl'] for t in wins) / len(wins) if wins else 0
            avg_loss = sum(t['pnl'] for t in losses) / len(losses) if losses else 0
            
            total_wins = sum(t['pnl'] for t in wins)
            total_losses = abs(sum(t['pnl'] for t in losses))
            profit_factor = total_wins / total_losses if total_losses > 0 else 999
            
            total_return = sum(t['pnl'] for t in trades)
            
            # Max drawdown
            cumulative = 0
            peak = 0
            max_dd = 0
            for t in trades:
                cumulative += t['pnl']
                peak = max(peak, cumulative)
                dd = peak - cumulative
                max_dd = max(max_dd, dd)
            
            return StockBacktest(
                symbol=symbol.upper(),
                period=period,
                total_signals=len(trades),
                wins=len(wins),
                losses=len(losses),
                win_rate=round(win_rate, 1),
                avg_win_pct=round(avg_win, 2),
                avg_loss_pct=round(avg_loss, 2),
                profit_factor=round(profit_factor, 2),
                max_drawdown_pct=round(max_dd, 2),
                total_return_pct=round(total_return, 2)
            )
            
        except Exception as e:
            logger.error(f"Error backtesting {symbol}: {e}")
            return None
    
    def _calculate_rsi_series(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI as a series"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def _calculate_macd_series(self, prices: pd.Series) -> pd.Series:
        """Calculate MACD histogram as series"""
        exp1 = prices.ewm(span=12, adjust=False).mean()
        exp2 = prices.ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        return macd - signal


# Singleton instance
stock_analysis_service = StockAnalysisService()
