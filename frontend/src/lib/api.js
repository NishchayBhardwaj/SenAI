import axios from "axios";
import {
  getCachedResumeResult,
  cacheResumeResult,
  queueResumeParsingTask,
  getTaskStatus,
  incrementCounter,
} from "./redis";

const API_URL = "http://localhost:8000";
const AUTH_API_URL = "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
});

export const authApi = axios.create({
  baseURL: AUTH_API_URL,
  withCredentials: true, // Required for session cookies
});

// Add request timeout to prevent long requests
api.defaults.timeout = 40000; // Increased to 40 seconds for resume processing
authApi.defaults.timeout = 10000;

export const resumeApi = {
  // Resume upload and processing
  uploadResume: async (file, parse = true, saveToDb = true) => {
    // Basic file validation
    if (!file || file.size === 0) {
      console.error("Invalid file: empty or undefined");
      return Promise.reject(new Error("Invalid or empty file"));
    }

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    if (!validTypes.includes(file.type)) {
      console.error("Invalid file type:", file.type);
      return Promise.reject(
        new Error(
          `Invalid file type: ${file.type}. Please upload PDF, DOCX, DOC, TXT, or RTF.`
        )
      );
    }

    // Generate a file hash for caching (using name and last modified date)
    const fileKey = `${file.name}-${file.lastModified}`;

    // Try to get the result from cache first
    const cachedResult = await getCachedResumeResult(fileKey);
    if (cachedResult) {
      console.log("Cache hit! Using cached resume parsing result");
      // Mark the result as coming from cache
      return { ...cachedResult, fromCache: true };
    }

    console.log("Cache miss. Processing resume...");
    // Increment cache miss counter
    await incrementCounter("cache_misses");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("parse", String(parse));
    // Only save to DB and S3 if not already cached
    formData.append("save_to_db", String(saveToDb));

    try {
      const response = await api.post("/api/resumes/upload", formData);

      // Cache the result for future use
      if (response.data && response.data.candidate_id) {
        await cacheResumeResult(fileKey, response.data);
        // Increment processed counter
        await incrementCounter("resumes_processed");
      }

      // Mark the result as NOT coming from cache
      return { ...response.data, fromCache: false };
    } catch (error) {
      // Handle specific error cases to provide better error messages
      if (error.response) {
        // The request was made and the server responded with an error status
        if (error.response.status === 500) {
          throw new Error(
            "The resume couldn't be processed. It may be invalid, corrupted, or not contain extractable text."
          );
        } else if (error.response.data && error.response.data.detail) {
          throw new Error(error.response.data.detail);
        }
      }
      // Pass through the original error if none of our specific cases match
      throw error;
    }
  },

  uploadResumesBatch: async (files, parse = true, saveToDb = true) => {
    // First check if any files are already in cache
    const cachedResults = [];
    const filesToProcess = [];

    // Check cache for each file
    for (const file of files) {
      const fileKey = `${file.name}-${file.lastModified}`;
      const cachedResult = await getCachedResumeResult(fileKey);

      if (cachedResult) {
        console.log(`Cache hit for file: ${file.name}`);
        cachedResults.push({
          ...cachedResult,
          filename: file.name,
          status: "success",
          fromCache: true,
          message: "Retrieved from cache",
        });
      } else {
        filesToProcess.push(file);
        // Increment cache miss counter for uncached files
        await incrementCounter("cache_misses");
      }
    }

    // If all files were in cache, return early
    if (filesToProcess.length === 0) {
      console.log("All files were retrieved from cache");
      return {
        batch_id: `cache-batch-${Date.now()}`,
        total_files: files.length,
        successful: cachedResults.length,
        failed: 0,
        duplicates: 0,
        results: cachedResults,
        fromCache: true,
      };
    }

    // Process remaining files
    console.log(
      `Processing ${filesToProcess.length} files that weren't in cache`
    );
    const formData = new FormData();
    filesToProcess.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("parse", String(parse));
    formData.append("save_to_db", String(saveToDb));

    const response = await api.post("/api/batch/upload-resumes", formData);

    // Cache each successful result
    if (response.data && response.data.results) {
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        const result = response.data.results.find(
          (r) => r.filename === file.name
        );

        if (result && result.status === "success") {
          const fileKey = `${file.name}-${file.lastModified}`;
          await cacheResumeResult(fileKey, result);
          await incrementCounter("resumes_processed");
        } else if (result && result.status === "error") {
          await incrementCounter("resumes_failed");
        }
      }
    }

    // Combine cached and new results
    if (cachedResults.length > 0) {
      return {
        ...response.data,
        total_files: response.data.total_files + cachedResults.length,
        successful: response.data.successful + cachedResults.length,
        results: [...cachedResults, ...response.data.results],
        partialCache: true,
      };
    }

    return response.data;
  },

  uploadResumesBatchAsync: async (files, parse = true, saveToDb = true) => {
    // Create a task in Redis queue
    const taskId = await queueResumeParsingTask("batch", {
      fileCount: files.length,
      saveToDb,
    });

    // Then send the actual request
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("parse", String(parse));
    formData.append("save_to_db", String(saveToDb));
    formData.append("task_id", taskId);

    const response = await api.post(
      "/api/batch/upload-resumes/async",
      formData
    );

    // Return the response with the task ID
    return {
      ...response.data,
      task_id: taskId,
    };
  },

  getBatchStatus: async (batchId) => {
    // First check if we have the status in Redis
    const cachedStatus = await getTaskStatus(batchId);
    if (cachedStatus) {
      try {
        return JSON.parse(cachedStatus);
      } catch (e) {
        console.error("Error parsing cached status:", e);
      }
    }

    // Fall back to API call
    const response = await api.get(`/api/batch/status/${batchId}`);
    return response.data;
  },

  viewResume: async (candidateId) => {
    try {
      const response = await api.get(`/api/resumes/${candidateId}/view`);
      return response.data;
    } catch (error) {
      // If we get a 404 or any other error, try to refresh the URL
      if (
        error.response &&
        (error.response.status === 404 || error.response.status === 403)
      ) {
        // Try to refresh the resume URL
        const refreshResponse = await api.post(
          `/api/candidates/${candidateId}/refresh-resume-url`
        );
        return {
          resume_url: refreshResponse.data.new_url,
          filename:
            refreshResponse.data.filename || `resume_${candidateId}.pdf`,
          candidate_id: candidateId,
          refreshed: true,
        };
      }
      throw error;
    }
  },

  // Candidate management
  getCandidates: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.limit) params.append("limit", String(filters.limit));
    if (filters.status) params.append("status", filters.status);
    if (filters.minExperience !== undefined)
      params.append("min_experience", String(filters.minExperience));
    if (filters.maxExperience !== undefined)
      params.append("max_experience", String(filters.maxExperience));
    if (filters.skills && filters.skills.length > 0)
      params.append("skills", filters.skills.join(","));
    if (filters.location) params.append("location", filters.location);
    if (filters.company) params.append("company", filters.company);
    if (filters.position) params.append("position", filters.position);
    if (filters.education) params.append("education", filters.education);
    if (filters.skip) params.append("skip", String(filters.skip));
    const response = await api.get(`/api/candidates/?${params.toString()}`);
    return response.data;
  },

  // Get statistics for the dashboard
  getCandidatesStats: async () => {
    try {
      // First try to get stats from the API
      const response = await api.get("/api/dashboard/stats");

      // Map the API response to the format expected by the dashboard
      return {
        total: response.data.total_candidates || 0,
        shortlisted: response.data.shortlisted_candidates || 0,
        rejected: response.data.rejected_candidates || 0,
        pending: response.data.pending_candidates || 0,
      };
    } catch (error) {
      console.error("Error fetching candidate stats:", error);

      // If the API fails, try to calculate stats from candidates list
      try {
        const candidates = await resumeApi.getCandidates({ limit: 1000 });

        // Count by status
        const stats = {
          total: candidates.length,
          shortlisted: 0,
          rejected: 0,
          pending: 0,
        };

        // Calculate counts by status
        candidates.forEach((candidate) => {
          if (candidate.status === "shortlisted") stats.shortlisted++;
          else if (candidate.status === "rejected") stats.rejected++;
          else stats.pending++;
        });

        return stats;
      } catch (fallbackError) {
        // If everything fails, return zeros
        console.error("Fallback stats calculation failed:", fallbackError);
        return {
          total: 0,
          shortlisted: 0,
          rejected: 0,
          pending: 0,
        };
      }
    }
  },

  getCandidate: async (candidateId) => {
    const response = await api.get(`/api/candidates/${candidateId}`);
    return response.data;
  },

  shortlistCandidate: async (candidateId) => {
    const response = await api.post(`/api/candidates/${candidateId}/shortlist`);
    return response.data;
  },

  unshortlistCandidate: async (candidateId) => {
    const response = await api.put(
      `/api/candidates/${candidateId}/status?status=pending`
    );
    return response.data;
  },

  updateCandidateStatus: async (candidateId, status) => {
    const response = await api.put(
      `/api/candidates/${candidateId}/status?status=${status}`
    );
    return response.data;
  },

  refreshResumeUrl: async (candidateId) => {
    const response = await api.post(
      `/api/candidates/${candidateId}/refresh-resume-url`
    );
    return response.data;
  },

  // Shortlisting functionality
  shortlistByDescription: async (criteria) => {
    const response = await api.post("/api/candidates/shortlist", criteria);
    return response.data;
  },

  shortlistPreview: async (criteria) => {
    const response = await api.post(
      "/api/candidates/shortlist/preview",
      criteria
    );
    return response.data;
  },

  // Dashboard functionality
  getDashboardStats: async () => {
    const response = await api.get("/api/dashboard/stats");
    return response.data;
  },

  parseText: async (text) => {
    const formData = new FormData();
    formData.append("text", text);
    const response = await api.post("/api/resumes/parse-text/", formData);
    return response.data;
  },
};

export const authApiClient = {
  checkAuthStatus: async () => {
    const response = await authApi.get("/auth/status");
    return response.data;
  },

  getUserProfile: async () => {
    const response = await authApi.get("/auth/profile");
    return response.data;
  },

  logout: async () => {
    const response = await authApi.post("/auth/logout");
    return response.data;
  },

  getGoogleLoginUrl: () => {
    return `${AUTH_API_URL}/auth/google`;
  },

  healthCheck: async () => {
    const response = await authApi.get("/health");
    return response.data;
  },
};
