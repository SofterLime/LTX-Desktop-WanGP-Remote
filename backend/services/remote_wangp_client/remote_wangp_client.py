"""HTTP client for the remote Wan2GP REST API server."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

import httpx

from .types import GenerationResult, RemoteWanGPStatus

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[str, int, int | None, int | None], None]
CancelledCallback = Callable[[], bool]

ATTACHMENT_KEYS = (
    "image_start",
    "image_end",
    "image_refs",
    "image_guide",
    "image_mask",
    "video_guide",
    "video_mask",
    "video_source",
    "audio_guide",
    "audio_source",
)

POLL_INTERVAL = 0.5
MAX_RETRIES = 3
RETRY_BACKOFF = 1.0


class RemoteWanGPClient:
    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        output_dir: Path,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._output_dir = output_dir
        self._output_dir.mkdir(parents=True, exist_ok=True)
        headers: dict[str, str] = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self._client = httpx.Client(
            base_url=self._base_url,
            headers=headers,
            timeout=httpx.Timeout(connect=10.0, read=300.0, write=300.0, pool=10.0),
        )

    _DEFAULT_MODELS: dict[str, list[dict[str, Any]]] = {
        "video_models": [
            {"model_type": "ltx2_22B_distilled", "name": "LTX2 22B Distilled", "architecture": "ltx2_22B",
             "capabilities": {"i2v": True, "t2v": True, "image_prompt_types_allowed": "S", "image_ref_roles": [], "one_image_ref_needed": False}},
        ],
        "image_models": [
            {"model_type": "z_image", "name": "Z-Image Turbo 6B", "architecture": "z_image"},
        ],
    }

    def get_available_models(self) -> dict[str, list[dict[str, Any]]]:
        try:
            resp = self._client.get("/api/models")
            resp.raise_for_status()
            data = resp.json()
            if "video_models" in data and "image_models" in data:
                return data
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                logger.info("Remote server does not support /api/models, using defaults")
            else:
                logger.warning("Failed to fetch models from remote: %s", exc)
        except Exception as exc:
            logger.warning("Failed to fetch models from remote: %s", exc)
        return dict(self._DEFAULT_MODELS)

    def get_profiles(self) -> list[dict[str, Any]]:
        try:
            resp = self._client.get("/api/profiles")
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list):
                return data
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                logger.info("Remote server does not support /api/profiles, using fallback")
            else:
                logger.warning("Failed to fetch profiles from remote: %s", exc)
        except Exception as exc:
            logger.warning("Failed to fetch profiles from remote: %s", exc)

        models = self.get_available_models()
        all_types = [m["model_type"] for m in models.get("video_models", [])] + \
                    [m["model_type"] for m in models.get("image_models", [])]
        return [{"id": "default", "name": "Default", "vram_gb": 0, "compatible_model_types": all_types}]

    def get_loras(self, model_type: str | None = None) -> list[dict[str, Any]]:
        try:
            params = {}
            if model_type:
                params["model_type"] = model_type
            resp = self._client.get("/api/loras", params=params)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list):
                return data
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                logger.info("Remote server does not support /api/loras")
            else:
                logger.warning("Failed to fetch LoRAs from remote: %s", exc)
        except Exception as exc:
            logger.warning("Failed to fetch LoRAs from remote: %s", exc)
        return []

    def get_status(self) -> RemoteWanGPStatus:
        try:
            resp = self._client.get("/api/health")
            resp.raise_for_status()
            data = resp.json()
            return RemoteWanGPStatus(
                available=data.get("status") == "ok",
                active_job=data.get("active_job"),
            )
        except Exception as exc:
            return RemoteWanGPStatus(available=False, reason=str(exc))

    def generate_video(
        self,
        *,
        settings: dict[str, Any],
        on_progress: ProgressCallback,
        is_cancelled: CancelledCallback,
    ) -> GenerationResult:
        return self._generate(settings=settings, on_progress=on_progress, is_cancelled=is_cancelled)

    def generate_images(
        self,
        *,
        settings: dict[str, Any],
        on_progress: ProgressCallback,
        is_cancelled: CancelledCallback,
    ) -> GenerationResult:
        return self._generate(settings=settings, on_progress=on_progress, is_cancelled=is_cancelled)

    def _generate(
        self,
        *,
        settings: dict[str, Any],
        on_progress: ProgressCallback,
        is_cancelled: CancelledCallback,
    ) -> GenerationResult:
        on_progress("uploading_files", 5, None, None)
        rewritten = self._rewrite_attachment_paths(settings)

        on_progress("submitting_job", 10, None, None)
        resp = self._client.post("/api/generate", json=rewritten)
        if resp.status_code == 409:
            raise RuntimeError("Remote server already has an active job")
        resp.raise_for_status()
        job_id = resp.json()["job_id"]
        logger.info("Remote job submitted: %s", job_id)

        self._poll_progress(job_id, on_progress, is_cancelled)

        on_progress("downloading_output", 95, None, None)
        files = self._download_result(job_id)

        on_progress("complete", 100, None, None)
        return GenerationResult(success=True, files=files)

    def _upload_file(self, local_path: str) -> str:
        path = Path(local_path)
        if not path.is_file():
            raise FileNotFoundError(f"Local file not found: {local_path}")

        with path.open("rb") as f:
            resp = self._client.post(
                "/api/upload",
                files={"file": (path.name, f)},
            )
        resp.raise_for_status()
        return resp.json()["server_path"]

    def _rewrite_attachment_paths(self, settings: dict[str, Any]) -> dict[str, Any]:
        rewritten = dict(settings)
        for key in ATTACHMENT_KEYS:
            val = rewritten.get(key)
            if not val:
                continue
            if isinstance(val, str) and Path(val).is_file():
                logger.info("Uploading %s: %s", key, val)
                rewritten[key] = self._upload_file(val)
            elif isinstance(val, list):
                new_list = []
                for item in val:
                    if isinstance(item, str) and Path(item).is_file():
                        logger.info("Uploading %s item: %s", key, item)
                        new_list.append(self._upload_file(item))
                    else:
                        new_list.append(item)
                rewritten[key] = new_list
        return rewritten

    def _poll_progress(
        self,
        job_id: str,
        on_progress: ProgressCallback,
        is_cancelled: CancelledCallback,
    ) -> None:
        retries = 0
        while True:
            if is_cancelled():
                self._try_cancel(job_id)
                raise RuntimeError("Generation was cancelled")

            try:
                resp = self._client.get(f"/api/jobs/{job_id}/progress")
                resp.raise_for_status()
                data = resp.json()
                retries = 0
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.RemoteProtocolError) as exc:
                retries += 1
                if retries > MAX_RETRIES:
                    raise RuntimeError(f"Lost connection to remote server after {MAX_RETRIES} retries: {exc}") from exc
                logger.warning("Poll retry %d/%d: %s", retries, MAX_RETRIES, exc)
                time.sleep(RETRY_BACKOFF * retries)
                continue

            status = data.get("status", "")
            if status == "completed":
                return
            if status == "failed":
                raise RuntimeError(f"Remote generation failed: {data.get('error', 'unknown')}")
            if status == "cancelled":
                raise RuntimeError("Remote generation was cancelled")

            on_progress(
                data.get("phase", "inference"),
                data.get("progress", 0),
                data.get("current_step"),
                data.get("total_steps"),
            )

            time.sleep(POLL_INTERVAL)

    def _download_result(self, job_id: str) -> list[str]:
        resp = self._client.get(f"/api/jobs/{job_id}/result")
        resp.raise_for_status()
        data = resp.json()

        if not data.get("success"):
            raise RuntimeError(f"Remote job did not succeed: {data}")

        local_paths: list[str] = []
        for file_info in data.get("files", []):
            filename = file_info["filename"]
            download_url = file_info["download_url"]

            file_resp = self._client.get(download_url)
            file_resp.raise_for_status()

            local_path = self._output_dir / filename
            local_path.write_bytes(file_resp.content)
            local_paths.append(str(local_path.resolve()))
            logger.info("Downloaded: %s -> %s", download_url, local_path)

        return local_paths

    def _try_cancel(self, job_id: str) -> None:
        try:
            self._client.post(f"/api/jobs/{job_id}/cancel")
        except Exception:
            logger.warning("Failed to send cancel to remote server for job %s", job_id)

    def close(self) -> None:
        self._client.close()
