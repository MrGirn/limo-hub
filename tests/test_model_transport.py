"""HTTP adapter integration test using a local fixture, not live-model validation."""
import json
import os
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch
from app.model_client import complete


class ModelTransportTests(unittest.IsolatedAsyncioTestCase):
    async def test_real_http_adapter_and_redaction(self):
        requests = []
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass
            def do_POST(self):
                requests.append(json.loads(self.rfile.read(int(self.headers['Content-Length']))))
                payload = json.dumps({'choices': [{'message': {'content': '{"supported": true, "issues": []}'}}], 'usage': {'total_tokens': 10}}).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with patch.dict(os.environ, {'MODEL_BASE_URL': f'http://127.0.0.1:{server.server_port}/v1', 'MODEL_NAME': 'fixture-only'}):
                result, usage = await complete('Return JSON', {'contact': 'person@example.com'}, {'type': 'object'})
            self.assertTrue(result['supported'])
            self.assertEqual(usage['total_tokens'], 10)
            self.assertNotIn('person@example.com', json.dumps(requests))
        finally:
            server.shutdown()
            server.server_close()
            thread.join()
