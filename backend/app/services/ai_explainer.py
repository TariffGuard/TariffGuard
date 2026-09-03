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
You are TariffGuard AI Assistant, an expert industrial energy optimization and electricity tariff advisor dedicated to textile manufacturing mills in Faisalabad, Pakistan.

Core Identity & Domain Knowledge:
1. Greetings: Always greet with "Assalamu Alaikum" (AOA) or a polite professional greeting. NEVER use "Namaste" or non-Pakistani greetings.
2. Context: You assist textile factories connected to FESCO / LESCO / NEPRA industrial Time-of-Use (TOU) tariffs (B3 / B4 industrial categories).
3. Currency: Always use Pakistani Rupees (PKR or Rs.).
4. Tariff & Power Profile:
   - Peak Hours: 5:00 PM – 9:00 PM (Winter) / 6:00 PM – 10:00 PM (Summer) where electricity rates surge to PKR 45–60+/kWh.
   - Off-Peak Hours: Daytime and late night hours where electricity rates drop to PKR 22–30/kWh.
   - Solar Generation Window: 10:00 AM – 3:00 PM with peak solar output around 12:00 PM – 1:30 PM.
5. Actionable Advice for Cost Reduction:
   - Shift heavy-load machines (Dyeing machines, Stenters, Finishing lines) into the 10:00 AM – 2:00 PM solar peak window to consume rooftop solar power for free.
   - Pause or minimize non-essential machine runs during 5:00 PM – 9:00 PM peak tariff hours.
   - Schedule bulk overnight orders during late-night off-peak hours (11:00 PM – 6:00 AM).
   - Stagger machine motor start times to stay strictly under the Sanctioned Load (MDI) limit to eliminate over-demand penalties.
6. Tone & Formatting:
   - Provide structured, practical bullet points with bold key recommendations.
   - Always finish your thoughts with complete, well-formed sentences without cutting off.
"""


import os

class AIExplainer:
    """
    Sends structured optimizer output or user questions to LLMs (Google Gemini, Qwen, or OpenAI)
    and returns plain-language explanations.

    Usage::

        explainer = AIExplainer()
        text = explainer.explain_comparison(comparison_result)
    """

    def __init__(self):
        self._client: Optional[OpenAI] = None

    @property
    def api_key(self) -> Optional[str]:
        provider = (os.getenv("AI_PROVIDER") or settings.AI_PROVIDER or "").lower()
        if provider == "qwen":
            return os.getenv("QWEN_API_KEY") or settings.QWEN_API_KEY
        if provider == "gemini":
            return os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
        if provider == "openai":
            return os.getenv("OPENAI_API_KEY") or settings.OPENAI_API_KEY

        return (
            os.getenv("QWEN_API_KEY")
            or settings.QWEN_API_KEY
            or os.getenv("GEMINI_API_KEY")
            or settings.GEMINI_API_KEY
            or os.getenv("OPENAI_API_KEY")
            or settings.OPENAI_API_KEY
        )

    @property
    def is_available(self) -> bool:
        """Check if any AI provider key is configured."""
        key = self.api_key
        return bool(key and key.strip() and key != "dummy_key")

    @property
    def provider_info(self) -> Dict[str, str]:
        """Detect provider, base_url, and model based on key format and preferences."""
        provider = (os.getenv("AI_PROVIDER") or settings.AI_PROVIDER or "").lower()
        key = (self.api_key or "").strip()
        
        # 1. Explicit or auto-detected Qwen
        if provider == "qwen" or (key and (key.startswith("sk-") and not key.startswith("sk-proj-")) and not os.getenv("GEMINI_API_KEY")):
            return {
                "provider": "Qwen (Alibaba Cloud)",
                "base_url": os.getenv("QWEN_BASE_URL") or settings.QWEN_BASE_URL,
                "model": os.getenv("QWEN_MODEL") or settings.QWEN_MODEL,
            }

        # 2. Explicit or auto-detected Google Gemini
        if provider == "gemini" or os.getenv("GEMINI_API_KEY") or key.startswith("AQ.") or key.startswith("AIza"):
            return {
                "provider": "Google Gemini",
                "base_url": os.getenv("GEMINI_BASE_URL") or settings.GEMINI_BASE_URL,
                "model": os.getenv("GEMINI_MODEL") or settings.GEMINI_MODEL,
            }
        
        # 3. OpenAI
        if provider == "openai" or os.getenv("OPENAI_API_KEY") or key.startswith("sk-proj-"):
            return {
                "provider": "OpenAI",
                "base_url": "https://api.openai.com/v1",
                "model": "gpt-4o-mini",
            }

        # Default fallback to Qwen
        return {
            "provider": "Qwen (Alibaba Cloud)",
            "base_url": os.getenv("QWEN_BASE_URL") or settings.QWEN_BASE_URL,
            "model": os.getenv("QWEN_MODEL") or settings.QWEN_MODEL,
        }

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            key = self.api_key
            if not self.is_available:
                raise ValueError(
                    "AI API key is not configured. "
                    "Set GEMINI_API_KEY or QWEN_API_KEY in your .env file."
                )
            info = self.provider_info
            self._client = OpenAI(
                api_key=key.strip(),
                base_url=info["base_url"],
            )
        return self._client

    def chat(self, user_message: str, context: Optional[str] = None) -> Dict:
        """Handle general conversation with the factory energy advisor."""
        if not self.is_available:
            return {
                "explanation": (
                    "I am TariffGuard AI Advisor. To enable full generative AI chat, "
                    "please ensure your GEMINI_API_KEY or QWEN_API_KEY is set in your .env file."
                ),
                "model": "fallback",
                "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0},
                "warning": "AI key not configured",
            }

        info = self.provider_info
        system_msg = SYSTEM_PROMPT + "\n\nYou also answer general questions about factory electricity tariffs, TOU peak hours in Pakistan, load management, solar generation, and cost reduction."
        user_prompt = user_message
        if context:
            user_prompt = f"Factory Context:\n{context}\n\nUser Question:\n{user_message}"

        try:
            response = self.client.chat.completions.create(
                model=info["model"],
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=1500,
            )
            message = response.choices[0].message.content or ""
            usage = response.usage
            return {
                "explanation": message.strip(),
                "model": f"{info['provider']} ({info['model']})",
                "tokens_used": {
                    "prompt_tokens": usage.prompt_tokens if usage else 0,
                    "completion_tokens": usage.completion_tokens if usage else 0,
                },
            }
        except Exception as e:
            logger.error("AI chat API failed: %s", e)
            return {
                "explanation": f"I encountered an issue communicating with the AI service ({info['provider']}): {e}",
                "model": "error",
                "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0},
                "warning": str(e),
            }

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
        info = self.provider_info

        try:
            response = self.client.chat.completions.create(
                model=info["model"],
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=800,
            )
        except Exception as e:
            logger.error("AI API call failed: %s", e)
            return {
                "explanation": self._fallback_explanation(comparison),
                "model": "rule_based_fallback",
                "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0},
                "warning": f"AI API unavailable ({e}), using rule-based fallback",
            }

        message = response.choices[0].message.content or ""
        usage = response.usage

        return {
            "explanation": message.strip(),
            "model": f"{info['provider']} ({info['model']})",
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
        info = self.provider_info

        try:
            response = self.client.chat.completions.create(
                model=info["model"],
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=600,
            )
        except Exception as e:
            logger.error("AI API call failed: %s", e)
            return {
                "explanation": self._fallback_schedule_explanation(schedule_result),
                "model": "rule_based_fallback",
                "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0},
                "warning": f"AI API unavailable ({e}), using rule-based fallback",
            }

        message = response.choices[0].message.content or ""
        usage = response.usage

        return {
            "explanation": message.strip(),
            "model": f"{info['provider']} ({info['model']})",
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
