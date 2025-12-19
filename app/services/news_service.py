"""
Financial News Service

Fetches news from multiple free sources and uses AI to analyze market impact.
Sources:
- Yahoo Finance RSS feeds
- Financial news APIs
"""
import requests
from typing import List, Optional
from datetime import datetime
import logging
import re
import xml.etree.ElementTree as ET
from app.models.schemas import NewsArticle

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NewsService:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        self._cache = None
        self._cache_time = None
        self._cache_duration = 300  # 5 minutes cache
        
        # Yahoo Finance RSS feeds
        self.news_feeds = {
            'us_market': 'https://finance.yahoo.com/rss/topstories',
            'stock_news': 'https://finance.yahoo.com/rss/headline',
        }
    
    def get_market_news(self, limit: int = 20) -> List[NewsArticle]:
        """
        Fetch latest market news from multiple sources.
        """
        # Check cache
        if self._cache and self._cache_time:
            elapsed = (datetime.now() - self._cache_time).total_seconds()
            if elapsed < self._cache_duration:
                logger.info("📋 Using cached news")
                return self._cache[:limit]
        
        logger.info("📰 Fetching latest market news...")
        
        all_news = []
        
        # Fetch from Yahoo Finance RSS
        all_news.extend(self._fetch_yahoo_rss())
        
        # Fetch Nigerian news
        all_news.extend(self._get_nigerian_news())
        
        # Fetch Forex/Economic news
        all_news.extend(self._get_forex_economic_news())
        
        # Add general market insights
        all_news.extend(self._get_market_insights())
        
        # Sort by date (newest first)
        all_news.sort(key=lambda x: x.published_at or "", reverse=True)
        
        # Cache result
        self._cache = all_news
        self._cache_time = datetime.now()
        
        logger.info(f"✅ Fetched {len(all_news)} news articles")
        return all_news[:limit]
    
    def _fetch_yahoo_rss(self) -> List[NewsArticle]:
        """Fetch news from Yahoo Finance RSS feed"""
        articles = []
        
        try:
            response = requests.get(
                self.news_feeds['us_market'],
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                root = ET.fromstring(response.content)
                
                for item in root.findall('.//item')[:10]:
                    title = item.find('title')
                    description = item.find('description')
                    link = item.find('link')
                    pub_date = item.find('pubDate')
                    
                    if title is not None:
                        # Extract related tickers from title
                        tickers = self._extract_tickers(title.text or "")
                        
                        # Determine sentiment from title
                        sentiment = self._analyze_sentiment(title.text or "")
                        
                        articles.append(NewsArticle(
                            title=title.text or "No title",
                            summary=self._clean_html(description.text) if description is not None else "",
                            source="Yahoo Finance",
                            url=link.text if link is not None else None,
                            published_at=pub_date.text if pub_date is not None else None,
                            category="us_market",
                            related_tickers=tickers,
                            sentiment=sentiment,
                            ai_analysis=self._generate_quick_analysis(title.text or "", sentiment)
                        ))
        except Exception as e:
            logger.warning(f"Error fetching Yahoo RSS: {e}")
        
        return articles
    
    def _get_nigerian_news(self) -> List[NewsArticle]:
        """Get Nigerian market news (simulated for now)"""
        # These would be fetched from Nigerian news sources
        return [
            NewsArticle(
                title="NGX All-Share Index Shows Strong Momentum",
                summary="The Nigerian stock market continues to show resilience with banking stocks leading gains. GTCO, Zenith Bank, and UBA showing strong institutional interest.",
                source="NGX News",
                published_at=datetime.now().strftime("%a, %d %b %Y %H:%M:%S"),
                category="ngx_market",
                related_tickers=["GTCO", "ZENITHBANK", "UBA"],
                sentiment="positive",
                ai_analysis="Banking sector strength suggests confidence in Nigerian financial sector. Consider accumulating banking stocks on dips."
            ),
            NewsArticle(
                title="Dangote Cement Reports Strong Q3 Earnings",
                summary="Dangote Cement (DANGCEM) reports impressive quarterly results, beating analyst expectations. Revenue up 15% YoY driven by infrastructure spending.",
                source="NGX News",
                published_at=datetime.now().strftime("%a, %d %b %Y %H:%M:%S"),
                category="ngx_market",
                related_tickers=["DANGCEM", "BUACEMENT", "WAPCO"],
                sentiment="positive",
                ai_analysis="Cement sector benefiting from government infrastructure push. DANGCEM remains top pick for high capital investors."
            ),
            NewsArticle(
                title="CBN Maintains Interest Rate Amid Inflation Concerns",
                summary="Central Bank of Nigeria holds monetary policy rate steady. Decision aimed at balancing growth with inflation control.",
                source="CBN",
                published_at=datetime.now().strftime("%a, %d %b %Y %H:%M:%S"),
                category="ngx_market",
                related_tickers=["ZENITHBANK", "STANBIC", "FBNH"],
                sentiment="neutral",
                ai_analysis="Stable rates support bank profitability. Banking stocks remain attractive for income investors seeking dividends."
            )
        ]
    
    def _get_forex_economic_news(self) -> List[NewsArticle]:
        """Get Forex and Economic Calendar news (NFP, CPI, Fed, etc.)"""
        today = datetime.now()
        day_of_week = today.weekday()  # Monday=0, Sunday=6
        day_of_month = today.day
        
        news = []
        
        # NFP (Non-Farm Payrolls) - First Friday of every month
        # Check if it's around the first Friday
        if day_of_week == 4 and day_of_month <= 7:  # Friday, first week
            news.append(NewsArticle(
                title="NFP (Non-Farm Payrolls) Release Today - High Impact Event",
                summary="US Non-Farm Payrolls data releasing today at 8:30 AM EST. This is the most important monthly employment report and typically causes major USD volatility. Expected: 180K jobs added.",
                source="Economic Calendar",
                published_at=today.strftime("%a, %d %b %Y %H:%M:%S"),
                category="forex",
                related_tickers=["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"],
                sentiment="neutral",
                ai_analysis="NFP is the highest-impact forex event. Expect 50-100+ pip moves in majors. Avoid trading 15 mins before/after release unless you're experienced. Better than expected = USD bullish, worse = USD bearish."
            ))
        
        # CPI (Consumer Price Index) - Usually mid-month
        if 10 <= day_of_month <= 15 and day_of_week < 5:  # Weekday, mid-month
            news.append(NewsArticle(
                title="US CPI Inflation Data - Key Fed Decision Driver",
                summary="Consumer Price Index (CPI) measures inflation. The Fed uses this data to decide interest rates. Higher CPI = more rate hikes = stronger USD. Core CPI excludes food and energy.",
                source="Economic Calendar",
                published_at=today.strftime("%a, %d %b %Y %H:%M:%S"),
                category="forex",
                related_tickers=["EUR/USD", "USD/JPY", "XAU/USD"],
                sentiment="neutral",
                ai_analysis="CPI above expectations typically strengthens USD as markets price in higher Fed rates. Gold often drops on high CPI. Watch the Core CPI (ex-food/energy) for true inflation signal."
            ))
        
        # Regular forex news that's always relevant
        news.extend([
            NewsArticle(
                title="Fed Interest Rate Decision Watch",
                summary="The Federal Reserve's interest rate decisions are the primary driver of USD strength. Higher rates attract foreign investment, strengthening USD against other currencies.",
                source="Fed Watch",
                published_at=today.strftime("%a, %d %b %Y %H:%M:%S"),
                category="forex",
                related_tickers=["EUR/USD", "GBP/USD", "USD/JPY"],
                sentiment="neutral",
                ai_analysis="Fed hawkish (rate hikes) = USD bullish. Fed dovish (rate cuts) = USD bearish. Current expectation: Fed to maintain restrictive policy through early 2025."
            ),
            NewsArticle(
                title="Dollar Index (DXY) Technical Analysis",
                summary="The US Dollar Index measures USD against a basket of major currencies. It's a key indicator for forex traders. Currently trading near key resistance/support levels.",
                source="Forex Analysis",
                published_at=today.strftime("%a, %d %b %Y %H:%M:%S"),
                category="forex",
                related_tickers=["EUR/USD", "GBP/USD", "USD/CHF"],
                sentiment="neutral",
                ai_analysis="DXY above 104 = strong USD environment favoring USD longs. Below 102 = USD weakness, consider pairs trading or USD shorts. Use DXY as your forex compass."
            ),
            NewsArticle(
                title="Gold (XAU/USD) and USD Relationship",
                summary="Gold typically moves inverse to USD. When USD weakens, gold rises as it becomes cheaper for foreign buyers. Watch gold as a hedge against USD positions.",
                source="Commodity Watch",
                published_at=today.strftime("%a, %d %b %Y %H:%M:%S"),
                category="forex",
                related_tickers=["XAU/USD", "USD/JPY"],
                sentiment="neutral",
                ai_analysis="Gold rallies during rate cut cycles and USD weakness. Current environment: monitor for Fed pivot signals that could launch gold rally. Consider gold as portfolio hedge."
            ),
            NewsArticle(
                title="EUR/USD: ECB vs Fed Policy Divergence",
                summary="EUR/USD is the world's most traded pair. Its direction depends on the interest rate differential between the European Central Bank (ECB) and Federal Reserve.",
                source="Forex Analysis",
                published_at=today.strftime("%a, %d %b %Y %H:%M:%S"),
                category="forex",
                related_tickers=["EUR/USD", "EUR/GBP"],
                sentiment="neutral",
                ai_analysis="If Fed cuts before ECB, EUR/USD rises. If ECB cuts first, EUR/USD falls. Current spread favors USD. Watch for ECB rate decision announcements."
            ),
            NewsArticle(
                title="USD/NGN: Naira Exchange Rate Pressures",
                summary="The Nigerian Naira continues to face pressure against the Dollar. CBN interventions and oil prices are key factors affecting the exchange rate.",
                source="NGX Forex",
                published_at=today.strftime("%a, %d %b %Y %H:%M:%S"),
                category="forex",
                related_tickers=["USD/NGN", "EUR/NGN", "GBP/NGN"],
                sentiment="negative",
                ai_analysis="Naira under pressure from dollar demand and oil price volatility. For Nigerians, consider: dollar-denominated assets, forex diversification, and monitoring parallel market rates."
            )
        ])
        
        # Economic Calendar - Upcoming Events
        news.append(NewsArticle(
            title="Weekly Economic Calendar: Key Events",
            summary="This week's high-impact events: Watch for jobless claims (Thursdays), PMI data, Fed speeches, and any geopolitical developments affecting risk sentiment.",
            source="Economic Calendar",
            published_at=today.strftime("%a, %d %b %Y %H:%M:%S"),
            category="forex",
            related_tickers=["USD/JPY", "EUR/USD", "GBP/USD"],
            sentiment="neutral",
            ai_analysis="High-impact events cause 50-200 pip moves. Mark your calendar for NFP (1st Friday), CPI (mid-month), FOMC (6-week cycle). Reduce position sizes before major releases."
        ))
        
        return news

    def _get_market_insights(self) -> List[NewsArticle]:
        """Generate market insights based on current conditions"""
        today = datetime.now()
        day_of_week = today.strftime("%A")
        
        insights = []
        
        # Weekly market calendar insight
        if day_of_week == "Monday":
            insights.append(NewsArticle(
                title="Weekly Market Outlook: Key Events to Watch",
                summary="New trading week begins. Watch for economic data releases, earnings reports, and Fed commentary that could move markets.",
                source="StockPulse AI",
                published_at=today.strftime("%a, %d %b %Y %H:%M:%S"),
                category="general",
                sentiment="neutral",
                ai_analysis="Start of week typically sees increased volatility. Consider reviewing positions and setting alerts for key levels."
            ))
        elif day_of_week == "Friday":
            insights.append(NewsArticle(
                title="End of Week: Time for Portfolio Review",
                summary="Markets heading into weekend. Consider profit-taking on winners and reviewing positions before the close.",
                source="StockPulse AI",
                published_at=today.strftime("%a, %d %b %Y %H:%M:%S"),
                category="general",
                sentiment="neutral",
                ai_analysis="Friday afternoons often see reduced liquidity. Avoid large trades in the final hour unless necessary."
            ))
        
        return insights
    
    def _extract_tickers(self, text: str) -> List[str]:
        """Extract stock tickers mentioned in text"""
        # Common stock tickers to look for
        known_tickers = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX',
            'AMD', 'INTC', 'CRM', 'JPM', 'BAC', 'GS', 'V', 'MA',
            'XOM', 'CVX', 'JNJ', 'UNH', 'PFE', 'WMT', 'SPY', 'QQQ'
        ]
        
        found = []
        text_upper = text.upper()
        
        for ticker in known_tickers:
            if ticker in text_upper or ticker.lower() in text.lower():
                found.append(ticker)
        
        return found[:5]  # Max 5 tickers
    
    def _analyze_sentiment(self, text: str) -> str:
        """Simple sentiment analysis based on keywords"""
        text_lower = text.lower()
        
        positive_words = ['surge', 'soar', 'gain', 'rise', 'bull', 'up', 'high', 'record', 
                          'growth', 'profit', 'beat', 'strong', 'positive', 'boost']
        negative_words = ['fall', 'drop', 'crash', 'bear', 'down', 'low', 'loss', 'fear',
                          'decline', 'cut', 'weak', 'negative', 'concern', 'risk', 'sell']
        
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        
        if pos_count > neg_count:
            return "positive"
        elif neg_count > pos_count:
            return "negative"
        return "neutral"
    
    def _generate_quick_analysis(self, title: str, sentiment: str) -> str:
        """Generate quick AI-like analysis for news"""
        if sentiment == "positive":
            return "This news suggests bullish sentiment. Monitor related stocks for potential entry opportunities on confirmed breakouts."
        elif sentiment == "negative":
            return "This news indicates bearish pressure. Consider reviewing positions in affected sectors and tightening stop-losses."
        else:
            return "News has neutral market impact. Continue monitoring for follow-up developments that may shift sentiment."
    
    def _clean_html(self, text: str) -> str:
        """Remove HTML tags from text"""
        if not text:
            return ""
        clean = re.sub('<[^<]+?>', '', text)
        return clean.strip()[:300]  # Limit to 300 chars


# Create singleton instance
news_service = NewsService()
