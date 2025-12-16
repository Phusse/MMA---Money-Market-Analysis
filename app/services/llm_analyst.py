"""
AI Market Analyst Service

Uses AI models to analyze market data and generate investment strategies.
Primary: Google Gemini
Fallback: OpenAI GPT-4
Last Resort: Pre-built fallback strategies
"""
import google.generativeai as genai
from app.core.config import get_settings
from app.models.schemas import (
    MarketSnapshot, AIAnalysis, InvestmentStrategy, 
    NigerianMarketSnapshot, NigerianInvestmentStrategy
)
import json
import logging
import os

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.gemma_model = None  # Primary: gemma-3-27b-it (separate quota)
        self.gemini_model = None  # Fallback: gemini-2.0-flash (fast)
        self.openai_client = None
        
        # Initialize Gemini models
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            # Primary model - gemma-3-27b-it has separate quota that doesn't exceed as fast
            self.gemma_model = genai.GenerativeModel('gemma-3-27b-it')
            # Fallback model - gemini-2.0-flash is faster
            self.gemini_model = genai.GenerativeModel('gemini-2.0-flash')
            logger.info("✅ Gemini API initialized (primary: gemma-3-27b-it, fallback: gemini-2.0-flash)")
        else:
            logger.warning("⚠️ GEMINI_API_KEY not set")
        
        # Initialize OpenAI as last AI fallback
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=openai_key)
                logger.info("✅ OpenAI API initialized as fallback")
            except ImportError:
                logger.warning("⚠️ OpenAI package not installed")
            except Exception as e:
                logger.warning(f"⚠️ OpenAI initialization failed: {e}")
    
    def _build_prompt(self, us_data: str, ng_data: str) -> str:
        """Build the analysis prompt for AI models"""
        return f"""
You are a Senior Financial Analyst. Analyze this market data and provide actionable strategies.

=== US MARKET DATA ===
{us_data}

=== NIGERIAN MARKET DATA ===
{ng_data}

Return ONLY valid JSON (no markdown, no backticks):

{{
    "key_insights": ["3-5 key insights about both markets"],
    "opportunities": ["Specific opportunities with stock names"],
    "red_flags": ["Risks and warnings"],
    "sector_rotation": "Analysis of sector momentum",
    "momentum_plays": ["Stocks with strong momentum"],
    
    "high_capital_strategy": {{
        "stocks": ["3-5 US stocks for $50K+ investors"],
        "allocation": "Percentage allocation",
        "rationale": "Why these stocks",
        "risk_level": "Conservative/Moderate/Aggressive",
        "entry_zone": "Entry price guidance",
        "target": "Price targets",
        "stop_loss": "Stop-loss levels",
        "timeframe": "Investment horizon"
    }},
    "medium_capital_strategy": {{
        "stocks": ["3-4 US stocks for $10K-50K"],
        "allocation": "Allocation percentages",
        "rationale": "Strategy rationale",
        "risk_level": "Moderate",
        "entry_zone": "Entry guidance",
        "target": "Targets",
        "stop_loss": "Stop-loss",
        "timeframe": "Timeframe"
    }},
    "low_capital_strategy": {{
        "stocks": ["2-3 US stocks/ETFs for $1K-10K"],
        "allocation": "Allocations",
        "rationale": "Rationale",
        "risk_level": "Moderate",
        "entry_zone": "Entry",
        "target": "Targets",
        "stop_loss": "Stop-loss",
        "timeframe": "Timeframe"
    }},
    "micro_capital_strategy": {{
        "stocks": ["1-2 ETFs for under $1K - fractional shares"],
        "allocation": "50/50 or 60/40",
        "rationale": "Best for beginners - use fractional shares",
        "risk_level": "Moderate",
        "entry_zone": "Dollar-cost average weekly",
        "target": "Long-term market returns",
        "stop_loss": "10% trailing stop",
        "timeframe": "12+ months"
    }},
    
    "ng_high_capital_strategy": {{
        "stocks": ["3-5 Nigerian blue chips for ₦10M+"],
        "allocation": "Allocation",
        "rationale": "Rationale",
        "risk_level": "Conservative",
        "entry_zone": "Entry",
        "target": "Targets",
        "stop_loss": "Stop-loss",
        "timeframe": "Timeframe"
    }},
    "ng_medium_capital_strategy": {{
        "stocks": ["3-4 Nigerian stocks for ₦1M-10M"],
        "allocation": "Allocation",
        "rationale": "Rationale",
        "risk_level": "Moderate",
        "entry_zone": "Entry",
        "target": "Targets",
        "stop_loss": "Stop-loss",
        "timeframe": "Timeframe"
    }},
    "ng_low_capital_strategy": {{
        "stocks": ["3-4 Nigerian stocks for ₦100K-1M"],
        "allocation": "Allocation",
        "rationale": "Rationale",
        "risk_level": "Moderate",
        "entry_zone": "Entry",
        "target": "Targets",
        "stop_loss": "Stop-loss",
        "timeframe": "Timeframe"
    }},
    "ng_micro_capital_strategy": {{
        "stocks": ["2-3 penny stocks under ₦20 for ₦5K-100K budget"],
        "allocation": "Equal weight",
        "rationale": "Affordable entry point stocks",
        "risk_level": "Aggressive",
        "entry_zone": "Buy in tranches",
        "target": "50-100% potential",
        "stop_loss": "15% below entry",
        "timeframe": "2-4 months"
    }},
    
    "raw_markdown": "# Summary\\n\\nBrief summary here..."
}}
"""

    def analyze_market(self, us_snapshot: MarketSnapshot, ng_snapshot: NigerianMarketSnapshot = None) -> AIAnalysis:
        """
        Analyze market data using AI.
        Tries: Gemma (primary) -> Gemini-Flash (fallback) -> OpenAI -> hardcoded fallback.
        """
        us_data = us_snapshot.model_dump_json()
        ng_data = ng_snapshot.model_dump_json() if ng_snapshot else "{}"
        prompt = self._build_prompt(us_data, ng_data)
        
        # Try Gemma (primary) - has separate quota that doesn't exceed as fast
        if self.gemma_model:
            result = self._try_gemini(prompt, self.gemma_model, "Gemma-27B")
            if result:
                return result
        
        # Try Gemini-Flash (fallback) - faster but quota exceeds quickly
        if self.gemini_model:
            result = self._try_gemini(prompt, self.gemini_model, "Gemini-Flash")
            if result:
                return result
        
        # Try OpenAI fallback
        if self.openai_client:
            result = self._try_openai(prompt)
            if result:
                return result
        
        # Use hardcoded fallback
        logger.warning("📋 Using fallback strategies (all AI APIs unavailable)")
        return self._fallback_with_strategies()

    def _try_gemini(self, prompt: str, model, model_name: str) -> AIAnalysis:
        """Try to get analysis from a Gemini model"""
        try:
            logger.info(f"🤖 Trying {model_name}...")
            response = model.generate_content(prompt)
            text = response.text.replace('```json', '').replace('```', '').strip()
            
            logger.info(f"📝 {model_name} response: {len(text)} chars")
            
            result = json.loads(text)
            return self._parse_result(result, model_name)
            
        except Exception as e:
            logger.error(f"❌ {model_name} failed: {str(e)[:100]}")
            return None

    def _try_openai(self, prompt: str) -> AIAnalysis:
        """Try to get analysis from OpenAI"""
        try:
            logger.info("🤖 Trying OpenAI API...")
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a financial analyst. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000
            )
            
            text = response.choices[0].message.content
            text = text.replace('```json', '').replace('```', '').strip()
            
            logger.info(f"📝 OpenAI response: {len(text)} chars")
            
            result = json.loads(text)
            return self._parse_result(result, "OpenAI")
            
        except Exception as e:
            logger.error(f"❌ OpenAI failed: {e}")
            return None

    def _parse_result(self, result: dict, source: str) -> AIAnalysis:
        """Parse JSON result into AIAnalysis"""
        # Parse US strategies
        high = self._parse_strategy(result.get('high_capital_strategy'), InvestmentStrategy)
        medium = self._parse_strategy(result.get('medium_capital_strategy'), InvestmentStrategy)
        low = self._parse_strategy(result.get('low_capital_strategy'), InvestmentStrategy)
        micro = self._parse_strategy(result.get('micro_capital_strategy'), InvestmentStrategy)
        
        # Parse Nigerian strategies
        ng_high = self._parse_strategy(result.get('ng_high_capital_strategy'), NigerianInvestmentStrategy)
        ng_medium = self._parse_strategy(result.get('ng_medium_capital_strategy'), NigerianInvestmentStrategy)
        ng_low = self._parse_strategy(result.get('ng_low_capital_strategy'), NigerianInvestmentStrategy)
        ng_micro = self._parse_strategy(result.get('ng_micro_capital_strategy'), NigerianInvestmentStrategy)
        
        all_strategies = [high, medium, low, micro, ng_high, ng_medium, ng_low, ng_micro]
        
        # If ALL strategies failed, use fallback
        if all(s is None for s in all_strategies):
            logger.warning("⚠️ All strategies null - using fallback")
            return self._fallback_with_strategies()
        
        logger.info(f"✅ {source} analysis complete")
        
        return AIAnalysis(
            key_insights=result.get('key_insights', ['Analysis complete']),
            opportunities=result.get('opportunities', []),
            red_flags=result.get('red_flags', []),
            sector_rotation=result.get('sector_rotation', 'Mixed'),
            momentum_plays=result.get('momentum_plays', []),
            raw_markdown=result.get('raw_markdown', f'Analysis by {source}'),
            is_fallback=False,
            data_source=source,
            high_capital_strategy=high,
            medium_capital_strategy=medium,
            low_capital_strategy=low,
            micro_capital_strategy=micro,
            ng_high_capital_strategy=ng_high,
            ng_medium_capital_strategy=ng_medium,
            ng_low_capital_strategy=ng_low,
            ng_micro_capital_strategy=ng_micro
        )

    def _parse_strategy(self, data, model_class):
        """Safely parse a strategy dict into a model"""
        if not data:
            return None
        if not isinstance(data, dict):
            return None
        try:
            required = ['stocks', 'allocation', 'rationale', 'risk_level']
            for field in required:
                if field not in data:
                    return None
            return model_class(**data)
        except Exception as e:
            logger.warning(f"⚠️ Parse error: {e}")
            return None

    def _fallback_with_strategies(self) -> AIAnalysis:
        """Fallback with pre-built strategies based on Dec 2024 market conditions"""
        return AIAnalysis(
            key_insights=[
                "⚠️ USING FALLBACK STRATEGIES - AI API quota exceeded",
                "US market: Tech remains strong led by NVDA ($500+), AAPL ($195). Monitor Fed interest rate decisions.",
                "Nigerian market: Banking sector outperforming. GTCO (~₦45), ZENITHBANK (~₦40) showing strength.",
                "Energy volatile: XOM (~$108), SEPLAT (~₦2,850) - watch oil prices.",
                "Defensive positioning recommended until AI analysis resumes."
            ],
            opportunities=[
                "NVDA: Strong AI demand - consider on pullbacks below $480",
                "VOO/SPY: Broad market exposure for long-term investors",
                "NGX Banks: GTCO, ZENITHBANK trading at reasonable valuations",
                "Micro investors: FCMB (₦7.80), JAIZBANK (₦2.20) for affordable entry"
            ],
            red_flags=[
                "⚠️ These are TEMPLATE strategies, not personalized AI analysis",
                "Fed interest rate uncertainty may cause volatility",
                "Nigerian Naira depreciation affecting stock prices",
                "Always do your own research before investing"
            ],
            sector_rotation="US: Tech > Healthcare > Financials. Nigeria: Banking > Industrial > Consumer",
            momentum_plays=["NVDA", "META", "GTCO", "DANGCEM", "MTNN"],
            raw_markdown="## ⚠️ Fallback Analysis Mode\n\n**AI API quota exceeded.** These are pre-built educational strategies, NOT personalized recommendations.\n\n### Disclaimer\nThese strategies are templates based on general market conditions. They do not account for:\n- Today's specific price movements\n- Breaking news or events\n- Your personal risk tolerance\n\n**Wait for AI quota to reset for personalized analysis.**",
            is_fallback=True,
            data_source="Fallback",
            
            # US Strategies with realistic Dec 2024 prices
            high_capital_strategy=InvestmentStrategy(
                stocks=["AAPL", "MSFT", "GOOGL", "JPM", "JNJ"],
                allocation="25% AAPL (~$195), 25% MSFT (~$380), 20% GOOGL (~$142), 15% JPM (~$176), 15% JNJ (~$155)",
                rationale="Blue-chip diversification. Tech leaders + financial stability + healthcare defense. These are market leaders with strong balance sheets.",
                risk_level="Conservative",
                entry_zone="AAPL: $185-195, MSFT: $365-380, GOOGL: $135-145, JPM: $168-178, JNJ: $148-158",
                target="10-15% upside over 6-12 months (portfolio target: $55K → $61-63K)",
                stop_loss="Set stops 8% below entry. Portfolio stop at -7% ($50K → $46.5K)",
                timeframe="6-12 months. Review quarterly."
            ),
            medium_capital_strategy=InvestmentStrategy(
                stocks=["NVDA", "META", "V", "XOM"],
                allocation="35% NVDA (~$505), 25% META (~$340), 20% V (~$265), 20% XOM (~$108)",
                rationale="Growth-focused portfolio. NVDA leads AI revolution, META benefits from ads + metaverse, V from payment growth, XOM for energy exposure.",
                risk_level="Moderate",
                entry_zone="NVDA: $480-510, META: $320-345, V: $255-270, XOM: $102-110",
                target="15-25% upside in 3-6 months ($25K → $29-31K)",
                stop_loss="Individual stops: 10% below entry. Exit NVDA if below $450.",
                timeframe="3-6 months. Active monitoring recommended."
            ),
            low_capital_strategy=InvestmentStrategy(
                stocks=["SPY", "QQQ", "NVDA"],
                allocation="50% SPY (~$475), 30% QQQ (~$415), 20% NVDA (~$505)",
                rationale="ETF-heavy for diversification + NVDA for growth. SPY tracks S&P 500, QQQ tracks Nasdaq-100. Lower risk than individual stocks.",
                risk_level="Moderate",
                entry_zone="Use dollar-cost averaging: invest $250-500 bi-weekly regardless of price",
                target="Market returns + alpha: 12-18% annually ($5K → $5.6-5.9K in 12 months)",
                stop_loss="10% trailing stop on entire portfolio. Don't panic sell on small dips.",
                timeframe="6-12+ months. Best for beginners building positions."
            ),
            micro_capital_strategy=InvestmentStrategy(
                stocks=["VOO", "VTI"],
                allocation="60% VOO (~$436) or 100% VTI (~$280) - choose one",
                rationale="Use FRACTIONAL SHARES. With $500, buy $300 of VOO + $200 of VTI. Brokers like Fidelity, Schwab, Robinhood allow fractional purchases.",
                risk_level="Moderate",
                entry_zone="Invest $50-100 WEEKLY. Don't time the market. Consistency beats timing.",
                target="Long-term: 8-12% annual returns. $500 → $560+ in year 1. Compound over 10+ years.",
                stop_loss="NO STOP LOSS for long-term investors. Stay invested through volatility.",
                timeframe="12+ months minimum. Best results over 5-10 years."
            ),
            
            # Nigerian Strategies with realistic Dec 2024 prices
            ng_high_capital_strategy=NigerianInvestmentStrategy(
                stocks=["DANGCEM", "MTNN", "GTCO", "SEPLAT", "BUACEMENT"],
                allocation="25% DANGCEM (~₦460), 25% MTNN (~₦245), 20% GTCO (~₦45), 15% SEPLAT (~₦2,850), 15% BUACEMENT (~₦112)",
                rationale="Blue-chip NGX portfolio. DANGCEM dominates cement, MTNN leads telecom, GTCO is banking leader, SEPLAT for oil exposure, BUACEMENT for diversified industrial.",
                risk_level="Conservative",
                entry_zone="DANGCEM: ₦440-470, MTNN: ₦235-250, GTCO: ₦42-48, SEPLAT: ₦2,700-2,900, BUACEMENT: ₦105-115",
                target="20-30% upside over 12 months (₦10M → ₦12-13M)",
                stop_loss="10% below entry for each stock. Rebalance quarterly.",
                timeframe="6-12 months. Long-term wealth preservation."
            ),
            ng_medium_capital_strategy=NigerianInvestmentStrategy(
                stocks=["ZENITHBANK", "UBA", "BUAFOODS", "NESTLE"],
                allocation="30% ZENITHBANK (~₦40), 30% UBA (~₦27), 25% BUAFOODS (~₦178), 15% NESTLE (~₦920)",
                rationale="Banking sector strength + consumer goods stability. ZENITHBANK & UBA are tier-1 banks with strong dividends. BUAFOODS growing fast. NESTLE is defensive.",
                risk_level="Moderate",
                entry_zone="ZENITHBANK: ₦38-42, UBA: ₦25-29, BUAFOODS: ₦170-185, NESTLE: ₦880-950",
                target="25-40% upside in 6-12 months (₦5M → ₦6.25-7M)",
                stop_loss="12% below entry. Exit if banking sector shows systemic weakness.",
                timeframe="6-12 months. Dividend income bonus."
            ),
            ng_low_capital_strategy=NigerianInvestmentStrategy(
                stocks=["FBNH", "ACCESSCORP", "TRANSCORP", "OANDO"],
                allocation="30% FBNH (~₦24), 25% ACCESSCORP (~₦21), 25% TRANSCORP (~₦10), 20% OANDO (~₦15)",
                rationale="Mid-cap value plays. All under ₦30 per share. FBNH & ACCESSCORP are undervalued banks. TRANSCORP is diversified conglomerate. OANDO for energy exposure.",
                risk_level="Moderate-Aggressive",
                entry_zone="FBNH: ₦22-26, ACCESSCORP: ₦19-23, TRANSCORP: ₦9-11, OANDO: ₦14-17",
                target="30-50% upside potential (₦500K → ₦650-750K in 6-12 months)",
                stop_loss="15% below entry. These are more volatile than blue chips.",
                timeframe="3-6 months for quick gains, 12 months for full potential."
            ),
            ng_micro_capital_strategy=NigerianInvestmentStrategy(
                stocks=["FCMB", "STERLINGNG", "JAIZBANK", "FIDELITYBK"],
                allocation="30% FCMB (~₦7.80), 25% STERLINGNG (~₦4.50), 25% JAIZBANK (~₦2.20), 20% FIDELITYBK (~₦12.50)",
                rationale="PENNY STOCKS for small budgets. With ₦50K you can buy 5,000+ shares. FCMB & STERLINGNG are undervalued banks. JAIZBANK is unique (non-interest). High risk, high reward.",
                risk_level="Aggressive",
                entry_zone="FCMB: ₦7-8.50, STERLINGNG: ₦4-5, JAIZBANK: ₦2-2.50, FIDELITYBK: ₦11-13",
                target="50-100% upside possible (₦50K → ₦75-100K) but volatile!",
                stop_loss="20% below entry. Be prepared for swings. Only invest what you can afford to lose.",
                timeframe="3-6 months. Requires active monitoring."
            )
        )
    
    def _fallback_analysis(self, reason: str) -> AIAnalysis:
        """Simple fallback when everything fails"""
        return AIAnalysis(
            key_insights=[f"Analysis unavailable: {reason}"],
            opportunities=[],
            red_flags=[],
            sector_rotation="N/A",
            momentum_plays=[],
            raw_markdown=f"## Analysis Unavailable\n\nReason: {reason}",
            high_capital_strategy=None,
            medium_capital_strategy=None,
            low_capital_strategy=None,
            micro_capital_strategy=None,
            ng_high_capital_strategy=None,
            ng_medium_capital_strategy=None,
            ng_low_capital_strategy=None,
            ng_micro_capital_strategy=None
        )
