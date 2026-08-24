"""
Pydantic request/response schemas for TexVision API.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    inspector = "inspector"
    manager = "manager"
    admin = "admin"


class SeverityLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class DefectType(str, Enum):
    hole = "hole"
    stain = "stain"
    slub = "slub"
    broken_yarn = "broken_yarn"
    color_variation = "color_variation"
    none = "none"


class InspectionStatus(str, Enum):
    draft = "draft"
    ai_analyzing = "ai_analyzing"
    inspector_review = "inspector_review"
    pending_manager_review = "pending_manager_review"
    rework_required = "rework_required"
    reinspection_required = "reinspection_required"
    approved_for_production = "approved_for_production"
    rejected = "rejected"
    closed = "closed"


class AIRecommendation(str, Enum):
    rework = "rework"
    approve = "approve"
    reject = "reject"


class ManagerDecision(str, Enum):
    approved = "approved"
    rework = "rework"
    rejected = "rejected"


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: UserRole = UserRole.inspector
    factory_id: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ---------- Factory / Production Line ----------
class FactoryCreate(BaseModel):
    name: str
    location: Optional[str] = None


class ProductionLineCreate(BaseModel):
    factory_id: str
    name: str
    capacity_per_day: Optional[int] = None


# ---------- Inspection ----------
class DefectDetectionResult(BaseModel):
    defect_type: DefectType
    confidence: float
    severity: SeverityLevel
    bbox: Optional[List[float]] = None  # [x1, y1, x2, y2] normalized


class DominantColor(BaseModel):
    name: str
    hex: str
    percentage: float


class FabricPattern(BaseModel):
    pattern_type: str
    note: str


class QualityAssessment(BaseModel):
    verdict: str
    grade: str
    color: str


class Recommendation(BaseModel):
    priority: int
    defect_type: str
    severity: Optional[str] = None
    action: str


class PredictionResponse(BaseModel):
    inspection_id: str
    image_url: str
    defects: List[DefectDetectionResult]
    overall_severity: SeverityLevel
    defect_free: bool
    processing_time_ms: float
    dominant_colors: List[DominantColor] = []
    fabric_pattern: Optional[FabricPattern] = None
    quality: Optional[QualityAssessment] = None
    recommendations: List[Recommendation] = []


class InspectionRecord(BaseModel):
    id: str
    inspector_id: str
    production_line_id: Optional[str] = None
    image_url: str
    defects: List[DefectDetectionResult]
    overall_severity: SeverityLevel
    defect_free: bool
    created_at: str


# ---------- Dashboard ----------
class DashboardStats(BaseModel):
    total_inspected: int
    total_defects: int
    defect_percentage: float
    production_efficiency: float
    estimated_waste_percentage: float
    defect_breakdown: dict
    trend_last_7_days: List[dict]
    alerts: List[str]


# ---------- Workflow: AI Analysis, Manager Decision, Audit Trail ----------
class AIAnalysisData(BaseModel):
    """Structured AI analysis results for an inspection."""
    defects: List[DefectDetectionResult]
    overall_severity: SeverityLevel
    defect_count: int
    confidence_average: float
    affected_area_percentage: float
    recommendation: AIRecommendation
    explanation: str


class ManagerDecisionRequest(BaseModel):
    """Manager submits a decision on an inspection."""
    decision: ManagerDecision
    reason: str = Field(min_length=1, max_length=500)


class ManagerDecisionResponse(BaseModel):
    """Response after manager makes a decision."""
    inspection_id: str
    decision: ManagerDecision
    reason: str
    decided_by: str
    decided_at: str
    new_status: InspectionStatus


class AuditLogEntry(BaseModel):
    """Audit trail entry for workflow actions."""
    action: str
    user_id: str
    user_name: str
    user_role: str
    timestamp: str
    note: Optional[str] = None


class InspectionResponse(BaseModel):
    """Full inspection object with workflow state."""
    id: str
    inspector_id: str
    inspector_name: Optional[str] = None
    production_line_id: Optional[str] = None
    batch_id: Optional[str] = None
    image_url: str
    image_status: Optional[str] = None
    status: InspectionStatus
    ai_analysis: Optional[AIAnalysisData] = None
    dominant_colors: Optional[List[DominantColor]] = None
    fabric_pattern: Optional[FabricPattern] = None
    quality_assessment: Optional[QualityAssessment] = None
    recommendations: Optional[List[Recommendation]] = None
    manager_decision: Optional[ManagerDecision] = None
    decision_reason: Optional[str] = None
    decided_by: Optional[str] = None
    decided_at: Optional[str] = None
    parent_inspection_id: Optional[str] = None  # For reinspections
    created_at: str
    updated_at: Optional[str] = None
    audit_trail: Optional[List[AuditLogEntry]] = None


class ReinspectionRequest(BaseModel):
    """Start a reinspection for a fabric after rework."""
    reason: str = Field(min_length=1, max_length=300)


class ReinspectionResponse(BaseModel):
    """Response to starting a reinspection."""
    reinspection_id: str
    parent_inspection_id: str
    status: InspectionStatus
    created_at: str