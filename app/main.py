"""
Daily AI Stock Intelligence System - FastAPI Entry Point
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from app.api.endpoints import router as api_router
from app.core.config import get_settings

settings = get_settings()

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Automated stock intelligence system with AI-powered analysis",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routes
app.include_router(api_router)

# Static Files - Mount the frontend
static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")


# Root endpoint - serve the dashboard
@app.get("/", include_in_schema=False)
async def root():
    """Serve the main dashboard"""
    index_file = static_path / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Welcome to Daily AI Stock Intelligence System", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
