"""
Lightweight local JSON "database" used as a fallback when Firebase
credentials are not configured. This lets the whole system run
end-to-end for demo/dev purposes with zero external setup.

Structure mirrors the Firestore collections:
  users, factories, production_lines, inspections, defects, reports

Swap-in note: every function here has a 1:1 Firestore equivalent.
See docs/DATABASE_SCHEMA.md for the full schema + Firestore version.
"""
import json
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

DB_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "local_data.json")
DB_FILE = os.path.abspath(DB_FILE)
_lock = threading.Lock()

DEFAULT_DATA = {
    "users": [],
    "factories": [],
    "production_lines": [],
    "inspections": [],
    "defects": [],
    "reports": [],
    "audit_logs": [],
    "manager_decisions": [],
}


def _load() -> Dict[str, List[Dict[str, Any]]]:
    if not os.path.exists(DB_FILE):
        _save(DEFAULT_DATA)
        return json.loads(json.dumps(DEFAULT_DATA))
    with open(DB_FILE, "r") as f:
        return json.load(f)


def _save(data: Dict[str, Any]) -> None:
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def insert(collection: str, doc: Dict[str, Any]) -> Dict[str, Any]:
    with _lock:
        data = _load()
        doc = dict(doc)
        doc.setdefault("id", new_id())
        doc.setdefault("created_at", now_iso())
        data.setdefault(collection, []).append(doc)
        _save(data)
        return doc


def find_all(collection: str, **filters) -> List[Dict[str, Any]]:
    with _lock:
        data = _load()
        items = data.get(collection, [])
        if not filters:
            return items
        result = []
        for item in items:
            if all(item.get(k) == v for k, v in filters.items()):
                result.append(item)
        return result


def find_one(collection: str, **filters) -> Optional[Dict[str, Any]]:
    items = find_all(collection, **filters)
    return items[0] if items else None


def find_by_id(collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
    return find_one(collection, id=doc_id)


def update(collection: str, doc_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    with _lock:
        data = _load()
        items = data.get(collection, [])
        for item in items:
            if item.get("id") == doc_id:
                item.update(updates)
                item["updated_at"] = now_iso()
                _save(data)
                return item
        return None


def delete(collection: str, doc_id: str) -> bool:
    with _lock:
        data = _load()
        items = data.get(collection, [])
        new_items = [i for i in items if i.get("id") != doc_id]
        changed = len(new_items) != len(items)
        data[collection] = new_items
        _save(data)
        return changed
