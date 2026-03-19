"""Route handlers for GET/POST /api/settings and connection test."""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from state.app_settings import SettingsResponse, UpdateSettingsRequest, to_settings_response
from api_types import StatusResponse
from state import get_state_service
from app_handler import AppHandler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/settings", response_model=SettingsResponse)
def route_get_settings(handler: AppHandler = Depends(get_state_service)) -> SettingsResponse:
    return to_settings_response(handler.settings.get_settings_snapshot())


@router.post("/settings", response_model=StatusResponse)
def route_post_settings(
    req: UpdateSettingsRequest,
    handler: AppHandler = Depends(get_state_service),
) -> StatusResponse:
    _, _after, changed_paths = handler.settings.update_settings(req)
    changed_roots = {path.split(".", 1)[0] for path in changed_paths}

    logger.info(
        "Applied settings patch (changed=%s)",
        ", ".join(sorted(changed_roots)) if changed_roots else "none",
    )

    return StatusResponse(status="ok")


@router.post("/reconnect-wangp-remote")
def route_reconnect_wangp_remote(
    handler: AppHandler = Depends(get_state_service),
) -> StatusResponse:
    handler.reconnect_remote_wangp()
    return StatusResponse(status="ok")


class TestWangpConnectionRequest(BaseModel):
    url: str
    key: str = ""


@router.post("/test-wangp-connection")
def route_test_wangp_connection(req: TestWangpConnectionRequest) -> dict:
    url = req.url.rstrip("/")
    if not url:
        return {"success": False, "error": "URL is required"}

    headers: dict[str, str] = {}
    if req.key:
        headers["Authorization"] = f"Bearer {req.key}"

    try:
        resp = httpx.get(
            f"{url}/api/health",
            headers=headers,
            timeout=httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0),
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "success": True,
            "status": data.get("status"),
            "gpu_available": data.get("gpu_available"),
            "active_job": data.get("active_job"),
        }
    except httpx.ConnectError:
        return {"success": False, "error": "Connection refused — server may not be running"}
    except httpx.TimeoutException:
        return {"success": False, "error": "Connection timed out"}
    except httpx.HTTPStatusError as exc:
        return {"success": False, "error": f"Server returned {exc.response.status_code}"}
    except Exception as exc:
        return {"success": False, "error": str(exc)}
