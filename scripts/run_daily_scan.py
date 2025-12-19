"""
Daily Stock Scan - Automation Script

This script is designed to be run via cron job or task scheduler.
It executes the full pipeline: Fetch Data -> AI Analysis -> Email Report

Usage:
    python scripts/run_daily_scan.py [--dry-run] [--no-email]

Options:
    --dry-run   Print results but don't send email
    --no-email  Skip email sending even if configured
"""

import sys
import os
import argparse
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.market_data import MarketDataService
from app.services.llm_analyst import LLMService
from app.services.notifier import NotificationService
from app.models.schemas import FullReport


def run_daily_scan(dry_run: bool = False, send_email: bool = True) -> FullReport:
    """
    Execute the full daily stock analysis pipeline.
    
    Args:
        dry_run: If True, print results but don't send email
        send_email: If True and not dry_run, send email report
    
    Returns:
        FullReport object with market data and AI analysis
    """
    print("=" * 60)
    print(f"🚀 Daily AI Stock Intelligence Scan")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Initialize services
    market_service = MarketDataService()
    llm_service = LLMService()
    notification_service = NotificationService()
    
    # Step 1: Fetch Market Data
    print("\n📊 Step 1: Fetching market data...")
    snapshot = market_service.get_market_snapshot()
    
    if not snapshot.gainers and not snapshot.losers:
        print("⚠️  No market data available. Markets may be closed.")
        return None
    
    print(f"   ✅ Found {len(snapshot.gainers)} gainers, {len(snapshot.losers)} losers")
    print(f"   ✅ Tracked {len(snapshot.sector_performance)} sectors")
    
    # Step 2: AI Analysis
    print("\n🤖 Step 2: Running AI analysis...")
    analysis = llm_service.analyze_market(snapshot)
    
    print(f"   ✅ Generated {len(analysis.key_insights)} key insights")
    print(f"   ✅ Identified {len(analysis.opportunities)} opportunities")
    print(f"   ✅ Flagged {len(analysis.red_flags)} risks")
    
    # Build Full Report
    report = FullReport(
        date=datetime.now().strftime("%Y-%m-%d %H:%M"),
        market_data=snapshot,
        analysis=analysis
    )
    
    # Print Summary
    print("\n" + "=" * 60)
    print("📋 REPORT SUMMARY")
    print("=" * 60)
    
    print("\n🏆 Top Gainers:")
    for stock in snapshot.gainers[:3]:
        print(f"   {stock.ticker}: +{stock.change_pct}% (${stock.price})")
    
    print("\n📉 Top Losers:")
    for stock in snapshot.losers[:3]:
        print(f"   {stock.ticker}: {stock.change_pct}% (${stock.price})")
    
    print("\n💡 Key Insights:")
    for i, insight in enumerate(analysis.key_insights[:3], 1):
        print(f"   {i}. {insight}")
    
    if analysis.opportunities:
        print("\n🚀 Opportunities:")
        for opp in analysis.opportunities[:2]:
            print(f"   • {opp}")
    
    if analysis.red_flags:
        print("\n⚠️  Red Flags:")
        for flag in analysis.red_flags[:2]:
            print(f"   • {flag}")
    
    print("\n" + "=" * 60)
    
    # Step 3: Send Email
    if dry_run:
        print("🔍 DRY RUN - Email not sent")
    elif send_email:
        print("\n📧 Step 3: Sending email report...")
        success = notification_service.send_report(report)
        if success:
            print("   ✅ Email sent successfully!")
        else:
            print("   ❌ Failed to send email (check logs)")
    else:
        print("\n⏭️  Email sending skipped (--no-email flag)")
    
    print("\n✨ Scan complete!")
    return report


def main():
    parser = argparse.ArgumentParser(
        description="Run daily stock market analysis with AI"
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Print results but do not send email'
    )
    parser.add_argument(
        '--no-email',
        action='store_true',
        help='Skip email sending'
    )
    
    args = parser.parse_args()
    
    try:
        report = run_daily_scan(
            dry_run=args.dry_run,
            send_email=not args.no_email
        )
        
        if report:
            sys.exit(0)
        else:
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
