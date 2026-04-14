from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator, Dict, List, Literal, Optional

from fastapi import FastAPI
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from core.orchestrator import DualEngineOrchestrator


class TraitPayload(BaseModel):
    id: str = Field(..., description="Trait id, e.g. T001:反PUA雷达")
    modifier: float = Field(0.0, description="Probability modifier in [-1.0, 1.0], usually a small delta")
    applies_to: List[str] = Field(default_factory=lambda: ["ALL"])


class DnaVector(BaseModel):
    social_energy: float = Field(..., ge=0.0, le=1.0)
    empathy_resonance: float = Field(..., ge=0.0, le=1.0)
    rational_logic: float = Field(..., ge=0.0, le=1.0)
    stress_resilience: float = Field(..., ge=0.0, le=1.0)
    behavioral_flexibility: float = Field(..., ge=0.0, le=1.0)


class TriggerRequest(BaseModel):
    room_id: Optional[str] = None
    action: str
    source_dna: DnaVector
    target_dna: Optional[DnaVector] = None
    traits: List[TraitPayload] = Field(default_factory=list)
    locale: Literal["zh", "en"] = "zh"
    seed: Optional[str] = None


class TriggerAccepted(BaseModel):
    ok: bool
    phase: str
    room_id: Optional[str] = None


app = FastAPI(
    title="Turing Destiny Arena Engine Gateway",
    version="0.1.0",
    description="Dual-engine gateway: deterministic referee first, narration later.",
)

orchestrator = DualEngineOrchestrator()


def sse_event(event: str, payload: Dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def trigger_stream(payload: TriggerRequest) -> AsyncIterator[str]:
    async for event in orchestrator.stream_dating_turn(
        action=payload.action,
        source_dna=payload.source_dna.model_dump(),
        target_dna=payload.target_dna.model_dump() if payload.target_dna else None,
        traits=[item.model_dump() for item in payload.traits],
        locale=payload.locale,
        room_id=payload.room_id,
        seed=payload.seed,
    ):
        yield sse_event(event["event"], event["payload"])


@app.get("/healthz")
async def healthz() -> Dict[str, str]:
    return {"ok": "true", "service": "turing-destiny-engine"}


@app.post("/engine/trigger")
async def trigger_engine(payload: TriggerRequest):
    return StreamingResponse(
        trigger_stream(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/engine/trigger/preview", response_model=TriggerAccepted)
async def trigger_preview(payload: TriggerRequest):
    # Helpful for local smoke tests without opening an SSE stream.
    _ = payload
    return TriggerAccepted(ok=True, phase="accepted", room_id=payload.room_id)


@app.exception_handler(ValueError)
async def value_error_handler(_, exc: ValueError):
    return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
