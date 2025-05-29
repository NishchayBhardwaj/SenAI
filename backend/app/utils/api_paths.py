# Base paths
API_PREFIX = "/api"

CANDIDATES_BASE = f"{API_PREFIX}/candidates"
RESUMES_BASE = f"{API_PREFIX}/resumes"
DASHBOARD_BASE = f"{API_PREFIX}/dashboard"
BATCH_BASE = f"{API_PREFIX}/batch"

# Candidate paths
CANDIDATE_PATHS = {
    "list": CANDIDATES_BASE,
    "detail": lambda candidate_id: f"{CANDIDATES_BASE}/{candidate_id}",
    "status_update": lambda candidate_id: f"{CANDIDATES_BASE}/{candidate_id}/status",
    "shortlist": lambda candidate_id: f"{CANDIDATES_BASE}/{candidate_id}/shortlist",
    "refresh_resume": lambda candidate_id: f"{CANDIDATES_BASE}/{candidate_id}/refresh-resume-url",
    "view_resume": lambda candidate_id: f"{CANDIDATES_BASE}/{candidate_id}/view",
}

# Resume paths
RESUME_PATHS = {
    "upload": f"{RESUMES_BASE}/upload",
    "view": lambda candidate_id: f"{RESUMES_BASE}/{candidate_id}/view",
}

# Shortlisting paths
SHORTLIST_PATHS = {
    "shortlist": f"{CANDIDATES_BASE}/shortlist",
    "preview": f"{CANDIDATES_BASE}/shortlist/preview",
}

# Batch processing paths
BATCH_PATHS = {
    "upload": f"{BATCH_BASE}/upload-resumes",
    "upload_async": f"{BATCH_BASE}/upload-resumes/async",
    "status": lambda batch_id: f"{BATCH_BASE}/status/{batch_id}",
}

# Dashboard paths
DASHBOARD_PATHS = {
    "stats": f"{DASHBOARD_BASE}/stats",
} 