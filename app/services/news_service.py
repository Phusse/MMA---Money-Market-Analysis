"""
Financial News Service - Multi-Source Dynamic

Fetches news from multiple sources with AI-powered impact analysis.
Sources (in priority order):
1. CryptoCompare News (free, no API key required)
2. Finnhub News API (free tier with key)
3. Alpha Vantage News (free tier with key)
4. NewsAPI.org (free tier with key) - Nigerian/Business news
5. Marketaux (free tier with key) - US financial news
6. RSS Feeds (free, no key required) - Multiple sources
7. Curated content (fallback only when APIs fail)
"""
import requests
import feedparser
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
        self.newsapi_key = os.getenv('NEWSAPI_KEY', '')
        self.marketaux_key = os.getenv('MARKETAUX_KEY', '')
        
        # RSS Feed URLs
        self.rss_feeds = {
            'investing': 'https://www.investing.com/rss/news.rss',
            'nasdaq': 'https://www.nasdaq.com/feed/rssoutbound?category=Markets',
            'cnbc': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
            'marketwatch': 'https://feeds.marketwatch.com/marketwatch/topstories/',
        }
        
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
        
        # 4. Fetch Nigerian news from NewsAPI.org if key available
        if self.newsapi_key:
            all_news.extend(self._fetch_newsapi_nigerian())
        
        # 5. Fetch US market news from Marketaux if key available
        if self.marketaux_key:
            all_news.extend(self._fetch_marketaux_news())
        
        # 6. Fetch from RSS feeds (always available as fallback)
        all_news.extend(self._fetch_rss_news())
        
        # 7. Add curated fallbacks only if we don't have enough news
        if len(all_news) < 10:
            logger.info("📰 Adding curated fallback content...")
            all_news.extend(self._get_curated_fallback())
        
        # Sort by date (newest first) and deduplicate
        seen_titles = set()
        unique_news = []
        for article in all_news:
            # Simple deduplication by title similarity
            title_key = article.title.lower()[:50]
            if title_key not in seen_titles:
                seen_titles.add(title_key)
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
    
    def _fetch_newsapi_nigerian(self) -> List[NewsArticle]:
        """Fetch Nigerian business/market news from NewsAPI.org"""
        articles = []
        try:
            # Search for Nigerian market/business news
            queries = ['Nigeria stock market', 'NGX', 'Nigerian economy', 'Naira']
            
            for query in queries[:2]:  # Limit to 2 queries to stay within rate limits
                response = requests.get(
                    f"https://newsapi.org/v2/everything",
                    params={
                        'q': query,
                        'language': 'en',
                        'sortBy': 'publishedAt',
                        'pageSize': 5,
                        'apiKey': self.newsapi_key
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get('articles', []):
                        title = item.get('title', '')
                        description = item.get('description', '') or ''
                        
                        if not title or title == '[Removed]':
                            continue
                        
                        sentiment = self._analyze_sentiment(title + ' ' + description)
                        impact = self._determine_impact(title + ' ' + description)
                        
                        # Parse the published date
                        pub_date = item.get('publishedAt', '')
                        if pub_date:
                            try:
                                dt = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
                                pub_date = dt.strftime("%a, %d %b %Y %H:%M")
                            except:
                                pass
                        
                        articles.append(NewsArticle(
                            title=f"🇳🇬 {title}",
                            summary=description[:300] + '...' if len(description) > 300 else description,
                            source=item.get('source', {}).get('name', 'NewsAPI'),
                            url=item.get('url'),
                            published_at=pub_date,
                            category="ngx_market",
                            related_tickers=self._extract_nigerian_tickers(title + ' ' + description),
                            sentiment=sentiment,
                            ai_analysis=self._generate_nigerian_analysis(title, sentiment, impact)
                        ))
            
            logger.info(f"📰 Fetched {len(articles)} Nigerian news from NewsAPI")
        except Exception as e:
            logger.warning(f"NewsAPI fetch error: {e}")
        
        return articles
    
    def _fetch_marketaux_news(self) -> List[NewsArticle]:
        """Fetch US financial news from Marketaux"""
        articles = []
        try:
            response = requests.get(
                "https://api.marketaux.com/v1/news/all",
                params={
                    'countries': 'us',
                    'filter_entities': 'true',
                    'language': 'en',
                    'api_token': self.marketaux_key
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                for item in data.get('data', [])[:8]:
                    title = item.get('title', '')
                    description = item.get('description', '') or ''
                    
                    sentiment = self._analyze_sentiment(title + ' ' + description)
                    impact = self._determine_impact(title + ' ' + description)
                    
                    # Extract tickers from entities
                    tickers = []
                    for entity in item.get('entities', []):
                        if entity.get('symbol'):
                            tickers.append(entity.get('symbol'))
                    
                    articles.append(NewsArticle(
                        title=f"🇺🇸 {title}",
                        summary=description[:300] + '...' if len(description) > 300 else description,
                        source=item.get('source', 'Marketaux'),
                        url=item.get('url'),
                        published_at=item.get('published_at', ''),
                        category="us_market",
                        related_tickers=tickers[:5],
                        sentiment=sentiment,
                        ai_analysis=self._generate_market_analysis(title, sentiment, impact, 'us_market')
                    ))
            
            logger.info(f"📰 Fetched {len(articles)} US news from Marketaux")
        except Exception as e:
            logger.warning(f"Marketaux fetch error: {e}")
        
        return articles
    
    def _fetch_rss_news(self) -> List[NewsArticle]:
        """Fetch news from multiple RSS feeds"""
        articles = []
        
        for source_name, feed_url in self.rss_feeds.items():
            try:
                feed = feedparser.parse(feed_url)
                
                for entry in feed.entries[:5]:  # Limit per feed
                    title = entry.get('title', '')
                    summary = entry.get('summary', '') or entry.get('description', '') or ''
                    link = entry.get('link', '')
                    
                    # Parse published date
                    pub_date = ''
                    if hasattr(entry, 'published_parsed') and entry.published_parsed:
                        try:
                            dt = datetime(*entry.published_parsed[:6])
                            pub_date = dt.strftime("%a, %d %b %Y %H:%M")
                        except:
                            pass
                    
                    # Clean HTML from summary
                    import re
                    summary = re.sub(r'<[^>]+>', '', summary)
                    
                    sentiment = self._analyze_sentiment(title + ' ' + summary)
                    category = self._determine_category(title + ' ' + summary)
                    impact = self._determine_impact(title + ' ' + summary)
                    
                    articles.append(NewsArticle(
                        title=title,
                        summary=summary[:300] + '...' if len(summary) > 300 else summary,
                        source=source_name.title(),
                        url=link,
                        published_at=pub_date,
                        category=category,
                        related_tickers=self._extract_tickers(title + ' ' + summary),
                        sentiment=sentiment,
                        ai_analysis=self._generate_market_analysis(title, sentiment, impact, category)
                    ))
                
                logger.info(f"📰 Fetched {len(feed.entries[:5])} articles from {source_name}")
            except Exception as e:
                logger.warning(f"RSS feed {source_name} error: {e}")
        
        return articles
    
    def _get_curated_fallback(self) -> List[NewsArticle]:
        """Fallback curated content when live sources fail - with dynamic timestamps"""
        now = datetime.now()
        timestamp = now.strftime("%a, %d %b %Y %H:%M")
        
        # Return minimal curated content as last resort
        return [
            NewsArticle(
                title="📊 Market Overview: Global Trading Update",
                summary="Markets are in active trading. Check live prices for the latest movements across major indices, commodities, and currencies. This is a general market update - for specific news, ensure API keys are configured.",
                source="MMI Market Watch",
                published_at=timestamp,
                category="general",
                related_tickers=["SPY", "QQQ", "DIA"],
                sentiment="neutral",
                ai_analysis="ℹ️ NOTICE: Live news feeds unavailable. Configure NEWSAPI_KEY, MARKETAUX_KEY, or FINNHUB_API_KEY in your .env file for real-time news."
            ),
            NewsArticle(
                title="💱 Forex Session Status",
                summary=self._get_session_status(),
                source="MMI Forex Watch",
                published_at=timestamp,
                category="forex",
                related_tickers=["EUR/USD", "GBP/USD", "USD/JPY"],
                sentiment="neutral",
                ai_analysis=self._get_session_trading_tip()
            ),
        ]
    
    def _get_session_status(self) -> str:
        """Get current forex session status"""
        hour = datetime.now().hour
        
        if 0 <= hour < 8:
            return "Asian session (Tokyo/Sydney) currently active. Lower volatility expected for major pairs. AUD, NZD, and JPY pairs most active."
        elif 8 <= hour < 12:
            return "London session open - peak forex trading hours. EUR and GBP pairs most active. High liquidity and best spreads available."
        elif 12 <= hour < 17:
            return "London/New York overlap - maximum liquidity period. Highest volatility window for major currency pairs."
        elif 17 <= hour < 22:
            return "New York session active. USD pairs remain liquid. Watch for late-session position squaring."
        else:
            return "Transitioning to Asian session. Liquidity decreasing for major pairs. Consider wider stops if trading overnight."
    
    def _get_session_trading_tip(self) -> str:
        """Get trading tip based on current session"""
        hour = datetime.now().hour
        
        if 8 <= hour < 17:
            return "🟢 OPTIMAL TRADING: Major forex sessions active. Best time for EUR/USD and GBP/USD trades with tight spreads."
        else:
            return "🟡 REDUCED LIQUIDITY: Off-peak hours. Consider wider stops and smaller position sizes. Avoid exotic pairs."
    
    def _extract_nigerian_tickers(self, text: str) -> List[str]:
        """Extract Nigerian stock tickers from text"""
        text_upper = text.upper()
        tickers = []
        
        ngx_stocks = {
            'DANGOTE': 'DANGCEM', 'DANGCEM': 'DANGCEM',
            'ZENITH': 'ZENITHBANK', 'ZENITHBANK': 'ZENITHBANK',
            'GTCO': 'GTCO', 'GTB': 'GTCO', 'GUARANTY': 'GTCO',
            'UBA': 'UBA',
            'ACCESS': 'ACCESSCORP', 'ACCESSCORP': 'ACCESSCORP',
            'FBNH': 'FBNH', 'FIRST BANK': 'FBNH',
            'SEPLAT': 'SEPLAT',
            'OANDO': 'OANDO',
            'MTN': 'MTNN', 'MTNN': 'MTNN',
            'AIRTEL': 'AIRTELAFRI', 'AIRTELAFRI': 'AIRTELAFRI',
            'BUA': 'BUACEMENT', 'BUACEMENT': 'BUACEMENT',
            'NESTLE': 'NESTLE',
            'UNILEVER': 'UNILEVER',
        }
        
        for keyword, ticker in ngx_stocks.items():
            if keyword in text_upper and ticker not in tickers:
                tickers.append(ticker)
        
        return tickers[:5]
    
    def _extract_tickers(self, text: str) -> List[str]:
        """Extract stock tickers from text"""
        text_upper = text.upper()
        tickers = []
        
        common_tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 
                          'SPY', 'QQQ', 'AMD', 'INTC', 'JPM', 'BAC', 'GS']
        
        for ticker in common_tickers:
            if ticker in text_upper and ticker not in tickers:
                tickers.append(ticker)
        
        return tickers[:5]
    
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
            return f"{impact_emoji} {impact.upper()} IMPACT: Bullish catalyst. Look for BUY setups with proper risk management. Trail stops as position moves in favor."
        elif sentiment == 'negative':
            return f"{impact_emoji} {impact.upper()} IMPACT: Bearish development. Exercise caution with longs. Consider hedging or reducing exposure."
        else:
            return f"{impact_emoji} {impact.upper()} IMPACT: Neutral market event. Wait for clarity before taking directional bets. Focus on range-bound strategies."
    
    def _generate_nigerian_analysis(self, title: str, sentiment: str, impact: str) -> str:
        """Generate Nigerian market-specific analysis"""
        impact_emoji = '🔴' if impact == 'high' else '🟡' if impact == 'medium' else '🟢'
        
        if sentiment == 'positive':
            return f"{impact_emoji} {impact.upper()} IMPACT: Positive for NGX. Consider accumulating quality stocks like GTCO, ZENITHBANK, DANGCEM on dips."
        elif sentiment == 'negative':
            return f"{impact_emoji} {impact.upper()} IMPACT: Caution for Nigerian market. Monitor Naira/USD rates. Consider defensive positions in consumer staples."
        else:
            return f"{impact_emoji} {impact.upper()} IMPACT: Neutral for NGX. Focus on dividend-paying stocks. Watch CBN policy updates for direction."


# Create singleton instance
news_service = NewsService()
