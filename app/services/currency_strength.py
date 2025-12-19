"""
Currency Strength Analysis Service

Calculates relative currency strength based on cross-pair performance.
This helps forex traders identify the strongest and weakest currencies.
"""
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class CurrencyStrength:
    """Currency strength data"""
    currency: str
    name: str
    flag: str
    score: float  # -100 to +100
    change_1h: float
    change_24h: float
    trend: str  # bullish, bearish, neutral
    rank: int


class CurrencyStrengthService:
    """Service for calculating currency strength"""
    
    def __init__(self):
        # Currency metadata
        self.currencies = {
            "USD": {"name": "US Dollar", "flag": "🇺🇸"},
            "EUR": {"name": "Euro", "flag": "🇪🇺"},
            "GBP": {"name": "British Pound", "flag": "🇬🇧"},
            "JPY": {"name": "Japanese Yen", "flag": "🇯🇵"},
            "CHF": {"name": "Swiss Franc", "flag": "🇨🇭"},
            "AUD": {"name": "Australian Dollar", "flag": "🇦🇺"},
            "CAD": {"name": "Canadian Dollar", "flag": "🇨🇦"},
            "NZD": {"name": "New Zealand Dollar", "flag": "🇳🇿"},
            "NGN": {"name": "Nigerian Naira", "flag": "🇳🇬"},
        }
        
        # Major pair mappings (base/quote)
        self.pairs = [
            ("EUR", "USD"), ("GBP", "USD"), ("USD", "JPY"), ("USD", "CHF"),
            ("AUD", "USD"), ("USD", "CAD"), ("NZD", "USD"),
            ("EUR", "GBP"), ("EUR", "JPY"), ("GBP", "JPY"),
            ("EUR", "CHF"), ("GBP", "CHF"), ("AUD", "JPY"),
            ("USD", "NGN"), ("EUR", "NGN"), ("GBP", "NGN")
        ]
    
    def calculate_strength(self, forex_data: Dict) -> List[CurrencyStrength]:
        """
        Calculate currency strength based on forex pair performance.
        
        Args:
            forex_data: Dictionary with pair symbols as keys and change percentages as values
                       e.g., {"EUR/USD": 0.25, "GBP/USD": -0.15, ...}
        
        Returns:
            List of CurrencyStrength objects sorted by strength (strongest first)
        """
        # Initialize strength scores
        strength_scores: Dict[str, List[float]] = {c: [] for c in self.currencies.keys()}
        
        # Process each pair to derive individual currency performance
        for pair_symbol, change_pct in forex_data.items():
            try:
                # Parse pair (e.g., "EUR/USD" -> base="EUR", quote="USD")
                if "/" not in pair_symbol:
                    continue
                    
                base, quote = pair_symbol.split("/")
                
                if base not in self.currencies or quote not in self.currencies:
                    continue
                
                # If EUR/USD is up, EUR is strong and USD is weak
                # The change percentage reflects base currency performance vs quote
                strength_scores[base].append(change_pct)
                strength_scores[quote].append(-change_pct)  # Inverse for quote currency
                
            except Exception as e:
                logger.debug(f"Error processing pair {pair_symbol}: {e}")
                continue
        
        # Calculate average strength for each currency
        results = []
        for currency, scores in strength_scores.items():
            if not scores:
                avg_score = 0
            else:
                avg_score = sum(scores) / len(scores)
            
            # Normalize score to -100 to +100 range (assuming max ±5% daily move)
            normalized_score = max(-100, min(100, avg_score * 20))
            
            # Determine trend
            if normalized_score > 20:
                trend = "bullish"
            elif normalized_score < -20:
                trend = "bearish"
            else:
                trend = "neutral"
            
            results.append(CurrencyStrength(
                currency=currency,
                name=self.currencies[currency]["name"],
                flag=self.currencies[currency]["flag"],
                score=round(normalized_score, 1),
                change_1h=round(avg_score * 0.3, 2),  # Estimated 1h change
                change_24h=round(avg_score, 2),
                trend=trend,
                rank=0  # Will be set after sorting
            ))
        
        # Sort by score (highest first) and assign ranks
        results.sort(key=lambda x: x.score, reverse=True)
        for i, item in enumerate(results):
            item.rank = i + 1
        
        return results
    
    def get_strength_from_pairs(self, pairs_list: List[dict]) -> List[CurrencyStrength]:
        """
        Calculate currency strength from a list of forex pair objects.
        
        Args:
            pairs_list: List of forex pair dicts with 'symbol' and 'change_pct' keys
        
        Returns:
            List of CurrencyStrength objects
        """
        forex_data = {}
        for pair in pairs_list:
            symbol = pair.get("symbol", "")
            change = pair.get("change_pct", 0)
            if symbol:
                forex_data[symbol] = change
        
        return self.calculate_strength(forex_data)
    
    def get_strongest_pairs(
        self, 
        strengths: List[CurrencyStrength],
        top_n: int = 3
    ) -> List[Tuple[str, str, str]]:
        """
        Get the best pairs to trade based on currency strength divergence.
        
        Returns pairs where a strong currency is paired against a weak currency.
        
        Args:
            strengths: List of CurrencyStrength objects
            top_n: Number of strongest and weakest currencies to consider
        
        Returns:
            List of (pair_symbol, action, reason) tuples
        """
        if len(strengths) < 2:
            return []
            
        strongest = strengths[:top_n]
        weakest = strengths[-top_n:]
        
        recommendations = []
        
        for strong in strongest:
            for weak in weakest:
                # Create the standard pair notation
                pair = self._get_pair_symbol(strong.currency, weak.currency)
                if pair:
                    base, quote = pair.split("/")
                    
                    # Determine action based on which is the base currency
                    if base == strong.currency:
                        action = "BUY"
                        reason = f"{strong.flag} {strong.currency} strong ({strong.score:+.1f}) vs {weak.flag} {weak.currency} weak ({weak.score:+.1f})"
                    else:
                        action = "SELL"
                        reason = f"{weak.flag} {weak.currency} weak ({weak.score:+.1f}) vs {strong.flag} {strong.currency} strong ({strong.score:+.1f})"
                    
                    recommendations.append((pair, action, reason))
        
        return recommendations[:5]  # Top 5 opportunities
    
    def _get_pair_symbol(self, curr1: str, curr2: str) -> Optional[str]:
        """Get the standard forex pair symbol for two currencies"""
        # Check both directions
        for base, quote in self.pairs:
            if (base == curr1 and quote == curr2):
                return f"{base}/{quote}"
            elif (base == curr2 and quote == curr1):
                return f"{base}/{quote}"
        return None
    
    def get_strength_summary(self, strengths: List[CurrencyStrength]) -> str:
        """Generate a text summary of currency strength"""
        if not strengths:
            return "No currency data available."
        
        strongest = strengths[0] if strengths else None
        weakest = strengths[-1] if strengths else None
        
        summary_parts = []
        
        if strongest and strongest.score > 10:
            summary_parts.append(f"{strongest.flag} {strongest.currency} is the strongest currency (+{strongest.score:.1f})")
        
        if weakest and weakest.score < -10:
            summary_parts.append(f"{weakest.flag} {weakest.currency} is the weakest currency ({weakest.score:.1f})")
        
        # Best pair opportunity
        if strongest and weakest and abs(strongest.score - weakest.score) > 30:
            pair = self._get_pair_symbol(strongest.currency, weakest.currency)
            if pair:
                base, _ = pair.split("/")
                action = "BUY" if base == strongest.currency else "SELL"
                summary_parts.append(f"Top opportunity: {action} {pair}")
        
        if not summary_parts:
            summary_parts.append("Markets showing mixed signals. No strong currency divergence detected.")
        
        return " • ".join(summary_parts)


# Singleton instance
currency_strength_service = CurrencyStrengthService()
