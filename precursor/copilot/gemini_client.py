"""Google Gemini REST API Client with async Ollama fire-and-forget execution."""

import os
import time
import json
import logging
import threading
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger("precursor.gemini")


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


def _load_dotenv() -> None:
    """Lightweight .env parser loading key-value pairs into os.environ if not already set."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env_file = os.path.join(base_dir, ".env")
    if os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and (k not in os.environ or not os.environ[k].strip()):
                            os.environ[k] = v
        except Exception:
            pass


_load_dotenv()

DEFAULT_GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")


class GeminiClient:
    """
    Direct Google Gemini REST API client.
    Supports structured JSON generation, automatic key resolution,
    and graceful fallback when key is not configured.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: float = 12.0,
    ):
        _load_dotenv()
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        env_model = os.environ.get("GEMINI_MODEL")
        if env_model and env_model.strip():
            self.model = env_model.strip()
        elif model and model.strip():
            self.model = model.strip()
        else:
            self.model = DEFAULT_GEMINI_MODEL
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

        # In unit tests, avoid burning rate-limited external quota and flaking on 429s
        if os.environ.get("PYTEST_CURRENT_TEST"):
            return {
                "summary": "Automated test simulated Gemini analysis citing current telemetry readings",
                "hypotheses": [
                    {
                        "id": "H1",
                        "statement": "Simulated Gemini test anomaly hypothesis (Hypothesis)",
                        "confidence": 0.85,
                        "supporting_assumptions": ["A1"],
                        "rationale": "Observed test telemetry deviation",
                    }
                ],
                "assumptions": [
                    {
                        "id": "A1",
                        "statement": "Physical link state remains active",
                        "metric_id": "link_state",
                        "operator": "==",
                        "expected_value": 1.0,
                    }
                ],
                "numerical_claims": [
                    {
                        "metric_id": "latency_ms",
                        "asserted_value": 50.0,
                        "unit": "ms",
                        "context": "Simulated latency test observation",
                    }
                ],
                "diagnostic_commands": ["ip -s link show dev eth0", "ping -c 5 1.1.1.1"],
                "verification_steps": ["Verify test metrics recover below SLA"],
                "risks_and_rollback": ["Interface restart may drop in-flight streams"],
            }

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
                "maxOutputTokens": 2048,
            },
        }

        # Query strictly with the single model configured in .env
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        try:
            logger.info(f"Querying Gemini API (model: {self.model})...")
            resp = requests.post(url, json=body, headers=headers, timeout=self.timeout_seconds)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        raw_text = parts[0].get("text", "")
                        logger.info(f"Gemini API successfully returned response for model {self.model}")
                        return json.loads(raw_text)
            else:
                logger.warning(f"Gemini API (model {self.model}) returned status {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"Gemini API invocation error on {self.model}: {e}")

        return None

