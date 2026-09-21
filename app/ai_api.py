import asyncio
import os
from fastapi import APIRouter, HTTPException
from app import knowledge
from app.agents import run_agent, ROLE_INSTRUCTIONS
from app.ai_models import AgentRequest, DocumentRequest, EdgeRequest, EvaluationRequest
from app.model_client import ModelUnavailable

router = APIRouter(prefix='/api/ai', tags=['Working AI services'])
semaphore = asyncio.Semaphore(2)


def tenant():
    # Single-tenant local installation. Never taken from model output/request body.
    return os.getenv('LOCAL_TENANT_ID', 'local-vendor')


@router.get('/capabilities')
def capabilities():
    return {'roles': list(ROLE_INSTRUCTIONS), 'model_configured': bool(os.getenv('MODEL_BASE_URL') and os.getenv('MODEL_NAME')), 'retrieval': 'SQLite FTS plus curated graph expansion', 'agent_runtime': 'LangGraph', 'external_business_mutations': False, 'tenant_mode': 'single local tenant', 'max_model_calls_per_run': 4}


@router.post('/documents', status_code=201)
def add_document(request: DocumentRequest):
    try:
        return {'document_id': knowledge.add_document(tenant(), **request.model_dump())}
    except ValueError as error:
        raise HTTPException(422, str(error)) from error


@router.get('/documents')
def documents():
    return knowledge.list_documents(tenant())


@router.delete('/documents/{identifier}')
def delete(identifier: str):
    if not knowledge.delete_document(tenant(), identifier):
        raise HTTPException(404, 'Document not found')
    return {'deleted': True, 'derived_chunks_and_edges_deleted': True}


@router.post('/graph/edges', status_code=201)
def edge(request: EdgeRequest):
    try:
        knowledge.add_edge(tenant(), **request.model_dump())
        return {'created': True, 'provenance': request.document_id}
    except ValueError as error:
        raise HTTPException(422, str(error)) from error


@router.post('/retrieve')
def search(request: AgentRequest):
    return {'sources': knowledge.retrieve(tenant(), request.question, request.graph_enabled)}


@router.post('/run')
async def run(request: AgentRequest):
    async with semaphore:
        try:
            return await run_agent(tenant(), request)
        except ModelUnavailable as error:
            raise HTTPException(503, str(error)) from error
        except TimeoutError as error:
            raise HTTPException(504, 'AI workflow deadline reached; no action executed') from error
        except RuntimeError as error:
            raise HTTPException(429, 'AI execution budget or runtime limit reached') from error
        except ValueError as error:
            raise HTTPException(502, 'Model response failed schema validation; no action executed') from error


@router.get('/runs')
def history():
    return knowledge.runs(tenant())


@router.post('/evaluate')
async def evaluate(request: EvaluationRequest):
    results = []
    for case in request.cases:
        try:
            result = await run(case.request)
            actual_ids = {c['document_id'] for c in result['result']['citations']}
            passed = result['result']['status'] == case.expected_status and set(case.expected_document_ids).issubset(actual_ids)
            results.append({'passed': passed, 'run_id': result['run_id'], 'actual_status': result['result']['status']})
        except HTTPException as error:
            results.append({'passed': False, 'http_status': error.status_code, 'error': error.detail})
    return {'passed': sum(r['passed'] for r in results), 'total': len(results), 'cases': results, 'scope': 'Status and expected-citation regression checks; not proof of factual correctness or operational safety'}
