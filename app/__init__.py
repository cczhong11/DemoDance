from __future__ import annotations

from flask import Flask
from dotenv import load_dotenv

from app.config import load_config
from app.routes.audio import audio_bp
from app.routes.health import health_bp
from app.routes.text import text_bp
from app.routes.video import video_bp


def create_app() -> Flask:
    load_dotenv(dotenv_path=".env")

    app = Flask(__name__)
    app.config.from_mapping(load_config())

    app.register_blueprint(health_bp)
    app.register_blueprint(text_bp)
    app.register_blueprint(audio_bp)
    app.register_blueprint(video_bp)

    return app
