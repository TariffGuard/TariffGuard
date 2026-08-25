"""
Utility functions for TariffGuard
"""

from datetime import datetime, timedelta
from typing import Optional

def parse_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    """Parse datetime string to datetime object"""
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str)
    except:
        return None

def get_default_time_range():
    """Get default 24-hour time range"""
    start = datetime.now().replace(minute=0, second=0, microsecond=0)
    end = start + timedelta(hours=24)
    return start, end

def calculate_savings(baseline_cost: float, optimized_cost: float) -> dict:
    """Calculate savings between baseline and optimized costs"""
    savings = baseline_cost - optimized_cost
    savings_pct = (savings / baseline_cost * 100) if baseline_cost > 0 else 0
    
    return {
        "amount": round(savings, 2),
        "percentage": round(savings_pct, 2)
    }

def format_currency(amount: float) -> str:
    """Format amount as PKR currency"""
    return f"Rs. {amount:,.2f}"

def get_tariff_period(hour: int) -> str:
    """Get tariff period name for an hour"""
    if 0 <= hour < 18:
        return "Off-Peak"
    elif 18 <= hour < 22:
        return "Peak"
    else:
        return "Night"