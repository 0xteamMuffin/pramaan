"""Entity-resolution graph: shell / related-party / cartel detection.

Builds a graph over ALL bidders in a tender (nodes: bidder, PAN, GSTIN, CIN, DIN,
address, email, phone, bank, submission IP; edges: has_pan/has_director/
shares_bank/same_ip/...). Deterministic graph queries flag:
  * cartel / related-party rings  (2+ bidders sharing DIN, bank, or submission IP)
  * shell companies               (recent CIN vs claimed experience; no EPFO/ESIC)

Persists EntityNode/EntityEdge idempotently and returns the CONTRACTS shape:
  {"nodes":[{id,type,value,label}], "edges":[{source,target,relation,weight}],
   "clusters":[{"bidder_ids":[...],"reason":"...","severity":"high"}], "shell":{...}}

Spec: docs/03-architecture/ai-verification-engine.md §3.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.compliance import rules
from app.models import Bid, EntityEdge, EntityNode

# Relations that, when shared by 2+ "competing" bidders, indicate collusion.
# Weak relations (address/email/phone) only enrich a cluster's reason string.
_STRONG_RELATIONS = {"has_director", "shares_bank", "same_ip"}


def _current_year() -> int:
    return datetime.now(timezone.utc).year


# --------------------------------------------------------------------------- #
# Attribute extraction
# --------------------------------------------------------------------------- #
def _bidder_attrs(bidder: Any, bid: Any) -> dict[str, Any]:
    """Collect graph-relevant attributes for one bidder/bid."""
    idents: dict[str, str] = {}
    dins: list[str] = []
    for ident in getattr(bidder, "identifiers", None) or []:
        kind = str(getattr(ident, "kind", "")).lower()
        val = getattr(ident, "value", None)
        if not val:
            continue
        if kind == "din":
            dins.append(str(val).strip().upper())
        else:
            idents[kind] = str(val).strip().upper()

    contact = dict(getattr(bidder, "contact", None) or {})
    submission = dict(getattr(bid, "submission_meta", None) or {})
    has_labour = bool(idents.get("epfo") or idents.get("esic"))

    return {
        "bidder_id": getattr(bidder, "id", None),
        "name": getattr(bidder, "legal_name", None),
        "pan": idents.get("pan") or getattr(bidder, "primary_pan", None),
        "gstin": idents.get("gstin"),
        "cin": idents.get("cin"),
        "dins": dins,
        "address": (contact.get("address") or "").strip().lower() or None,
        "email": (contact.get("email") or "").strip().lower() or None,
        "phone": str(contact.get("phone") or "").strip() or None,
        "bank": str(contact.get("bank") or contact.get("bank_account") or "").strip() or None,
        "ip": str(submission.get("ip") or contact.get("ip") or "").strip() or None,
        "has_labour": has_labour,
        "claimed_experience": _claimed_experience(bidder),
    }


def _claimed_experience(bidder: Any) -> float | None:
    flags = dict(getattr(bidder, "claimed_flags", None) or {})
    val = rules.first(flags, "experience_years", "experience", "years_experience", "vintage_years")
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None


# --------------------------------------------------------------------------- #
# Persistence helpers (idempotent)
# --------------------------------------------------------------------------- #
def _get_or_create_node(
    db: Session, cache: dict[tuple[str, str], EntityNode], type_: str, value: str, label: str | None
) -> EntityNode:
    key = (type_, value)
    if key in cache:
        return cache[key]
    node = db.execute(
        select(EntityNode).where(EntityNode.type == type_, EntityNode.value == value)
    ).scalar_one_or_none()
    if node is None:
        node = EntityNode(type=type_, value=value, label=label)
        db.add(node)
        db.flush()
    cache[key] = node
    return node


def _get_or_create_edge(
    db: Session,
    cache: dict[tuple[str, str, str], EntityEdge],
    src: EntityNode,
    dst: EntityNode,
    relation: str,
) -> EntityEdge:
    key = (src.id, dst.id, relation)
    if key in cache:
        return cache[key]
    edge = db.execute(
        select(EntityEdge).where(
            EntityEdge.src_id == src.id,
            EntityEdge.dst_id == dst.id,
            EntityEdge.relation == relation,
        )
    ).scalar_one_or_none()
    if edge is None:
        edge = EntityEdge(src_id=src.id, dst_id=dst.id, relation=relation, weight=1.0, run_ids=[])
        db.add(edge)
        db.flush()
    cache[key] = edge
    return edge


# --------------------------------------------------------------------------- #
# Cluster + shell detectors (pure, in-memory)
# --------------------------------------------------------------------------- #
def detect_clusters(attrs_list: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return cartel/related-party clusters (2+ bidders sharing DIN/bank/IP/...)."""
    # (relation, value) -> set(bidder_id)
    shared: dict[tuple[str, str], set[str]] = {}

    def add(relation: str, value: str | None, bidder_id: str) -> None:
        if not value or not bidder_id:
            return
        shared.setdefault((relation, value), set()).add(bidder_id)

    for a in attrs_list:
        bid_id = a["bidder_id"]
        for din in a["dins"]:
            add("has_director", din, bid_id)
        add("shares_bank", a["bank"], bid_id)
        add("same_ip", a["ip"], bid_id)
        add("shares_address", a["address"], bid_id)
        add("shares_email", a["email"], bid_id)
        add("shares_phone", a["phone"], bid_id)

    # union-find over bidders linked by STRONG relations
    parent: dict[str, str] = {a["bidder_id"]: a["bidder_id"] for a in attrs_list if a["bidder_id"]}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: str, y: str) -> None:
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    link_reasons: dict[frozenset[str], set[str]] = {}
    for (relation, value), members in shared.items():
        if len(members) < 2:
            continue
        member_list = sorted(members)
        if relation in _STRONG_RELATIONS:
            for other in member_list[1:]:
                union(member_list[0], other)
        # record reason at pairwise granularity for the eventual cluster
        key = frozenset(member_list)
        link_reasons.setdefault(key, set()).add(f"{relation}={value}")

    # collect components
    components: dict[str, set[str]] = {}
    for bidder_id in parent:
        components.setdefault(find(bidder_id), set()).add(bidder_id)

    clusters: list[dict[str, Any]] = []
    for members in components.values():
        if len(members) < 2:
            continue
        member_set = set(members)
        reasons: set[str] = set()
        strong_types: set[str] = set()
        for key, rs in link_reasons.items():
            if key & member_set and len(key & member_set) >= 2:
                for r in rs:
                    reasons.add(r)
                    rel = r.split("=", 1)[0]
                    if rel in _STRONG_RELATIONS:
                        strong_types.add(rel)
        if not strong_types:
            continue
        severity = "high" if len(strong_types) >= 2 else "medium"
        # summarize the relation types (not raw values) for readability
        rel_types = sorted({r.split("=", 1)[0] for r in reasons})
        clusters.append(
            {
                "bidder_ids": sorted(member_set),
                "reason": "shared " + "+".join(t.replace("shares_", "").replace("has_", "") for t in rel_types),
                "shared": sorted(reasons),
                "severity": severity,
            }
        )
    clusters.sort(key=lambda c: c["bidder_ids"])
    return clusters


def detect_shell(attrs_list: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Per-bidder shell signals: recent CIN vs claimed experience; no EPFO/ESIC."""
    out: dict[str, dict[str, Any]] = {}
    year = _current_year()
    for a in attrs_list:
        signals: list[str] = []
        cin_year = rules.year_from_cin(a["cin"])
        age = (year - cin_year) if cin_year else None
        claimed = a["claimed_experience"]
        vintage_conflict = bool(cin_year and claimed and age is not None and age < claimed)
        if vintage_conflict:
            signals.append(
                f"CIN incorporated {cin_year} (~{age}y) but {claimed:g}y experience claimed"
            )
        no_labour = not a["has_labour"]
        if no_labour:
            signals.append("no EPFO/ESIC footprint")
        is_shell = vintage_conflict and no_labour
        out[a["bidder_id"]] = {
            "cin_year": cin_year,
            "age_years": age,
            "claimed_experience": claimed,
            "vintage_conflict": vintage_conflict,
            "no_labour_footprint": no_labour,
            "is_shell": is_shell,
            "signals": signals,
        }
    return out


# --------------------------------------------------------------------------- #
# Public builder
# --------------------------------------------------------------------------- #
def build_graph(db: Session, tender_id: str) -> dict[str, Any]:
    """Build + persist the tender graph and return nodes/edges/clusters/shell."""
    bids = db.execute(select(Bid).where(Bid.tender_id == tender_id)).scalars().all()

    attrs_list: list[dict[str, Any]] = []
    node_cache: dict[tuple[str, str], EntityNode] = {}
    edge_cache: dict[tuple[str, str, str], EntityEdge] = {}
    touched_nodes: dict[str, EntityNode] = {}
    touched_edges: list[EntityEdge] = []

    for bid in bids:
        bidder = getattr(bid, "bidder", None)
        if bidder is None:
            continue
        attrs = _bidder_attrs(bidder, bid)
        attrs_list.append(attrs)

        bidder_node = _get_or_create_node(
            db, node_cache, "bidder", str(attrs["bidder_id"]), attrs["name"]
        )
        touched_nodes[bidder_node.id] = bidder_node

        edge_specs: list[tuple[str, str, str]] = []
        if attrs["pan"]:
            edge_specs.append(("pan", attrs["pan"], "has_pan"))
        if attrs["gstin"]:
            edge_specs.append(("gstin", attrs["gstin"], "has_gstin"))
        if attrs["cin"]:
            edge_specs.append(("cin", attrs["cin"], "has_cin"))
        for din in attrs["dins"]:
            edge_specs.append(("din", din, "has_director"))
        if attrs["address"]:
            edge_specs.append(("address", attrs["address"], "shares_address"))
        if attrs["email"]:
            edge_specs.append(("email", attrs["email"], "shares_email"))
        if attrs["phone"]:
            edge_specs.append(("phone", attrs["phone"], "shares_phone"))
        if attrs["bank"]:
            edge_specs.append(("bank", attrs["bank"], "shares_bank"))
        if attrs["ip"]:
            edge_specs.append(("ip", attrs["ip"], "same_ip"))

        for node_type, value, relation in edge_specs:
            attr_node = _get_or_create_node(db, node_cache, node_type, value, None)
            touched_nodes[attr_node.id] = attr_node
            edge = _get_or_create_edge(db, edge_cache, bidder_node, attr_node, relation)
            touched_edges.append(edge)

    db.flush()

    clusters = detect_clusters(attrs_list)
    shell = detect_shell(attrs_list)

    nodes = [
        {"id": n.id, "type": n.type, "value": n.value, "label": n.label}
        for n in touched_nodes.values()
    ]
    edges = [
        {"source": e.src_id, "target": e.dst_id, "relation": e.relation, "weight": e.weight}
        for e in touched_edges
    ]

    return {"nodes": nodes, "edges": edges, "clusters": clusters, "shell": shell}
