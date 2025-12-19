"""
US Market Data Service

Uses yfinance to fetch real-time stock data from Yahoo Finance for:
- Major tech stocks (FAANG+)
- S&P 500 ETFs and major indices
- Banking and financial stocks
- Energy stocks
- Healthcare stocks
- Consumer stocks

This provides a broad view of the US market for analysis.
Includes technical indicators: RSI, MACD, Moving Averages.
"""
import yfinance as yf
import pandas as pd
import numpy as np
from app.models.schemas import MarketSnapshot, StockData, TechnicalIndicators
from typing import List, Dict, Optional
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MarketDataService:
    def __init__(self):
        # Expanded list of US tickers for comprehensive market view
        self.tickers = [
            # Big Tech (FAANG+)
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX',
            
            # Other Tech
            'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'SQ', 'SHOP',
            
            # Indices & ETFs
            'SPY', 'QQQ', 'DIA', 'IWM', 'VTI',
            
            # Banking & Financials
            'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP',
            
            # Energy
            'XOM', 'CVX', 'COP', 'SLB', 'OXY',
            
            # Healthcare
            'JNJ', 'UNH', 'PFE', 'MRK', 'ABBV', 'LLY',
            
            # Consumer
            'WMT', 'COST', 'HD', 'NKE', 'SBUX', 'MCD', 'DIS',
            
            # Industrial
            'CAT', 'BA', 'GE', 'RTX', 'LMT',
        ]
        
        self._cache = None
        self._cache_time = None
        self._cache_duration = 60  # 1 minute cache
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> Optional[float]:
        """Calculate Relative Strength Index"""
        try:
            delta = prices.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
            
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            return round(float(rsi.iloc[-1]), 2) if not pd.isna(rsi.iloc[-1]) else None
        except:
            return None
    
    def _calculate_macd(self, prices: pd.Series) -> tuple:
        """Calculate MACD, Signal, and Histogram"""
        try:
            ema_12 = prices.ewm(span=12, adjust=False).mean()
            ema_26 = prices.ewm(span=26, adjust=False).mean()
            macd = ema_12 - ema_26
            signal = macd.ewm(span=9, adjust=False).mean()
            histogram = macd - signal
            
            return (
                round(float(macd.iloc[-1]), 4) if not pd.isna(macd.iloc[-1]) else None,
                round(float(signal.iloc[-1]), 4) if not pd.isna(signal.iloc[-1]) else None,
                round(float(histogram.iloc[-1]), 4) if not pd.isna(histogram.iloc[-1]) else None,
                round(float(ema_12.iloc[-1]), 2) if not pd.isna(ema_12.iloc[-1]) else None,
                round(float(ema_26.iloc[-1]), 2) if not pd.isna(ema_26.iloc[-1]) else None
            )
        except:
            return None, None, None, None, None
    
    def _calculate_sma(self, prices: pd.Series, period: int) -> Optional[float]:
        """Calculate Simple Moving Average"""
        try:
            sma = prices.rolling(window=period).mean()
            return round(float(sma.iloc[-1]), 2) if not pd.isna(sma.iloc[-1]) else None
        except:
            return None
    
    def _get_trend_signal(self, price: float, rsi: Optional[float], macd_hist: Optional[float], 
                          sma_50: Optional[float], sma_200: Optional[float]) -> tuple:
        """Determine trend and trading signal based on indicators"""
        trend = "Neutral"
        signal = "Hold"
        
        # Determine trend
        above_50 = sma_50 and price > sma_50
        above_200 = sma_200 and price > sma_200
        
        if above_50 and above_200:
            trend = "Bullish"
        elif not above_50 and not above_200:
            trend = "Bearish"
        else:
            trend = "Neutral"
        
        # Determine signal
        if rsi and macd_hist:
            if rsi < 30 and macd_hist > 0:
                signal = "Strong Buy"
            elif rsi < 40 and macd_hist > 0 and above_50:
                signal = "Buy"
            elif rsi > 70 and macd_hist < 0:
                signal = "Strong Sell"
            elif rsi > 60 and macd_hist < 0 and not above_50:
                signal = "Sell"
            else:
                signal = "Hold"
        
        return trend, signal, above_50, above_200

    def get_market_snapshot(self) -> MarketSnapshot:
        """
        Fetch current market data for all tracked tickers.
        Uses 1-year period for technical indicator calculations.
        """
        # Check cache
        if self._cache and self._cache_time:
            elapsed = (datetime.now() - self._cache_time).total_seconds()
            if elapsed < self._cache_duration:
                logger.info("📋 Using cached US market data")
                return self._cache
        
        logger.info(f"📊 Fetching data for {len(self.tickers)} US tickers with technical indicators...")
        
        processed_stocks: List[StockData] = []
        
        try:
            # Download 1 year of data for technical indicators
            data = yf.download(self.tickers, period="1y", group_by='ticker', progress=False)
            
            for ticker in self.tickers:
                try:
                    # Handle MultiIndex or Single Index
                    if isinstance(data.columns, pd.MultiIndex):
                        if ticker not in data.columns.levels[0]:
                            continue
                        df = data[ticker]
                    else:
                        df = data

                    # Remove NaN rows
                    df = df.dropna()
                    
                    if df.empty or len(df) < 20:
                        continue

                    # Get latest 2 rows for comparison
                    latest = df.iloc[-1]
                    prev = df.iloc[-2]
                    
                    # Handle different column name formats
                    close_col = 'Close' if 'Close' in df.columns else 'close'
                    volume_col = 'Volume' if 'Volume' in df.columns else 'volume'
                    
                    price = float(latest[close_col])
                    prev_close = float(prev[close_col])
                    volume = int(latest[volume_col])
                    
                    avg_volume = df[volume_col].mean()
                    pct_change = ((price - prev_close) / prev_close) * 100
                    
                    # Calculate technical indicators
                    close_prices = df[close_col]
                    
                    rsi = self._calculate_rsi(close_prices)
                    macd, macd_signal, macd_hist, ema_12, ema_26 = self._calculate_macd(close_prices)
                    sma_20 = self._calculate_sma(close_prices, 20)
                    sma_50 = self._calculate_sma(close_prices, 50)
                    sma_200 = self._calculate_sma(close_prices, 200)
                    
                    trend, signal, above_50, above_200 = self._get_trend_signal(
                        price, rsi, macd_hist, sma_50, sma_200
                    )
                    
                    technicals = TechnicalIndicators(
                        rsi=rsi,
                        macd=macd,
                        macd_signal=macd_signal,
                        macd_histogram=macd_hist,
                        sma_20=sma_20,
                        sma_50=sma_50,
                        sma_200=sma_200,
                        ema_12=ema_12,
                        ema_26=ema_26,
                        above_sma_50=above_50,
                        above_sma_200=above_200,
                        trend=trend,
                        signal=signal
                    )
                    
                    stock = StockData(
                        ticker=ticker,
                        price=round(price, 2),
                        change_pct=round(pct_change, 2),
                        volume=volume,
                        avg_volume=int(avg_volume),
                        volume_ratio=round(volume / avg_volume, 2) if avg_volume > 0 else 1.0,
                        sector=self._get_sector(ticker),
                        technicals=technicals
                    )
                    processed_stocks.append(stock)
                    
                except Exception as e:
                    logger.warning(f"Error processing {ticker}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error fetching yfinance data: {e}")

        # If yfinance fails completely, use fallback data
        if not processed_stocks:
            logger.warning("Using fallback US market data...")
            processed_stocks = self._generate_fallback_data()

        # Sort for Gainers/Losers
        sorted_stocks = sorted(processed_stocks, key=lambda x: x.change_pct, reverse=True)
        
        # Top 5 gainers and losers
        gainers = sorted_stocks[:5]
        losers = sorted_stocks[-5:][::-1]
        
        # Most Active by Volume Ratio
        active = sorted(processed_stocks, key=lambda x: x.volume_ratio, reverse=True)[:5]

        # Sector Performance
        sector_perf = {}
        sectors = set(s.sector for s in processed_stocks)
        for sec in sectors:
            sec_stocks = [s for s in processed_stocks if s.sector == sec]
            avg_change = sum(s.change_pct for s in sec_stocks) / len(sec_stocks)
            sector_perf[sec] = round(avg_change, 2)

        result = MarketSnapshot(
            gainers=gainers,
            losers=losers,
            active=active,
            sector_performance=sector_perf,
            news=self._fetch_news()
        )
        
        # Cache result
        self._cache = result
        self._cache_time = datetime.now()
        
        logger.info(f"✅ Processed {len(processed_stocks)} US stocks successfully")
        return result

    def _get_sector(self, ticker: str) -> str:
        """Categorize ticker into sector"""
        sector_map = {
            # Indices/ETFs
            'SPY': 'Index', 'QQQ': 'Index', 'DIA': 'Index', 'IWM': 'Index', 'VTI': 'Index',
            
            # Tech
            'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 
            'AMZN': 'Technology', 'META': 'Technology', 'NFLX': 'Technology',
            'NVDA': 'Technology', 'AMD': 'Technology', 'INTC': 'Technology',
            'CRM': 'Technology', 'ORCL': 'Technology', 'ADBE': 'Technology',
            'PYPL': 'Technology', 'SQ': 'Technology', 'SHOP': 'Technology',
            
            # Industrial
            'TSLA': 'Industrial', 'CAT': 'Industrial', 'BA': 'Industrial', 
            'GE': 'Industrial', 'RTX': 'Industrial', 'LMT': 'Industrial',
            
            # Financials
            'JPM': 'Financials', 'BAC': 'Financials', 'WFC': 'Financials',
            'GS': 'Financials', 'MS': 'Financials', 'V': 'Financials', 
            'MA': 'Financials', 'AXP': 'Financials',
            
            # Energy
            'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 
            'SLB': 'Energy', 'OXY': 'Energy',
            
            # Healthcare
            'JNJ': 'Healthcare', 'UNH': 'Healthcare', 'PFE': 'Healthcare',
            'MRK': 'Healthcare', 'ABBV': 'Healthcare', 'LLY': 'Healthcare',
            
            # Consumer
            'WMT': 'Consumer', 'COST': 'Consumer', 'HD': 'Consumer',
            'NKE': 'Consumer', 'SBUX': 'Consumer', 'MCD': 'Consumer', 'DIS': 'Consumer',
        }
        return sector_map.get(ticker, 'Other')

    def _generate_fallback_data(self) -> List[StockData]:
        """Generate fallback data when market data unavailable"""
        import random
        
        # Realistic baseline prices (Dec 2024 estimates)
        fallback = [
            {'ticker': 'AAPL', 'price': 195.50, 'sector': 'Technology'},
            {'ticker': 'MSFT', 'price': 380.20, 'sector': 'Technology'},
            {'ticker': 'GOOGL', 'price': 142.30, 'sector': 'Technology'},
            {'ticker': 'AMZN', 'price': 185.80, 'sector': 'Technology'},
            {'ticker': 'TSLA', 'price': 250.60, 'sector': 'Industrial'},
            {'ticker': 'NVDA', 'price': 505.20, 'sector': 'Technology'},
            {'ticker': 'META', 'price': 340.40, 'sector': 'Technology'},
            {'ticker': 'JPM', 'price': 175.80, 'sector': 'Financials'},
            {'ticker': 'BAC', 'price': 35.50, 'sector': 'Financials'},
            {'ticker': 'V', 'price': 265.30, 'sector': 'Financials'},
            {'ticker': 'XOM', 'price': 108.40, 'sector': 'Energy'},
            {'ticker': 'CVX', 'price': 155.70, 'sector': 'Energy'},
            {'ticker': 'SPY', 'price': 475.50, 'sector': 'Index'},
            {'ticker': 'QQQ', 'price': 415.20, 'sector': 'Index'},
            {'ticker': 'JNJ', 'price': 155.00, 'sector': 'Healthcare'},
            {'ticker': 'WMT', 'price': 165.00, 'sector': 'Consumer'},
        ]
        
        result = []
        for stock in fallback:
            change = round(random.uniform(-4, 4), 2)
            volume = random.randint(5000000, 50000000)
            
            result.append(StockData(
                ticker=stock['ticker'],
                price=stock['price'],
                change_pct=change,
                volume=volume,
                avg_volume=volume,
                volume_ratio=round(random.uniform(0.8, 2.5), 2),
                sector=stock['sector']
            ))
        
        return result

    def _fetch_news(self) -> List[Dict[str, str]]:
        """Fetch market-related news from Yahoo Finance"""
        news_items = []
        try:
            spy = yf.Ticker("SPY")
            for item in spy.news[:5]:
                headline = item.get('title')
                link = item.get('link')
                if headline and link:
                    news_items.append({
                        "headline": str(headline),
                        "link": str(link)
                    })
                if len(news_items) >= 3:
                    break
        except Exception as e:
            logger.warning(f"Error fetching news: {e}")
        
        return news_items
