import os
import tempfile
import unittest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app import knowledge
from app.main import app
from app.ai_models import AgentRequest
from app.agents import run_agent
from app.model_client import configuration, ModelUnavailable


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'AI_DB_PATH': self.temp.name + '/test.sqlite3', 'AI_DAILY_CALL_LIMIT': '4'})
        self.env.start()
        knowledge.initialise()

    def tearDown(self):
        self.env.stop()
        self.temp.cleanup()

    def test_tenant_and_validity(self):
        knowledge.add_document('a', 'Airport', 'Airport waiting allowance is thirty minutes.')
        knowledge.add_document('a', 'Old', 'Airport old waiting policy.', valid_until='2020-01-01T00:00:00Z')
        knowledge.add_document('b', 'Secret', 'Airport confidential competitor policy.')
        result = knowledge.retrieve('a', 'airport', False)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['title'], 'Airport')

    def test_graph_provenance_delete(self):
        identifier = knowledge.add_document('a', 'Meeting', 'Meet at the designated arrivals desk.')
        knowledge.add_edge('a', 'Vienna', 'meeting procedure', 'airport', identifier)
        self.assertEqual(knowledge.retrieve('a', 'Vienna')[0]['retrieval'], 'graph')
        self.assertEqual(knowledge.retrieve('b', 'Vienna'), [])
        knowledge.delete_document('a', identifier)
        self.assertEqual(knowledge.retrieve('a', 'Vienna'), [])

    def test_budget_enforced(self):
        knowledge.reserve_calls('a', 4)
        with self.assertRaises(RuntimeError):
            knowledge.reserve_calls('a', 1)
        knowledge.reserve_calls('b', 1)

    def test_invalid_graph_source(self):
        with self.assertRaises(ValueError):
            knowledge.add_edge('a', 'airport', 'policy', 'waiting', 'missing')

    def test_naive_validity_rejected(self):
        with self.assertRaises(ValueError):
            knowledge.add_document('a', 'Bad date', 'Enough policy text.', valid_from='2026-01-01')


class ApiTests(unittest.TestCase):
    def test_api_auth_validation_and_missing_model(self):
        with tempfile.TemporaryDirectory() as temp:
            with patch.dict(os.environ, {'AI_DB_PATH': temp+'/db', 'DEMO_API_KEY': 'test-key', 'MODEL_BASE_URL': '', 'MODEL_NAME': ''}):
                with TestClient(app) as client:
                    self.assertEqual(client.get('/health').status_code, 200)
                    self.assertEqual(client.get('/api/ai/documents').status_code, 401)
                    headers = {'X-Demo-Key': 'test-key'}
                    self.assertEqual(client.post('/api/demo/quotes', json={'distance_km': -1}, headers=headers).status_code, 422)
                    quote = client.post('/api/demo/quotes', json={'distance_km': 60, 'wait_minutes': 40}, headers=headers).json()
                    self.assertEqual(quote['total'], '175.00')
                    result = client.post('/api/ai/run', json={'question': 'What is the waiting policy?'}, headers=headers)
                    self.assertEqual(result.status_code, 503)
                    self.assertEqual(len(client.get('/api/ai/runs', headers=headers).json()), 1)

    def test_remote_plain_http_rejected(self):
        with patch.dict(os.environ, {'MODEL_BASE_URL': 'http://example.com/v1', 'MODEL_NAME': 'test'}):
            with self.assertRaises(ModelUnavailable):
                configuration()


class AgentTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'AI_DB_PATH': self.temp.name+'/db', 'MODEL_BASE_URL': 'http://localhost:11434/v1', 'MODEL_NAME': 'test-fixture', 'AI_DAILY_CALL_LIMIT': '100'})
        self.env.start()
        knowledge.initialise()

    def tearDown(self):
        self.env.stop()
        self.temp.cleanup()

    async def test_grounded_answer(self):
        identifier = knowledge.add_document('a', 'Waiting', 'Airport waiting allowance is thirty minutes.')
        output = {'status': 'answered', 'answer': 'The allowance is thirty minutes.', 'citations': [{'document_id': identifier, 'excerpt': 'Airport waiting allowance is thirty minutes.'}]}
        mocked = AsyncMock(side_effect=[(output, {'total_tokens': 100}), ({'supported': True, 'issues': []}, {'total_tokens': 50})])
        with patch('app.model_client.complete', mocked):
            result = await run_agent('a', AgentRequest(question='Airport waiting allowance?'))
        self.assertEqual(result['result']['status'], 'answered')
        self.assertEqual(result['model_calls'], 2)
        self.assertEqual(result['actions_executed'], [])
        self.assertEqual(knowledge.runs('a')[0]['model_calls'], 2)

    async def test_fabricated_citation_abstains(self):
        knowledge.add_document('a', 'Waiting', 'Airport waiting allowance is thirty minutes.')
        output = {'status': 'answered', 'answer': 'Free waiting forever.', 'citations': [{'document_id': 'invented', 'excerpt': 'Free waiting forever.'}]}
        mocked = AsyncMock(return_value=(output, {}))
        with patch('app.model_client.complete', mocked):
            result = await run_agent('a', AgentRequest(question='Airport waiting?'))
        self.assertEqual(result['result']['status'], 'unable_to_determine')
        self.assertEqual(mocked.await_count, 2)

    async def test_missing_evidence_does_not_call_model(self):
        mocked = AsyncMock()
        with patch('app.model_client.complete', mocked):
            result = await run_agent('a', AgentRequest(question='Airport waiting?'))
        self.assertEqual(result['result']['status'], 'needs_information')
        mocked.assert_not_awaited()

    async def test_critic_rejects_unsupported_answer(self):
        identifier = knowledge.add_document('a', 'Waiting', 'Airport waiting allowance is thirty minutes.')
        output = {'status': 'answered', 'answer': 'Your driver has been assigned.', 'citations': [{'document_id': identifier, 'excerpt': 'Airport waiting allowance is thirty minutes.'}]}
        rejected = {'supported': False, 'issues': ['No evidence of assignment']}
        mocked = AsyncMock(side_effect=[(output, {}), (rejected, {}), (output, {}), (rejected, {})])
        with patch('app.model_client.complete', mocked):
            result = await run_agent('a', AgentRequest(question='Airport waiting?'))
        self.assertEqual(result['result']['status'], 'unable_to_determine')
        self.assertEqual(result['model_calls'], 4)
