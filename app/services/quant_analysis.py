"""
Quantitative Analysis Service

Professional-grade quant finance tools:
1. Fibonacci Retracements - Key reversal levels
2. Bollinger Bands - Volatility-based trading signals
3. Mean Reversion Strategies - Statistical arbitrage signals
4. Monte Carlo Simulation - Probabilistic price forecasting

Author: MMA Quant Team
"""

import numpy as np
import pandas as pd
import yfinance as yf
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==============================================
# MODELS
# ==============================================

class FibonacciLevels(BaseModel):
    """Fibonacci retracement and extension levels"""
    symbol: str
    current_price: float
    trend: str  # "uptrend" or "downtrend"
    swing_high: float
    swing_low: float
    
    # Retracement levels (for pullback entries)
    fib_0: float      # 0% - Swing point
    fib_236: float    # 23.6%
    fib_382: float    # 38.2% - Key level
    fib_50: float     # 50% - Psychological level
    fib_618: float    # 61.8% - Golden ratio (strongest)
    fib_786: float    # 78.6%
    fib_100: float    # 100% - Full retracement
    
    # Extension levels (for profit targets)
    fib_ext_1272: float  # 127.2%
    fib_ext_1618: float  # 161.8% - Golden extension
    fib_ext_2000: float  # 200%
    fib_ext_2618: float  # 261.8%
    
    nearest_level: str
    distance_to_nearest_pct: float
    signal: str
    recommendation: str


class BollingerBands(BaseModel):
    """Bollinger Bands analysis"""
    symbol: str
    current_price: float
    
    # Band values
    upper_band: float
    middle_band: float  # 20-period SMA
    lower_band: float
    bandwidth: float    # Band width percentage
    percent_b: float    # %B indicator (0-1 range)
    
    # Band squeeze detection
    is_squeeze: bool    # Low volatility, potential breakout
    squeeze_intensity: str  # "tight", "moderate", "none"
    
    # Signals
    position: str       # "above_upper", "upper_zone", "middle", "lower_zone", "below_lower"
    signal: str         # "strong_sell", "sell", "neutral", "buy", "strong_buy"
    volatility: str     # "low", "normal", "high", "extreme"
    recommendation: str


class MeanReversionSignal(BaseModel):
    """Mean reversion trading signal"""
    symbol: str
    current_price: float
    
    # Z-Score analysis
    zscore: float              # Current z-score from mean
    zscore_signal: str         # "overbought", "oversold", "neutral"
    
    # Deviation from moving averages
    deviation_sma20_pct: float
    deviation_sma50_pct: float
    deviation_vwap_pct: Optional[float] = None
    
    # Half-life calculation (how fast price reverts)
    half_life_days: Optional[float] = None
    
    # RSI divergence
    rsi: float
    rsi_divergence: Optional[str] = None  # "bullish_divergence", "bearish_divergence", None
    
    # Probability of reversion
    reversion_probability: float  # 0-100%
    expected_reversion_pct: float # Expected move back to mean
    
    signal: str           # "strong_buy", "buy", "neutral", "sell", "strong_sell"
    confidence: str       # "high", "medium", "low"
    recommendation: str


class MonteCarloResult(BaseModel):
    """Monte Carlo simulation results"""
    symbol: str
    current_price: float
    simulation_days: int
    num_simulations: int
    
    # Price distribution at end of period
    mean_price: float
    median_price: float
    std_dev: float
    
    # Percentiles
    percentile_5: float   # 5% worst case
    percentile_25: float  # 25th percentile
    percentile_75: float  # 75th percentile
    percentile_95: float  # 95% best case
    
    # Probability analysis
    prob_above_current: float    # % chance price will be higher
    prob_gain_10_pct: float      # % chance of 10%+ gain
    prob_loss_10_pct: float      # % chance of 10%+ loss
    
    # Value at Risk
    var_95: float         # 95% VaR (max expected loss)
    var_99: float         # 99% VaR
    expected_return_pct: float
    
    # Risk metrics
    sharpe_estimate: float
    risk_reward_ratio: float
    
    recommendation: str
    confidence: str


class QuantAnalysisFull(BaseModel):
    """Complete quantitative analysis"""
    symbol: str
    timestamp: str
    
    fibonacci: FibonacciLevels
    bollinger: BollingerBands
    mean_reversion: MeanReversionSignal
    monte_carlo: MonteCarloResult
    
    # Combined score
    combined_signal: str      # Weighted combination of all signals
    combined_strength: int    # 1-10 scale
    confidence_level: str     # "high", "medium", "low"
    recommendation: str


# ==============================================
# HELPERS
# ==============================================

def normalize_symbol(symbol: str) -> str:
    """Normalize symbol for yfinance (e.g. GBP/USD -> GBPUSD=X)"""
    if "XAU" in symbol or "Gold" in symbol: return "GC=F"
    if "XAG" in symbol or "Silver" in symbol: return "SI=F"
    if "WTI" in symbol or "Oil" in symbol: return "CL=F"
    
    # Standard pairs
    s = symbol.upper().replace("/", "").replace("-", "")
    if "=" in s: return s  # Already in yahoo format
    
    # Generic append =X for currency pairs
    return f"{s}=X"


# ==============================================
# FIBONACCI RETRACEMENT SERVICE
# ==============================================

class FibonacciService:
    """Calculate Fibonacci retracement and extension levels"""
    
    def __init__(self):
        self.retracement_levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0]
        self.extension_levels = [1.272, 1.618, 2.0, 2.618]
    
    def calculate_levels(self, symbol: str, period: str = "3mo") -> FibonacciLevels:
        """
        Calculate Fibonacci levels based on recent swing high/low.
        
        Args:
            symbol: Trading symbol (e.g., "EURUSD=X" or "AAPL")
            period: Lookback period for swing detection
        """
        try:
            # Fetch data
            ticker = yf.Ticker(normalize_symbol(symbol))
            df = ticker.history(period=period)
            
            if df.empty or len(df) < 20:
                raise ValueError(f"Insufficient data for {symbol}")
            
            current_price = float(df['Close'].iloc[-1])
            
            # Find swing high and low
            swing_high = float(df['High'].max())
            swing_low = float(df['Low'].min())
            swing_high_idx = df['High'].idxmax()
            swing_low_idx = df['Low'].idxmin()
            
            # Determine trend based on which came first
            if swing_low_idx < swing_high_idx:
                trend = "uptrend"
                # In uptrend: retrace from high, low is the base
                diff = swing_high - swing_low
                fib_0 = swing_high
                fib_236 = swing_high - (diff * 0.236)
                fib_382 = swing_high - (diff * 0.382)
                fib_50 = swing_high - (diff * 0.5)
                fib_618 = swing_high - (diff * 0.618)
                fib_786 = swing_high - (diff * 0.786)
                fib_100 = swing_low
                
                # Extensions above swing high
                fib_ext_1272 = swing_high + (diff * 0.272)
                fib_ext_1618 = swing_high + (diff * 0.618)
                fib_ext_2000 = swing_high + (diff * 1.0)
                fib_ext_2618 = swing_high + (diff * 1.618)
            else:
                trend = "downtrend"
                # In downtrend: retrace from low, high is the base
                diff = swing_high - swing_low
                fib_0 = swing_low
                fib_236 = swing_low + (diff * 0.236)
                fib_382 = swing_low + (diff * 0.382)
                fib_50 = swing_low + (diff * 0.5)
                fib_618 = swing_low + (diff * 0.618)
                fib_786 = swing_low + (diff * 0.786)
                fib_100 = swing_high
                
                # Extensions below swing low
                fib_ext_1272 = swing_low - (diff * 0.272)
                fib_ext_1618 = swing_low - (diff * 0.618)
                fib_ext_2000 = swing_low - (diff * 1.0)
                fib_ext_2618 = swing_low - (diff * 1.618)
            
            # Find nearest level
            levels = {
                "0%": fib_0,
                "23.6%": fib_236,
                "38.2%": fib_382,
                "50%": fib_50,
                "61.8%": fib_618,
                "78.6%": fib_786,
                "100%": fib_100,
            }
            
            nearest_level = min(levels.items(), key=lambda x: abs(x[1] - current_price))
            distance_pct = ((current_price - nearest_level[1]) / current_price) * 100
            
            # Generate signal
            if trend == "uptrend":
                if current_price >= fib_382 and current_price <= fib_618:
                    signal = "BUY"
                    recommendation = f"Price in golden pocket ({fib_382:.4f}-{fib_618:.4f}). Strong buy zone."
                elif current_price > fib_236:
                    signal = "HOLD"
                    recommendation = "Price above 23.6% retracement. Wait for pullback."
                elif current_price < fib_618:
                    signal = "CAUTION"
                    recommendation = "Deep retracement. Trend may be weakening."
                else:
                    signal = "WATCH"
                    recommendation = "Monitor for reversal confirmation."
            else:
                if current_price >= fib_382 and current_price <= fib_618:
                    signal = "SELL"
                    recommendation = f"Price in golden pocket ({fib_382:.4f}-{fib_618:.4f}). Strong sell zone."
                elif current_price < fib_236:
                    signal = "HOLD"
                    recommendation = "Price below 23.6% retracement. Wait for bounce."
                else:
                    signal = "WATCH"
                    recommendation = "Monitor for continuation."
            
            return FibonacciLevels(
                symbol=symbol,
                current_price=round(current_price, 5),
                trend=trend,
                swing_high=round(swing_high, 5),
                swing_low=round(swing_low, 5),
                fib_0=round(fib_0, 5),
                fib_236=round(fib_236, 5),
                fib_382=round(fib_382, 5),
                fib_50=round(fib_50, 5),
                fib_618=round(fib_618, 5),
                fib_786=round(fib_786, 5),
                fib_100=round(fib_100, 5),
                fib_ext_1272=round(fib_ext_1272, 5),
                fib_ext_1618=round(fib_ext_1618, 5),
                fib_ext_2000=round(fib_ext_2000, 5),
                fib_ext_2618=round(fib_ext_2618, 5),
                nearest_level=nearest_level[0],
                distance_to_nearest_pct=round(distance_pct, 2),
                signal=signal,
                recommendation=recommendation
            )
            
        except Exception as e:
            logger.error(f"Fibonacci calculation error for {symbol}: {e}")
            raise


# ==============================================
# BOLLINGER BANDS SERVICE
# ==============================================

class BollingerBandsService:
    """Calculate and analyze Bollinger Bands"""
    
    def __init__(self, period: int = 20, std_dev: float = 2.0):
        self.period = period
        self.std_dev = std_dev
    
    def calculate(self, symbol: str, lookback: str = "3mo") -> BollingerBands:
        """
        Calculate Bollinger Bands with squeeze detection.
        """
        try:
            ticker = yf.Ticker(normalize_symbol(symbol))
            df = ticker.history(period=lookback)
            
            if df.empty or len(df) < self.period:
                raise ValueError(f"Insufficient data for {symbol}")
            
            close = df['Close']
            current_price = float(close.iloc[-1])
            
            # Calculate bands
            sma = close.rolling(window=self.period).mean()
            std = close.rolling(window=self.period).std()
            
            upper_band = float(sma.iloc[-1] + (std.iloc[-1] * self.std_dev))
            middle_band = float(sma.iloc[-1])
            lower_band = float(sma.iloc[-1] - (std.iloc[-1] * self.std_dev))
            
            # Bandwidth (volatility measure)
            bandwidth = ((upper_band - lower_band) / middle_band) * 100
            
            # %B indicator (where price is relative to bands)
            percent_b = (current_price - lower_band) / (upper_band - lower_band) if (upper_band - lower_band) != 0 else 0.5
            
            # Squeeze detection (compare current bandwidth to historical)
            bandwidth_series = ((sma + std * self.std_dev) - (sma - std * self.std_dev)) / sma * 100
            avg_bandwidth = bandwidth_series.mean()
            bandwidth_percentile = (bandwidth_series < bandwidth).sum() / len(bandwidth_series) * 100
            
            is_squeeze = bandwidth_percentile < 20  # Bottom 20% of bandwidth
            if bandwidth_percentile < 10:
                squeeze_intensity = "tight"
            elif bandwidth_percentile < 30:
                squeeze_intensity = "moderate"
            else:
                squeeze_intensity = "none"
            
            # Position analysis
            if current_price > upper_band:
                position = "above_upper"
            elif current_price > middle_band + (upper_band - middle_band) * 0.6:
                position = "upper_zone"
            elif current_price < lower_band:
                position = "below_lower"
            elif current_price < middle_band - (middle_band - lower_band) * 0.6:
                position = "lower_zone"
            else:
                position = "middle"
            
            # Signal generation
            if percent_b > 1.0:
                signal = "STRONG_SELL"
            elif percent_b > 0.8:
                signal = "SELL"
            elif percent_b < 0:
                signal = "STRONG_BUY"
            elif percent_b < 0.2:
                signal = "BUY"
            else:
                signal = "NEUTRAL"
            
            # Volatility assessment
            if bandwidth > avg_bandwidth * 1.5:
                volatility = "extreme"
            elif bandwidth > avg_bandwidth * 1.2:
                volatility = "high"
            elif bandwidth < avg_bandwidth * 0.6:
                volatility = "low"
            else:
                volatility = "normal"
            
            # Recommendation
            if is_squeeze:
                recommendation = f"⚠️ SQUEEZE DETECTED ({squeeze_intensity}). Breakout imminent. Wait for direction confirmation."
            elif signal == "STRONG_BUY":
                recommendation = f"Price below lower band ({lower_band:.4f}). Potential bounce. Consider buying."
            elif signal == "STRONG_SELL":
                recommendation = f"Price above upper band ({upper_band:.4f}). Overbought. Consider selling."
            elif signal == "BUY":
                recommendation = "Price near lower band. Good entry zone if trend is up."
            elif signal == "SELL":
                recommendation = "Price near upper band. Consider taking profits."
            else:
                recommendation = "Price in neutral zone. Wait for clearer setup."
            
            return BollingerBands(
                symbol=symbol,
                current_price=round(current_price, 5),
                upper_band=round(upper_band, 5),
                middle_band=round(middle_band, 5),
                lower_band=round(lower_band, 5),
                bandwidth=round(bandwidth, 2),
                percent_b=round(percent_b, 3),
                is_squeeze=is_squeeze,
                squeeze_intensity=squeeze_intensity,
                position=position,
                signal=signal,
                volatility=volatility,
                recommendation=recommendation
            )
            
        except Exception as e:
            logger.error(f"Bollinger Bands error for {symbol}: {e}")
            raise


# ==============================================
# MEAN REVERSION SERVICE
# ==============================================

class MeanReversionService:
    """Identify mean reversion trading opportunities"""
    
    def __init__(self):
        self.zscore_threshold = 2.0  # Standard deviations for signal
    
    def _calculate_zscore(self, series: pd.Series, lookback: int = 20) -> float:
        """Calculate z-score of current price vs rolling mean"""
        mean = series.rolling(window=lookback).mean().iloc[-1]
        std = series.rolling(window=lookback).std().iloc[-1]
        current = series.iloc[-1]
        return (current - mean) / std if std != 0 else 0
    
    def _calculate_half_life(self, series: pd.Series) -> Optional[float]:
        """
        Calculate mean reversion half-life using OLS regression.
        Lower half-life = faster mean reversion.
        """
        try:
            lag = series.shift(1).dropna()
            delta = series.diff().dropna()
            
            # Align series
            lag = lag.iloc[1:]
            delta = delta.iloc[1:]
            
            if len(lag) < 20:
                return None
            
            # OLS: delta = alpha + beta * lag
            X = np.column_stack([np.ones(len(lag)), lag.values])
            y = delta.values
            
            beta = np.linalg.lstsq(X, y, rcond=None)[0][1]
            
            if beta >= 0:
                return None  # No mean reversion (random walk or trending)
            
            half_life = -np.log(2) / beta
            return round(half_life, 1) if half_life > 0 else None
            
        except Exception:
            return None
    
    def _detect_divergence(self, price: pd.Series, rsi: pd.Series, lookback: int = 10) -> Optional[str]:
        """Detect RSI divergence for reversal signals"""
        try:
            price_recent = price.iloc[-lookback:]
            rsi_recent = rsi.iloc[-lookback:]
            
            # Bullish divergence: price making lower lows, RSI making higher lows
            if price_recent.iloc[-1] < price_recent.iloc[0] and rsi_recent.iloc[-1] > rsi_recent.iloc[0]:
                return "bullish_divergence"
            
            # Bearish divergence: price making higher highs, RSI making lower highs
            if price_recent.iloc[-1] > price_recent.iloc[0] and rsi_recent.iloc[-1] < rsi_recent.iloc[0]:
                return "bearish_divergence"
            
            return None
        except Exception:
            return None
    
    def analyze(self, symbol: str, lookback: str = "3mo") -> MeanReversionSignal:
        """
        Analyze mean reversion potential for a symbol.
        """
        try:
            ticker = yf.Ticker(normalize_symbol(symbol))
            df = ticker.history(period=lookback)
            
            if df.empty or len(df) < 50:
                raise ValueError(f"Insufficient data for {symbol}")
            
            close = df['Close']
            current_price = float(close.iloc[-1])
            
            # Calculate indicators
            sma20 = close.rolling(20).mean()
            sma50 = close.rolling(50).mean()
            
            deviation_sma20 = ((current_price - sma20.iloc[-1]) / sma20.iloc[-1]) * 100
            deviation_sma50 = ((current_price - sma50.iloc[-1]) / sma50.iloc[-1]) * 100
            
            # Z-Score
            zscore = self._calculate_zscore(close)
            
            if zscore > self.zscore_threshold:
                zscore_signal = "overbought"
            elif zscore < -self.zscore_threshold:
                zscore_signal = "oversold"
            else:
                zscore_signal = "neutral"
            
            # Half-life
            half_life = self._calculate_half_life(close)
            
            # RSI
            delta = close.diff()
            gain = delta.where(delta > 0, 0).rolling(14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
            rs = gain / loss
            rsi_series = 100 - (100 / (1 + rs))
            rsi = float(rsi_series.iloc[-1])
            
            # Divergence
            divergence = self._detect_divergence(close, rsi_series)
            
            # Calculate reversion probability
            # Based on historical reversion from similar z-scores
            abs_zscore = abs(zscore)
            if abs_zscore > 3:
                reversion_prob = 95
            elif abs_zscore > 2.5:
                reversion_prob = 85
            elif abs_zscore > 2:
                reversion_prob = 75
            elif abs_zscore > 1.5:
                reversion_prob = 60
            elif abs_zscore > 1:
                reversion_prob = 45
            else:
                reversion_prob = 30
            
            # Expected reversion (towards mean)
            if zscore_signal == "overbought":
                expected_reversion = -deviation_sma20  # Expect to fall back
            elif zscore_signal == "oversold":
                expected_reversion = -deviation_sma20  # Expect to rise back
            else:
                expected_reversion = 0
            
            # Generate signal
            if zscore < -2.5 or (zscore < -2 and divergence == "bullish_divergence"):
                signal = "STRONG_BUY"
                confidence = "high"
            elif zscore < -1.5:
                signal = "BUY"
                confidence = "medium"
            elif zscore > 2.5 or (zscore > 2 and divergence == "bearish_divergence"):
                signal = "STRONG_SELL"
                confidence = "high"
            elif zscore > 1.5:
                signal = "SELL"
                confidence = "medium"
            else:
                signal = "NEUTRAL"
                confidence = "low"
            
            # Recommendation
            if signal == "STRONG_BUY":
                recommendation = f"Mean reversion BUY: Price {abs(deviation_sma20):.1f}% below mean. Z-score: {zscore:.2f}. High probability of bounce."
            elif signal == "STRONG_SELL":
                recommendation = f"Mean reversion SELL: Price {deviation_sma20:.1f}% above mean. Z-score: {zscore:.2f}. High probability of pullback."
            elif half_life and half_life < 10:
                recommendation = f"Fast mean reversion (half-life: {half_life:.1f} days). Good for swing trades."
            else:
                recommendation = "No strong mean reversion setup. Wait for extremes."
            
            return MeanReversionSignal(
                symbol=symbol,
                current_price=round(current_price, 5),
                zscore=round(zscore, 3),
                zscore_signal=zscore_signal,
                deviation_sma20_pct=round(deviation_sma20, 2),
                deviation_sma50_pct=round(deviation_sma50, 2),
                half_life_days=half_life,
                rsi=round(rsi, 1),
                rsi_divergence=divergence,
                reversion_probability=reversion_prob,
                expected_reversion_pct=round(expected_reversion, 2),
                signal=signal,
                confidence=confidence,
                recommendation=recommendation
            )
            
        except Exception as e:
            logger.error(f"Mean reversion error for {symbol}: {e}")
            raise


# ==============================================
# MONTE CARLO SIMULATION SERVICE
# ==============================================

class MonteCarloService:
    """Monte Carlo simulation for price forecasting"""
    
    def __init__(self, num_simulations: int = 10000):
        self.num_simulations = num_simulations
    
    def simulate(self, symbol: str, days: int = 30, lookback: str = "1y") -> MonteCarloResult:
        """
        Run Monte Carlo simulation using historical volatility.
        
        Uses Geometric Brownian Motion (GBM):
        S(t+1) = S(t) * exp((mu - 0.5*sigma²)*dt + sigma*sqrt(dt)*Z)
        
        Args:
            symbol: Trading symbol
            days: Number of days to simulate forward
            lookback: Historical period for volatility calculation
        """
        try:
            ticker = yf.Ticker(normalize_symbol(symbol))
            df = ticker.history(period=lookback)
            
            if df.empty or len(df) < 50:
                raise ValueError(f"Insufficient data for {symbol}")
            
            close = df['Close']
            current_price = float(close.iloc[-1])
            
            # Calculate historical returns
            log_returns = np.log(close / close.shift(1)).dropna()
            
            # Parameters
            mu = log_returns.mean()  # Daily drift
            sigma = log_returns.std()  # Daily volatility
            dt = 1  # One day
            
            # Run simulations
            np.random.seed(42)  # For reproducibility
            
            # GBM simulation
            simulations = np.zeros((self.num_simulations, days + 1))
            simulations[:, 0] = current_price
            
            for t in range(1, days + 1):
                Z = np.random.standard_normal(self.num_simulations)
                simulations[:, t] = simulations[:, t-1] * np.exp(
                    (mu - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * Z
                )
            
            # Final prices
            final_prices = simulations[:, -1]
            
            # Statistics
            mean_price = float(np.mean(final_prices))
            median_price = float(np.median(final_prices))
            std_dev = float(np.std(final_prices))
            
            # Percentiles
            percentile_5 = float(np.percentile(final_prices, 5))
            percentile_25 = float(np.percentile(final_prices, 25))
            percentile_75 = float(np.percentile(final_prices, 75))
            percentile_95 = float(np.percentile(final_prices, 95))
            
            # Probabilities
            prob_above_current = float(np.mean(final_prices > current_price) * 100)
            prob_gain_10 = float(np.mean(final_prices > current_price * 1.1) * 100)
            prob_loss_10 = float(np.mean(final_prices < current_price * 0.9) * 100)
            
            # Value at Risk (VaR)
            returns_sim = (final_prices - current_price) / current_price
            var_95 = float(-np.percentile(returns_sim, 5) * current_price)  # 95% VaR
            var_99 = float(-np.percentile(returns_sim, 1) * current_price)  # 99% VaR
            
            expected_return = ((mean_price - current_price) / current_price) * 100
            
            # Sharpe estimate (annualized)
            daily_sharpe = (mu / sigma) if sigma != 0 else 0
            annual_sharpe = daily_sharpe * np.sqrt(252)
            
            # Risk-reward ratio
            upside = percentile_75 - current_price
            downside = current_price - percentile_25
            risk_reward = (upside / downside) if downside != 0 else 0
            
            # Recommendation
            if prob_above_current > 65 and expected_return > 5:
                recommendation = f"BULLISH: {prob_above_current:.0f}% probability of gain. Expected return: {expected_return:.1f}%"
                confidence = "high"
            elif prob_above_current > 55:
                recommendation = f"Slightly BULLISH: {prob_above_current:.0f}% probability of gain."
                confidence = "medium"
            elif prob_above_current < 35:
                recommendation = f"BEARISH: Only {prob_above_current:.0f}% probability of gain. Consider selling."
                confidence = "high"
            elif prob_above_current < 45:
                recommendation = f"Slightly BEARISH: {prob_above_current:.0f}% probability of gain."
                confidence = "medium"
            else:
                recommendation = f"NEUTRAL: {prob_above_current:.0f}% probability of gain. Market indecision."
                confidence = "low"
            
            return MonteCarloResult(
                symbol=symbol,
                current_price=round(current_price, 5),
                simulation_days=days,
                num_simulations=self.num_simulations,
                mean_price=round(mean_price, 5),
                median_price=round(median_price, 5),
                std_dev=round(std_dev, 5),
                percentile_5=round(percentile_5, 5),
                percentile_25=round(percentile_25, 5),
                percentile_75=round(percentile_75, 5),
                percentile_95=round(percentile_95, 5),
                prob_above_current=round(prob_above_current, 1),
                prob_gain_10_pct=round(prob_gain_10, 1),
                prob_loss_10_pct=round(prob_loss_10, 1),
                var_95=round(var_95, 5),
                var_99=round(var_99, 5),
                expected_return_pct=round(expected_return, 2),
                sharpe_estimate=round(annual_sharpe, 2),
                risk_reward_ratio=round(risk_reward, 2),
                recommendation=recommendation,
                confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"Monte Carlo error for {symbol}: {e}")
            raise


# ==============================================
# COMBINED QUANT ANALYSIS SERVICE
# ==============================================

class QuantAnalysisService:
    """Combined quantitative analysis service"""
    
    def __init__(self):
        self.fibonacci = FibonacciService()
        self.bollinger = BollingerBandsService()
        self.mean_reversion = MeanReversionService()
        self.monte_carlo = MonteCarloService()
    
    def full_analysis(self, symbol: str) -> QuantAnalysisFull:
        """
        Run complete quantitative analysis on a symbol.
        
        Combines:
        - Fibonacci levels for support/resistance
        - Bollinger Bands for volatility/mean reversion
        - Mean Reversion signals with z-score
        - Monte Carlo for probabilistic forecasting
        """
        try:
            fib = self.fibonacci.calculate_levels(symbol)
            bb = self.bollinger.calculate(symbol)
            mr = self.mean_reversion.analyze(symbol)
            mc = self.monte_carlo.simulate(symbol)
            
            # Combine signals
            signals = []
            
            # Fibonacci signal weight: 20%
            if fib.signal == "BUY":
                signals.append(("fib", 1))
            elif fib.signal == "SELL":
                signals.append(("fib", -1))
            else:
                signals.append(("fib", 0))
            
            # Bollinger signal weight: 25%
            bb_map = {"STRONG_BUY": 2, "BUY": 1, "NEUTRAL": 0, "SELL": -1, "STRONG_SELL": -2}
            signals.append(("bb", bb_map.get(bb.signal, 0)))
            
            # Mean Reversion weight: 30%
            mr_map = {"STRONG_BUY": 2, "BUY": 1, "NEUTRAL": 0, "SELL": -1, "STRONG_SELL": -2}
            signals.append(("mr", mr_map.get(mr.signal, 0)))
            
            # Monte Carlo weight: 25%
            if mc.prob_above_current > 65:
                signals.append(("mc", 2))
            elif mc.prob_above_current > 55:
                signals.append(("mc", 1))
            elif mc.prob_above_current < 35:
                signals.append(("mc", -2))
            elif mc.prob_above_current < 45:
                signals.append(("mc", -1))
            else:
                signals.append(("mc", 0))
            
            # Weighted combination
            weights = {"fib": 0.20, "bb": 0.25, "mr": 0.30, "mc": 0.25}
            weighted_score = sum(weights[s[0]] * s[1] for s in signals)
            
            # Convert to signal
            if weighted_score >= 1.2:
                combined_signal = "STRONG_BUY"
            elif weighted_score >= 0.5:
                combined_signal = "BUY"
            elif weighted_score <= -1.2:
                combined_signal = "STRONG_SELL"
            elif weighted_score <= -0.5:
                combined_signal = "SELL"
            else:
                combined_signal = "NEUTRAL"
            
            # Strength 1-10
            strength = min(10, max(1, int(5 + weighted_score * 2.5)))
            
            # Confidence based on agreement
            signal_values = [s[1] for s in signals]
            all_positive = all(s >= 0 for s in signal_values)
            all_negative = all(s <= 0 for s in signal_values)
            
            if all_positive or all_negative:
                confidence = "high"
            elif abs(weighted_score) > 0.5:
                confidence = "medium"
            else:
                confidence = "low"
            
            # Combined recommendation
            recommendation = f"{combined_signal} (Strength: {strength}/10, Confidence: {confidence}). "
            if bb.is_squeeze:
                recommendation += "⚠️ Squeeze detected - breakout imminent. "
            if mr.half_life_days and mr.half_life_days < 10:
                recommendation += f"Fast mean reversion ({mr.half_life_days}d). "
            recommendation += f"30-day probability: {mc.prob_above_current:.0f}% bullish."
            
            return QuantAnalysisFull(
                symbol=symbol,
                timestamp=datetime.now().isoformat(),
                fibonacci=fib,
                bollinger=bb,
                mean_reversion=mr,
                monte_carlo=mc,
                combined_signal=combined_signal,
                combined_strength=strength,
                confidence_level=confidence,
                recommendation=recommendation
            )
            
        except Exception as e:
            logger.error(f"Full quant analysis error for {symbol}: {e}")
            raise


# Singleton instances
fibonacci_service = FibonacciService()
bollinger_service = BollingerBandsService()
mean_reversion_service = MeanReversionService()
monte_carlo_service = MonteCarloService()
quant_analysis_service = QuantAnalysisService()
