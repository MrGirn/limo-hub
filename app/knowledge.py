"""Local SQLite knowledge store: scoped FTS retrieval and provenance-backed graph expansion."""
import json
import os
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


def now():
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def database():
    path = Path(os.getenv('AI_DB_PATH', 'data/ai.sqlite3'))
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=15)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialise():
    with database() as db:
        db.executescript('''
        CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY, tenant TEXT, title TEXT, text TEXT, valid_from TEXT, valid_until TEXT, created_at TEXT);
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5(document_id UNINDEXED, tenant UNINDEXED, text);
        CREATE TABLE IF NOT EXISTS edges(tenant TEXT, source TEXT, relation TEXT, target TEXT, document_id TEXT);
        CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, tenant TEXT, role TEXT, status TEXT, duration_ms INTEGER, model_calls INTEGER, usage TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS budgets(tenant TEXT, day TEXT, calls INTEGER, PRIMARY KEY(tenant,day));
        ''')


def reserve_calls(tenant, count):
    limit = int(os.getenv('AI_DAILY_CALL_LIMIT', '100'))
    day = now()[:10]
    with database() as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT calls FROM budgets WHERE tenant=? AND day=?', (tenant, day)).fetchone()
        used = row['calls'] if row else 0
        if used + count > limit:
            raise RuntimeError('Daily model-call budget exhausted')
        db.execute('INSERT INTO budgets VALUES(?,?,?) ON CONFLICT(tenant,day) DO UPDATE SET calls=excluded.calls', (tenant, day, used + count))


def add_document(tenant, title, text, valid_from=None, valid_until=None):
    identifier = str(uuid4())
    def parse(value):
        if value is None:
            return None
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            raise ValueError('Validity timestamps require an explicit UTC offset')
        return parsed.astimezone(timezone.utc).isoformat()
    start, end = parse(valid_from), parse(valid_until)
    if start and end and start >= end:
        raise ValueError('valid_until must follow valid_from')
    with database() as db:
        db.execute('INSERT INTO documents VALUES(?,?,?,?,?,?,?)', (identifier, tenant, title, text, start, end, now()))
        # Overlap preserves short statements at chunk boundaries.
        for offset in range(0, len(text), 1000):
            db.execute('INSERT INTO chunks VALUES(?,?,?)', (identifier, tenant, text[offset:offset+1300]))
    return identifier


def list_documents(tenant):
    with database() as db:
        return [dict(r) for r in db.execute('SELECT id,title,valid_from,valid_until,created_at FROM documents WHERE tenant=? ORDER BY created_at DESC', (tenant,))]


def delete_document(tenant, identifier):
    with database() as db:
        db.execute('DELETE FROM chunks WHERE tenant=? AND document_id=?', (tenant, identifier))
        db.execute('DELETE FROM edges WHERE tenant=? AND document_id=?', (tenant, identifier))
        return db.execute('DELETE FROM documents WHERE tenant=? AND id=?', (tenant, identifier)).rowcount


def add_edge(tenant, source, relation, target, document_id):
    with database() as db:
        if not db.execute('SELECT 1 FROM documents WHERE id=? AND tenant=?', (document_id, tenant)).fetchone():
            raise ValueError('Source document not found')
        db.execute('INSERT INTO edges VALUES(?,?,?,?,?)', (tenant, source, relation, target, document_id))


def retrieve(tenant, query, graph_enabled=True, limit=5):
    words = list(dict.fromkeys(re.findall(r'[^\W_]+', query.lower(), re.UNICODE)))[:30]
    if not words:
        return []
    expression = ' OR '.join('"' + w + '"' for w in words)
    current = now()
    with database() as db:
        rows = db.execute('''SELECT chunks.document_id, documents.title, chunks.text, bm25(chunks) AS rank
            FROM chunks JOIN documents ON documents.id=chunks.document_id
            WHERE chunks MATCH ? AND chunks.tenant=? AND documents.tenant=?
            AND (valid_from IS NULL OR valid_from<=?) AND (valid_until IS NULL OR valid_until>?)
            ORDER BY rank LIMIT ?''', (expression, tenant, tenant, current, current, limit)).fetchall()
        result = [dict(r, retrieval='lexical') for r in rows]
        if graph_enabled:
            # One-hop expansion through explicitly curated graph edges; not inferred eligibility.
            edges = db.execute('''SELECT edges.*,documents.title,documents.text FROM edges JOIN documents ON documents.id=edges.document_id
                WHERE edges.tenant=? AND documents.tenant=?
                AND (valid_from IS NULL OR valid_from<=?) AND (valid_until IS NULL OR valid_until>?) LIMIT 1000''', (tenant, tenant, current, current)).fetchall()
            ids = {r['document_id'] for r in result}
            for edge in edges:
                if edge['document_id'] not in ids and any(w in (edge['source'] + ' ' + edge['target']).lower().split() for w in words):
                    result.append({'document_id': edge['document_id'], 'title': edge['title'], 'text': edge['text'][:2000], 'retrieval': 'graph', 'relationship': f"{edge['source']} / {edge['relation']} / {edge['target']}"})
                    ids.add(edge['document_id'])
                if len(result) >= limit + 3:
                    break
        return result


def record_run(tenant, run_id, role, status, duration_ms, calls, usage):
    # Deliberately omit prompt, passenger data, answers and chain-of-thought.
    with database() as db:
        db.execute('INSERT INTO runs VALUES(?,?,?,?,?,?,?,?)', (run_id, tenant, role, status, duration_ms, calls, json.dumps(usage), now()))


def runs(tenant):
    with database() as db:
        return [dict(r) for r in db.execute('SELECT * FROM runs WHERE tenant=? ORDER BY created_at DESC LIMIT 100', (tenant,))]
