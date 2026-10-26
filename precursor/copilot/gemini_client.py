"""Google Gemini REST API Client with async Ollama fire-and-forget execution."""

import os
import time
import json
import logging
import threading
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger("precursor.gemini")

DEFAULT_GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")


def fire_ollama_prompt_async(base_url: str, model: str, prompt: str) -> None:
    """
    Dispatch prompt to local Ollama in a background daemon thread.
    Does not wait for reply and discards the output (fire-and-forget),
    ensuring Ollama executes the prompt locally without blocking Copilot response.
    """
    def _worker():
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.2, "top_p": 0.9, "num_predict": 100},
            }
            # Short timeout to dispatch; response is discarded
            requests.post(
                f"{base_url.rstrip('/')}/api/generate",
                json=payload,
                timeout=(2.0, 30.0),
            )
        except Exception as e:
            logger.debug(f"Async Ollama execution completed or dropped: {e}")

    t = threading.Thread(target=_worker, daemon=True, name="ollama-fire-and-forget")
    t.start()


class GeminiClient:
    """
    Direct Google Gemini REST API client.
    Supports structured JSON generation, automatic key resolution,
    and graceful fallback when key is not configured.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = DEFAULT_GEMINI_MODEL,
        timeout_seconds: float = 8.0,
    ):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.model = model
        self.timeout_seconds = timeout_seconds

    @property
    def is_configured(self) -> bool:
        """True if a valid Gemini API key is configured."""
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Query Gemini REST API requesting strict JSON output.
        Returns parsed dictionary or None on failure/unconfigured.
        """
        if not self.is_configured:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        contents = []
        if system_instruction:
            contents.append({
                "role": "user",
                "parts": [{"text": f"System Instructions: {system_instruction}\n\nTask:\n{prompt}"}]
            })
        else:
            contents.append({
                "role": "user",
                "parts": [{"text": prompt}]
            })

        body: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
                "maxOutputTokens": 1024,
            },
        }

        try:
            resp = requests.post(url, json=body, headers=headers, timeout=self.timeout_seconds)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        raw_text = parts[0].get("text", "")
                        return json.loads(raw_text)
            else:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"Gemini API invocation error: {e}")

        return None
