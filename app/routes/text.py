from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request
import requests

from app.services.ionrouter import IonRouterClient

text_bp = Blueprint("text", __name__, url_prefix="/api/text")


@text_bp.post("/chat")
def text_chat():
    data = request.get_json(silent=True) or {}

    model = data.get("model") or current_app.config["DEFAULT_TEXT_MODEL"]
    messages = data.get("messages")

    if not messages:
        prompt = data.get("prompt")
        if not prompt:
            return jsonify({"error": "Provide either 'messages' or 'prompt'"}), 400
        messages = [{"role": "user", "content": prompt}]

    payload = {
        "model": model,
        "messages": messages,
        "temperature": data.get("temperature", 0.7),
        "max_tokens": data.get("max_tokens", 512),
    }

    try:
        client = IonRouterClient()
        result = client.text_chat(payload)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 500
    except requests.HTTPError as exc:
        response = exc.response
        details = response.text if response is not None else str(exc)
        status = response.status_code if response is not None else 502
        return jsonify({"error": "IonRouter text API request failed", "details": details}), status
    except requests.RequestException as exc:
        return jsonify({"error": "IonRouter text API unavailable", "details": str(exc)}), 502
