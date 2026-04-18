from __future__ import annotations

import os


def load_config() -> dict[str, str]:
    byteplus_key = os.getenv("BYTEPLUS_ARK_API_KEY", "") or os.getenv("ARK_API_KEY", "")
    return {
        "IONROUTER_API_KEY": os.getenv("IONROUTER_API_KEY", ""),
        "IONROUTER_BASE_URL": os.getenv("IONROUTER_BASE_URL", "https://api.ionrouter.io/v1"),
        "DEFAULT_TEXT_MODEL": os.getenv("IONROUTER_TEXT_MODEL", "qwen3-30b-a3b"),
        "DEFAULT_TTS_MODEL": os.getenv("IONROUTER_TTS_MODEL", "orpheus-3b"),
        "DEFAULT_TTS_VOICE": os.getenv("IONROUTER_TTS_VOICE", "tara"),
        "BYTEPLUS_ARK_API_KEY": byteplus_key,
        "BYTEPLUS_ARK_BASE_URL": os.getenv(
            "BYTEPLUS_ARK_BASE_URL", "https://ark.ap-southeast.bytepluses.com/api/v3"
        ),
        "DEFAULT_VIDEO_MODEL": os.getenv(
            "BYTEPLUS_VIDEO_MODEL", "dreamina-seedance-2-0-260128"
        ),
    }
