"""Gemini Client for ScholarHub AI Matching.

Handles communication with the Google Gemini API using the official `google-genai` SDK.
Completely isolated from the database and application business logic.
"""

import json
import logging
import re
from typing import Any, Dict, Optional

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiClient:
    """Isolated client wrapper for Google Gemini Generative AI API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[int] = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self.timeout = timeout or settings.GEMINI_REQUEST_TIMEOUT_SECONDS
        self._client: Optional[genai.Client] = None

    @property
    def is_configured(self) -> bool:
        """Check whether the client has a valid, non-placeholder API key configured."""
        if not self.api_key:
            return False
        cleaned = self.api_key.strip()
        if not cleaned or cleaned.startswith("your_") or cleaned == "replace_with_a_secure_random_secret_key_minimum_32_chars":
            return False
        return True

    def get_client(self) -> Optional[genai.Client]:
        """Lazy initialization of the official Google GenAI client instance."""
        if not self.is_configured:
            return None
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    async def generate_structured_json(
        self,
        system_instruction: str,
        prompt: str,
    ) -> Optional[Dict[str, Any]]:
        """Send prompt to Gemini model and return parsed JSON response dictionary.

        Returns None if Gemini is not configured or if an error occurs.
        """
        if not self.is_configured:
            logger.info("Gemini API key is not configured; skipping live AI inference.")
            return None

        client = self.get_client()
        if client is None:
            return None

        try:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.2,
            )

            response = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )

            raw_text = response.text
            if not raw_text:
                logger.warning("Empty response received from Gemini API.")
                return None

            # Clean potential markdown fences (```json ... ```)
            cleaned_text = raw_text.strip()
            if cleaned_text.startswith("```"):
                cleaned_text = re.sub(r"^```(?:json)?\s*", "", cleaned_text)
                cleaned_text = re.sub(r"\s*```$", "", cleaned_text)

            parsed_json = json.loads(cleaned_text)
            if isinstance(parsed_json, dict):
                return parsed_json
            elif isinstance(parsed_json, list) and parsed_json and isinstance(parsed_json[0], dict):
                return parsed_json[0]
            else:
                logger.warning(f"Unexpected JSON root type from Gemini: {type(parsed_json)}")
                return None

        except json.JSONDecodeError as jde:
            logger.warning(f"Failed to decode JSON from Gemini response: {jde}")
            return None
        except Exception as exc:
            # Note: We explicitly log only exception type and message, never keys or payloads
            logger.warning(f"Gemini API request failed: {type(exc).__name__}: {exc}")
            return None
