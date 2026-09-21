"""Local stdio MCP bridge. Calls the same authenticated API; exposes no arbitrary tools."""
import os
import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP('Limo Local AI Tools')


async def call(path, payload):
    key = os.getenv('DEMO_API_KEY')
    if not key:
        raise RuntimeError('Set DEMO_API_KEY for the local API')
    async with httpx.AsyncClient(timeout=210, follow_redirects=False, trust_env=False) as client:
        response = await client.post('http://127.0.0.1:8000' + path, json=payload, headers={'X-Demo-Key': key})
        response.raise_for_status()
        return response.json()


@mcp.tool()
async def search_approved_knowledge(question: str) -> dict:
    """Retrieve current local tenant knowledge with provenance. No external mutations."""
    return await call('/api/ai/retrieve', {'question': question})


@mcp.tool()
async def ask_limo_agent(role: str, question: str) -> dict:
    """Run a bounded role workflow; output is analysis, not an executed booking."""
    return await call('/api/ai/run', {'role': role, 'question': question})


@mcp.tool()
async def calculate_nonbinding_demo_quote(distance_km: float, wait_minutes: int = 0) -> dict:
    """Calculate the explicitly illustrative local tariff, not a live price."""
    return await call('/api/demo/quotes', {'distance_km': distance_km, 'wait_minutes': wait_minutes})


if __name__ == '__main__':
    mcp.run(transport='stdio')
