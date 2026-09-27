from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import expeditions, reports, datasets, publications, media, activities, files, auth, generated_content
import uvicorn
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="NCPOR Polar Science Outreach Portal")

# CORS enabled for all origins (hackathon demo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(expeditions.router, prefix="/api/expeditions", tags=["expeditions"])
app.include_router(reports.router, prefix="/api/expeditions", tags=["reports"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(publications.router, prefix="/api/publications", tags=["publications"])
app.include_router(media.router, prefix="/api/expeditions", tags=["media"])
app.include_router(activities.router, prefix="/api/activities", tags=["activities"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(generated_content.router, prefix="/api/generated", tags=["generated_content"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "NCPOR Portal API"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
