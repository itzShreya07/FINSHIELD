"""Fraud Network Graph router — builds node/edge graph of suspicious transaction chains."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Transaction, Account

router = APIRouter(prefix="/api/network", tags=["network"])


@router.get("/graph")
def fraud_network_graph(db: Session = Depends(get_db)):
    """
    Returns nodes (accounts) and edges (transactions) for the fraud network graph.
    Only includes accounts and transactions with risk_score >= 0.4.
    """
    suspicious_txns = db.query(Transaction).filter(Transaction.risk_score >= 0.40).all()

    # Collect all involved account IDs
    account_ids = set()
    for t in suspicious_txns:
        account_ids.add(t.sender_account_id)
        account_ids.add(t.receiver_account_id)

    accounts = db.query(Account).filter(Account.id.in_(account_ids)).all()
    acc_map = {a.id: a for a in accounts}

    # Compute per-account total risk and transaction count
    acc_stats = {aid: {"total_amount": 0.0, "txn_count": 0, "max_risk": 0.0} for aid in account_ids}
    for t in suspicious_txns:
        for aid in [t.sender_account_id, t.receiver_account_id]:
            acc_stats[aid]["total_amount"] += t.amount
            acc_stats[aid]["txn_count"] += 1
            acc_stats[aid]["max_risk"] = max(acc_stats[aid]["max_risk"], t.risk_score)

    nodes = []
    for aid in account_ids:
        acc = acc_map.get(aid)
        if not acc:
            continue
        stats = acc_stats[aid]
        risk = stats["max_risk"]
        group = "critical" if risk >= 0.90 else "high" if risk >= 0.75 else "medium"
        nodes.append({
            "id": aid,
            "label": acc.account_number,
            "owner": acc.owner_name,
            "total_amount": round(stats["total_amount"], 2),
            "txn_count": stats["txn_count"],
            "max_risk_score": round(risk, 2),
            "is_flagged": acc.is_flagged,
            "group": group,
        })

    edges = []
    for t in suspicious_txns:
        edges.append({
            "id": t.id,
            "source": t.sender_account_id,
            "target": t.receiver_account_id,
            "transaction_id": t.transaction_id,
            "amount": t.amount,
            "risk_score": t.risk_score,
            "status": t.status,
            "label": f"₹{t.amount:,.0f}",
        })

    return {"nodes": nodes, "edges": edges}


@router.get("/clusters")
def fraud_clusters(db: Session = Depends(get_db)):
    """Identifies clusters of accounts with high mutual suspicious transaction volume."""
    suspicious_txns = db.query(Transaction).filter(Transaction.status == "suspicious").all()

    # Simple component detection: group by shared accounts
    adj = {}
    for t in suspicious_txns:
        s, r = t.sender_account_id, t.receiver_account_id
        adj.setdefault(s, set()).add(r)
        adj.setdefault(r, set()).add(s)

    visited = set()
    clusters = []

    def bfs(start):
        q, component = [start], set()
        while q:
            node = q.pop()
            if node in visited:
                continue
            visited.add(node)
            component.add(node)
            q.extend(adj.get(node, set()) - visited)
        return component

    for node in adj:
        if node not in visited:
            comp = bfs(node)
            if len(comp) >= 2:
                clusters.append(list(comp))

    result = []
    acc_map = {a.id: a for a in db.query(Account).all()}
    for i, cluster in enumerate(clusters[:10]):
        members = [
            {
                "account_id": aid,
                "account_number": acc_map[aid].account_number if aid in acc_map else aid,
                "owner_name": acc_map[aid].owner_name if aid in acc_map else "Unknown",
            }
            for aid in cluster
        ]
        result.append({"cluster_id": i + 1, "size": len(cluster), "members": members})

    return result
