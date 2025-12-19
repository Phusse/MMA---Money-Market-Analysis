"""
Nigerian Stock Exchange (NGX) Market Data Service

Data sourcing strategy:
1. PRIMARY: AI Web Search (Gemini with Google Search) - FREE, real-time
2. SECONDARY: Bamboo API (if configured)
3. FALLBACK: Simulated data

Uses AI to intelligently search the web for current NGX stock prices,
bypassing the expensive ₦625,000/year NGX API subscription.
"""
import requests
import random
import hashlib
import os
from datetime import datetime
from typing import List, Dict, Optional
from app.models.schemas import NigerianStockData, NigerianMarketSnapshot
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NigerianMarketService:
    def __init__(self):
        # AI Scraper configuration
        self.use_ai_search = os.getenv('USE_AI_NGX_SEARCH', 'true').lower() == 'true'
        
        # Bamboo API configuration (secondary)
        self.bamboo_api_base = os.getenv('BAMBOO_API_URL', 'https://api.investbamboo.com')
        self.bamboo_api_key = os.getenv('BAMBOO_API_KEY', '')
        
        # Stock metadata (for fallback and enrichment)
        self.ngx_stocks_metadata = {
            # Blue chips
            'DANGCEM': {'name': 'Dangote Cement', 'sector': 'Industrial'},
            'MTNN': {'name': 'MTN Nigeria', 'sector': 'Telecom'},
            'AIRTELAFRI': {'name': 'Airtel Africa', 'sector': 'Telecom'},
            'BUACEMENT': {'name': 'BUA Cement', 'sector': 'Industrial'},
            'SEPLAT': {'name': 'Seplat Energy', 'sector': 'Oil & Gas'},
            'GEREGU': {'name': 'Geregu Power', 'sector': 'Utilities'},
            
            # Banking
            'GTCO': {'name': 'GT Holding Company', 'sector': 'Banking'},
            'ZENITHBANK': {'name': 'Zenith Bank', 'sector': 'Banking'},
            'ACCESSCORP': {'name': 'Access Holdings', 'sector': 'Banking'},
            'UBA': {'name': 'United Bank for Africa', 'sector': 'Banking'},
            'FBNH': {'name': 'FBN Holdings', 'sector': 'Banking'},
            'STANBIC': {'name': 'Stanbic IBTC', 'sector': 'Banking'},
            'WEMABANK': {'name': 'Wema Bank', 'sector': 'Banking'},
            'FIDELITYBK': {'name': 'Fidelity Bank', 'sector': 'Banking'},
            'FCMB': {'name': 'FCMB Group', 'sector': 'Banking'},
            'STERLINGNG': {'name': 'Sterling HoldCo', 'sector': 'Banking'},
            
            # Consumer Goods
            'NESTLE': {'name': 'Nestle Nigeria', 'sector': 'Consumer Goods'},
            'BUAFOODS': {'name': 'BUA Foods', 'sector': 'Consumer Goods'},
            'NB': {'name': 'Nigerian Breweries', 'sector': 'Consumer Goods'},
            'GUINNESS': {'name': 'Guinness Nigeria', 'sector': 'Consumer Goods'},
            'FLOURMILL': {'name': 'Flour Mills Nigeria', 'sector': 'Consumer Goods'},
            'NASCON': {'name': 'Nascon Allied Industries', 'sector': 'Consumer Goods'},
            'DANGSUGAR': {'name': 'Dangote Sugar', 'sector': 'Consumer Goods'},
            'HONYFLOUR': {'name': 'Honeywell Flour', 'sector': 'Consumer Goods'},
            
            # Oil & Gas
            'TOTALENERG': {'name': 'TotalEnergies Marketing', 'sector': 'Oil & Gas'},
            'OANDO': {'name': 'Oando PLC', 'sector': 'Oil & Gas'},
            'CONOIL': {'name': 'Conoil PLC', 'sector': 'Oil & Gas'},
            
            # Industrial
            'WAPCO': {'name': 'Lafarge Africa', 'sector': 'Industrial'},
            'CUTIX': {'name': 'Cutix PLC', 'sector': 'Industrial'},
            
            # Agriculture
            'PRESCO': {'name': 'Presco PLC', 'sector': 'Agriculture'},
            'OKOMUOIL': {'name': 'Okomu Oil Palm', 'sector': 'Agriculture'},
            
            # Conglomerate
            'TRANSCORP': {'name': 'Transnational Corp', 'sector': 'Conglomerate'},
            
            # Insurance
            'AIICO': {'name': 'AIICO Insurance', 'sector': 'Insurance'},
            'MANSARD': {'name': 'AXA Mansard', 'sector': 'Insurance'},
            'CHIPLC': {'name': 'Consolidated Hallmark', 'sector': 'Insurance'},
        }
        
        self._cache = None
        self._cache_time = None
        self._cache_duration = 300  # 5 minutes cache
    
    def _fetch_from_ai_search(self) -> Optional[List[Dict]]:
        """
        Use AI with web search to find real-time NGX stock prices.
        
        Returns list of stock data or None if AI search fails.
        """
        if not self.use_ai_search:
            return None
        
        try:
            from app.services.ai_ngx_scraper import ai_scraper
            
            logger.info("🤖 Using AI to search web for NGX stock prices...")
            
            # Get top stocks (limit to avoid long AI processing time)
            top_stocks = list(self.ngx_stocks_metadata.keys())[:15]
            
            stocks = ai_scraper.fetch_stock_prices(top_stocks)
            
            if stocks and len(stocks) > 0:
                logger.info(f"✅ AI found {len(stocks)} stock prices from web search")
                return stocks
            else:
                logger.warning("⚠️ AI search returned no results")
                return None
                
        except ImportError:
            logger.warning("⚠️ AI scraper not available (missing dependencies)")
            return None
        except Exception as e:
            logger.warning(f"⚠️ AI search failed: {e}")
            return None
    
    def _parse_ai_data(self, ai_stocks: List[Dict]) -> List[NigerianStockData]:
        """
        Parse AI-scraped stock data into NigerianStockData objects.
        
        AI returns data in format:
        {
          "ticker": "DANGCEM",
          "price": 465.50,
          "change_pct": 1.2,
          "volume": 5000000,
          "source": "NGX website",
          "timestamp": "2024-12-17 14:30"
        }
        """
        parsed_stocks = []
        
        for stock in ai_stocks:
            try:
                ticker = stock.get('ticker', '').upper()
                
                # Skip if no price found
                if stock.get('price') is None:
                    logger.warning(f"⚠️ AI couldn't find price for {ticker}")
                    continue
                
                # Get metadata
                metadata = self.ngx_stocks_metadata.get(ticker, {
                    'name': ticker,
                    'sector': 'Unknown'
                })
                
                # Parse price data
                price = float(stock.get('price', 0))
                change_pct = float(stock.get('change_pct', 0))
                volume = int(stock.get('volume', 1000000))  # Default volume if not found
                
                parsed_stocks.append(NigerianStockData(
                    ticker=ticker,
                    name=metadata['name'],
                    price=round(price, 2),
                    change_pct=round(change_pct, 2),
                    volume=volume,
                    sector=metadata['sector'],
                    description=f"{metadata['name']} - {metadata['sector']} stock (AI-sourced)",
                    market_cap=None,
                    pe_ratio=None,
                    week_52_high=None,
                    week_52_low=None
                ))
                
            except (ValueError, KeyError, TypeError) as e:
                logger.warning(f"⚠️ Error parsing AI data for {stock.get('ticker', 'UNKNOWN')}: {e}")
                continue
        
        return parsed_stocks
    
    def _fetch_from_bamboo(self) -> Optional[List[Dict]]:
        """
        Fetch real NGX market data from Bamboo API.
        
        Returns list of stock data or None if API fails.
        """
        try:
            # Bamboo API endpoint for NGX stocks
            # Adjust this based on actual Bamboo API documentation
            url = f"{self.bamboo_api_base}/stocks/ngx"
            
            headers = {}
            if self.bamboo_api_key:
                headers['Authorization'] = f'Bearer {self.bamboo_api_key}'
            
            logger.info(f"🌿 Fetching NGX data from Bamboo API: {url}")
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Bamboo API success: {len(data.get('stocks', []))} stocks")
                return data.get('stocks', [])
            else:
                logger.warning(f"⚠️ Bamboo API returned status {response.status_code}")
                return None
                
        except requests.exceptions.Timeout:
            logger.warning("⚠️ Bamboo API timeout")
            return None
        except requests.exceptions.ConnectionError:
            logger.warning("⚠️ Bamboo API connection error")
            return None
        except Exception as e:
            logger.warning(f"⚠️ Bamboo API error: {e}")
            return None
    
    def _parse_bamboo_data(self, bamboo_stocks: List[Dict]) -> List[NigerianStockData]:
        """
        Parse Bamboo API response into NigerianStockData objects.
        
        Adjust field mappings based on actual Bamboo API response format.
        """
        parsed_stocks = []
        
        for stock in bamboo_stocks:
            try:
                # Map Bamboo API fields to our schema
                # Adjust these field names based on actual Bamboo API response
                ticker = stock.get('symbol', stock.get('ticker', '')).upper()
                
                # Get metadata
                metadata = self.ngx_stocks_metadata.get(ticker, {
                    'name': stock.get('name', ticker),
                    'sector': stock.get('sector', 'Unknown')
                })
                
                # Parse price data
                price = float(stock.get('price', stock.get('lastPrice', 0)))
                change_pct = float(stock.get('changePercent', stock.get('change_pct', 0)))
                volume = int(stock.get('volume', stock.get('totalVolume', 0)))
                
                parsed_stocks.append(NigerianStockData(
                    ticker=ticker,
                    name=metadata['name'],
                    price=round(price, 2),
                    change_pct=round(change_pct, 2),
                    volume=volume,
                    sector=metadata['sector'],
                    description=f"{metadata['name']} - {metadata['sector']} stock",
                    market_cap=stock.get('marketCap'),
                    pe_ratio=stock.get('peRatio'),
                    week_52_high=stock.get('week52High'),
                    week_52_low=stock.get('week52Low')
                ))
                
            except (ValueError, KeyError, TypeError) as e:
                logger.warning(f"⚠️ Error parsing stock {stock.get('symbol', 'UNKNOWN')}: {e}")
                continue
        
        return parsed_stocks
    
    def _generate_fallback_data(self) -> List[NigerianStockData]:
        """
        Generate fallback simulated data when Bamboo API is unavailable.
        Uses date-based seeding for consistency.
        """
        logger.info("📊 Using fallback simulated data (Bamboo API unavailable)")
        
        today = datetime.now().strftime("%Y-%m-%d")
        stocks_data = []
        
        # Fallback base prices
        fallback_prices = {
            'DANGCEM': 460.00, 'MTNN': 245.00, 'AIRTELAFRI': 2150.00,
            'BUACEMENT': 112.00, 'SEPLAT': 2850.00, 'GEREGU': 750.00,
            'GTCO': 45.50, 'ZENITHBANK': 40.25, 'ACCESSCORP': 20.80,
            'UBA': 27.50, 'FBNH': 24.00, 'STANBIC': 68.00,
            'NESTLE': 920.00, 'BUAFOODS': 178.00, 'NB': 28.00,
        }
        
        for ticker, metadata in self.ngx_stocks_metadata.items():
            if ticker not in fallback_prices:
                continue
                
            # Generate consistent daily price
            seed = int(hashlib.md5(f"{today}{ticker}".encode()).hexdigest()[:8], 16)
            random.seed(seed)
            
            base_price = fallback_prices[ticker]
            change_pct = round(random.uniform(-5.0, 5.0), 2)
            price = round(base_price * (1 + change_pct / 100), 2)
            volume = random.randint(1000000, 10000000)
            
            random.seed()  # Reset
            
            stocks_data.append(NigerianStockData(
                ticker=ticker,
                name=metadata['name'],
                price=price,
                change_pct=change_pct,
                volume=volume,
                sector=metadata['sector'],
                description=f"{metadata['name']} - {metadata['sector']} stock",
                market_cap=None,
                pe_ratio=None,
                week_52_high=round(base_price * 1.3, 2),
                week_52_low=round(base_price * 0.7, 2)
            ))
        
        return stocks_data
    
    def get_market_snapshot(self) -> NigerianMarketSnapshot:
        """
        Get Nigerian market snapshot.
        
        Data source priority:
        1. AI Web Search (Gemini with Google Search) - Real-time, FREE
        2. Bamboo API (if configured)
        3. Fallback simulated data
        """
        # Check cache
        if self._cache and self._cache_time:
            elapsed = (datetime.now() - self._cache_time).total_seconds()
            if elapsed < self._cache_duration:
                logger.info("📋 Using cached NGX data")
                return self._cache
        
        logger.info(f"💱 Fetching NGX market data...")
        
        # Try AI web search first (FREE and real-time!)
        ai_data = self._fetch_from_ai_search()
        
        if ai_data:
            all_stocks = self._parse_ai_data(ai_data)
            data_source = "AI Web Search (Real-time)"
        else:
            # Try Bamboo API as backup
            bamboo_data = self._fetch_from_bamboo()
            
            if bamboo_data:
                all_stocks = self._parse_bamboo_data(bamboo_data)
                data_source = "Bamboo API (Real-time)"
            else:
                # Final fallback: simulated data
                all_stocks = self._generate_fallback_data()
                data_source = "Simulated (AI & Bamboo unavailable)"
        
        if not all_stocks:
            logger.error("❌ No stock data available")
            raise ValueError("Unable to fetch NGX market data")
        
        # Sort by change percentage
        sorted_stocks = sorted(all_stocks, key=lambda x: x.change_pct, reverse=True)
        
        # Get gainers (positive change, top 5)
        gainers = [s for s in sorted_stocks if s.change_pct > 0][:5]
        
        # Get losers (negative change, bottom 5)
        losers_list = [s for s in sorted_stocks if s.change_pct < 0]
        losers = losers_list[-5:][::-1] if losers_list else []
        
        # Most active by volume
        active = sorted(all_stocks, key=lambda x: x.volume, reverse=True)[:5]
        
        # Sector performance
        sector_perf = {}
        sectors = set(s.sector for s in all_stocks)
        for sec in sectors:
            sec_stocks = [s for s in all_stocks if s.sector == sec]
            if sec_stocks:
                avg = sum(s.change_pct for s in sec_stocks) / len(sec_stocks)
                sector_perf[sec] = round(avg, 2)
        
        # Market summary
        avg_change = sum(s.change_pct for s in all_stocks) / len(all_stocks)
        advancing = len([s for s in all_stocks if s.change_pct > 0])
        declining = len([s for s in all_stocks if s.change_pct < 0])
        unchanged = len(all_stocks) - advancing - declining
        
        if avg_change > 0.3:
            mood = "🟢 NGX bullish"
        elif avg_change < -0.3:
            mood = "🔴 NGX bearish"
        else:
            mood = "🟡 NGX mixed"
        
        summary = f"{mood} ({avg_change:+.2f}% avg). {advancing} gainers, {declining} losers. Source: {data_source}"
        
        result = NigerianMarketSnapshot(
            gainers=gainers,
            losers=losers,
            active=active,
            sector_performance=sector_perf,
            market_summary=summary
        )
        
        # Cache the result
        self._cache = result
        self._cache_time = datetime.now()
        
        logger.info(f"✅ NGX data ready: {len(all_stocks)} stocks from {data_source}")
        
        return result


# Singleton instance
nigerian_market_service = NigerianMarketService()
