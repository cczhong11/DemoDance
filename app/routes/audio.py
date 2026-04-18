from __future__ import annotations

import base64

from flask import Blueprint, current_app, jsonify, request, Response
import requests

from app.services.ionrouter import IonRouterClient

audio_bp = Blueprint("audio", __name__, url_prefix="/api/audio")


@audio_bp.post("/speech")
def text_to_speech():
    data = request.get_json(silent=True) or {}

    text_input = data.get("input")
    if not text_input:
        return jsonify({"error": "'input' is required"}), 400

    payload = {
        "model": data.get("model") or current_app.config["DEFAULT_TTS_MODEL"],
        "input": text_input,
        "voice": data.get("voice") or current_app.config["DEFAULT_TTS_VOICE"],
    }

    for optional_key in ("ref_audio", "ref_text"):
        if data.get(optional_key):
            payload[optional_key] = data[optional_key]

    try:
        client = IonRouterClient()
        audio_bytes, content_type = client.text_to_speech(payload)

        if data.get("base64", False):
            return jsonify(
                {
                    "audio_base64": base64.b64encode(audio_bytes).decode("utf-8"),
                    "mime_type": content_type,
                }
            )

        return Response(audio_bytes, mimetype=content_type)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 500
    except requests.HTTPError as exc:
        response = exc.response
        details = response.text if response is not None else str(exc)
        status = response.status_code if response is not None else 502
        return jsonify({"error": "IonRouter audio API request failed", "details": details}), status
    except requests.RequestException as exc:
        return jsonify({"error": "IonRouter audio API unavailable", "details": str(exc)}), 502
