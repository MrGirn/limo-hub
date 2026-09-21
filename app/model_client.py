"""Real OpenAI-compatible chat API adapter. No simulated success fallback."""
import json
import os
import re
from urllib.parse import urlparse
import httpx


class ModelUnavailable(RuntimeError):
    pass


def redact(text):
    text = re.sub(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', '[EMAIL]', text)
    text = re.sub(r'(?<!\w)\+?\d[\d ()-]{8,}\d', '[PHONE_OR_NUMBER]', text)
    return text


def configuration():
    base = os.getenv('MODEL_BASE_URL', '').rstrip('/')
    model = os.getenv('MODEL_NAME', '')
    if not base or not model:
        raise ModelUnavailable('Set MODEL_BASE_URL and MODEL_NAME; no model is configured')
    parsed = urlparse(base)
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ModelUnavailable('Invalid model endpoint configuration')
    local = parsed.hostname in {'localhost', '127.0.0.1', 'host.docker.internal', 'ollama'}
    if parsed.scheme != 'https' and not (parsed.scheme == 'http' and local):
        raise ModelUnavailable('Use HTTPS for remote models or HTTP for an approved local endpoint')
    if not local and not os.getenv('MODEL_API_KEY'):
        raise ModelUnavailable('Remote model requires MODEL_API_KEY')
    return base, model


async def complete(system, payload, schema):
    base, model = configuration()
    content = redact(json.dumps(payload, ensure_ascii=False))
    if len(content) > 24000:
        raise ModelUnavailable('Input exceeds the local request budget')
    body = {'model': model, 'messages': [
        {'role': 'system', 'content': system + '\nReturn only a JSON object matching this schema: ' + json.dumps(schema)},
        {'role': 'user', 'content': content}], 'max_tokens': int(os.getenv('MODEL_MAX_OUTPUT_TOKENS', '1800'))}
    headers = {'Authorization': 'Bearer ' + os.getenv('MODEL_API_KEY', 'local')}
    try:
        async with httpx.AsyncClient(timeout=45, follow_redirects=False, trust_env=False) as client:
            response = await client.post(base + '/chat/completions', headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            raw = data['choices'][0]['message']['content'].strip()
            if raw.startswith('```'):
                raw = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw)
            return json.loads(raw), data.get('usage', {})
    except (httpx.HTTPError, ValueError, KeyError, IndexError, AttributeError) as error:
        raise ModelUnavailable('Model call failed or returned invalid JSON; no action was executed') from error
