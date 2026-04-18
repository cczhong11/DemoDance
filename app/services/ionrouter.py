from __future__ import annotations

from typing import Any

import requests
from flask import current_app


class IonRouterClient:
    def __init__(self) -> None:
        self.api_key = current_app.config["IONROUTER_API_KEY"]
        self.base_url = current_app.config["IONROUTER_BASE_URL"].rstrip("/")

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise ValueError("IONROUTER_API_KEY is not set")

        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def text_chat(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=self._headers(),
            json=payload,
            timeout=60,
        )
        response.raise_for_status()
        return response.json()

    def text_to_speech(self, payload: dict[str, Any]) -> tuple[bytes, str]:
        response = requests.post(
            f"{self.base_url}/audio/speech",
            headers=self._headers(),
            json=payload,
            timeout=120,
        )
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "audio/wav")
        return response.content, content_type
