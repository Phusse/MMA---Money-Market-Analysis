from pydantic import BaseModel
from typing import List, Dict, Optional


class TechnicalIndicators(BaseModel):
    """Technical analysis indicators for a stock"""
    rsi: Optional[float] = None  # Relative Strength Index (0-100)
    macd: Optional[float] = None  # MACD line value
    macd_signal: Optional[float] = None  # MACD signal line
    macd_histogram: Optional[float] = None  # MACD histogram
    sma_20: Optional[float] = None  # 20-day Simple Moving Average
    sma_50: Optional[float] = None  # 50-day Simple Moving Average
    sma_200: Optional[float] = None  # 200-day Simple Moving Average
    ema_12: Optional[float] = None  # 12-day Exponential Moving Average
    ema_26: Optional[float] = None  # 26-day Exponential Moving Average
    above_sma_50: Optional[bool] = None  # Price above 50-day MA
    above_sma_200: Optional[bool] = None  # Price above 200-day MA
    trend: Optional[str] = None  # "Bullish", "Bearish", "Neutral"
    signal: Optional[str] = None  # "Buy", "Sell", "Hold"


class StockData(BaseModel):
    ticker: str
    price: float
    change_pct: float
    volume: int
    avg_volume: int
    volume_ratio: float
    sector: str
    # Technical indicators
    technicals: Optional[TechnicalIndicators] = None


class MarketSnapshot(BaseModel):
    gainers: List[StockData]
    losers: List[StockData]
    active: List[StockData]  # High volume
    sector_performance: Dict[str, float]
    news: List[Dict[str, str]]


class InvestmentStrategy(BaseModel):
    """Investment strategy for a specific capital tier"""
    stocks: List[str]
    allocation: str
    rationale: str
    risk_level: str
    entry_zone: Optional[str] = None
    target: Optional[str] = None
    stop_loss: Optional[str] = None
    timeframe: Optional[str] = None


class NigerianInvestmentStrategy(BaseModel):
    """Investment strategy for Nigerian market"""
    stocks: List[str]
    allocation: str
    rationale: str
    risk_level: str
    currency: str = "NGN"
    entry_zone: Optional[str] = None
    target: Optional[str] = None
    stop_loss: Optional[str] = None
    timeframe: Optional[str] = None


class AIAnalysis(BaseModel):
    key_insights: List[str]
    opportunities: List[str]
    red_flags: List[str]
    sector_rotation: str
    momentum_plays: List[str]
    raw_markdown: str  # For email body
    
    # Fallback indicator
    is_fallback: bool = False  # True when using pre-built strategies (AI unavailable)
    data_source: str = "AI"    # "Gemini", "OpenAI", or "Fallback"
    
    # US Investment strategies by capital tier
    high_capital_strategy: Optional[InvestmentStrategy] = None      # $50K+
    medium_capital_strategy: Optional[InvestmentStrategy] = None    # $10K-$50K
    low_capital_strategy: Optional[InvestmentStrategy] = None       # $1K-$10K
    micro_capital_strategy: Optional[InvestmentStrategy] = None     # Under $1K
    
    # Nigerian Investment strategies by capital tier
    ng_high_capital_strategy: Optional[NigerianInvestmentStrategy] = None      # ₦10M+
    ng_medium_capital_strategy: Optional[NigerianInvestmentStrategy] = None    # ₦1M-₦10M
    ng_low_capital_strategy: Optional[NigerianInvestmentStrategy] = None       # ₦100K-₦1M
    ng_micro_capital_strategy: Optional[NigerianInvestmentStrategy] = None     # ₦5K-₦100K


class NigerianStockData(BaseModel):
    """Nigerian Stock Exchange data with detailed info"""
    ticker: str
    name: str
    price: float
    change_pct: float
    volume: int
    sector: str
    description: Optional[str] = None
    market_cap: Optional[str] = None
    pe_ratio: Optional[float] = None
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None


class NigerianMarketSnapshot(BaseModel):
    """Nigerian market data snapshot"""
    gainers: List[NigerianStockData]
    losers: List[NigerianStockData]
    active: List[NigerianStockData]
    sector_performance: Dict[str, float]
    market_summary: str = ""


class NewsArticle(BaseModel):
    """Financial news article with AI analysis"""
    title: str
    summary: str
    source: str
    url: Optional[str] = None
    published_at: Optional[str] = None
    category: str = "general"  # "us_market", "ngx_market", "crypto", "forex", "general"
    related_tickers: List[str] = []
    sentiment: Optional[str] = None  # "positive", "negative", "neutral"
    ai_analysis: Optional[str] = None  # AI explanation of market impact


class FullReport(BaseModel):
    date: str
    market_data: MarketSnapshot
    analysis: AIAnalysis
    nigerian_market: Optional[NigerianMarketSnapshot] = None

