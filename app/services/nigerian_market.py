"""
Nigerian Stock Exchange (NGX) Market Data Service

Data sourcing strategy:
1. Uses realistic simulated data based on actual NGX stock prices
2. Prices are seeded daily for consistency
3. Simulates realistic market movements within NGX ±10% daily limit

Note: Real-time NGX API requires expensive subscription (₦625,000/year)
This simulation uses actual stock tickers and realistic price ranges.
"""
import random
import hashlib
from datetime import datetime
from typing import List, Dict
from app.models.schemas import NigerianStockData, NigerianMarketSnapshot
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NigerianMarketService:
    def __init__(self):
        # Real NGX stocks with realistic base prices (December 2024 - verified active on NGX)
        self.ngx_stocks = [
            # Blue chips (Most Traded)
            {'ticker': 'DANGCEM', 'name': 'Dangote Cement', 'sector': 'Industrial', 
             'base_price': 460.00, 'volatility': 0.03},
            {'ticker': 'MTNN', 'name': 'MTN Nigeria', 'sector': 'Telecom', 
             'base_price': 245.00, 'volatility': 0.04},
            {'ticker': 'AIRTELAFRI', 'name': 'Airtel Africa', 'sector': 'Telecom', 
             'base_price': 2150.00, 'volatility': 0.035},
            {'ticker': 'BUACEMENT', 'name': 'BUA Cement', 'sector': 'Industrial', 
             'base_price': 112.00, 'volatility': 0.03},
            {'ticker': 'SEPLAT', 'name': 'Seplat Energy', 'sector': 'Oil & Gas', 
             'base_price': 2850.00, 'volatility': 0.045},
            {'ticker': 'GEREGU', 'name': 'Geregu Power', 'sector': 'Utilities', 
             'base_price': 750.00, 'volatility': 0.04},
            
            # Banking (Tier 1)
            {'ticker': 'GTCO', 'name': 'GT Holding Company', 'sector': 'Banking', 
             'base_price': 45.50, 'volatility': 0.04},
            {'ticker': 'ZENITHBANK', 'name': 'Zenith Bank', 'sector': 'Banking', 
             'base_price': 40.25, 'volatility': 0.04},
            {'ticker': 'ACCESSCORP', 'name': 'Access Holdings', 'sector': 'Banking', 
             'base_price': 20.80, 'volatility': 0.045},
            {'ticker': 'UBA', 'name': 'United Bank for Africa', 'sector': 'Banking', 
             'base_price': 27.50, 'volatility': 0.04},
            {'ticker': 'FBNH', 'name': 'FBN Holdings', 'sector': 'Banking', 
             'base_price': 24.00, 'volatility': 0.05},
            {'ticker': 'STANBIC', 'name': 'Stanbic IBTC', 'sector': 'Banking', 
             'base_price': 68.00, 'volatility': 0.03},
            {'ticker': 'WEMABANK', 'name': 'Wema Bank', 'sector': 'Banking', 
             'base_price': 8.50, 'volatility': 0.05},
            
            # Mid-cap Banks (affordable)
            {'ticker': 'FIDELITYBK', 'name': 'Fidelity Bank', 'sector': 'Banking', 
             'base_price': 12.50, 'volatility': 0.05},
            {'ticker': 'FCMB', 'name': 'FCMB Group', 'sector': 'Banking', 
             'base_price': 7.80, 'volatility': 0.06},
            {'ticker': 'STERLINGNG', 'name': 'Sterling HoldCo', 'sector': 'Banking', 
             'base_price': 4.50, 'volatility': 0.06},
            
            # Consumer Goods
            {'ticker': 'NESTLE', 'name': 'Nestle Nigeria', 'sector': 'Consumer Goods', 
             'base_price': 920.00, 'volatility': 0.025},
            {'ticker': 'BUAFOODS', 'name': 'BUA Foods', 'sector': 'Consumer Goods', 
             'base_price': 178.00, 'volatility': 0.035},
            {'ticker': 'NB', 'name': 'Nigerian Breweries', 'sector': 'Consumer Goods', 
             'base_price': 28.00, 'volatility': 0.04},
            {'ticker': 'GUINNESS', 'name': 'Guinness Nigeria', 'sector': 'Consumer Goods', 
             'base_price': 52.00, 'volatility': 0.04},
            {'ticker': 'FLOURMILL', 'name': 'Flour Mills Nigeria', 'sector': 'Consumer Goods', 
             'base_price': 46.00, 'volatility': 0.035},
            {'ticker': 'NASCON', 'name': 'Nascon Allied Industries', 'sector': 'Consumer Goods', 
             'base_price': 35.00, 'volatility': 0.04},
            {'ticker': 'DANGSUGAR', 'name': 'Dangote Sugar', 'sector': 'Consumer Goods', 
             'base_price': 32.00, 'volatility': 0.045},
            {'ticker': 'HONYFLOUR', 'name': 'Honeywell Flour', 'sector': 'Consumer Goods', 
             'base_price': 4.20, 'volatility': 0.05},
            
            # Oil & Gas
            {'ticker': 'TOTALENERG', 'name': 'TotalEnergies Marketing', 'sector': 'Oil & Gas', 
             'base_price': 420.00, 'volatility': 0.03},
            {'ticker': 'OANDO', 'name': 'Oando PLC', 'sector': 'Oil & Gas', 
             'base_price': 15.50, 'volatility': 0.055},
            {'ticker': 'CONOIL', 'name': 'Conoil PLC', 'sector': 'Oil & Gas', 
             'base_price': 120.00, 'volatility': 0.04},
            
            # Industrial
            {'ticker': 'WAPCO', 'name': 'Lafarge Africa', 'sector': 'Industrial', 
             'base_price': 36.50, 'volatility': 0.035},
            {'ticker': 'CUTIX', 'name': 'Cutix PLC', 'sector': 'Industrial', 
             'base_price': 3.20, 'volatility': 0.05},
            
            # Agriculture
            {'ticker': 'PRESCO', 'name': 'Presco PLC', 'sector': 'Agriculture', 
             'base_price': 310.00, 'volatility': 0.04},
            {'ticker': 'OKOMUOIL', 'name': 'Okomu Oil Palm', 'sector': 'Agriculture', 
             'base_price': 280.00, 'volatility': 0.04},
            
            # Conglomerate
            {'ticker': 'TRANSCORP', 'name': 'Transnational Corp', 'sector': 'Conglomerate', 
             'base_price': 9.80, 'volatility': 0.055},
            
            # Insurance
            {'ticker': 'AIICO', 'name': 'AIICO Insurance', 'sector': 'Insurance', 
             'base_price': 1.80, 'volatility': 0.06},
            {'ticker': 'MANSARD', 'name': 'AXA Mansard', 'sector': 'Insurance', 
             'base_price': 5.50, 'volatility': 0.05},
            {'ticker': 'CHIPLC', 'name': 'Consolidated Hallmark', 'sector': 'Insurance', 
             'base_price': 0.95, 'volatility': 0.07},
        ]
        
        self._cache = None
        self._cache_time = None
        self._cache_duration = 300  # 5 minutes cache
    
    def _generate_daily_prices(self) -> List[Dict]:
        """
        Generate daily stock prices with consistent movements.
        Uses date as seed so prices are same throughout the day.
        """
        today = datetime.now().strftime("%Y-%m-%d")
        stocks_data = []
        
        for stock in self.ngx_stocks:
            # Create consistent daily seed based on ticker + date
            seed = int(hashlib.md5(f"{today}{stock['ticker']}".encode()).hexdigest()[:8], 16)
            random.seed(seed)
            
            # Generate price change within stock's volatility range
            # Also respect NGX ±10% daily limit
            max_change = min(stock['volatility'] * 100, 10.0)
            change_pct = round(random.uniform(-max_change, max_change), 2)
            
            # Calculate new price
            price = round(stock['base_price'] * (1 + change_pct / 100), 2)
            
            # Random volume based on liquidity
            base_volume = 5000000 if stock['base_price'] > 100 else 10000000
            volume = random.randint(base_volume // 2, base_volume * 2)
            
            random.seed()  # Reset random seed
            
            stocks_data.append({
                'ticker': stock['ticker'],
                'name': stock['name'],
                'price': price,
                'change_pct': change_pct,
                'volume': volume,
                'sector': stock['sector'],
                'base_price': stock['base_price']
            })
        
        return stocks_data
    
    def get_market_snapshot(self) -> NigerianMarketSnapshot:
        """
        Get Nigerian market snapshot with simulated daily prices.
        
        Note: This uses simulated data because real-time NGX API requires
        a costly subscription. Prices are consistent within each day.
        """
        # Check cache
        if self._cache and self._cache_time:
            elapsed = (datetime.now() - self._cache_time).total_seconds()
            if elapsed < self._cache_duration:
                return self._cache
        
        logger.info(f"📊 Generating Nigerian market data for {len(self.ngx_stocks)} stocks...")
        logger.info("⚠️ Note: Using simulated prices (real-time NGX API costs ₦625K/year)")
        
        # Generate daily prices
        stocks_data = self._generate_daily_prices()
        
        # Convert to NigerianStockData objects
        all_stocks = []
        for stock in stocks_data:
            all_stocks.append(NigerianStockData(
                ticker=stock['ticker'],
                name=stock['name'],
                price=stock['price'],
                change_pct=stock['change_pct'],
                volume=stock['volume'],
                sector=stock['sector'],
                description=f"{stock['name']} - {stock['sector']} stock",
                market_cap=None,
                pe_ratio=None,
                week_52_high=round(stock['base_price'] * 1.3, 2),
                week_52_low=round(stock['base_price'] * 0.7, 2)
            ))
        
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
        
        summary = f"{mood} ({avg_change:+.2f}% avg). {advancing} gainers, {declining} losers, {unchanged} unchanged. ⚠️ Simulated data"
        
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
        
        return result
