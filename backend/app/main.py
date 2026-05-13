# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.v1.ticket_routes  import router as ticket_router
from backend.app.v1.runbook_routes import router as runbook_router
from backend.app.v1.rca_routes     import router as rca_router     # ← was missing

app = FastAPI()

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── GLOBAL ERROR HANDLER ──
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print("🔥 ERROR:", exc)
    return JSONResponse(
        status_code=500,
        content={"message": str(exc)},
    )

# ── ROUTERS ──
app.include_router(ticket_router,  prefix="/api")
app.include_router(runbook_router, prefix="/api")
app.include_router(rca_router,     prefix="/api")   # ← was missing