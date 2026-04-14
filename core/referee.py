from __future__ import annotations

import hashlib
import json
import random
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Literal, Mapping, Optional


ActionType = Literal["FLIRT", "DEBATE", "LEAD", "RESIST", "DECEIVE", "SEDUCE", "CONFESS", "WITHDRAW"]


def _fallback_tool(*, name: str, description: str):
    """
    Lightweight compatibility decorator.

    OpenClaw's concrete Python tool binding may vary by deployment strategy.
    We keep a tiny fallback so this module stays importable and testable before
    Task 3 wires the real OpenClaw registration path.
    """

    def decorator(fn):
        fn.__openclaw_tool__ = {"name": name, "description": description}
        return fn

    return decorator


try:
    # Replace this import with the concrete OpenClaw Python binding in Task 3
    from openclaw.tools import tool  # type: ignore
except Exception:  # pragma: no cover - local fallback for repo bootstrap
    tool = _fallback_tool


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


@dataclass(frozen=True)
class RefereeResult:
    success: bool
    delta: int
    narrative_hint: str
    roll: float
    threshold: float
    modifier_total: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "delta": self.delta,
            "narrative_hint": self.narrative_hint,
            "roll": round(self.roll, 4),
            "threshold": round(self.threshold, 4),
            "modifier_total": round(self.modifier_total, 4),
        }


class RefereeEngine:
    """
    Deterministic referee layer.

    Philosophy:
    - DNA is the immutable substrate.
    - Traits can shift probabilities, but only via numeric modifiers.
    - LLM never decides outcome; it only receives the result as context.
    """

    ACTION_FORMULAS: Dict[str, Dict[str, float]] = {
        "FLIRT": {
            "source.social_energy": 0.34,
            "source.empathy_resonance": 0.26,
            "target.stress_resilience": -0.18,
            "target.behavioral_flexibility": 0.08,
        },
        "SEDUCE": {
            "source.social_energy": 0.32,
            "source.behavioral_flexibility": 0.20,
            "source.empathy_resonance": 0.14,
            "target.stress_resilience": -0.16,
            "target.rational_logic": -0.08,
        },
        "CONFESS": {
            "source.empathy_resonance": 0.30,
            "source.stress_resilience": 0.12,
            "target.behavioral_flexibility": 0.12,
            "target.rational_logic": -0.14,
        },
        "DEBATE": {
            "source.rational_logic": 0.36,
            "source.stress_resilience": 0.16,
            "target.rational_logic": -0.16,
            "target.behavioral_flexibility": -0.06,
        },
        "LEAD": {
            "source.social_energy": 0.18,
            "source.rational_logic": 0.18,
            "source.stress_resilience": 0.16,
            "target.behavioral_flexibility": -0.10,
            "target.empathy_resonance": -0.06,
        },
        "RESIST": {
            "source.stress_resilience": 0.36,
            "source.rational_logic": 0.10,
            "target.social_energy": -0.12,
            "target.behavioral_flexibility": -0.06,
        },
        "DECEIVE": {
            "source.behavioral_flexibility": 0.28,
            "source.rational_logic": 0.14,
            "target.empathy_resonance": -0.14,
            "target.rational_logic": -0.10,
        },
        "WITHDRAW": {
            "source.stress_resilience": 0.18,
            "source.behavioral_flexibility": 0.14,
            "target.social_energy": -0.10,
        },
    }

    HINTS = {
        ("FLIRT", True): "spark_lands",
        ("FLIRT", False): "guard_hardens",
        ("SEDUCE", True): "desire_hooks",
        ("SEDUCE", False): "temperature_drops",
        ("CONFESS", True): "wall_cracks",
        ("CONFESS", False): "silence_recoils",
        ("DEBATE", True): "logic_pins_target",
        ("DEBATE", False): "argument_backfires",
        ("LEAD", True): "dominance_seized",
        ("LEAD", False): "tempo_slips",
        ("RESIST", True): "pressure_absorbed",
        ("RESIST", False): "defense_breaks",
        ("DECEIVE", True): "mask_holds",
        ("DECEIVE", False): "feint_exposed",
        ("WITHDRAW", True): "distance_reframes_scene",
        ("WITHDRAW", False): "distance_reads_as_fear",
    }

    def evaluate(
        self,
        *,
        action: str,
        source_dna: Mapping[str, float],
        target_dna: Optional[Mapping[str, float]] = None,
        traits: Optional[Iterable[Mapping[str, Any]]] = None,
        base_bias: float = 0.50,
        seed: Optional[str] = None,
    ) -> RefereeResult:
        action_key = action.upper()
        formula = self.ACTION_FORMULAS.get(action_key)
        if not formula:
            raise ValueError(f"Unsupported action '{action}'.")

        normalized_source = self._normalize_dna(source_dna)
        normalized_target = self._normalize_dna(target_dna or {})
        threshold = base_bias + self._weighted_score(formula, normalized_source, normalized_target)
        modifier_total = self._trait_modifier_total(action_key, traits or [])
        threshold = clamp(threshold + modifier_total, 0.05, 0.95)

        roll = self._deterministic_roll(
          action=action_key,
          source_dna=normalized_source,
          target_dna=normalized_target,
          traits=list(traits or []),
          seed=seed,
        )
        success = roll <= threshold
        margin = threshold - roll
        delta = self._compute_delta(margin=margin, success=success)
        narrative_hint = self.HINTS.get((action_key, success), "state_shifts")

        return RefereeResult(
            success=success,
            delta=delta,
            narrative_hint=narrative_hint,
            roll=roll,
            threshold=threshold,
            modifier_total=modifier_total,
        )

    def _normalize_dna(self, dna: Mapping[str, float]) -> Dict[str, float]:
        keys = (
            "social_energy",
            "empathy_resonance",
            "rational_logic",
            "stress_resilience",
            "behavioral_flexibility",
        )
        normalized: Dict[str, float] = {}
        for key in keys:
            normalized[key] = clamp(float(dna.get(key, 0.5)), 0.0, 1.0)
        return normalized

    def _weighted_score(
        self,
        formula: Mapping[str, float],
        source_dna: Mapping[str, float],
        target_dna: Mapping[str, float],
    ) -> float:
        score = 0.0
        for path, weight in formula.items():
            side, dimension = path.split(".", 1)
            vector = source_dna if side == "source" else target_dna
            value = float(vector.get(dimension, 0.5))
            score += (value - 0.5) * weight
        return score

    def _trait_modifier_total(self, action: str, traits: Iterable[Mapping[str, Any]]) -> float:
        total = 0.0
        for trait in traits:
            modifier = float(trait.get("modifier", 0.0))
            applies_to = trait.get("applies_to") or trait.get("actions") or ["ALL"]
            applies = {str(item).upper() for item in applies_to}
            if "ALL" in applies or action in applies:
                total += modifier
        return clamp(total, -0.35, 0.35)

    def _deterministic_roll(
        self,
        *,
        action: str,
        source_dna: Mapping[str, float],
        target_dna: Mapping[str, float],
        traits: List[Mapping[str, Any]],
        seed: Optional[str],
    ) -> float:
        payload = {
            "action": action,
            "source_dna": dict(source_dna),
            "target_dna": dict(target_dna),
            "traits": traits,
            "seed": seed or "",
        }
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
        rng = random.Random(int(digest[:16], 16))
        return rng.random()

    def _compute_delta(self, *, margin: float, success: bool) -> int:
        magnitude = max(4, min(20, int(abs(margin) * 100) + 4))
        return magnitude if success else -magnitude


@tool(
    name="referee_engine",
    description="Deterministic dual-engine referee for immutable DNA-driven interaction outcomes.",
)
def referee_tool(
    action: str,
    source_dna: Mapping[str, float],
    target_dna: Optional[Mapping[str, float]] = None,
    traits: Optional[List[Mapping[str, Any]]] = None,
    base_bias: float = 0.50,
    seed: Optional[str] = None,
) -> Dict[str, Any]:
    engine = RefereeEngine()
    result = engine.evaluate(
        action=action,
        source_dna=source_dna,
        target_dna=target_dna,
        traits=traits,
        base_bias=base_bias,
        seed=seed,
    )
    return result.to_dict()

