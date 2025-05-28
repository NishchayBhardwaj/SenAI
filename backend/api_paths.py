class APIPaths:
    # Resume endpoints
    UPLOAD_RESUME = "/api/resumes/upload"
    
    # Candidate endpoints
    GET_CANDIDATES = "/api/candidates"
    GET_CANDIDATE = "/api/candidates/{candidate_id}"
    SHORTLIST_CANDIDATES = "/api/candidates/shortlist"
    UPDATE_CANDIDATE_STATUS = "/api/candidates/{candidate_id}/status"
    
    # Dashboard endpoints
    GET_DASHBOARD_STATS = "/api/dashboard/stats" 