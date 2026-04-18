from __future__ import annotations

from typing import Any

import requests
from flask import current_app


class BytePlusVideoClient:
    def __init__(self) -> None:
        self.api_key = current_app.config["BYTEPLUS_ARK_API_KEY"]
        self.base_url = current_app.config["BYTEPLUS_ARK_BASE_URL"].rstrip("/")

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise ValueError("BYTEPLUS_ARK_API_KEY is not set")

        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def create_task(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/contents/generations/tasks",
            headers=self._headers(),
            json=payload,
            timeout=90,
        )
        response.raise_for_status()
        return response.json()

    def get_task(self, task_id: str) -> dict[str, Any]:
        response = requests.get(
            f"{self.base_url}/contents/generations/tasks/{task_id}",
            headers=self._headers(),
            timeout=60,
        )
        response.raise_for_status()
        return response.json()

    def list_tasks(self, params: dict[str, Any]) -> dict[str, Any]:
        response = requests.get(
            f"{self.base_url}/contents/generations/tasks",
            headers=self._headers(),
            params=params,
            timeout=60,
        )
        response.raise_for_status()
        return response.json()
