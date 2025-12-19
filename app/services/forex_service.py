"""
Forex Market Data Service with Technical Analysis

Data Sources (in order of preference):
1. Twelve Data API - Real-time forex data (free: 800 requests/day)
2. Yahoo Finance (yfinance) - Delayed data fallback

Fetches real-time forex data and calculates:
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Moving Averages (SMA 20, 50)
- Trading Signals (Strong Buy, Buy, Hold, Sell, Strong Sell)

Major pairs tracked:
- EUR/USD, GBP/USD, USD/JPY (majors)
- USD/NGN, EUR/NGN, GBP/NGN (Nigerian Naira pairs)
- Gold, Silver, Oil (commodities)
"""
import yfinance as yf
import pandas as pd
import numpy as np
import requests
import os
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Twelve Data API key (optional - will fallback to Yahoo Finance if not set)
TWELVE_DATA_API_KEY = os.getenv('TWELVE_DATA_API_KEY', '')


class ForexTechnicals(BaseModel):
    """Technical indicators for a forex pair"""
    rsi: Optional[float] = None  # 0-100
    rsi_signal: Optional[str] = None  # Overbought, Oversold, Neutral
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_histogram: Optional[float] = None
    macd_trend: Optional[str] = None  # Bullish, Bearish
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    above_sma_20: Optional[bool] = None
    above_sma_50: Optional[bool] = None
    signal: Optional[str] = None  # Strong Buy, Buy, Hold, Sell, Strong Sell
    signal_strength: Optional[int] = None  # 1-5 (1=Strong Sell, 5=Strong Buy)


class ForexPair(BaseModel):
    """Forex currency pair data with technicals"""
    symbol: str  # e.g., "EUR/USD"
    name: str  # e.g., "Euro / US Dollar"
    price: float
    change: float  # Change in pips/points
    change_pct: float
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    category: str = "major"  # major, minor, exotic, commodity, naira
    trend: Optional[str] = None  # Bullish, Bearish, Neutral
    technicals: Optional[ForexTechnicals] = None
    analysis: Optional[str] = None  # AI analysis text
    data_source: str = "yahoo"  # "twelvedata" or "yahoo"
    

class ForexSnapshot(BaseModel):
    """Forex market snapshot"""
    pairs: List[ForexPair]
    major_pairs: List[ForexPair]
    naira_pairs: List[ForexPair]
    commodities: List[ForexPair]
    market_summary: str
    last_updated: str
    data_source: str = "yahoo"  # Primary data source used


class ForexService:
    def __init__(self):
        # Forex pairs configuration
        # Yahoo Finance symbols -> Twelve Data symbols mapping
        self.forex_pairs = {
            # Major pairs
            'EURUSD=X': {'symbol': 'EUR/USD', 'td_symbol': 'EUR/USD', 'name': 'Euro / US Dollar', 'category': 'major'},
            'GBPUSD=X': {'symbol': 'GBP/USD', 'td_symbol': 'GBP/USD', 'name': 'British Pound / US Dollar', 'category': 'major'},
            'USDJPY=X': {'symbol': 'USD/JPY', 'td_symbol': 'USD/JPY', 'name': 'US Dollar / Japanese Yen', 'category': 'major'},
            'USDCHF=X': {'symbol': 'USD/CHF', 'td_symbol': 'USD/CHF', 'name': 'US Dollar / Swiss Franc', 'category': 'major'},
            'AUDUSD=X': {'symbol': 'AUD/USD', 'td_symbol': 'AUD/USD', 'name': 'Australian Dollar / US Dollar', 'category': 'major'},
            'USDCAD=X': {'symbol': 'USD/CAD', 'td_symbol': 'USD/CAD', 'name': 'US Dollar / Canadian Dollar', 'category': 'major'},
            
            # Nigerian Naira pairs
            'USDNGN=X': {'symbol': 'USD/NGN', 'td_symbol': 'USD/NGN', 'name': 'US Dollar / Nigerian Naira', 'category': 'naira'},
            'EURNGN=X': {'symbol': 'EUR/NGN', 'td_symbol': 'EUR/NGN', 'name': 'Euro / Nigerian Naira', 'category': 'naira'},
            'GBPNGN=X': {'symbol': 'GBP/NGN', 'td_symbol': 'GBP/NGN', 'name': 'British Pound / Nigerian Naira', 'category': 'naira'},
            
            # Commodities
            'GC=F': {'symbol': 'XAU/USD', 'td_symbol': 'XAU/USD', 'name': 'Gold Spot', 'category': 'commodity'},
            'SI=F': {'symbol': 'XAG/USD', 'td_symbol': 'XAG/USD', 'name': 'Silver Spot', 'category': 'commodity'},
            'CL=F': {'symbol': 'WTI Oil', 'td_symbol': 'CL', 'name': 'Crude Oil WTI', 'category': 'commodity'},
        }
        
        self._cache = None
        self._cache_time = None
        self._cache_duration = 60  # 1 minute cache for more real-time data
        
        # Check if Twelve Data API is available
        self.twelve_data_available = bool(TWELVE_DATA_API_KEY)
        if self.twelve_data_available:
            logger.info("✅ Twelve Data API configured for real-time forex")
        else:
            logger.info("ℹ️ Twelve Data API not configured - using Yahoo Finance (delayed data)")
    
    def _fetch_twelve_data_prices(self) -> Dict[str, Dict]:
        """Fetch real-time prices from Twelve Data API"""
        if not TWELVE_DATA_API_KEY:
            return {}
        
        try:
            # Get symbols for Twelve Data
            symbols = [info['td_symbol'] for info in self.forex_pairs.values()]
            symbols_str = ','.join(symbols)
            
            url = f"https://api.twelvedata.com/price?symbol={symbols_str}&apikey={TWELVE_DATA_API_KEY}"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                logger.info("✅ Twelve Data real-time prices fetched")
                return data
            else:
                logger.warning(f"⚠️ Twelve Data API error: {response.status_code}")
                return {}
        except Exception as e:
            logger.warning(f"⚠️ Twelve Data fetch failed: {e}")
            return {}
    
    def _fetch_twelve_data_quote(self, symbol: str) -> Optional[Dict]:
        """Fetch detailed quote for a single symbol from Twelve Data"""
        if not TWELVE_DATA_API_KEY:
            return None
        
        try:
            url = f"https://api.twelvedata.com/quote?symbol={symbol}&apikey={TWELVE_DATA_API_KEY}"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            return None
        except:
            return None
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> tuple:
        """Calculate RSI and its signal"""
        try:
            delta = prices.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
            
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            rsi_value = float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None
            
            if rsi_value:
                if rsi_value >= 70:
                    signal = "Overbought"
                elif rsi_value <= 30:
                    signal = "Oversold"
                else:
                    signal = "Neutral"
                return round(rsi_value, 1), signal
            return None, None
        except:
            return None, None
    
    def _calculate_macd(self, prices: pd.Series) -> tuple:
        """Calculate MACD, Signal line, Histogram"""
        try:
            ema_12 = prices.ewm(span=12, adjust=False).mean()
            ema_26 = prices.ewm(span=26, adjust=False).mean()
            macd = ema_12 - ema_26
            signal = macd.ewm(span=9, adjust=False).mean()
            histogram = macd - signal
            
            macd_val = float(macd.iloc[-1]) if not pd.isna(macd.iloc[-1]) else None
            signal_val = float(signal.iloc[-1]) if not pd.isna(signal.iloc[-1]) else None
            hist_val = float(histogram.iloc[-1]) if not pd.isna(histogram.iloc[-1]) else None
            
            # Determine MACD trend
            trend = None
            if hist_val:
                if hist_val > 0 and histogram.iloc[-2] and hist_val > float(histogram.iloc[-2]):
                    trend = "Strong Bullish"
                elif hist_val > 0:
                    trend = "Bullish"
                elif hist_val < 0 and histogram.iloc[-2] and hist_val < float(histogram.iloc[-2]):
                    trend = "Strong Bearish"
                elif hist_val < 0:
                    trend = "Bearish"
            
            return (
                round(macd_val, 5) if macd_val else None,
                round(signal_val, 5) if signal_val else None,
                round(hist_val, 5) if hist_val else None,
                trend
            )
        except:
            return None, None, None, None
    
    def _calculate_sma(self, prices: pd.Series, period: int) -> Optional[float]:
        """Calculate Simple Moving Average"""
        try:
            sma = prices.rolling(window=period).mean()
            return round(float(sma.iloc[-1]), 5) if not pd.isna(sma.iloc[-1]) else None
        except:
            return None
    
    def _get_trading_signal(self, rsi: float, rsi_signal: str, macd_trend: str, 
                           above_20: bool, above_50: bool) -> tuple:
        """Generate trading signal based on all indicators"""
        score = 3  # Start at neutral (Hold)
        
        # RSI contribution (-1 to +1)
        if rsi:
            if rsi <= 30:
                score += 1  # Oversold = bullish
            elif rsi >= 70:
                score -= 1  # Overbought = bearish
        
        # MACD contribution (-1 to +1)
        if macd_trend:
            if "Strong Bullish" in macd_trend:
                score += 1.5
            elif "Bullish" in macd_trend:
                score += 0.5
            elif "Strong Bearish" in macd_trend:
                score -= 1.5
            elif "Bearish" in macd_trend:
                score -= 0.5
        
        # Moving Average contribution
        if above_20 and above_50:
            score += 0.5  # Price above both MAs = bullish
        elif not above_20 and not above_50:
            score -= 0.5  # Price below both MAs = bearish
        
        # Convert score to signal
        score = max(1, min(5, round(score)))  # Clamp to 1-5
        
        signals = {
            1: "Strong Sell",
            2: "Sell",
            3: "Hold",
            4: "Buy",
            5: "Strong Buy"
        }
        
        return signals[score], score
    
    def _generate_analysis(self, pair: ForexPair) -> str:
        """Generate trading analysis text"""
        t = pair.technicals
        if not t:
            return "Insufficient data for analysis. Please try again later."
        
        parts = []
        
        # RSI analysis
        if t.rsi:
            if t.rsi_signal == "Oversold":
                parts.append(f"RSI at {t.rsi} indicates OVERSOLD conditions - potential bounce opportunity")
            elif t.rsi_signal == "Overbought":
                parts.append(f"RSI at {t.rsi} shows OVERBOUGHT levels - caution on new longs")
            else:
                parts.append(f"RSI at {t.rsi} is neutral")
        
        # MACD analysis
        if t.macd_trend:
            if "Bullish" in t.macd_trend:
                parts.append(f"MACD shows {t.macd_trend.upper()} momentum - favor long positions")
            else:
                parts.append(f"MACD indicates {t.macd_trend.upper()} momentum - favor shorts")
        
        # MA analysis
        if t.above_sma_20 is not None and t.above_sma_50 is not None:
            if t.above_sma_20 and t.above_sma_50:
                parts.append("Price above 20 & 50 SMA = UPTREND confirmed")
            elif not t.above_sma_20 and not t.above_sma_50:
                parts.append("Price below 20 & 50 SMA = DOWNTREND confirmed")
            else:
                parts.append("Price between MAs = CONSOLIDATION phase")
        
        # Signal
        if t.signal:
            signal_emoji = {
                "Strong Buy": "🟢🟢",
                "Buy": "🟢",
                "Hold": "🟡",
                "Sell": "🔴",
                "Strong Sell": "🔴🔴"
            }
            parts.append(f"\n\n{signal_emoji.get(t.signal, '')} SIGNAL: {t.signal.upper()}")
        
        return " | ".join(parts) if parts else "Analysis unavailable"
    
    def get_forex_snapshot(self) -> ForexSnapshot:
        """Get current forex market snapshot with technical analysis
        
        Uses Twelve Data API for real-time prices (if configured),
        falls back to Yahoo Finance for historical data and technicals.
        """
        # Check cache
        if self._cache and self._cache_time:
            elapsed = (datetime.now() - self._cache_time).total_seconds()
            if elapsed < self._cache_duration:
                logger.info("📋 Using cached forex data")
                return self._cache
        
        logger.info(f"💱 Fetching forex data with technicals for {len(self.forex_pairs)} pairs...")
        
        pairs = []
        data_source = "yahoo"
        
        # Try to get real-time prices from Twelve Data
        twelve_data_prices = {}
        if self.twelve_data_available:
            twelve_data_prices = self._fetch_twelve_data_prices()
            if twelve_data_prices:
                data_source = "twelvedata"
        
        try:
            # Fetch 3 months of data for proper technical analysis (from Yahoo)
            tickers = list(self.forex_pairs.keys())
            data = yf.download(tickers, period="3mo", group_by='ticker', progress=False)
            
            for ticker, info in self.forex_pairs.items():
                try:
                    # Handle different DataFrame column formats from yfinance
                    if isinstance(data.columns, pd.MultiIndex):
                        # Check if ticker exists in either level of the MultiIndex
                        has_ticker = False
                        if hasattr(data.columns, 'levels'):
                            for level in data.columns.levels:
                                if ticker in level:
                                    has_ticker = True
                                    break
                        
                        if not has_ticker:
                            logger.debug(f"Ticker {ticker} not found in data")
                            continue
                        
                        # Try to get data for this ticker
                        try:
                            # New yfinance format: columns are ('Price', 'Ticker')
                            df = data.xs(ticker, axis=1, level='Ticker') if 'Ticker' in data.columns.names else data[ticker]
                        except (KeyError, TypeError):
                            try:
                                # Old format: columns are ('Ticker', 'Price')  
                                df = data[ticker]
                            except KeyError:
                                logger.debug(f"Could not extract data for {ticker}")
                                continue
                    else:
                        df = data
                    
                    df = df.dropna()
                    
                    if df.empty or len(df) < 30:  # Need enough data for technicals
                        logger.debug(f"Not enough data for {ticker}: {len(df)} rows")
                        continue
                    
                    close_col = 'Close' if 'Close' in df.columns else 'close'
                    high_col = 'High' if 'High' in df.columns else 'high'
                    low_col = 'Low' if 'Low' in df.columns else 'low'
                    
                    latest = df.iloc[-1]
                    prev = df.iloc[-2]
                    close_prices = df[close_col]
                    
                    # Use Twelve Data price if available, otherwise Yahoo price
                    td_symbol = info.get('td_symbol', info['symbol'])
                    if td_symbol in twelve_data_prices and 'price' in twelve_data_prices[td_symbol]:
                        price = float(twelve_data_prices[td_symbol]['price'])
                        pair_data_source = "twelvedata"
                    elif isinstance(twelve_data_prices.get(td_symbol), dict) and twelve_data_prices.get(td_symbol, {}).get('price'):
                        price = float(twelve_data_prices[td_symbol]['price'])
                        pair_data_source = "twelvedata"
                    else:
                        price = float(latest[close_col])
                        pair_data_source = "yahoo"
                    
                    prev_price = float(prev[close_col])
                    change = price - prev_price
                    change_pct = (change / prev_price) * 100
                    
                    # Calculate technical indicators (always from Yahoo historical data)
                    rsi, rsi_signal = self._calculate_rsi(close_prices)
                    macd, macd_sig, macd_hist, macd_trend = self._calculate_macd(close_prices)
                    sma_20 = self._calculate_sma(close_prices, 20)
                    sma_50 = self._calculate_sma(close_prices, 50)
                    
                    above_20 = sma_20 and price > sma_20
                    above_50 = sma_50 and price > sma_50
                    
                    # Get trading signal
                    signal, signal_strength = self._get_trading_signal(
                        rsi, rsi_signal, macd_trend, above_20, above_50
                    )
                    
                    # Determine trend
                    trend = "Bullish" if change_pct > 0.1 else "Bearish" if change_pct < -0.1 else "Neutral"
                    
                    # Get 24h high/low
                    high_24h = float(df[high_col].iloc[-5:].max())
                    low_24h = float(df[low_col].iloc[-5:].min())
                    
                    technicals = ForexTechnicals(
                        rsi=rsi,
                        rsi_signal=rsi_signal,
                        macd=macd,
                        macd_signal=macd_sig,
                        macd_histogram=macd_hist,
                        macd_trend=macd_trend,
                        sma_20=sma_20,
                        sma_50=sma_50,
                        above_sma_20=above_20,
                        above_sma_50=above_50,
                        signal=signal,
                        signal_strength=signal_strength
                    )
                    
                    precision = 5 if info['category'] != 'commodity' else 2
                    if 'NGN' in info['symbol']:
                        precision = 2
                    
                    pair_obj = ForexPair(
                        symbol=info['symbol'],
                        name=info['name'],
                        price=round(price, precision),
                        change=round(change, precision),
                        change_pct=round(change_pct, 2),
                        high_24h=round(high_24h, precision),
                        low_24h=round(low_24h, precision),
                        category=info['category'],
                        trend=trend,
                        technicals=technicals,
                        data_source=pair_data_source
                    )
                    
                    # Generate analysis
                    pair_obj.analysis = self._generate_analysis(pair_obj)
                    
                    pairs.append(pair_obj)
                    
                except Exception as e:
                    logger.warning(f"Error processing {ticker}: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error fetching forex data: {e}")
        
        # If no data, use fallback
        if not pairs:
            pairs = self._get_fallback_data()
        
        # Categorize pairs
        major_pairs = [p for p in pairs if p.category == 'major']
        naira_pairs = [p for p in pairs if p.category == 'naira']
        commodities = [p for p in pairs if p.category == 'commodity']
        
        # Calculate market summary
        avg_change = sum(p.change_pct for p in major_pairs) / len(major_pairs) if major_pairs else 0
        buy_signals = sum(1 for p in pairs if p.technicals and p.technicals.signal_strength >= 4)
        sell_signals = sum(1 for p in pairs if p.technicals and p.technicals.signal_strength <= 2)
        
        source_note = " (Real-time)" if data_source == "twelvedata" else " (Delayed ~15min)"
        
        if avg_change > 0.1:
            mood = f"💹 USD weakening - {buy_signals} buy signals{source_note}"
        elif avg_change < -0.1:
            mood = f"📉 USD strengthening - {sell_signals} sell signals{source_note}"
        else:
            mood = f"➡️ USD stable - mixed signals ({buy_signals} buy, {sell_signals} sell){source_note}"
        
        result = ForexSnapshot(
            pairs=pairs,
            major_pairs=major_pairs,
            naira_pairs=naira_pairs,
            commodities=commodities,
            market_summary=mood,
            last_updated=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            data_source=data_source
        )
        
        # Cache result
        self._cache = result
        self._cache_time = datetime.now()
        
        logger.info(f"✅ Processed {len(pairs)} forex pairs (source: {data_source})")
        return result
    
    def _get_fallback_data(self) -> List[ForexPair]:
        """Fallback forex data when API fails"""
        fallback_tech = ForexTechnicals(
            rsi=55.0, rsi_signal="Neutral",
            macd=0.001, macd_signal=0.0008, macd_histogram=0.0002, macd_trend="Bullish",
            sma_20=1.0500, sma_50=1.0480, above_sma_20=True, above_sma_50=True,
            signal="Hold", signal_strength=3
        )
        return [
            ForexPair(symbol="EUR/USD", name="Euro / US Dollar", price=1.0512, change=0.0015, change_pct=0.14, 
                     category="major", trend="Bullish", technicals=fallback_tech, analysis="RSI neutral | MACD bullish | SIGNAL: HOLD"),
            ForexPair(symbol="GBP/USD", name="British Pound / US Dollar", price=1.2650, change=-0.0020, change_pct=-0.16, 
                     category="major", trend="Bearish", technicals=fallback_tech, analysis="Slight bearish pressure"),
            ForexPair(symbol="USD/JPY", name="US Dollar / Japanese Yen", price=149.50, change=0.45, change_pct=0.30, 
                     category="major", trend="Bullish", technicals=fallback_tech, analysis="Yen weakness continues"),
            ForexPair(symbol="USD/NGN", name="US Dollar / Nigerian Naira", price=1550.00, change=5.00, change_pct=0.32, 
                     category="naira", trend="Bullish", technicals=fallback_tech, analysis="Naira under pressure"),
            ForexPair(symbol="XAU/USD", name="Gold Spot", price=2035.50, change=12.50, change_pct=0.62, 
                     category="commodity", trend="Bullish", technicals=fallback_tech, analysis="Gold showing strength"),
        ]
    
    def get_historical_data(self, symbol: str, period: str = "3mo") -> Optional[Dict]:
        """
        Get real historical data for a forex pair for charting.
        
        Args:
            symbol: The forex pair symbol (e.g., "EUR/USD")
            period: Time period - "1d", "5d", "1mo", "3mo", "6mo", "1y"
                    For intraday: "1d" = 1 day (1-minute bars), "5d" = 5 days (5-minute bars)
            
        Returns:
            Dictionary with dates, prices, SMAs, RSI, MACD, Fibonacci levels
        """
        # Find the Yahoo Finance ticker for this symbol
        yahoo_ticker = None
        for ticker, info in self.forex_pairs.items():
            if info['symbol'] == symbol:
                yahoo_ticker = ticker
                break
        
        if not yahoo_ticker:
            logger.warning(f"Symbol {symbol} not found in forex pairs")
            return None
        
        try:
            logger.info(f"📊 Fetching historical data for {symbol} ({yahoo_ticker}) - period: {period}")
            
            # Determine interval based on period
            # For intraday data, we need to specify interval
            interval = "1d"  # Default daily
            if period == "1h":
                period = "1d"  # Yahoo uses period for how far back
                interval = "1m"  # 1-minute bars for 1 hour (limited to 1 day period)
            elif period == "1d":
                interval = "5m"  # 5-minute bars for 1 day
            elif period == "1wk":
                period = "5d"  # Use 5 days for 1 week period
                interval = "15m"  # 15-minute bars for 1 week
            elif period == "1mo":
                interval = "1h"  # Hourly for 1 month
            
            # Fetch data from Yahoo Finance
            data = yf.download(yahoo_ticker, period=period, interval=interval, progress=False)
            
            if data.empty or len(data) < 20:
                logger.warning(f"Insufficient data for {symbol}")
                return None
            
            # Handle multi-level columns from yfinance
            if hasattr(data.columns, 'levels'):
                data.columns = data.columns.droplevel(1)
            
            close_prices = data['Close'].dropna()
            
            # Calculate technical indicators
            sma_20 = close_prices.rolling(window=20).mean()
            sma_50 = close_prices.rolling(window=50).mean()
            
            # Calculate RSI
            delta = close_prices.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            
            # Calculate MACD
            ema_12 = close_prices.ewm(span=12, adjust=False).mean()
            ema_26 = close_prices.ewm(span=26, adjust=False).mean()
            macd = ema_12 - ema_26
            macd_signal = macd.ewm(span=9, adjust=False).mean()
            macd_histogram = macd - macd_signal
            
            # Calculate Fibonacci levels
            high_price = float(close_prices.max())
            low_price = float(close_prices.min())
            fib_range = high_price - low_price
            
            fib_levels = {
                'fib0': high_price,
                'fib236': high_price - fib_range * 0.236,
                'fib382': high_price - fib_range * 0.382,
                'fib50': high_price - fib_range * 0.5,
                'fib618': high_price - fib_range * 0.618,
                'fib786': high_price - fib_range * 0.786,
                'fib100': low_price
            }
            
            # Prepare data for frontend
            # More data points for intraday, less for daily/weekly
            if interval in ['1m']:
                data_points = min(60, len(close_prices))  # ~1 hour of 1-min bars
                date_format = '%H:%M'  # Just time for intraday
            elif interval in ['5m', '15m']:
                data_points = min(100, len(close_prices))  # Good for day/week views
                date_format = '%m/%d %H:%M'
            elif interval == '1h':
                data_points = min(80, len(close_prices))
                date_format = '%m/%d %H:%M'
            else:
                data_points = min(60, len(close_prices))
                date_format = '%Y-%m-%d'
            
            result = {
                'symbol': symbol,
                'period': period,
                'interval': interval,
                'data_points': data_points,
                'dates': [d.strftime(date_format) for d in close_prices.index[-data_points:]],
                'prices': [round(float(p), 5) for p in close_prices.values[-data_points:]],
                'sma_20': [round(float(p), 5) if not pd.isna(p) else None for p in sma_20.values[-data_points:]],
                'sma_50': [round(float(p), 5) if not pd.isna(p) else None for p in sma_50.values[-data_points:]],
                'rsi': [round(float(p), 1) if not pd.isna(p) else None for p in rsi.values[-data_points:]],
                'macd': [round(float(p), 6) if not pd.isna(p) else None for p in macd.values[-data_points:]],
                'macd_signal': [round(float(p), 6) if not pd.isna(p) else None for p in macd_signal.values[-data_points:]],
                'macd_histogram': [round(float(p), 6) if not pd.isna(p) else None for p in macd_histogram.values[-data_points:]],
                'fibonacci': fib_levels,
                'high': high_price,
                'low': low_price,
                'current_price': round(float(close_prices.iloc[-1]), 5),
                'fetched_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            logger.info(f"✅ Historical data fetched: {data_points} points for {symbol} ({interval} interval)")
            return result
            
        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {e}")
            return None

 
# Singleton instance
forex_service = ForexService()
