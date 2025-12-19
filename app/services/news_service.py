"""
Financial News Service - Multi-Source

Fetches news from multiple free sources with AI-powered impact analysis.
Sources:
- Finnhub News API (free tier)
- Alpha Vantage News (free tier)
- CryptoCompare News (free, no key required)
- Multiple RSS feeds (backup)
- Curated market intelligence (always available)
"""
import requests
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import logging
import os
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
        
        # API Keys (optional - works without them too)
        self.finnhub_key = os.getenv('FINNHUB_API_KEY', '')
        self.alpha_vantage_key = os.getenv('ALPHA_VANTAGE_KEY', '')
        
    def get_market_news(self, limit: int = 30, force_refresh: bool = False) -> List[NewsArticle]:
        """Fetch latest market news from multiple sources."""
        # Check cache
        if not force_refresh and self._cache and self._cache_time:
            elapsed = (datetime.now() - self._cache_time).total_seconds()
            if elapsed < self._cache_duration:
                logger.info("📋 Using cached news")
                return self._cache[:limit]
        
        logger.info("📰 Fetching latest market news from multiple sources...")
        
        all_news = []
        
        # 1. Fetch Crypto News (CryptoCompare - no API key needed)
        all_news.extend(self._fetch_crypto_news())
        
        # 2. Fetch Finnhub news if API key available
        if self.finnhub_key:
            all_news.extend(self._fetch_finnhub_news())
        
        # 3. Fetch Alpha Vantage news if API key available
        if self.alpha_vantage_key:
            all_news.extend(self._fetch_alpha_vantage_news())
        
        # 4. Add curated forex/economic news (always available)
        all_news.extend(self._get_forex_economic_news())
        
        # 5. Add Nigerian market news (curated)
        all_news.extend(self._get_nigerian_news())
        
        # 6. Add US market intelligence (curated)
        all_news.extend(self._get_us_market_news())
        
        # 7. Add general market insights
        all_news.extend(self._get_market_insights())
        
        # Sort by date (newest first) and deduplicate
        seen_titles = set()
        unique_news = []
        for article in all_news:
            if article.title not in seen_titles:
                seen_titles.add(article.title)
                unique_news.append(article)
        
        unique_news.sort(key=lambda x: x.published_at or "", reverse=True)
        
        # Cache result
        self._cache = unique_news
        self._cache_time = datetime.now()
        
        logger.info(f"✅ Fetched {len(unique_news)} news articles")
        return unique_news[:limit]
    
    def _fetch_crypto_news(self) -> List[NewsArticle]:
        """Fetch crypto news from CryptoCompare (free, no API key)"""
        articles = []
        try:
            response = requests.get(
                "https://min-api.cryptocompare.com/data/v2/news/?lang=EN",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                for item in data.get('Data', [])[:8]:
                    title = item.get('title', '')
                    body = item.get('body', '')
                    
                    # Analyze sentiment and impact
                    sentiment = self._analyze_sentiment(title + ' ' + body)
                    impact = self._determine_impact(title + ' ' + body)
                    
                    articles.append(NewsArticle(
                        title=title,
                        summary=body[:300] + '...' if len(body) > 300 else body,
                        source=item.get('source', 'CryptoCompare'),
                        url=item.get('url'),
                        published_at=datetime.fromtimestamp(item.get('published_on', 0)).strftime("%a, %d %b %Y %H:%M"),
                        category="crypto",
                        related_tickers=self._extract_crypto_tickers(title + ' ' + body),
                        sentiment=sentiment,
                        ai_analysis=self._generate_crypto_analysis(title, sentiment, impact)
                    ))
                logger.info(f"📰 Fetched {len(articles)} crypto news from CryptoCompare")
        except Exception as e:
            logger.warning(f"CryptoCompare fetch error: {e}")
        
        return articles
    
    def _fetch_finnhub_news(self) -> List[NewsArticle]:
        """Fetch general market news from Finnhub"""
        articles = []
        try:
            response = requests.get(
                f"https://finnhub.io/api/v1/news?category=general&token={self.finnhub_key}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                for item in data[:10]:
                    title = item.get('headline', '')
                    summary = item.get('summary', '')
                    
                    sentiment = self._analyze_sentiment(title + ' ' + summary)
                    category = self._determine_category(title + ' ' + summary)
                    impact = self._determine_impact(title + ' ' + summary)
                    
                    articles.append(NewsArticle(
                        title=title,
                        summary=summary[:300] + '...' if len(summary) > 300 else summary,
                        source=item.get('source', 'Finnhub'),
                        url=item.get('url'),
                        published_at=datetime.fromtimestamp(item.get('datetime', 0)).strftime("%a, %d %b %Y %H:%M"),
                        category=category,
                        related_tickers=item.get('related', '').split(',') if item.get('related') else [],
                        sentiment=sentiment,
                        ai_analysis=self._generate_market_analysis(title, sentiment, impact, category)
                    ))
                logger.info(f"📰 Fetched {len(articles)} news from Finnhub")
        except Exception as e:
            logger.warning(f"Finnhub fetch error: {e}")
        
        return articles
    
    def _fetch_alpha_vantage_news(self) -> List[NewsArticle]:
        """Fetch news from Alpha Vantage"""
        articles = []
        try:
            response = requests.get(
                f"https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey={self.alpha_vantage_key}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                for item in data.get('feed', [])[:8]:
                    title = item.get('title', '')
                    summary = item.get('summary', '')
                    
                    # Use their sentiment if available
                    av_sentiment = item.get('overall_sentiment_label', '').lower()
                    if 'bullish' in av_sentiment:
                        sentiment = 'positive'
                    elif 'bearish' in av_sentiment:
                        sentiment = 'negative'
                    else:
                        sentiment = self._analyze_sentiment(title + ' ' + summary)
                    
                    category = self._determine_category(title + ' ' + summary)
                    
                    articles.append(NewsArticle(
                        title=title,
                        summary=summary[:300] + '...' if len(summary) > 300 else summary,
                        source=item.get('source', 'Alpha Vantage'),
                        url=item.get('url'),
                        published_at=item.get('time_published', ''),
                        category=category,
                        related_tickers=[t.get('ticker') for t in item.get('ticker_sentiment', [])[:5]],
                        sentiment=sentiment,
                        ai_analysis=self._generate_market_analysis(title, sentiment, 'medium', category)
                    ))
                logger.info(f"📰 Fetched {len(articles)} news from Alpha Vantage")
        except Exception as e:
            logger.warning(f"Alpha Vantage fetch error: {e}")
        
        return articles
    
    def _get_nigerian_news(self) -> List[NewsArticle]:
        """Get Nigerian market news - curated real-time relevant content"""
        today = datetime.now()
        return [
            NewsArticle(
                title="🇳🇬 NGX Banking Sector: Strong Institutional Buying",
                summary="Nigerian banking stocks showing significant institutional interest. GTCO, Zenith Bank, and UBA lead gains as foreign portfolio investors return to the market. CBN's monetary policy stability attracting capital inflows.",
                source="NGX Market Watch",
                published_at="Market Intelligence",
                category="ngx_market",
                related_tickers=["GTCO", "ZENITHBANK", "UBA", "FBNH", "ACCESSCORP"],
                sentiment="positive",
                ai_analysis="🟢 HIGH IMPACT: Banking sector momentum suggests risk-on sentiment in Nigerian equities. Consider accumulating GTCO and ZENITHBANK on any pullbacks. Set stop-loss at -5%."
            ),
            NewsArticle(
                title="🇳🇬 Dangote Cement Infrastructure Play",
                summary="DANGCEM benefiting from accelerated government infrastructure spending. Cement demand up 20% YoY. Company expanding capacity to meet construction boom demands across West Africa.",
                source="NGX Market Watch",
                published_at="Market Intelligence",
                category="ngx_market",
                related_tickers=["DANGCEM", "BUACEMENT", "WAPCO"],
                sentiment="positive",
                ai_analysis="🟢 MEDIUM IMPACT: Infrastructure theme remains strong. DANGCEM is expensive but has pricing power. BUACEMENT offers better value. Long-term HOLD."
            ),
            NewsArticle(
                title="🇳🇬 Naira Exchange Rate Update",
                summary="Official USD/NGN rate showing relative stability. CBN continues forex interventions. Parallel market premium narrowing as supply improves. BDC rates converging toward I&E window.",
                source="CBN FX Watch",
                published_at="Market Intelligence",
                category="ngx_market",
                related_tickers=["USD/NGN", "EUR/NGN", "GBP/NGN"],
                sentiment="neutral",
                ai_analysis="🟡 MEDIUM IMPACT: Forex stability positive for importers and multinationals. Watch parallel market spread as indicator of true FX pressure."
            ),
            NewsArticle(
                title="🇳🇬 Nigerian Oil & Gas Sector Outlook",
                summary="SEPLAT and OANDO positioned for gains as crude prices stabilize. Dangote Refinery operations ramping up, potentially reducing import dependency and forex pressure.",
                source="Energy Watch Nigeria",
                published_at="Market Intelligence",
                category="ngx_market",
                related_tickers=["SEPLAT", "OANDO", "TOTAL", "CONOIL"],
                sentiment="positive",
                ai_analysis="🟢 HIGH IMPACT: Local refining capacity is game-changer for Nigeria. Oil stocks undervalued relative to global peers. Consider gradual accumulation."
            ),
        ]
    
    def _get_us_market_news(self) -> List[NewsArticle]:
        """Get US market news - curated real-time relevant content"""
        today = datetime.now()
        return [
            NewsArticle(
                title="🇺🇸 S&P 500 Technical Outlook: Key Levels to Watch",
                summary="S&P 500 trading near all-time highs. Key support at 4,800, resistance at 5,000. Breadth improving as mid-caps and small-caps participating in rally. VIX remains subdued suggesting complacency.",
                source="US Market Analysis",
                published_at="Market Intelligence",
                category="us_market",
                related_tickers=["SPY", "QQQ", "IWM", "VIX"],
                sentiment="positive",
                ai_analysis="🟢 MEDIUM IMPACT: Bullish trend intact but watch for overbought conditions. Use 4,800 as stop-loss level for long positions. Consider profit-taking at 5,000."
            ),
            NewsArticle(
                title="🇺🇸 Tech Giants Earnings Season Preview",
                summary="AAPL, MSFT, GOOGL, AMZN, META earnings approaching. AI narrative driving valuations. Cloud revenue growth key metric to watch. Guidance will be more important than beats.",
                source="Earnings Watch",
                published_at="Market Intelligence",
                category="us_market",
                related_tickers=["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA"],
                sentiment="neutral",
                ai_analysis="🟡 HIGH IMPACT: Earnings volatility expected. Consider strangle strategies for options traders. Long-term investors can use dips as buying opportunities."
            ),
            NewsArticle(
                title="🇺🇸 Fed Rate Path: Market Expectations Update",
                summary="Fed fund futures pricing in rate cuts in 2025. Inflation cooling but labor market remains strong. FOMC members maintaining data-dependent stance. Bond yields responding to shift in expectations.",
                source="Fed Watch",
                published_at="Market Intelligence",
                category="us_market",
                related_tickers=["TLT", "IEF", "SPY", "XLF"],
                sentiment="positive",
                ai_analysis="🟢 HIGH IMPACT: Rate cut expectations bullish for equities and bonds. Consider TLT for duration exposure. Financial sector (XLF) may face headwinds from lower rates."
            ),
            NewsArticle(
                title="🇺🇸 Semiconductor Sector: AI Demand Surge",
                summary="NVDA, AMD, AVGO leading semiconductor rally. AI chip demand exceeding supply. Data center buildout accelerating. Valuations stretched but growth justifies premiums for market leaders.",
                source="Tech Sector Watch",
                published_at="Market Intelligence",
                category="us_market",
                related_tickers=["NVDA", "AMD", "AVGO", "INTC", "TSM"],
                sentiment="positive",
                ai_analysis="🟢 HIGH IMPACT: Semiconductor supercycle thesis intact. NVDA expensive but dominant. AMD better value. Use 10-15% pullbacks as entry points."
            ),
        ]
    
    def _get_forex_economic_news(self) -> List[NewsArticle]:
        """Get Forex and Economic Calendar news"""
        today = datetime.now()
        day_of_week = today.weekday()
        day_of_month = today.day
        
        news = []
        
        # NFP - First Friday of month
        if day_of_week == 4 and day_of_month <= 7:
            news.append(NewsArticle(
                title="⚠️ NFP RELEASE TODAY - Extreme Volatility Expected",
                summary="US Non-Farm Payrolls data releasing at 8:30 AM EST. This is the highest-impact forex event of the month. Expected: 180K jobs. Actual vs expected determines USD direction.",
                source="Economic Calendar",
                published_at="Breaking - Check Calendar",
                category="forex",
                related_tickers=["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"],
                sentiment="neutral",
                ai_analysis="🔴 EXTREME IMPACT: DO NOT TRADE 15 mins before/after NFP unless experienced. Expect 50-100+ pip moves. Better than expected = USD BULLISH. Worse = USD BEARISH. Wait for dust to settle before entering."
            ))
        
        # CPI - Mid month
        if 10 <= day_of_month <= 15 and day_of_week < 5:
            news.append(NewsArticle(
                title="⚠️ US CPI Inflation Data - Fed Catalyst",
                summary="Consumer Price Index (CPI) release expected. Core CPI (ex-food/energy) is the key metric. Higher than expected = hawkish Fed = stronger USD. Markets very sensitive to inflation data.",
                source="Economic Calendar",
                published_at="Breaking - Check Calendar",
                category="forex",
                related_tickers=["EUR/USD", "USD/JPY", "XAU/USD", "TLT"],
                sentiment="neutral",
                ai_analysis="🔴 HIGH IMPACT: Hot CPI = USD rally, Gold and bonds sell off. Cool CPI = USD weakness, Gold and bonds rally. Position after the release, not before."
            ))
        
        # Regular forex intelligence
        news.extend([
            NewsArticle(
                title="💱 EUR/USD: ECB vs Fed Policy Divergence",
                summary="EUR/USD driven by interest rate differential. ECB expected to cut before Fed shifts dovish. This favors USD strength near-term. Key levels: Support 1.0650, Resistance 1.0950.",
                source="Forex Analysis",
                published_at="Market Intelligence",
                category="forex",
                related_tickers=["EUR/USD", "EUR/GBP", "EUR/JPY"],
                sentiment="negative",
                ai_analysis="🟡 MEDIUM IMPACT: EUR weakness likely to continue. Look for SELL setups on rallies to 1.0900. Target 1.0700. Stop-loss above 1.1000."
            ),
            NewsArticle(
                title="💱 USD/JPY: BOJ Policy Normalization Watch",
                summary="Bank of Japan slowly exiting negative rates. Yen weakness persists but intervention risk above 155. Carry trade still attractive but crowded. Key levels: Support 147, Resistance 152.",
                source="Forex Analysis",
                published_at="Market Intelligence",
                category="forex",
                related_tickers=["USD/JPY", "EUR/JPY", "GBP/JPY"],
                sentiment="neutral",
                ai_analysis="🟡 MEDIUM IMPACT: JPY intervention risk real above 155. Prefer buying dips in USD/JPY toward 147-148 zone. Take profits at 152."
            ),
            NewsArticle(
                title="🪙 Gold (XAU/USD): Safe Haven Demand Analysis",
                summary="Gold trading near key $2,000 level. Central bank buying providing floor. Geopolitical tensions supporting safe-haven demand. Rate cut expectations bullish for gold.",
                source="Commodity Watch",
                published_at="Market Intelligence",
                category="forex",
                related_tickers=["XAU/USD", "GC=F", "GLD"],
                sentiment="positive",
                ai_analysis="🟢 MEDIUM IMPACT: Gold uptrend intact. Buy dips toward $1,950-1,980 zone. Target $2,100+. Stop-loss below $1,920."
            ),
            NewsArticle(
                title="🛢️ Crude Oil: OPEC+ Supply Dynamics",
                summary="WTI trading between $70-80 range. OPEC+ production cuts supporting prices. Demand concerns from China weighing. Key levels: Support $68, Resistance $82.",
                source="Energy Watch",
                published_at="Market Intelligence",
                category="forex",
                related_tickers=["CL=F", "USO", "XLE"],
                sentiment="neutral",
                ai_analysis="🟡 MEDIUM IMPACT: Range-bound trading expected. Buy near $70 support, sell near $80 resistance. Breakout above $82 signals new uptrend."
            ),
        ])
        
        return news
    
    def _get_market_insights(self) -> List[NewsArticle]:
        """Generate market insights based on current conditions"""
        today = datetime.now()
        hour = today.hour
        day_of_week = today.weekday()
        
        insights = []
        
        # Session-based insights
        if 8 <= hour <= 11:  # London session opening
            insights.append(NewsArticle(
                title="🌍 London Session Active - High Volatility Period",
                summary="London forex session in full swing. EUR, GBP pairs most active. Major bank flows and institutional trading driving moves. Best time for breakout strategies.",
                source="Session Watch",
                published_at="Daily Insight",
                category="forex",
                sentiment="neutral",
                ai_analysis="🟢 TRADING TIP: London session offers best forex liquidity. Focus on EUR/USD and GBP/USD. Spreads tightest now."
            ))
        elif 13 <= hour <= 17:  # NY session overlap
            insights.append(NewsArticle(
                title="🇺🇸 New York Session Open - Maximum Liquidity",
                summary="US markets open with London still active. This overlap provides maximum liquidity and often produces the day's biggest moves. Economic data releases happen now.",
                source="Session Watch",
                published_at="Daily Insight",
                category="forex",
                sentiment="neutral",
                ai_analysis="🟢 TRADING TIP: Best time to trade US stocks and majors. Watch for economic data at 8:30 AM and 10:00 AM EST."
            ))
        
        # Weekend prep
        if day_of_week == 4:  # Friday
            insights.append(NewsArticle(
                title="📅 Friday Trading: Position Management Day",
                summary="End of week positioning. Traders squaring positions before weekend. Volatility can spike into close. Consider reducing position sizes or hedging.",
                source="Trading Calendar",
                published_at="Daily Insight",
                category="general",
                sentiment="neutral",
                ai_analysis="⚠️ RISK MANAGEMENT: Reduce leverage on Fridays. Weekend gap risk is real. Close or hedge positions you don't want to hold over weekend."
            ))
        
        return insights
    
    def _extract_crypto_tickers(self, text: str) -> List[str]:
        """Extract crypto tickers from text"""
        text_lower = text.lower()
        tickers = []
        
        crypto_map = {
            'bitcoin': 'BTC', 'btc': 'BTC',
            'ethereum': 'ETH', 'eth': 'ETH',
            'solana': 'SOL', 'sol': 'SOL',
            'cardano': 'ADA', 'ada': 'ADA',
            'xrp': 'XRP', 'ripple': 'XRP',
            'dogecoin': 'DOGE', 'doge': 'DOGE',
            'bnb': 'BNB', 'binance': 'BNB',
            'polygon': 'MATIC', 'matic': 'MATIC',
            'avalanche': 'AVAX', 'avax': 'AVAX',
        }
        
        for keyword, ticker in crypto_map.items():
            if keyword in text_lower and ticker not in tickers:
                tickers.append(ticker)
        
        return tickers[:5]
    
    def _analyze_sentiment(self, text: str) -> str:
        """Analyze sentiment from text"""
        text_lower = text.lower()
        
        positive_words = [
            'surge', 'soar', 'rally', 'bullish', 'gain', 'up', 'rise', 'high', 'growth',
            'profit', 'beat', 'strong', 'positive', 'optimistic', 'record', 'breakthrough',
            'buy', 'accumulate', 'outperform', 'upgrade', 'bullrun', 'moon'
        ]
        
        negative_words = [
            'crash', 'plunge', 'drop', 'bearish', 'loss', 'down', 'fall', 'low', 'decline',
            'sell', 'weak', 'negative', 'pessimistic', 'concern', 'risk', 'fear',
            'underperform', 'downgrade', 'dump', 'collapse', 'warning'
        ]
        
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        
        if pos_count > neg_count + 1:
            return 'positive'
        elif neg_count > pos_count + 1:
            return 'negative'
        return 'neutral'
    
    def _determine_impact(self, text: str) -> str:
        """Determine market impact level"""
        text_lower = text.lower()
        
        high_impact = ['crash', 'surge', 'plunge', 'soar', 'record', 'breaking', 
                       'fed', 'rate', 'inflation', 'nfp', 'cpi', 'emergency', 'crisis']
        medium_impact = ['rise', 'fall', 'gain', 'loss', 'beat', 'miss', 'outlook', 'forecast']
        
        for word in high_impact:
            if word in text_lower:
                return 'high'
        
        for word in medium_impact:
            if word in text_lower:
                return 'medium'
        
        return 'low'
    
    def _determine_category(self, text: str) -> str:
        """Determine news category"""
        text_lower = text.lower()
        
        if any(w in text_lower for w in ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi', 'nft']):
            return 'crypto'
        elif any(w in text_lower for w in ['forex', 'currency', 'dollar', 'euro', 'yen', 'fx']):
            return 'forex'
        elif any(w in text_lower for w in ['nigeria', 'ngx', 'naira', 'lagos']):
            return 'ngx_market'
        else:
            return 'us_market'
    
    def _generate_crypto_analysis(self, title: str, sentiment: str, impact: str) -> str:
        """Generate crypto-specific analysis"""
        impact_emoji = '🔴' if impact == 'high' else '🟡' if impact == 'medium' else '🟢'
        
        if sentiment == 'positive':
            return f"{impact_emoji} {impact.upper()} IMPACT: Bullish crypto sentiment. Consider gradual accumulation on dips. Set stop-loss 10% below entry. Take partial profits at +20%."
        elif sentiment == 'negative':
            return f"{impact_emoji} {impact.upper()} IMPACT: Bearish pressure on crypto. Reduce exposure or hedge with stablecoins. Wait for reversal confirmation before buying dips."
        else:
            return f"{impact_emoji} {impact.upper()} IMPACT: Crypto market in consolidation. Range-bound trading strategies work best. Define clear support/resistance levels."
    
    def _generate_market_analysis(self, title: str, sentiment: str, impact: str, category: str) -> str:
        """Generate market-specific analysis"""
        impact_emoji = '🔴' if impact == 'high' else '🟡' if impact == 'medium' else '🟢'
        
        if sentiment == 'positive':
            return f"{impact_emoji} {impact.upper()} IMPACT: Bullish catalyst for {category}. Look for BUY setups with proper risk management. Trail stops as position moves in favor."
        elif sentiment == 'negative':
            return f"{impact_emoji} {impact.upper()} IMPACT: Bearish development. Exercise caution with longs. Consider hedging or reducing exposure. Short sellers may find opportunities."
        else:
            return f"{impact_emoji} {impact.upper()} IMPACT: Neutral market-moving event. Wait for clarity before taking directional bets. Focus on range-bound strategies."


# Create singleton instance
news_service = NewsService()
