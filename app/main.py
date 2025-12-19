"""
Daily AI Stock Intelligence System - FastAPI Entry Point
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
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

# Include API Routes FIRST
app.include_router(api_router)

# Static path for serving files
static_path = Path(__file__).parent / "static"


# ============================================
# Frontend Routes - Clean Single Dashboard System
# ============================================
# Route Overview:
#   /           -> Main Dashboard (index.html) - NEW Tailwind dashboard
#   /dashboard  -> Redirects to /
#   /login      -> Login page
#   /signup     -> Signup page  
#   /welcome    -> Marketing landing page
#   /landing    -> Alias for /welcome
# ============================================

def serve_file(filepath: Path, media_type: str = "text/html"):
    """Serve file with no-cache headers for development"""
    if filepath.exists():
        return FileResponse(
            str(filepath), 
            media_type=media_type,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    return None


@app.get("/", include_in_schema=False)
async def root():
    """Serve the main dashboard at root"""
    response = serve_file(static_path / "index.html")
    if response:
        return response
    return {"message": "Dashboard not found", "login": "/login"}


@app.get("/dashboard", include_in_schema=False)
async def dashboard():
    """Redirect /dashboard to root for consistency"""
    return RedirectResponse(url="/", status_code=302)


@app.get("/login", include_in_schema=False)
async def login_page():
    """Serve the login page"""
    response = serve_file(static_path / "login.html")
    if response:
        return response
    return {"message": "Login page not found"}


@app.get("/signup", include_in_schema=False)
async def signup_page():
    """Serve the signup page"""
    response = serve_file(static_path / "signup.html")
    if response:
        return response
    return {"message": "Signup page not found"}


@app.get("/welcome", include_in_schema=False)
async def welcome_page():
    """Serve the marketing landing page"""
    response = serve_file(static_path / "landing.html")
    if response:
        return response
    return RedirectResponse(url="/login", status_code=302)


@app.get("/landing", include_in_schema=False)
async def landing_page():
    """Alias for /welcome - serve the marketing landing page"""
    response = serve_file(static_path / "landing.html")
    if response:
        return response
    return RedirectResponse(url="/login", status_code=302)


@app.get("/auth/callback", include_in_schema=False)
async def auth_callback():
    """
    Handle Supabase email confirmation callback.
    Supabase redirects here with tokens in the URL fragment (#).
    We serve a simple HTML page that extracts the tokens and redirects cleanly.
    """
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Verifying...</title>
        <style>
            body { background: #0a0f1e; color: white; font-family: system-ui; display: flex; 
                   align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .loader { text-align: center; }
            .spinner { width: 40px; height: 40px; border: 3px solid rgba(139,92,246,0.2); 
                       border-top-color: #8b5cf6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
            @keyframes spin { to { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="loader">
            <div class="spinner"></div>
            <h2>✅ Email Verified!</h2>
            <p>Redirecting to login...</p>
        </div>
        <script>
            // Extract tokens from URL fragment
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const type = params.get('type');
            
            if (accessToken && type === 'signup') {
                // Email confirmation - redirect to login
                setTimeout(() => {
                    window.location.href = '/login?verified=true';
                }, 1500);
            } else if (accessToken) {
                // Store tokens and redirect to dashboard
                localStorage.setItem('mma_access_token', accessToken);
                if (refreshToken) {
                    localStorage.setItem('mma_refresh_token', refreshToken);
                }
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                // No tokens, just redirect to login
                window.location.href = '/login';
            }
        </script>
    </body>
    </html>
    """
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html_content)


# Mount static files LAST (so explicit routes take precedence)
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
