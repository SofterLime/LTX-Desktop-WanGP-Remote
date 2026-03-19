from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class RemoteWanGPStatus:
    available: bool
    reason: str | None = None
    active_job: str | None = None


@dataclass(frozen=True)
class GenerationResult:
    success: bool
    files: list[str] = field(default_factory=list)
    error: str | None = None
