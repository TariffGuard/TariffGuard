"""
AI Explanation Layer for TariffGuard
Uses Alibaba Cloud Model Studio (Qwen) via OpenAI-compatible API to turn
structured optimizer results into plain-language explanations that factory
floor managers can understand.

The AI does NOT invent numbers or make optimization decisions — it only
explains the data that the CP-SAT solver produced.
"""

import logging
from typing import Dict, Optional
from datetime import datetime

from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# System prompt — instructs Qwen how to behave
# ------------------------------------------------------------------
SYSTEM_PROMPT = """\
You are TariffGuard AI Assistant, an energy-cost advisor for small textile \
manufacturers in Faisalabad, Pakistan.

Your job is to explain production schedule optimization results in plain, \
simple language that a factory floor manager (who may not be technical) \
can understand and act on.

RULES:
1. NEVER invent numbers. Only use the exact data provided in the JSON below.
2. Always mention: total cost before vs after, savings amount and percentage, \
   how many orders were scheduled, and solar utilization.
3. If orders were shifted to different time slots, explain WHY (e.g. cheaper \
   tariff rate, more solar power available, avoiding peak hours).
4. Highlight any locked jobs that stayed in place.
5. Mention demand-risk warnings if peak grid demand is close to sanctioned load.
6. Keep the explanation concise — aim for 150-300 words.
7. Use short paragraphs. Use bullet points for individual order changes.
8. Write in English. You may use common Urdu terms like "bijli" (electricity), \
   "bachat" (savings), or "dhoop" (sunlight) where it makes the explanation \
   friendlier for a Pakistani audience.
9. End with 1-2 actionable tips (e.g. "Consider running heavy machines between \
   10 AM–2 PM when solar output is highest").
"""


class AIExplainer:
    """
    Sends structured optimizer output to Qwen and returns a plain-language
    explanation.

    Usage::

        explainer = AIExplainer()
        text = explainer.explain_comparison(comparison_result)
    """

    def __init__(self):
        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            if not settings.QWEN_API_KEY:
                raise ValueError(
                    "QWEN_API_KEY is not configured. "
                    "Set it in your .env file or environment variables."
                )
            self._client = OpenAI(
                api_key=settings.QWEN_API_KEY,
                base_url=settings.QWEN_BASE_URL,
            )
        return self._client

    @property
    def is_available(self) -> bool:
        """Check if the Qwen API key is configured."""
        return bool(settings.QWEN_API_KEY)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def explain_comparison(self, comparison: Dict) -> Dict:
        """
        Explain a baseline-vs-optimized comparison result.

        Parameters
        ----------
        comparison : dict
            Output from ScheduleOptimizer.compare_baseline_vs_optimized()

        Returns
        -------
        dict with keys:
            - explanation: str  (plain-language text)
            - model: str
            - tokens_used: dict (prompt_tokens, completion_tokens)
        """
        prompt = self._build_prompt(comparison)

        try:
            response = self.client.chat.completions.create(
                model=settings.QWEN_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=800,
            )
        except Exception as e:
            logger.error("Qwen API call failed: %s", e)
            return {
                "explanation": self._fallback_explanation(comparison),
                "model": "rule_based_fallback",
                "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0},
                "warning": f"Qwen API unavailable ({e}), using rule-based fallback",
            }

        message = response.choices[0].message.content or ""
        usage = response.usage

        return {
            "explanation": message.strip(),
            "model": settings.QWEN_MODEL,
            "tokens_used": {
                "prompt_tokens": usage.prompt_tokens if usage else 0,
                "completion_tokens": usage.completion_tokens if usage else 0,
            },
        }

    def explain_schedule(self, schedule_result: Dict) -> Dict:
        """
        Explain a single optimized schedule (without baseline comparison).

        Parameters
        ----------
        schedule_result : dict
            Output from ScheduleOptimizer.create_optimized_schedule()
        """
        prompt = self._build_schedule_prompt(schedule_result)

        try:
            response = self.client.chat.completions.create(
                model=settings.QWEN_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=600,
            )
        except Exception as e:
            logger.error("Qwen API call failed: %s", e)
            return {
                "explanation": self._fallback_schedule_explanation(schedule_result),
                "model": "rule_based_fallback",
                "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0},
                "warning": f"Qwen API unavailable ({e}), using rule-based fallback",
            }

        message = response.choices[0].message.content or ""
        usage = response.usage

        return {
            "explanation": message.strip(),
            "model": settings.QWEN_MODEL,
            "tokens_used": {
                "prompt_tokens": usage.prompt_tokens if usage else 0,
                "completion_tokens": usage.completion_tokens if usage else 0,
            },
        }

    # ------------------------------------------------------------------
    # Prompt builders
    # ------------------------------------------------------------------

    @staticmethod
    def _build_prompt(comparison: Dict) -> str:
        """Build a user prompt from comparison results."""
        baseline = comparison.get("baseline", {})
        optimized = comparison.get("optimized", {})
        savings = comparison.get("savings", {})
        schedule = comparison.get("schedule", [])

        # Summarize schedule changes
        order_lines = []
        for entry in schedule:
            start = entry.get("start_time")
            end = entry.get("end_time")
            if isinstance(start, datetime):
                start = start.strftime("%Y-%m-%d %H:%M")
            if isinstance(end, datetime):
                end = end.strftime("%Y-%m-%d %H:%M")
            locked_tag = " [LOCKED]" if entry.get("locked") else ""
            solar_kwh = entry.get("solar_kwh", 0)
            order_lines.append(
                f"  - {entry.get('order_no', 'N/A')} ({entry.get('process', '?')}) "
                f"on {entry.get('machine_name', '?')}{locked_tag}: "
                f"{start} → {end}, "
                f"cost PKR {entry.get('estimated_cost', 0)}, "
                f"solar {solar_kwh} kWh, grid {entry.get('grid_kwh', 0)} kWh"
            )

        schedule_text = "\n".join(order_lines) if order_lines else "  (no orders)"

        return f"""\
Please explain the following optimization result to a factory floor manager:

BASELINE (before optimization):
- Total cost: PKR {baseline.get('total_cost', 0)}
- Total energy: {baseline.get('total_kwh', 0)} kWh
- Grid energy: {baseline.get('total_grid_kwh', 0)} kWh
- Solar energy: {baseline.get('total_solar_kwh', 0)} kWh

OPTIMIZED (after CP-SAT solver):
- Total cost: PKR {optimized.get('total_cost', 0)}
- Total energy: {optimized.get('total_kwh', 0)} kWh
- Grid energy: {optimized.get('total_grid_kwh', 0)} kWh
- Solar energy: {optimized.get('total_solar_kwh', 0)} kWh
- Peak grid demand: {optimized.get('peak_grid_kw', 0)} kW
- Solver status: {optimized.get('solver_status', 'unknown')}

SAVINGS:
- Amount: PKR {savings.get('amount', 0)}
- Percentage: {savings.get('percentage', 0)}%

OPTIMIZED SCHEDULE:
{schedule_text}
"""

    @staticmethod
    def _build_schedule_prompt(schedule_result: Dict) -> str:
        """Build a user prompt from a single optimized schedule."""
        schedule = schedule_result.get("schedule", [])

        order_lines = []
        for entry in schedule:
            start = entry.get("start_time")
            if isinstance(start, datetime):
                start = start.strftime("%Y-%m-%d %H:%M")
            end = entry.get("end_time")
            if isinstance(end, datetime):
                end = end.strftime("%Y-%m-%d %H:%M")
            locked_tag = " [LOCKED]" if entry.get("locked") else ""
            order_lines.append(
                f"  - {entry.get('order_no', 'N/A')} ({entry.get('process', '?')}) "
                f"on {entry.get('machine_name', '?')}{locked_tag}: "
                f"{start} → {end}, PKR {entry.get('estimated_cost', 0)}"
            )

        schedule_text = "\n".join(order_lines) if order_lines else "  (no orders)"

        return f"""\
Please explain the following optimized production schedule:

- Factory ID: {schedule_result.get('factory_id', 'N/A')}
- Period: {schedule_result.get('start_time', '?')} to {schedule_result.get('end_time', '?')}
- Orders scheduled: {schedule_result.get('total_orders_scheduled', 0)}
- Total estimated cost: PKR {schedule_result.get('total_estimated_cost', 0)}
- Total energy: {schedule_result.get('total_estimated_kwh', 0)} kWh
- Solar energy used: {schedule_result.get('total_solar_kwh', 0)} kWh
- Grid energy: {schedule_result.get('total_grid_kwh', 0)} kWh
- Peak grid demand: {schedule_result.get('peak_grid_kw', 0)} kW
- Solver status: {schedule_result.get('solver_status', 'unknown')}

SCHEDULE:
{schedule_text}
"""

    # ------------------------------------------------------------------
    # Rule-based fallback (when Qwen API is unavailable)
    # ------------------------------------------------------------------

    @staticmethod
    def _fallback_explanation(comparison: Dict) -> str:
        """Generate a simple rule-based explanation without AI."""
        baseline = comparison.get("baseline", {})
        optimized = comparison.get("optimized", {})
        savings = comparison.get("savings", {})
        schedule = comparison.get("schedule", [])

        lines = [
            "## Schedule Optimization Summary",
            "",
            f"**Before optimization:** PKR {baseline.get('total_cost', 0):,.0f}",
            f"**After optimization:** PKR {optimized.get('total_cost', 0):,.0f}",
            f"**Bachat (savings):** PKR {savings.get('amount', 0):,.0f} "
            f"({savings.get('percentage', 0):.1f}%)",
            "",
            f"**Orders scheduled:** {len(schedule)}",
            f"**Solar energy used:** {optimized.get('total_solar_kwh', 0):.1f} kWh",
            f"**Grid energy:** {optimized.get('total_grid_kwh', 0):.1f} kWh",
        ]

        locked = [e for e in schedule if e.get("locked")]
        if locked:
            lines.append("")
            lines.append("**Locked jobs** (kept in original position):")
            for job in locked:
                lines.append(f"  - {job.get('order_no', 'N/A')}")

        # Find orders that shifted time
        baseline_sched = {
            e["order_id"]: e for e in baseline.get("schedule", [])
        }
        shifted = []
        for entry in schedule:
            oid = entry.get("order_id")
            if oid in baseline_sched:
                b_start = baseline_sched[oid].get("start_time")
                o_start = entry.get("start_time")
                if b_start and o_start and b_start != o_start:
                    shifted.append(entry)

        if shifted:
            lines.append("")
            lines.append("**Orders shifted to save cost:**")
            for entry in shifted:
                lines.append(
                    f"  - {entry.get('order_no', 'N/A')} moved to "
                    f"{entry.get('start_time', '?')}"
                )

        lines.append("")
        lines.append(
            "**Tip:** Run heavy machines between 10 AM–2 PM when "
            "dhoop (sunlight) is strongest for maximum solar bachat."
        )

        return "\n".join(lines)

    @staticmethod
    def _fallback_schedule_explanation(schedule_result: Dict) -> str:
        """Generate a simple rule-based explanation for a single schedule."""
        schedule = schedule_result.get("schedule", [])

        lines = [
            "## Optimized Schedule Summary",
            "",
            f"**Total cost:** PKR {schedule_result.get('total_estimated_cost', 0):,.0f}",
            f"**Orders scheduled:** {schedule_result.get('total_orders_scheduled', 0)}",
            f"**Solar energy:** {schedule_result.get('total_solar_kwh', 0):.1f} kWh",
            f"**Grid energy:** {schedule_result.get('total_grid_kwh', 0):.1f} kWh",
            "",
            "**Schedule:**",
        ]

        for entry in schedule:
            start = entry.get("start_time")
            if isinstance(start, datetime):
                start = start.strftime("%H:%M")
            end = entry.get("end_time")
            if isinstance(end, datetime):
                end = end.strftime("%H:%M")
            locked_tag = " [LOCKED]" if entry.get("locked") else ""
            lines.append(
                f"  - {entry.get('order_no', 'N/A')} "
                f"({entry.get('process', '?')}){locked_tag}: "
                f"{start}–{end} on {entry.get('machine_name', '?')}, "
                f"PKR {entry.get('estimated_cost', 0)}"
            )

        return "\n".join(lines)
