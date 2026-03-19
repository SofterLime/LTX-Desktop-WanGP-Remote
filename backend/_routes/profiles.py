"""Route handlers for /api/profiles and /api/loras — proxy to remote WanGP."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query

from state import get_state_service
from app_handler import AppHandler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["remote-models"])


@router.get("/profiles")
def route_profiles(handler: AppHandler = Depends(get_state_service)) -> list[dict[str, Any]]:
    client = handler.remote_wangp_client
    if client is None:
        return []
    return client.get_profiles()


@router.get("/loras")
def route_loras(
    model_type: str | None = Query(None),
    handler: AppHandler = Depends(get_state_service),
) -> list[dict[str, Any]]:
    client = handler.remote_wangp_client
    if client is None:
        return []
    return client.get_loras(model_type=model_type)
