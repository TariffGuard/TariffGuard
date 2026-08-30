"""
AI Explanation API endpoints for TariffGuard
Provides natural-language explanations of optimizer results using
Alibaba Cloud Model Studio (Qwen).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import get_db
from app.services.ai_explainer import AIExplainer
from app.services.optimizer import ScheduleOptimizer

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/status")
def ai_status():
    """Check if the AI explanation service is available."""
    explainer = AIExplainer()
    return {
        "available": explainer.is_available,
        "model": "Qwen" if explainer.is_available else None,
        "message": (
            "AI explanation service is ready."
            if explainer.is_available
            else "QWEN_API_KEY is not configured. "
                 "Set it in your .env file to enable AI explanations."
        ),
    }


@router.post("/explain/{factory_id}")
def explain_optimization(
    factory_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """
    Run optimizer comparison (baseline vs optimized) and return a
    plain-language AI explanation of the results.

    If QWEN_API_KEY is not set, returns a rule-based fallback explanation.
    """
    if not start_time:
        start_time = datetime.now().replace(
            minute=0, second=0, microsecond=0
        )
    if not end_time:
        end_time = start_time + timedelta(hours=24)

    # Run the optimizer comparison
    optimizer = ScheduleOptimizer(db)
    comparison = optimizer.compare_baseline_vs_optimized(
        factory_id, start_time, end_time
    )

    # Generate AI explanation
    explainer = AIExplainer()
    explanation = explainer.explain_comparison(comparison)

    return {
        "factory_id": factory_id,
        "start_time": start_time,
        "end_time": end_time,
        "comparison": comparison,
        "ai_explanation": explanation["explanation"],
        "ai_model": explanation["model"],
        "tokens_used": explanation["tokens_used"],
        "warning": explanation.get("warning"),
    }


@router.post("/explain-schedule/{factory_id}")
def explain_schedule(
    factory_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """
    Generate an optimized schedule and return a plain-language
    AI explanation (without baseline comparison).
    """
    if not start_time:
        start_time = datetime.now().replace(
            minute=0, second=0, microsecond=0
        )
    if not end_time:
        end_time = start_time + timedelta(hours=24)

    # Run the optimizer
    optimizer = ScheduleOptimizer(db)
    schedule_result = optimizer.create_optimized_schedule(
        factory_id, start_time, end_time
    )

    # Generate AI explanation
    explainer = AIExplainer()
    explanation = explainer.explain_schedule(schedule_result)

    return {
        "factory_id": factory_id,
        "start_time": start_time,
        "end_time": end_time,
        "schedule_result": schedule_result,
        "ai_explanation": explanation["explanation"],
        "ai_model": explanation["model"],
        "tokens_used": explanation["tokens_used"],
        "warning": explanation.get("warning"),
    }
