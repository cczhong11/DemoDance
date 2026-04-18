from __future__ import annotations

from typing import Any

import requests
from flask import Blueprint, current_app, jsonify, request

from app.services.byteplus_video import BytePlusVideoClient

video_bp = Blueprint("video", __name__, url_prefix="/api/video")
ALLOWED_LIST_STATUSES = {"queued", "running", "cancelled", "succeeded", "failed"}
ALLOWED_SERVICE_TIERS = {"default", "flex"}


def _handle_byteplus_error(exc: Exception):
    if isinstance(exc, ValueError):
        return jsonify({"error": str(exc)}), 500
    if isinstance(exc, requests.HTTPError):
        response = exc.response
        details = response.text if response is not None else str(exc)
        status = response.status_code if response is not None else 502
        return jsonify({"error": "BytePlus video API request failed", "details": details}), status
    if isinstance(exc, requests.RequestException):
        return jsonify({"error": "BytePlus video API unavailable", "details": str(exc)}), 502
    return jsonify({"error": "Unexpected server error", "details": str(exc)}), 500


def _build_task_payload(data: dict[str, Any]) -> tuple[dict[str, Any], tuple[dict[str, str], int] | None]:
    model = data.get("model") or current_app.config["DEFAULT_VIDEO_MODEL"]

    content = data.get("content")
    if content is None:
        prompt = data.get("prompt")
        if not prompt:
            return {}, ({"error": "Provide either 'content' or 'prompt'"}, 400)
        content = [{"type": "text", "text": prompt}]

    if not isinstance(content, list) or len(content) == 0:
        return {}, ({"error": "'content' must be a non-empty array"}, 400)

    payload: dict[str, Any] = {
        "model": model,
        "content": content,
    }

    optional_keys = (
        "callback_url",
        "return_last_frame",
        "service_tier",
        "execution_expires_after",
        "generate_audio",
        "draft",
        "safety_identifier",
        "resolution",
        "ratio",
        "duration",
        "frames",
        "seed",
        "camera_fixed",
        "watermark",
    )
    for key in optional_keys:
        if key in data and data[key] is not None:
            payload[key] = data[key]

    return payload, None


@video_bp.post("/tasks")
def create_video_task():
    data = request.get_json(silent=True) or {}
    payload, error = _build_task_payload(data)
    if error:
        body, status = error
        return jsonify(body), status

    try:
        client = BytePlusVideoClient()
        result = client.create_task(payload)
        return jsonify(result), 201
    except Exception as exc:  # noqa: BLE001
        return _handle_byteplus_error(exc)


@video_bp.get("/tasks/<task_id>")
def get_video_task(task_id: str):
    try:
        client = BytePlusVideoClient()
        result = client.get_task(task_id=task_id)
        return jsonify(result)
    except Exception as exc:  # noqa: BLE001
        return _handle_byteplus_error(exc)


@video_bp.get("/tasks")
def list_video_tasks():
    params: dict[str, Any] = {}

    for page_key in ("page_num", "page_size"):
        raw_value = request.args.get(page_key)
        if not raw_value:
            continue
        try:
            parsed_value = int(raw_value)
        except ValueError:
            return jsonify({"error": f"'{page_key}' must be an integer"}), 400
        if parsed_value < 1 or parsed_value > 500:
            return jsonify({"error": f"'{page_key}' must be in range [1, 500]"}), 400
        params[page_key] = parsed_value

    # Support either status or filter.status on our API surface.
    status = request.args.get("filter.status") or request.args.get("status")
    if status:
        if status not in ALLOWED_LIST_STATUSES:
            return jsonify(
                {
                    "error": "'status' must be one of: queued, running, cancelled, succeeded, failed"
                }
            ), 400
        params["filter.status"] = status

    # Support either model or filter.model on our API surface.
    model = request.args.get("filter.model") or request.args.get("model")
    if model:
        params["filter.model"] = model

    # Support either service_tier or filter.service_tier on our API surface.
    service_tier = request.args.get("filter.service_tier") or request.args.get("service_tier")
    if service_tier:
        if service_tier not in ALLOWED_SERVICE_TIERS:
            return jsonify({"error": "'service_tier' must be one of: default, flex"}), 400
        params["filter.service_tier"] = service_tier

    # Supports:
    # 1) repeated task_ids=id1&task_ids=id2
    # 2) repeated filter.task_ids=id1&filter.task_ids=id2
    # 3) comma-separated task_ids=id1,id2
    raw_task_ids = request.args.getlist("task_ids") + request.args.getlist("filter.task_ids")
    parsed_task_ids: list[str] = []
    for raw in raw_task_ids:
        for item in raw.split(","):
            task_id = item.strip()
            if task_id:
                parsed_task_ids.append(task_id)
    if parsed_task_ids:
        params["filter.task_ids"] = parsed_task_ids

    try:
        client = BytePlusVideoClient()
        result = client.list_tasks(params=params)
        return jsonify(result)
    except Exception as exc:  # noqa: BLE001
        return _handle_byteplus_error(exc)
