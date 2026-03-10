from __future__ import annotations

from pathlib import Path

from services.wangp_bridge import WanGPBridge


def _make_bridge(*, image_model_type: str = "z_image") -> WanGPBridge:
    return WanGPBridge(
        enabled=True,
        root=Path(r"E:\ML\w20"),
        python_executable=None,
        config_dir=Path(r"E:\tmp\wangp_bridge"),
        output_dir=Path(r"E:\tmp\wangp_outputs"),
        video_model_type="ltx2_22B_distilled",
        image_model_type=image_model_type,
        camera_motion_prompts={},
        extra_args=(),
    )


def test_qwen_image_resolution_uses_native_16_9_preset() -> None:
    bridge = _make_bridge(image_model_type="qwen_image_20B")

    assert bridge._map_image_resolution(1920, 1072) == (1664, 928)


def test_qwen_image_resolution_falls_back_to_nearest_supported_aspect() -> None:
    bridge = _make_bridge(image_model_type="qwen_image_20B")

    assert bridge._map_image_resolution(2520, 1080) == (1664, 928)


def test_non_qwen_image_resolution_is_left_unchanged() -> None:
    bridge = _make_bridge(image_model_type="z_image")

    assert bridge._map_image_resolution(1920, 1072) == (1920, 1072)


def test_z_image_uses_eight_step_floor() -> None:
    bridge = _make_bridge(image_model_type="z_image")

    assert bridge._normalize_image_steps(4) == 8
    assert bridge._normalize_image_steps(8) == 8
    assert bridge._normalize_image_steps(12) == 12
