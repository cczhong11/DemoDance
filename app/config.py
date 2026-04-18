from __future__ import annotations

import os


def load_config() -> dict[str, str]:
    return {
        "IONROUTER_API_KEY": os.getenv("IONROUTER_API_KEY", ""),
        "IONROUTER_BASE_URL": os.getenv("IONROUTER_BASE_URL", "https://api.ionrouter.io/v1"),
        "DEFAULT_TEXT_MODEL": os.getenv("IONROUTER_TEXT_MODEL", "qwen3-30b-a3b"),
        "DEFAULT_TTS_MODEL": os.getenv("IONROUTER_TTS_MODEL", "orpheus-3b"),
        "DEFAULT_TTS_VOICE": os.getenv("IONROUTER_TTS_VOICE", "tara"),
    }
