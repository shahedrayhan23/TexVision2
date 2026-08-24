"""
Production dashboard & analytics routes.
Aggregates inspection/defect data into statistics, trends and alerts.
Includes workflow status overview for managers.
"""
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import DashboardStats, InspectionStatus
from app.utils import local_db, security

router = APIRouter(prefix="/api", tags=["Dashboard & Reports"])


@router.get("/statistics", response_model=DashboardStats)
def get_statistics(
    user: dict = Depends(security.require_roles("manager", "admin")),
):
    inspections = local_db.find_all("inspections")
    total_inspected = len(inspections)
    total_defects = sum(len(i.get("defects", [])) for i in inspections)
    defective_fabrics = sum(1 for i in inspections if not i.get("defect_free", True))

    defect_percentage = round((defective_fabrics / total_inspected) * 100, 2) if total_inspected else 0.0
    production_efficiency = round(100 - defect_percentage, 2)
    estimated_waste_percentage = round(defect_percentage * 0.6, 2)  # heuristic: not all defects -> full waste

    breakdown = defaultdict(int)
    for i in inspections:
        for d in i.get("defects", []):
            breakdown[d["defect_type"]] += 1

    # 7-day trend
    trend = []
    today = datetime.now(timezone.utc).date()
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        day_inspections = [
            i for i in inspections
            if i.get("created_at", "")[:10] == day.isoformat()
        ]
        day_defects = sum(len(i.get("defects", [])) for i in day_inspections)
        trend.append({
            "date": day.isoformat(),
            "inspected": len(day_inspections),
            "defects": day_defects,
        })

    alerts = []
    if len(trend) >= 2 and trend[-2]["defects"] > 0:
        change = ((trend[-1]["defects"] - trend[-2]["defects"]) / max(trend[-2]["defects"], 1)) * 100
        if change >= 20:
            alerts.append(f"Defect rate increased {round(change)}% compared to yesterday.")
        elif change <= -20:
            alerts.append(f"Defect rate decreased {abs(round(change))}% compared to yesterday. Great progress!")

    if breakdown:
        most_common = max(breakdown.items(), key=lambda kv: kv[1])
        alerts.append(f"Most frequent defect: {most_common[0]} ({most_common[1]} occurrences).")

    if defect_percentage > 15:
        alerts.append(f"Overall defect rate ({defect_percentage}%) exceeds recommended QC threshold of 15%.")

    return DashboardStats(
        total_inspected=total_inspected,
        total_defects=total_defects,
        defect_percentage=defect_percentage,
        production_efficiency=production_efficiency,
        estimated_waste_percentage=estimated_waste_percentage,
        defect_breakdown=dict(breakdown),
        trend_last_7_days=trend,
        alerts=alerts,
    )


@router.get("/reports")
def get_reports(user: dict = Depends(security.require_roles("manager", "admin"))):
    reports = local_db.find_all("reports")
    return {"count": len(reports), "reports": reports}


@router.post("/reports/generate")
def generate_report(user: dict = Depends(security.require_roles("manager", "admin"))):
    """Generates and stores a snapshot report from current stats."""
    stats = get_statistics(user=user)
    report = local_db.insert("reports", {
        "generated_by": user["id"],
        "summary": stats.model_dump(),
    })
    return report


@router.get("/workflow-status")
def get_workflow_status(
    user: dict = Depends(security.require_roles("manager", "admin")),
):
    """Get overview of inspection workflow statuses."""
    inspections = local_db.find_all("inspections")

    # Count by status
    status_counts = defaultdict(int)
    for inspection in inspections:
        status = inspection.get("status", InspectionStatus.draft.value)
        status_counts[status] += 1

    # Calculate statistics by role
    pending_manager_review = [
        i for i in inspections
        if i.get("status") == InspectionStatus.pending_manager_review.value
    ]
    
    rework_required = [
        i for i in inspections
        if i.get("status") == InspectionStatus.rework_required.value
    ]
    
    reinspection_required = [
        i for i in inspections
        if i.get("status") == InspectionStatus.reinspection_required.value
    ]

    approved = [
        i for i in inspections
        if i.get("status") == InspectionStatus.approved_for_production.value
    ]

    rejected = [
        i for i in inspections
        if i.get("status") == InspectionStatus.rejected.value
    ]

    return {
        "total_inspections": len(inspections),
        "by_status": dict(status_counts),
        "summary": {
            "pending_manager_review": len(pending_manager_review),
            "rework_required": len(rework_required),
            "reinspection_required": len(reinspection_required),
            "approved_for_production": len(approved),
            "rejected": len(rejected),
        },
        "recent_pending": sorted(
            pending_manager_review,
            key=lambda x: x.get("created_at", ""),
            reverse=True
        )[:5],
    }
