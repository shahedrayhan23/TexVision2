"""
Fabric inspection routes: upload/capture image -> AI defect prediction,
inspection workflow, manager decision, reinspection, and audit trail.
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import Optional, List

from app.ai.defect_model import full_image_analysis
from app.ai.authenticity_check import analyze_authenticity
from app.models.schemas import (
    PredictionResponse, InspectionResponse, InspectionStatus, AIRecommendation,
    ManagerDecisionRequest, ManagerDecisionResponse, ManagerDecision,
    ReinspectionRequest, ReinspectionResponse, AuditLogEntry, AIAnalysisData
)
from app.utils import local_db, security, storage

router = APIRouter(prefix="/api", tags=["Fabric Inspection"])


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(security.get_current_user),
):
    """Uploads a raw fabric image and returns its stored URL (no AI analysis)."""
    contents = await file.read()
    url = storage.save_image(contents, filename_hint=file.filename or "fabric.jpg")
    return {"image_url": url}


@router.post("/predict-defect", response_model=PredictionResponse)
async def predict_defect(
    file: UploadFile = File(...),
    production_line_id: Optional[str] = Form(None),
    user: dict = Depends(security.require_roles("inspector", "manager", "admin")),
):
    """
    Core AI endpoint: accepts a fabric image, runs defect detection,
    stores the image + inspection record, and returns structured results.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    try:
        analysis = full_image_analysis(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    detections = analysis["detections"]
    severity = analysis["overall_severity"]
    defect_free = len(detections) == 0

    # Calculate AI recommendation based on severity and defects
    if defect_free:
        recommendation = AIRecommendation.approve
        explanation = "Fabric passed inspection with no defects detected."
    elif severity.value == "critical":
        recommendation = AIRecommendation.reject
        explanation = "Critical defects detected. Fabric should be rejected."
    elif severity.value == "high":
        recommendation = AIRecommendation.rework
        explanation = "High severity defects detected. Rework is recommended."
    else:
        recommendation = AIRecommendation.approve
        explanation = "Minor defects detected but within acceptable tolerances."

    # Calculate affected area percentage from bounding boxes
    affected_area = 0.0
    if detections:
        total_bbox_area = sum(
            (d.bbox[2] - d.bbox[0]) * (d.bbox[3] - d.bbox[1]) 
            for d in detections if d.bbox
        )
        affected_area = round(total_bbox_area * 100, 2)

    # Calculate average confidence
    avg_confidence = (
        round(sum(d.confidence for d in detections) / len(detections), 3)
        if detections else 1.0
    )

    # Analyze authenticity
    image_status = analyze_authenticity(contents)

    # Save image
    image_url = storage.save_image(contents, filename_hint=file.filename or "fabric.jpg")

    # Create inspection with workflow status
    inspection = local_db.insert("inspections", {
        "inspector_id": user["id"],
        "inspector_name": user.get("name", "Unknown"),
        "production_line_id": production_line_id,
        "status": InspectionStatus.inspector_review.value,
        "image_url": image_url,
        "image_status": image_status,
        "defects": [d.model_dump() for d in detections],
        "overall_severity": severity.value,
        "defect_free": defect_free,
        "dominant_colors": analysis["dominant_colors"],
        "fabric_pattern": analysis["fabric_pattern"],
        "quality": analysis["quality"],
        "recommendations": analysis["recommendations"],
        "ai_recommendation": recommendation.value,
        "ai_explanation": explanation,
        "affected_area": affected_area,
        "avg_confidence": avg_confidence,
        "parent_inspection_id": None,
    })

    # Add audit log
    _add_audit_log(
        inspection["id"],
        "Image uploaded and AI analysis completed",
        user["id"],
        user.get("name", "Unknown"),
        user.get("role", "inspector"),
        f"Detected {len(detections)} defect(s) with {recommendation.value} recommendation"
    )

    # Store defect records separately for analytics
    for d in detections:
        local_db.insert("defects", {
            "inspection_id": inspection["id"],
            "production_line_id": production_line_id,
            "defect_type": d.defect_type.value,
            "confidence": d.confidence,
            "severity": d.severity.value,
        })

    return PredictionResponse(
        inspection_id=inspection["id"],
        image_url=image_url,
        defects=detections,
        overall_severity=severity,
        defect_free=defect_free,
        processing_time_ms=analysis["processing_time_ms"],
        dominant_colors=analysis["dominant_colors"],
        fabric_pattern=analysis["fabric_pattern"],
        quality=analysis["quality"],
        recommendations=analysis["recommendations"],
    )


@router.get("/inspection-history")
def inspection_history(
    limit: int = 50,
    user: dict = Depends(security.get_current_user),
):
    """
    Inspectors see their own history; managers/admins see everything.
    """
    if user["role"] == "inspector":
        items = local_db.find_all("inspections", inspector_id=user["id"])
    else:
        items = local_db.find_all("inspections")

    items = sorted(items, key=lambda i: i.get("created_at", ""), reverse=True)[:limit]
    return {"count": len(items), "inspections": items}


@router.get("/inspection/{inspection_id}")
def get_inspection(inspection_id: str, user: dict = Depends(security.get_current_user)):
    item = local_db.find_by_id("inspections", inspection_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return item


# ============================================================================
# WORKFLOW ENDPOINTS: SUBMIT, MANAGER DECISION, REINSPECTION
# ============================================================================

@router.post("/inspections/{inspection_id}/submit")
def submit_inspection_for_review(
    inspection_id: str,
    user: dict = Depends(security.require_roles("inspector", "admin")),
):
    """Inspector submits inspection for manager review."""
    inspection = local_db.find_by_id("inspections", inspection_id)
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    if inspection["inspector_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Cannot submit other inspector's inspection")
    
    if inspection["status"] not in [InspectionStatus.inspector_review.value, InspectionStatus.reinspection_required.value]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit inspection with status: {inspection['status']}"
        )

    # Update status
    updated = local_db.update("inspections", inspection_id, {
        "status": InspectionStatus.pending_manager_review.value
    })

    # Add audit log
    _add_audit_log(
        inspection_id,
        "Inspection submitted for manager review",
        user["id"],
        user.get("name", "Unknown"),
        user.get("role", "inspector"),
        None
    )

    return {"status": "submitted", "new_status": InspectionStatus.pending_manager_review.value}


@router.get("/inspections/pending/manager")
def get_pending_inspections(
    user: dict = Depends(security.require_roles("manager", "admin")),
):
    """Manager views all inspections awaiting their decision."""
    all_inspections = local_db.find_all("inspections")
    pending = [
        i for i in all_inspections
        if i.get("status") == InspectionStatus.pending_manager_review.value
    ]
    pending = sorted(pending, key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {
        "count": len(pending),
        "inspections": pending
    }


@router.post("/inspections/{inspection_id}/decision", response_model=ManagerDecisionResponse)
def submit_manager_decision(
    inspection_id: str,
    payload: ManagerDecisionRequest,
    user: dict = Depends(security.require_roles("manager", "admin")),
):
    """Manager approves, sends for rework, or rejects."""
    inspection = local_db.find_by_id("inspections", inspection_id)
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    if inspection["status"] != InspectionStatus.pending_manager_review.value:
        raise HTTPException(
            status_code=400,
            detail=f"Can only decide on inspections in pending_manager_review status. Current: {inspection['status']}"
        )

    # Determine new status based on decision
    if payload.decision == ManagerDecision.approved:
        new_status = InspectionStatus.approved_for_production.value
    elif payload.decision == ManagerDecision.rework:
        new_status = InspectionStatus.rework_required.value
    elif payload.decision == ManagerDecision.rejected:
        new_status = InspectionStatus.rejected.value
    else:
        raise HTTPException(status_code=400, detail="Invalid decision")

    # Update inspection
    updated = local_db.update("inspections", inspection_id, {
        "status": new_status,
        "manager_decision": payload.decision.value,
        "decision_reason": payload.reason,
        "decided_by": user["id"],
        "decided_by_name": user.get("name", "Unknown"),
        "decided_at": local_db.now_iso(),
    })

    # Add audit log
    action_text = f"Manager decision: {payload.decision.value}"
    _add_audit_log(
        inspection_id,
        action_text,
        user["id"],
        user.get("name", "Unknown"),
        user.get("role", "manager"),
        payload.reason
    )

    return ManagerDecisionResponse(
        inspection_id=inspection_id,
        decision=payload.decision,
        reason=payload.reason,
        decided_by=user["id"],
        decided_at=local_db.now_iso(),
        new_status=InspectionStatus(new_status),
    )


@router.post("/inspections/{inspection_id}/reinspect", response_model=ReinspectionResponse)
def start_reinspection(
    inspection_id: str,
    payload: ReinspectionRequest,
    user: dict = Depends(security.require_roles("inspector", "admin")),
):
    """Inspector starts a reinspection after rework."""
    inspection = local_db.find_by_id("inspections", inspection_id)
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    if inspection["status"] != InspectionStatus.reinspection_required.value:
        raise HTTPException(
            status_code=400,
            detail=f"Can only reinspect items in reinspection_required status. Current: {inspection['status']}"
        )

    # Create new inspection linked to parent
    reinspection = local_db.insert("inspections", {
        "inspector_id": user["id"],
        "inspector_name": user.get("name", "Unknown"),
        "production_line_id": inspection.get("production_line_id"),
        "batch_id": inspection.get("batch_id"),
        "status": InspectionStatus.inspector_review.value,
        "parent_inspection_id": inspection_id,
        "image_url": None,  # Will be filled when image is uploaded
    })

    # Update parent to show reinspection is in progress
    local_db.update("inspections", inspection_id, {
        "status": InspectionStatus.reinspection_required.value,
    })

    # Add audit log to parent
    _add_audit_log(
        inspection_id,
        "Reinspection initiated",
        user["id"],
        user.get("name", "Unknown"),
        user.get("role", "inspector"),
        payload.reason
    )

    return ReinspectionResponse(
        reinspection_id=reinspection["id"],
        parent_inspection_id=inspection_id,
        status=InspectionStatus.inspector_review,
        created_at=reinspection["created_at"],
    )


@router.get("/inspections/{inspection_id}/comparison")
def get_inspection_comparison(
    inspection_id: str,
    user: dict = Depends(security.get_current_user),
):
    """
    Get before/after comparison for a reinspection.
    Returns parent inspection and current reinspection side by side.
    """
    current = local_db.find_by_id("inspections", inspection_id)
    if not current:
        raise HTTPException(status_code=404, detail="Inspection not found")

    parent_id = current.get("parent_inspection_id")
    if not parent_id:
        return {
            "has_parent": False,
            "current": current,
            "parent": None,
        }

    parent = local_db.find_by_id("inspections", parent_id)
    if not parent:
        return {
            "has_parent": False,
            "current": current,
            "parent": None,
        }

    # Build comparison data
    return {
        "has_parent": True,
        "parent": {
            "id": parent["id"],
            "severity": parent.get("overall_severity"),
            "defect_count": len(parent.get("defects", [])),
            "affected_area": parent.get("affected_area", 0),
            "confidence": parent.get("avg_confidence", 0),
            "recommendation": parent.get("ai_recommendation"),
            "created_at": parent.get("created_at"),
        },
        "current": {
            "id": current["id"],
            "severity": current.get("overall_severity"),
            "defect_count": len(current.get("defects", [])),
            "affected_area": current.get("affected_area", 0),
            "confidence": current.get("avg_confidence", 0),
            "recommendation": current.get("ai_recommendation"),
            "created_at": current.get("created_at"),
        },
    }


@router.get("/inspections/{inspection_id}/audit-trail")
def get_audit_trail(
    inspection_id: str,
    user: dict = Depends(security.get_current_user),
):
    """Get complete audit trail for an inspection."""
    inspection = local_db.find_by_id("inspections", inspection_id)
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    logs = local_db.find_all("audit_logs", inspection_id=inspection_id)
    logs = sorted(logs, key=lambda x: x.get("timestamp", ""))

    return {
        "inspection_id": inspection_id,
        "audit_trail": logs,
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _add_audit_log(
    inspection_id: str,
    action: str,
    user_id: str,
    user_name: str,
    user_role: str,
    note: Optional[str] = None
) -> dict:
    """Add entry to audit trail for an inspection."""
    return local_db.insert("audit_logs", {
        "inspection_id": inspection_id,
        "action": action,
        "user_id": user_id,
        "user_name": user_name,
        "user_role": user_role,
        "note": note,
        "timestamp": local_db.now_iso(),
    })