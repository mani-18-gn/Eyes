import os
import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.core.database import engine, Base
from backend.app.models.models import *  # Ensure all models are registered with Base
from backend.app.api.v1 import auth, lens, chat, brain, expenses, agent, settings as settings_api

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("realitylens")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database schemas
    logger.info("Initializing RealityLens database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("RealityLens Core Engine Ready.")
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="RealityLens Core API — See it. Get it. Do it.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded images and thumbnails
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Uniform Error Handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    req_id = str(uuid.uuid4())
    logger.error(f"Unhandled Exception [req: {req_id}]: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred while processing your request.",
            "requestId": req_id
        }
    )

# Register API v1 Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Authentication"])
app.include_router(lens.router, prefix=f"{settings.API_V1_PREFIX}/lens", tags=["Lens & Scans"])
app.include_router(chat.router, prefix=f"{settings.API_V1_PREFIX}/chat", tags=["Visual Chat"])
app.include_router(brain.router, prefix=f"{settings.API_V1_PREFIX}/brain", tags=["Personal Brain"])
app.include_router(expenses.router, prefix=f"{settings.API_V1_PREFIX}/expenses", tags=["Receipt & MoneyLens"])
app.include_router(agent.router, prefix=f"{settings.API_V1_PREFIX}/agent", tags=["Reality Agent"])
app.include_router(settings_api.router, prefix=f"{settings.API_V1_PREFIX}/settings", tags=["Settings & Health"])

@app.get("/")
def root():
    return {
        "product": "RealityLens",
        "tagline": "See it. Get it. Do it.",
        "status": "online",
        "docs": "/docs"
    }
