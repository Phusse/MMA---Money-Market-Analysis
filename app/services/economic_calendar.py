"""
Economic Calendar Service for Forex Market Intelligence

Provides upcoming high-impact economic events that affect currency pairs.
"""
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class EconomicEvent:
    """Economic calendar event"""
    title: str
    country: str
    currency: str
    impact: str  # high, medium, low
    date: str
    time: str  # UTC
    forecast: Optional[str] = None
    previous: Optional[str] = None
    actual: Optional[str] = None
    description: Optional[str] = None
    affected_pairs: List[str] = field(default_factory=list)


class EconomicCalendarService:
    """Service for economic calendar events"""
    
    def __init__(self):
        # Recurring high-impact events (simplified mock data)
        self.high_impact_events = [
            {
                "title": "Non-Farm Payrolls (NFP)",
                "country": "US",
                "currency": "USD",
                "impact": "high",
                "recurrence": "monthly",  # First Friday of month
                "description": "US employment change excluding farming sector. Major market mover.",
                "affected_pairs": ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"]
            },
            {
                "title": "FOMC Interest Rate Decision",
                "country": "US",
                "currency": "USD",
                "impact": "high",
                "recurrence": "6-weekly",
                "description": "Federal Reserve interest rate decision. Highly volatile.",
                "affected_pairs": ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "USD/CHF"]
            },
            {
                "title": "Fed Chair Powell Speech",
                "country": "US",
                "currency": "USD",
                "impact": "high",
                "recurrence": "variable",
                "description": "Federal Reserve chair policy remarks.",
                "affected_pairs": ["EUR/USD", "USD/JPY", "XAU/USD"]
            },
            {
                "title": "US CPI (Inflation)",
                "country": "US",
                "currency": "USD",
                "impact": "high",
                "recurrence": "monthly",
                "description": "Consumer Price Index - key inflation gauge.",
                "affected_pairs": ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"]
            },
            {
                "title": "ECB Interest Rate Decision",
                "country": "EU",
                "currency": "EUR",
                "impact": "high",
                "recurrence": "6-weekly",
                "description": "European Central Bank rate decision.",
                "affected_pairs": ["EUR/USD", "EUR/GBP", "EUR/JPY"]
            },
            {
                "title": "Bank of England Rate Decision",
                "country": "UK",
                "currency": "GBP",
                "impact": "high",
                "recurrence": "6-weekly",
                "description": "BoE Monetary Policy Committee decision.",
                "affected_pairs": ["GBP/USD", "EUR/GBP", "GBP/JPY"]
            },
            {
                "title": "Bank of Japan Rate Decision",
                "country": "JP",
                "currency": "JPY",
                "impact": "high",
                "recurrence": "6-weekly",
                "description": "BoJ monetary policy decision.",
                "affected_pairs": ["USD/JPY", "EUR/JPY", "GBP/JPY"]
            },
            {
                "title": "US Retail Sales",
                "country": "US",
                "currency": "USD",
                "impact": "medium",
                "recurrence": "monthly",
                "description": "Consumer spending indicator.",
                "affected_pairs": ["EUR/USD", "USD/JPY"]
            },
            {
                "title": "UK GDP",
                "country": "UK",
                "currency": "GBP",
                "impact": "medium",
                "recurrence": "quarterly",
                "description": "UK economic growth rate.",
                "affected_pairs": ["GBP/USD", "EUR/GBP"]
            },
            {
                "title": "Eurozone GDP",
                "country": "EU",
                "currency": "EUR",
                "impact": "medium",
                "recurrence": "quarterly",
                "description": "European economic growth rate.",
                "affected_pairs": ["EUR/USD", "EUR/GBP"]
            },
            {
                "title": "CBN Monetary Policy Decision",
                "country": "NG",
                "currency": "NGN",
                "impact": "high",
                "recurrence": "bi-monthly",
                "description": "Central Bank of Nigeria rate decision.",
                "affected_pairs": ["USD/NGN", "EUR/NGN", "GBP/NGN"]
            },
            {
                "title": "US Initial Jobless Claims",
                "country": "US",
                "currency": "USD",
                "impact": "medium",
                "recurrence": "weekly",
                "description": "Weekly unemployment claims data.",
                "affected_pairs": ["EUR/USD", "USD/JPY"]
            },
            {
                "title": "China PMI (Manufacturing)",
                "country": "CN",
                "currency": "CNY",
                "impact": "medium",
                "recurrence": "monthly",
                "description": "Chinese manufacturing activity index.",
                "affected_pairs": ["AUD/USD", "USD/CNH"]
            },
            {
                "title": "RBA Interest Rate Decision",
                "country": "AU",
                "currency": "AUD",
                "impact": "high",
                "recurrence": "monthly",
                "description": "Reserve Bank of Australia rate decision.",
                "affected_pairs": ["AUD/USD", "AUD/JPY"]
            }
        ]
    
    def _get_country_flag(self, country: str) -> str:
        """Get emoji flag for country code"""
        flags = {
            "US": "🇺🇸",
            "EU": "🇪🇺",
            "UK": "🇬🇧",
            "JP": "🇯🇵",
            "AU": "🇦🇺",
            "CN": "🇨🇳",
            "NG": "🇳🇬",
            "CA": "🇨🇦",
            "CH": "🇨🇭",
            "NZ": "🇳🇿"
        }
        return flags.get(country, "🌐")
    
    def get_upcoming_events(self, days_ahead: int = 7, currency_filter: str = None) -> List[dict]:
        """
        Get upcoming economic calendar events.
        
        Args:
            days_ahead: Number of days to look ahead
            currency_filter: Optional currency to filter by (e.g., "USD", "EUR")
        
        Returns:
            List of upcoming economic events
        """
        now = datetime.utcnow()
        events = []
        
        # Generate mock upcoming events based on our known high-impact events
        # In production, this would fetch from an API like ForexFactory, Investing.com, etc.
        
        for i in range(days_ahead):
            target_date = now + timedelta(days=i)
            day_name = target_date.strftime("%A")
            
            # Add events based on day patterns
            for event_template in self.high_impact_events:
                # Skip if currency filter doesn't match
                if currency_filter and event_template["currency"] != currency_filter:
                    continue
                    
                # Simulate event timing based on recurrence patterns
                add_event = False
                event_time = "14:30"  # Default time UTC
                
                if event_template["recurrence"] == "weekly":
                    # Weekly events on Thursdays
                    if day_name == "Thursday":
                        add_event = True
                        event_time = "13:30"
                        
                elif event_template["recurrence"] == "monthly":
                    # Monthly events - simulate on certain days
                    if target_date.day in [8, 10, 12, 13, 15]:
                        # First Friday for NFP, mid-month for CPI, Retail Sales
                        if event_template["title"] == "Non-Farm Payrolls (NFP)":
                            if day_name == "Friday" and target_date.day <= 7:
                                add_event = True
                                event_time = "13:30"
                        elif "CPI" in event_template["title"]:
                            if target_date.day in [10, 11, 12, 13]:
                                add_event = True
                                event_time = "13:30"
                        elif "Retail" in event_template["title"]:
                            if target_date.day in [14, 15, 16]:
                                add_event = True
                                event_time = "13:30"
                        else:
                            # Other monthly events
                            if target_date.day == 15:
                                add_event = True
                                
                elif event_template["recurrence"] == "6-weekly":
                    # Central bank meetings - simulate periodically
                    if i in [0, 3, 5] and target_date.day in [12, 13, 14, 19, 20]:
                        add_event = True
                        if "FOMC" in event_template["title"]:
                            event_time = "19:00"
                        elif "ECB" in event_template["title"]:
                            event_time = "13:15"
                        elif "BoE" in event_template["title"] or "Bank of England" in event_template["title"]:
                            event_time = "12:00"
                        elif "BoJ" in event_template["title"] or "Bank of Japan" in event_template["title"]:
                            event_time = "03:00"
                
                elif event_template["recurrence"] == "variable":
                    # Variable events - add occasionally
                    if i == 2:
                        add_event = True
                        event_time = "17:30"
                
                if add_event:
                    events.append({
                        "title": event_template["title"],
                        "country": event_template["country"],
                        "country_flag": self._get_country_flag(event_template["country"]),
                        "currency": event_template["currency"],
                        "impact": event_template["impact"],
                        "date": target_date.strftime("%Y-%m-%d"),
                        "date_display": target_date.strftime("%a, %b %d"),
                        "time": event_time,
                        "description": event_template["description"],
                        "affected_pairs": event_template["affected_pairs"],
                        "forecast": "--",
                        "previous": "--"
                    })
        
        # Sort by date and time
        events.sort(key=lambda x: (x["date"], x["time"]))
        
        # Limit to reasonable number
        return events[:20]
    
    def get_high_impact_today(self) -> List[dict]:
        """Get today's high-impact events only"""
        events = self.get_upcoming_events(days_ahead=1)
        return [e for e in events if e["impact"] == "high"]
    
    def get_events_for_pair(self, pair: str) -> List[dict]:
        """Get events that affect a specific currency pair"""
        events = self.get_upcoming_events(days_ahead=7)
        return [e for e in events if pair in e.get("affected_pairs", [])]


# Singleton instance
economic_calendar_service = EconomicCalendarService()
