"""
TexVision Backend — FastAPI Application Entrypoint
AI Fabric Defect Detection and Production Intelligence System
NITER Innovate Hackathon 2026
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.requests import Request

from app.config import get_settings
from app.routers import auth, inspection, dashboard, admin


# ==========================================
# LOGGING
# ==========================================

logging.basicConfig(level=logging.INFO)

settings = get_settings()


# ==========================================
# FASTAPI APP
# ==========================================

app = FastAPI(
    title="TexVision API",
    description="AI Fabric Defect Detection and Production Intelligence System",
    version="1.0.0",
)


# ==========================================
# 422 VALIDATION ERROR HANDLER
# ==========================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    print("\n")
    print("==============================================")
    print("        TEXVISION 422 VALIDATION ERROR")
    print("==============================================")
    print("URL:", request.url)
    print("METHOD:", request.method)
    print("HEADERS:", {
        "content-type": request.headers.get("content-type"),
        "content-length": request.headers.get("content-length"),
    })
    print("ERRORS:")
    print(exc.errors())
    print("==============================================")
    print("\n")

    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
        },
    )


# ==========================================
# REQUEST LOGGING
# ==========================================

@app.middleware("http")
async def log_predict_request(
    request: Request,
    call_next,
):
    if request.url.path == "/api/predict-defect":

        logging.info(
            "/api/predict-defect headers: %s",
            {
                "content-type": request.headers.get(
                    "content-type"
                ),
                "content-length": request.headers.get(
                    "content-length"
                ),
            },
        )

    response = await call_next(request)

    return response


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# STORAGE
# ==========================================

os.makedirs(
    settings.local_storage_dir,
    exist_ok=True,
)

app.mount(
    "/static/uploads",
    StaticFiles(
        directory=settings.local_storage_dir
    ),
    name="uploads",
)


# ==========================================
# ROUTERS
# ==========================================

app.include_router(auth.router)
app.include_router(inspection.router)
app.include_router(dashboard.router)
app.include_router(admin.router)


# ==========================================
# ROOT
# ==========================================

@app.get("/")
def root():
    return {
        "app": "TexVision API",
        "status": "running",
        "docs": "/docs",
    }


# ==========================================
# HEALTH
# ==========================================

@app.get("/health")
def health():
    return {
        "status": "ok"
    }