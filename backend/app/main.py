from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import candidates, dashboard, resumes
import uvicorn
import os
    
# Initialize FastAPI app
app = FastAPI(title="Resume Parser API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(candidates.router)
app.include_router(dashboard.router)
app.include_router(resumes.router)

if __name__ == "__main__":
    # Print startup information
    print("\n" + "="*50)
    print("Starting Resume Parser API Server")
    print("="*50)
    print("\n📚 API Documentation:")
    print("   • Swagger UI: http://localhost:8000/docs")
    print("   • ReDoc: http://localhost:8000/redoc")
    print("\n🔗 API Endpoints:")
    print("   • Candidates: http://localhost:8000/api/candidates")
    print("   • Dashboard: http://localhost:8000/api/dashboard")
    print("   • Resumes: http://localhost:8000/api/resumes")
    print("\n⚠️  Press Ctrl+C to stop the server")
    print("="*50 + "\n")
    
    # Start the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

