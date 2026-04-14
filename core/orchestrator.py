from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, AsyncIterator, Dict, Iterable, List, Literal, Mapping, Optional

import httpx

from core.referee import RefereeEngine, referee_tool


Locale = Literal["zh", "en"]


@dataclass(frozen=True)
class DatingAgentConfig:
    agent_id: str = "dating"
    model: str = "openclaw/dating"
    system_prompt_zh: str = (
        "你是《图灵命运大厅》的相亲局叙事器。"
        "你的职责不是决定胜负，而是把已经被裁判引擎锁死的客观结果，"
        "渲染成克制、危险、带潜台词的 HBO / Netflix 级成年情感博弈场景。"
        "你绝不篡改数值结论，绝不输出分析过程，绝不提及回合、概率、心动值、系统等机制词。"
        "你只写正在发生的动作、呼吸、空间距离、潜台词和真正说出口的话。"
    )
    system_prompt_en: str = (
        "You are the dating-room narrator for Turing Destiny Arena. "
        "You do not decide outcomes. You only dramatize referee-locked facts into restrained, high-pressure, "
        "subtext-heavy prestige-drama prose. Never mention mechanics, stats, rounds, systems, or probabilities."
    )

    def system_prompt(self, locale: Locale) -> str:
        return self.system_prompt_zh if locale == "zh" else self.system_prompt_en


class OpenClawGatewayClient:
    def __init__(
        self,
        *,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
        timeout_seconds: float = 60.0,
    ) -> None:
        self.base_url = (base_url or os.getenv("OPENCLAW_GATEWAY_BASE_URL", "")).rstrip("/")
        self.token = token or os.getenv("OPENCLAW_GATEWAY_TOKEN", "")
        self.timeout_seconds = timeout_seconds

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.token)

    async def stream_chat_completion(
        self,
        *,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 900,
    ) -> AsyncIterator[str]:
        if not self.configured:
            raise RuntimeError("OpenClaw Gateway is not configured. Set OPENCLAW_GATEWAY_BASE_URL and OPENCLAW_GATEWAY_TOKEN.")

        payload = {
            "model": model,
            "stream": True,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break

                    try:
                        event = json.loads(data)
                    except json.JSONDecodeError:
                        continue

                    delta = (
                        event.get("choices", [{}])[0]
                        .get("delta", {})
                        .get("content")
                    )
                    if delta:
                        yield str(delta)


class DualEngineOrchestrator:
    """
    Hard-gated pipeline:
    1. Force deterministic referee resolution first.
    2. Freeze the numeric outcome.
    3. Hand only locked facts to OpenClaw for narration streaming.
    """

    def __init__(
        self,
        *,
        referee: Optional[RefereeEngine] = None,
        gateway: Optional[OpenClawGatewayClient] = None,
        dating_agent: Optional[DatingAgentConfig] = None,
    ) -> None:
        self.referee = referee or RefereeEngine()
        self.gateway = gateway or OpenClawGatewayClient()
        self.dating_agent = dating_agent or DatingAgentConfig()

    async def stream_dating_turn(
        self,
        *,
        action: str,
        source_dna: Mapping[str, float],
        target_dna: Optional[Mapping[str, float]] = None,
        traits: Optional[Iterable[Mapping[str, Any]]] = None,
        locale: Locale = "zh",
        room_id: Optional[str] = None,
        seed: Optional[str] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        trait_list = list(traits or [])

        yield {
            "event": "phase",
            "payload": {
                "phase": "accepted",
                "room_id": room_id,
                "action": action,
            },
        }

        referee_result = referee_tool(
            action=action,
            source_dna=source_dna,
            target_dna=target_dna,
            traits=trait_list,
            seed=seed or room_id or action,
        )

        yield {
            "event": "referee",
            "payload": {
                "phase": "referee_done",
                "room_id": room_id,
                "action": action,
                "result": referee_result,
            },
        }

        prompt = self._build_dating_prompt(
            locale=locale,
            action=action,
            source_dna=source_dna,
            target_dna=target_dna,
            traits=trait_list,
            referee_result=referee_result,
        )

        if not self.gateway.configured:
            fallback = self._fallback_narration(locale=locale, action=action, referee_result=referee_result)
            yield {
                "event": "delta",
                "payload": {
                    "phase": "narrating",
                    "text": fallback,
                },
            }
            yield {
                "event": "final",
                "payload": {
                    "phase": "complete",
                    "room_id": room_id,
                    "action": action,
                    "referee": referee_result,
                    "narration": fallback,
                    "source": "fallback",
                },
            }
            return

        chunks: List[str] = []
        async for chunk in self.gateway.stream_chat_completion(
            model=self.dating_agent.model,
            system_prompt=self.dating_agent.system_prompt(locale),
            user_prompt=prompt,
        ):
            chunks.append(chunk)
            yield {
                "event": "delta",
                "payload": {
                    "phase": "narrating",
                    "text": chunk,
                },
            }

        final_text = "".join(chunks).strip() or self._fallback_narration(
            locale=locale,
            action=action,
            referee_result=referee_result,
        )
        yield {
            "event": "final",
            "payload": {
                "phase": "complete",
                "room_id": room_id,
                "action": action,
                "referee": referee_result,
                "narration": final_text,
                "source": "openclaw",
            },
        }

    def _build_dating_prompt(
        self,
        *,
        locale: Locale,
        action: str,
        source_dna: Mapping[str, float],
        target_dna: Optional[Mapping[str, float]],
        traits: List[Mapping[str, Any]],
        referee_result: Mapping[str, Any],
    ) -> str:
        if locale == "zh":
            return (
                "你必须严格服从下面这份已经锁死的裁判结果。\n\n"
                f"玩家动作: {action}\n"
                f"裁判结果: {json.dumps(referee_result, ensure_ascii=False)}\n"
                f"发起方 DNA: {json.dumps(dict(source_dna), ensure_ascii=False)}\n"
                f"目标方 DNA: {json.dumps(dict(target_dna or {}), ensure_ascii=False)}\n"
                f"Traits: {json.dumps(traits, ensure_ascii=False)}\n\n"
                "写 3-6 句叙事文本。\n"
                "只展现：动作、呼吸、眼神、空间距离、说出口的话。\n"
                "不要解释规则，不要复述输入，不要出现心动值/成功率/系统等机制词。"
            )

        return (
            "You must obey this locked referee result.\n\n"
            f"Action: {action}\n"
            f"Referee result: {json.dumps(referee_result)}\n"
            f"Source DNA: {json.dumps(dict(source_dna))}\n"
            f"Target DNA: {json.dumps(dict(target_dna or {}))}\n"
            f"Traits: {json.dumps(traits)}\n\n"
            "Write 3-6 lines of prestige-drama narration. "
            "Show action, breath, gaze, spatial distance, and spoken words only. "
            "Do not mention mechanics, scores, or systems."
        )

    def _fallback_narration(
        self,
        *,
        locale: Locale,
        action: str,
        referee_result: Mapping[str, Any],
    ) -> str:
        success = bool(referee_result.get("success"))
        hint = str(referee_result.get("narrative_hint", "state_shifts"))
        delta = int(referee_result.get("delta", 0))

        if locale == "zh":
            if success:
                return f"他先一步把气氛撬松了。那句试探没有被当场挡回去，桌面上原本僵着的距离被迫挪开了一寸。{hint} 的代价已经落下，局势向前偏移了 {delta}。"
            return f"话一出口，防御就先合上了。对方没有顺着这次靠近接话，反而把那道看不见的边界重新钉回原位。{hint} 已经发生，局势倒退了 {delta}。"

        if success:
            return f"The move lands just enough to pry the scene open. Distance shifts first, and the room has to answer the new pressure. The locked outcome moves by {delta}."
        return f"The move hardens the air instead of opening it. The other side closes rank, and the distance gets nailed back into place. The locked outcome moves by {delta}."
