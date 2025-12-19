"""
AI-Powered NGX Stock Price Scraper

Uses Gemini AI with web search to find real-time NGX stock prices.
This bypasses the need for expensive NGX API (₦625,000/year).

The AI searches online for current prices and extracts them intelligently.
"""
import os
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime
import google.generativeai as genai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AIStockPriceScraper:
    """Use AI to search and extract real-time NGX stock prices"""
    
    def __init__(self):
        # Configure Gemini AI
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        
        # Use Gemini 2.0 Flash with search grounding
        self.model = genai.GenerativeModel(
            'gemini-2.0-flash-exp',
            tools='google_search_retrieval'  # Enable web search
        )
        
        # Stock list to search for
        self.ngx_stocks = [
            'DANGCEM', 'MTNN', 'AIRTELAFRI', 'BUACEMENT', 'SEPLAT', 'GEREGU',
            'GTCO', 'ZENITHBANK', 'ACCESSCORP', 'UBA', 'FBNH', 'STANBIC',
            'NESTLE', 'BUAFOODS', 'NB', 'GUINNESS', 'FLOURMILL', 'NASCON',
            'TOTALENERG', 'OANDO', 'WAPCO', 'PRESCO', 'TRANSCORP'
        ]
    
    def fetch_stock_prices(self, stock_symbols: Optional[List[str]] = None) -> List[Dict]:
        """
        Use AI to search online and extract current NGX stock prices.
        
        Args:
            stock_symbols: List of stock symbols to fetch. If None, fetches all.
        
        Returns:
            List of dicts with stock data: {ticker, price, change_pct, volume, etc.}
        """
        if stock_symbols is None:
            stock_symbols = self.ngx_stocks[:10]  # Limit to 10 for faster response
        
        try:
            logger.info(f"🤖 AI searching online for {len(stock_symbols)} NGX stock prices...")
            
            # Create prompt for AI to search and extract prices
            prompt = f"""
Search online for the CURRENT stock prices of these Nigerian Exchange (NGX) stocks:
{', '.join(stock_symbols)}

For EACH stock, find:
1. Current price (in Naira ₦)
2. Price change percentage today
3. Trading volume (if available)
4. Last updated time

Search recent financial news sites, NGX website, Investing.com Nigeria, or any reliable source.

Return the data in this EXACT JSON format:
{{
  "stocks": [
    {{
      "ticker": "DANGCEM",
      "price": 465.50,
      "change_pct": 1.2,
      "volume": 5000000,
      "source": "NGX website",
      "timestamp": "2024-12-17 14:30"
    }}
  ],
  "data_source": "Web search via AI",
  "search_timestamp": "{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
}}

IMPORTANT: 
- Return ONLY valid JSON, no markdown formatting
- Use actual current prices from your search
- If you can't find a stock, set price to null
- Be accurate with the numbers
"""
            
            # Generate with search grounding
            response = self.model.generate_content(prompt)
            
            # Extract JSON from response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '').strip()
            
            # Parse JSON
            data = json.loads(response_text)
            
            stocks = data.get('stocks', [])
            logger.info(f"✅ AI found prices for {len(stocks)} stocks")
            
            # Log grounding metadata if available
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'grounding_metadata'):
                    logger.info(f"🔍 Search sources used: {len(candidate.grounding_metadata.grounding_chunks)} sources")
            
            return stocks
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse AI response as JSON: {e}")
            logger.error(f"Response was: {response_text[:500]}")
            return []
        except Exception as e:
            logger.error(f"❌ AI stock price search failed: {e}")
            return []
    
    def fetch_batch_prices(self, batch_size: int = 10) -> List[Dict]:
        """
        Fetch prices in batches to avoid overwhelming the AI.
        
        Args:
            batch_size: Number of stocks per batch
        
        Returns:
            Combined list of all stock data
        """
        all_stocks = []
        
        for i in range(0, len(self.ngx_stocks), batch_size):
            batch = self.ngx_stocks[i:i + batch_size]
            logger.info(f"📦 Fetching batch {i//batch_size + 1}: {batch}")
            
            batch_stocks = self.fetch_stock_prices(batch)
            all_stocks.extend(batch_stocks)
            
            # Small delay between batches to avoid rate limits
            if i + batch_size < len(self.ngx_stocks):
                import time
                time.sleep(2)
        
        return all_stocks
    
    def get_single_stock_price(self, ticker: str) -> Optional[Dict]:
        """
        Get price for a single stock (faster than batch).
        
        Args:
            ticker: Stock symbol (e.g., "DANGCEM")
        
        Returns:
            Dict with stock data or None if not found
        """
        try:
            logger.info(f"🔍 AI searching for {ticker} price...")
            
            prompt = f"""
Search online for the CURRENT price of {ticker} stock on the Nigerian Exchange (NGX).

Find:
- Current price in Naira (₦)
- Today's price change percentage
- Trading volume if available

Search NGX website, Investing.com Nigeria, financial news, or any reliable source.

Return ONLY this JSON (no markdown):
{{
  "ticker": "{ticker}",
  "price": 465.50,
  "change_pct": 1.2,
  "volume": 5000000,
  "source": "source name",
  "timestamp": "{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
}}
"""
            
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean response
            if '```' in response_text:
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            
            data = json.loads(response_text)
            
            logger.info(f"✅ Found {ticker}: ₦{data.get('price')} ({data.get('change_pct'):+.2f}%)")
            
            return data
            
        except Exception as e:
            logger.error(f"❌ Failed to get {ticker} price: {e}")
            return None


# Singleton instance
ai_scraper = AIStockPriceScraper()


# Example usage
if __name__ == "__main__":
    # Test single stock
    stock = ai_scraper.get_single_stock_price("DANGCEM")
    print(f"\nSingle stock result:")
    print(json.dumps(stock, indent=2))
    
    # Test batch
    stocks = ai_scraper.fetch_stock_prices(['DANGCEM', 'MTNN', 'GTCO'])
    print(f"\nBatch results:")
    print(json.dumps(stocks, indent=2))
