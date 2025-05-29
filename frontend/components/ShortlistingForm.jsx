"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FolderIcon,
  DocumentIcon,
  XMarkIcon,
  StarIcon,
  BriefcaseIcon,
  ChartBarIcon,
  TrophyIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { resumeApi } from "../src/lib/api";

// Document Viewer Component
const DocumentViewer = ({
  url,
  fileType,
  filename,
  candidateId,
  onRefreshUrl,
}) => {
  const [currentViewer, setCurrentViewer] = useState("office");
  const [viewerError, setViewerError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefreshAttempted, setAutoRefreshAttempted] = useState(false);

  const type = fileType?.toLowerCase();

  const getViewerUrl = (viewer) => {
    switch (viewer) {
      case "office":
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
          url
        )}`;
      case "google":
        return `https://docs.google.com/viewer?url=${encodeURIComponent(
          url
        )}&embedded=true`;
      case "direct":
        return url;
      default:
        return url;
    }
  };

  const handleViewerLoad = () => {
    setIsLoading(false);
    setViewerError(false);
  };

  const handleViewerError = async () => {
    setIsLoading(false);
    setViewerError(true);

    // For office documents, try to auto-refresh the URL if it fails the first time
    if (
      (type === "doc" || type === "docx") &&
      !autoRefreshAttempted &&
      candidateId &&
      onRefreshUrl
    ) {
      console.log("Document failed to load. Automatically refreshing URL...");
      setAutoRefreshAttempted(true);
      try {
        await onRefreshUrl();
        // After URL refresh, we'll try the Office viewer again
        setCurrentViewer("office");
        setIsLoading(true);
        setViewerError(false);
        return;
      } catch (error) {
        console.error("Auto-refresh failed:", error);
      }
    }

    // If auto-refresh was attempted or failed, follow the regular fallback logic
    if (currentViewer === "office") {
      console.log("Office viewer failed, trying Google Docs viewer...");
      setCurrentViewer("google");
      setIsLoading(true);
      setViewerError(false);
    } else if (currentViewer === "google") {
      console.log("Google viewer failed, falling back to direct link...");
      setCurrentViewer("direct");
      setIsLoading(true);
      setViewerError(false);
    }
  };

  const renderViewer = () => {
    if (type === "pdf" || type === "txt") {
      // Direct viewing for PDF and TXT
      return (
        <iframe
          src={url}
          className="absolute inset-0 w-full h-full border-0"
          title="Document Preview"
          onLoad={handleViewerLoad}
          onError={handleViewerError}
        />
      );
    } else if (type === "doc" || type === "docx") {
      // Office documents with smart viewer selection
      return (
        <iframe
          key={`${currentViewer}-${url}`} // Force re-render when viewer changes
          src={getViewerUrl(currentViewer)}
          className="absolute inset-0 w-full h-full border-0"
          title="Document Preview"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          onLoad={handleViewerLoad}
          onError={handleViewerError}
        />
      );
    } else {
      // Fallback for other file types
      return (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          <div className="text-center p-8">
            <h3 className="text-lg font-medium text-github-fg-default dark:text-github-dark-fg-default mb-4">
              Preview not available for this file type
            </h3>
            <p className="text-github-fg-muted dark:text-github-dark-fg-muted mb-4">
              File type: {type || "Unknown"}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-github-primary"
            >
              Download File
            </a>
          </div>
        </div>
      );
    }
  };

  const renderControls = () => {
    if (type !== "doc" && type !== "docx") return null;

    return (
      <div className="p-3 bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle border-t border-github-border-default dark:border-github-dark-border-default">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setCurrentViewer("office");
                setIsLoading(true);
                setViewerError(false);
              }}
              className={`px-3 py-1 text-xs rounded border ${
                currentViewer === "office"
                  ? "bg-github-accent-emphasis text-github-fg-onEmphasis dark:text-github-fg-onEmphasis border-github-accent-emphasis"
                  : "bg-github-btn-bg hover:bg-github-btn-hover-bg border-github-border-default dark:border-github-dark-border-default text-github-fg-default dark:text-github-dark-fg-default"
              }`}
            >
              Office Viewer
            </button>
            <button
              onClick={() => {
                setCurrentViewer("google");
                setIsLoading(true);
                setViewerError(false);
              }}
              className={`px-3 py-1 text-xs rounded border ${
                currentViewer === "google"
                  ? "bg-github-accent-emphasis text-github-fg-onEmphasis dark:text-github-fg-onEmphasis border-github-accent-emphasis"
                  : "bg-github-btn-bg hover:bg-github-btn-hover-bg border-github-border-default dark:border-github-dark-border-default text-github-fg-default dark:text-github-dark-fg-default"
              }`}
            >
              Google Viewer
            </button>
          </div>

          <div className="flex gap-2">
            {viewerError && (
              <span className="text-xs text-github-danger-fg dark:text-github-dark-danger-fg">
                Viewer failed to load
              </span>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-xs bg-github-success-emphasis hover:bg-github-success-emphasis text-github-fg-onEmphasis dark:text-github-fg-onEmphasis rounded"
            >
              Open in New Tab
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full" style={{ height: "80vh" }}>
      <div className="absolute inset-0 w-full h-full flex flex-col">
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-github-canvas-subtle dark:bg-github-dark-canvas-default bg-opacity-75 z-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-github-accent-emphasis border-t-transparent rounded-full"
              />
            </div>
          )}

          {viewerError && currentViewer === "direct" && (
            <div className="absolute inset-0 flex items-center justify-center bg-github-canvas-subtle dark:bg-github-dark-canvas-default">
              <div className="text-center p-8">
                <h3 className="text-lg font-medium text-github-fg-default dark:text-github-dark-fg-default mb-4">
                  Unable to preview this document
                </h3>
                <p className="text-github-fg-muted dark:text-github-dark-fg-muted mb-4">
                  {type === "doc" || type === "docx"
                    ? "Office documents require valid temporary URLs that expire after some time. The URL for this document has likely expired."
                    : "The document viewer is not compatible with this file or the URL has expired."}
                </p>
                <button onClick={onRefreshUrl} className="btn-github-primary">
                  Refresh Document URL
                </button>
              </div>
            </div>
          )}

          {!viewerError && renderViewer()}
        </div>

        {renderControls()}
      </div>
    </div>
  );
};

// Resume Modal Component
const ResumeModal = ({
  isOpen,
  onClose,
  resumeUrl,
  filename,
  onRefreshUrl,
  candidateId,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getFileType = (filename) => {
    const extension = filename?.split(".").pop()?.toLowerCase() || "";
    return extension;
  };

  const fileType = getFileType(filename);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(resumeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Failed to download file");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-github-canvas-default dark:bg-github-canvas-default-dark rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-github-border-default dark:border-github-border-default-dark">
              <h3 className="text-lg font-medium text-github-fg-default dark:text-github-fg-default-dark flex items-center">
                <DocumentIcon className="w-5 h-5 mr-2" />
                {filename}
              </h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-subtle-dark rounded-full"
              >
                <XMarkIcon className="w-5 h-5 text-github-fg-muted dark:text-github-fg-muted-dark" />
              </button>
            </div>

            <DocumentViewer
              url={resumeUrl}
              fileType={fileType}
              filename={filename}
              candidateId={candidateId}
              onRefreshUrl={onRefreshUrl}
            />

            <div className="p-4 border-t border-github-border-default dark:border-github-border-default-dark bg-github-canvas-subtle flex justify-end space-x-3">
              <button
                onClick={onRefreshUrl}
                className="btn-github flex items-center space-x-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span>Refresh URL</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="btn-github flex items-center space-x-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>{isDownloading ? "Downloading..." : "Download"}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function ShortlistingForm() {
  const [formData, setFormData] = useState({
    job_title: "",
    job_description: "",
    required_skills: [],
    preferred_skills: [],
    min_experience: 0,
    max_experience: 5,
    education_level: "",
    education_field: "",
    preferred_locations: [],
    minimum_score: 0.5,
    semantic_weight: 0.7,
    max_shortlisted: 10,
  });

  // Add new state for input values
  const [inputValues, setInputValues] = useState({
    required_skills: "",
    preferred_skills: "",
    preferred_locations: "",
  });

  const [validationErrors, setValidationErrors] = useState({
    job_title: "",
    job_description: "",
    required_skills: "",
    preferred_skills: "",
    preferred_locations: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(true);
  const [previewResults, setPreviewResults] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [resumeModal, setResumeModal] = useState({
    isOpen: false,
    url: "",
    filename: "",
    candidateId: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [shortlistingHistory, setShortlistingHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear validation error for this field when it changes
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateArrayInput = (values, field) => {
    const MAX_ENTRIES = {
      required_skills: 10,
      preferred_skills: 10,
      preferred_locations: 5,
    };

    const MIN_LENGTH = 2;
    const validFormat = /^[a-zA-Z0-9\s\+\#\.\-\_]{2,30}$/;

    if (values.length > MAX_ENTRIES[field]) {
      return `Maximum ${MAX_ENTRIES[field]} entries allowed`;
    }

    for (const value of values) {
      if (value.length < MIN_LENGTH) {
        return `Each ${field.replace(
          "_",
          " "
        )} must be at least ${MIN_LENGTH} characters`;
      }
      if (!validFormat.test(value)) {
        return `Invalid format in "${value}". Use only letters, numbers, and common symbols`;
      }
    }

    return "";
  };

  const handleArrayInputChange = (e, field) => {
    const { value } = e.target;
    setInputValues((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Only update formData when comma or Enter is pressed
    if (value.endsWith(",") || e.key === "Enter") {
      e.preventDefault();
      const newValue = value.replace(/,$/, "").trim();
      if (newValue) {
        const values = [...formData[field]];
        if (!values.includes(newValue)) {
          values.push(newValue);
          const error = validateArrayInput(values, field);
          setValidationErrors((prev) => ({
            ...prev,
            [field]: error,
          }));

          if (!error) {
            setFormData((prev) => ({
              ...prev,
              [field]: values,
            }));

            // Clear validation error for this field when items are added
            if (validationErrors[field]) {
              setValidationErrors((prev) => ({
                ...prev,
                [field]: "",
              }));
            }
          }
        }
        setInputValues((prev) => ({
          ...prev,
          [field]: "",
        }));
      }
    }
  };

  const removeArrayItem = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const onDrop = (acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size should not exceed 10MB");
      return;
    }
    setFile(selectedFile);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
  });

  const handleViewResume = async (candidateId) => {
    try {
      const data = await resumeApi.viewResume(candidateId);
      setResumeModal({
        isOpen: true,
        url: data.resume_url,
        filename: data.filename,
        candidateId: candidateId,
      });
    } catch (error) {
      console.error("Error viewing resume:", error);
      toast.error("Failed to load resume");
    }
  };

  const handleRefreshResumeUrl = async () => {
    try {
      toast.loading("Refreshing document URL...");
      // Use the dedicated method for refreshing URLs
      const data = await resumeApi.refreshResumeUrl(resumeModal.candidateId);
      toast.dismiss();
      toast.success("Document URL refreshed");
      setResumeModal({
        ...resumeModal,
        url: data.new_url,
      });
    } catch (error) {
      console.error("Error refreshing resume URL:", error);
      toast.dismiss();
      toast.error("Failed to refresh document URL");
    }
  };

  // Simple skills chart component
  const SkillsMatchChart = ({ skills, matchScore }) => {
    const score = Math.round(matchScore * 100);
    return (
      <div className="mt-4">
        <h5 className="font-medium text-github-fg-default mb-2">
          Skills Match
        </h5>
        <div className="w-full bg-github-canvas-subtle rounded-full h-4">
          <div
            className={`h-4 rounded-full ${
              score >= 80
                ? "bg-github-success-emphasis"
                : score >= 60
                ? "bg-github-accent-emphasis"
                : "bg-github-danger-emphasis"
            }`}
            style={{ width: `${score}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span>0%</span>
          <span className="font-medium">{score}%</span>
          <span>100%</span>
        </div>
      </div>
    );
  };

  // Enhanced candidate card component
  const CandidateCard = ({ candidate }) => {
    const score = Math.round(candidate.combined_score * 100);
    return (
      <div className="github-card p-6 border-t-4 border-github-accent-emphasis">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center">
              <h4 className="text-xl font-semibold">
                {candidate.candidate_name}
              </h4>
              <span
                className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${
                  candidate.predicted_status === "shortlisted"
                    ? "bg-github-success-subtle text-github-success-fg"
                    : "bg-github-danger-subtle text-github-danger-fg"
                }`}
              >
                {candidate.predicted_status === "shortlisted"
                  ? "Recommended"
                  : "Not Recommended"}
              </span>
            </div>
            <p className="text-sm text-github-fg-muted mt-1">
              ID: {candidate.candidate_id}
            </p>
          </div>
          <div
            className={`flex items-center px-4 py-2 rounded-full ${getScoreColor(
              score
            )}`}
          >
            {getScoreIcon(score)}
            <span className="ml-2 text-lg font-bold">{score}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h5 className="flex items-center text-github-success-fg font-medium mb-3">
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Strengths
            </h5>
            <ul className="space-y-2">
              {candidate.strengths && candidate.strengths.length > 0 ? (
                candidate.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-github-success-subtle text-github-success-fg mr-2">
                      <CheckCircleIcon className="h-4 w-4" />
                    </span>
                    <span className="text-sm">{strength}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-github-fg-muted">
                  No strengths identified.
                </li>
              )}
            </ul>
            <SkillsMatchChart
              skills={candidate.strengths || []}
              matchScore={candidate.combined_score}
            />
          </div>
          <div>
            <h5 className="flex items-center text-github-danger-fg font-medium mb-3">
              <ExclamationCircleIcon className="w-5 h-5 mr-2" />
              Areas for Consideration
            </h5>
            <ul className="space-y-2">
              {candidate.weaknesses && candidate.weaknesses.length > 0 ? (
                candidate.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-github-danger-subtle text-github-danger-fg mr-2">
                      <ExclamationCircleIcon className="h-4 w-4" />
                    </span>
                    <span className="text-sm">{weakness}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-github-fg-muted">
                  No weaknesses identified.
                </li>
              )}
            </ul>
            <div className="mt-4">
              <h5 className="flex items-center font-medium mb-3">
                <LightBulbIcon className="w-5 h-5 mr-2 text-github-attention-fg" />
                Summary
              </h5>
              <div className="bg-black rounded-md p-4 text-sm text-white">
                {candidate.reasoning || "No summary available."}
              </div>
            </div>
          </div>
        </div>

        {/* View Resume Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => handleViewResume(candidate.candidate_id)}
            className="btn-github-primary flex items-center space-x-2"
          >
            <EyeIcon className="w-4 h-4" />
            <span>View Resume</span>
          </button>
        </div>
      </div>
    );
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Validate job title (required)
    if (!formData.job_title.trim()) {
      errors.job_title = "Job title is required";
      isValid = false;
    }

    // Validate job description (required)
    if (!formData.job_description.trim()) {
      errors.job_description = "Job description is required";
      isValid = false;
    }

    // Validate required skills (at least one required)
    if (formData.required_skills.length === 0) {
      errors.required_skills = "At least one required skill must be added";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsLoading(true);
    setPreviewError(null);
    setIsProcessing(true);
    setProcessProgress(0);

    try {
      // Fix: Send required_skills and preferred_skills as arrays of strings
      const formDataForBackend = {
        ...formData,
        required_skills: formData.required_skills,
        preferred_skills: formData.preferred_skills,
      };

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProcessProgress((prev) => {
          const next = prev + (100 - prev) * 0.1;
          return Math.min(next, 95); // Never reach 100% until actually done
        });
      }, 500);

      let response;
      if (isPreview) {
        response = await resumeApi.shortlistPreview(formDataForBackend);
      } else {
        response = await resumeApi.shortlistByDescription(formDataForBackend);
      }

      clearInterval(progressInterval);
      setProcessProgress(100);

      // Delay setting results for smooth progress bar animation
      setTimeout(() => {
        setPreviewResults(response);
        setIsProcessing(false);
        toast.success(
          isPreview
            ? "Preview generated successfully"
            : "Shortlisting completed successfully"
        );
      }, 500);
    } catch (error) {
      setPreviewError(
        error.message || "No candidates are currently pending for review"
      );
      toast.error(error.message || "Failed to process shortlisting request");
      setIsProcessing(false);
      setProcessProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "text-github-success-fg bg-github-success-subtle";
    if (score >= 80) return "text-github-accent-fg bg-github-accent-subtle";
    if (score >= 70)
      return "text-github-attention-fg bg-github-attention-subtle";
    return "text-github-danger-fg bg-github-danger-subtle";
  };

  const getScoreIcon = (score) => {
    if (score >= 90) return <TrophyIcon className="w-5 h-5" />;
    if (score >= 80) return <StarIcon className="w-5 h-5" />;
    return <ChartBarIcon className="w-5 h-5" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="github-card p-6"
    >
      <h2 className="text-xl font-semibold text-github-fg-default dark:text-github-dark-fg-default mb-6">
        Shortlisting Criteria
      </h2>

      <div className="text-sm text-github-fg-muted mb-4">
        <span className="text-github-danger-fg">*</span> Required fields
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Job Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Job Title <span className="text-github-danger-fg">*</span>
            </label>
            <input
              type="text"
              name="job_title"
              value={formData.job_title}
              onChange={handleInputChange}
              className={`github-input w-full ${
                validationErrors.job_title ? "border-red-500" : ""
              }`}
              placeholder="e.g. Senior Software Engineer"
            />
            {validationErrors.job_title && (
              <p className="text-red-500 text-sm mt-1">
                {validationErrors.job_title}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Education Level
            </label>
            <input
              type="text"
              name="education_level"
              value={formData.education_level}
              onChange={handleInputChange}
              className="github-input w-full"
              placeholder="e.g. Bachelor's Degree"
            />
          </div>
        </div>

        {/* Job Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Job Description <span className="text-github-danger-fg">*</span>
          </label>
          <textarea
            name="job_description"
            value={formData.job_description}
            onChange={handleInputChange}
            className={`github-input w-full h-32 ${
              validationErrors.job_description ? "border-red-500" : ""
            }`}
            placeholder="Enter detailed job description..."
          />
          {validationErrors.job_description && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.job_description}
            </p>
          )}
        </div>

        {/* Skills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Required Skills <span className="text-github-danger-fg">*</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={inputValues.required_skills}
                onChange={(e) => handleArrayInputChange(e, "required_skills")}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleArrayInputChange(e, "required_skills");
                }}
                className={`github-input w-full ${
                  validationErrors.required_skills ? "border-red-500" : ""
                }`}
                placeholder="Type and press Enter or comma to add skills"
              />
              <div className="flex flex-wrap gap-2">
                {formData.required_skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-github-accent-subtle text-github-accent-fg"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeArrayItem("required_skills", index)}
                      className="ml-1 hover:text-github-danger-fg"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {validationErrors.required_skills && (
                <p className="text-red-500 text-sm">
                  {validationErrors.required_skills}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Preferred Skills
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={inputValues.preferred_skills}
                onChange={(e) => handleArrayInputChange(e, "preferred_skills")}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleArrayInputChange(e, "preferred_skills");
                }}
                className={`github-input w-full ${
                  validationErrors.preferred_skills ? "border-red-500" : ""
                }`}
                placeholder="Type and press Enter or comma to add skills"
              />
              <div className="flex flex-wrap gap-2">
                {formData.preferred_skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-github-accent-subtle text-github-accent-fg"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeArrayItem("preferred_skills", index)}
                      className="ml-1 hover:text-github-danger-fg"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {validationErrors.preferred_skills && (
                <p className="text-red-500 text-sm">
                  {validationErrors.preferred_skills}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Experience Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Minimum Experience (years)
            </label>
            <input
              type="number"
              name="min_experience"
              value={formData.min_experience}
              onChange={handleInputChange}
              min="0"
              className="github-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Maximum Experience (years)
            </label>
            <input
              type="number"
              name="max_experience"
              value={formData.max_experience}
              onChange={handleInputChange}
              min={formData.min_experience}
              className="github-input w-full"
            />
          </div>
        </div>

        {/* Education and Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Education Field
            </label>
            <input
              type="text"
              name="education_field"
              value={formData.education_field}
              onChange={handleInputChange}
              className="github-input w-full"
              placeholder="e.g. Computer Science"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Preferred Locations
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={inputValues.preferred_locations}
                onChange={(e) =>
                  handleArrayInputChange(e, "preferred_locations")
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleArrayInputChange(e, "preferred_locations");
                }}
                className={`github-input w-full ${
                  validationErrors.preferred_locations ? "border-red-500" : ""
                }`}
                placeholder="Type and press Enter or comma to add locations"
              />
              <div className="flex flex-wrap gap-2">
                {formData.preferred_locations.map((location, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-github-accent-subtle text-github-accent-fg"
                  >
                    {location}
                    <button
                      type="button"
                      onClick={() =>
                        removeArrayItem("preferred_locations", index)
                      }
                      className="ml-1 hover:text-github-danger-fg"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {validationErrors.preferred_locations && (
                <p className="text-red-500 text-sm">
                  {validationErrors.preferred_locations}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Minimum Score ({(formData.minimum_score * 100).toFixed(0)}%)
            </label>
            <input
              type="range"
              name="minimum_score"
              value={formData.minimum_score}
              onChange={handleInputChange}
              min="0"
              max="1"
              step="0.1"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Semantic Weight ({(formData.semantic_weight * 100).toFixed(0)}%)
            </label>
            <input
              type="range"
              name="semantic_weight"
              value={formData.semantic_weight}
              onChange={handleInputChange}
              min="0"
              max="1"
              step="0.1"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Max Shortlisted
            </label>
            <input
              type="number"
              name="max_shortlisted"
              value={formData.max_shortlisted}
              onChange={handleInputChange}
              min="1"
              className="github-input w-full"
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="btn-github"
            disabled={isLoading}
          >
            {isPreview ? "Switch to Final" : "Switch to Preview"}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-github-primary"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </div>
            ) : isPreview ? (
              "Generate Preview"
            ) : (
              "Start Shortlisting"
            )}
          </button>
        </div>
      </form>

      {/* Processing Progress */}
      {isProcessing && (
        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-github-fg-default">
              Processing candidates
            </span>
            <span className="text-sm font-medium text-github-fg-default">
              {Math.round(processProgress)}%
            </span>
          </div>
          <div className="w-full bg-github-canvas-subtle rounded-full h-2.5">
            <div
              className="bg-github-accent-emphasis h-2.5 rounded-full"
              style={{ width: `${processProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Preview Results or Error */}
      {previewError ? (
        <div className="mt-8 text-center py-8 bg-github-danger-subtle rounded-lg">
          <ChartBarIcon className="w-12 h-12 text-github-danger-fg mx-auto mb-4" />
          <h3 className="text-lg font-medium text-github-danger-fg mb-2">
            {previewError}
          </h3>
          <p className="text-github-danger-fg">
            Please try again later or modify your search criteria.
          </p>
        </div>
      ) : (
        previewResults && (
          <div className="mt-8 space-y-6">
            <h3 className="text-xl font-semibold">Shortlisting Results</h3>

            {previewResults.preview_results &&
            previewResults.preview_results.length > 0 ? (
              <>
                <div className="mb-6 p-6 bg-github-canvas-subtle rounded-lg shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="bg-github-canvas-default rounded-lg p-4 shadow-sm">
                      <div className="text-3xl font-bold text-github-fg-default">
                        {previewResults.total_candidates}
                      </div>
                      <div className="text-sm text-github-fg-muted">
                        Total Candidates
                      </div>
                    </div>
                    <div className="bg-github-canvas-default rounded-lg p-4 shadow-sm">
                      <div className="text-3xl font-bold text-github-success-fg">
                        {previewResults.predicted_shortlisted}
                      </div>
                      <div className="text-sm text-github-fg-muted">
                        Recommended
                      </div>
                    </div>
                    <div className="bg-github-canvas-default rounded-lg p-4 shadow-sm">
                      <div className="text-3xl font-bold text-github-danger-fg">
                        {previewResults.predicted_rejected}
                      </div>
                      <div className="text-sm text-github-fg-muted">
                        Not Recommended
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {previewResults.preview_results.map((candidate, index) => (
                    <CandidateCard
                      key={candidate.candidate_id || index}
                      candidate={candidate}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 bg-github-canvas-subtle rounded-lg">
                <ChartBarIcon className="w-12 h-12 text-github-fg-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-github-fg-default mb-2">
                  No Candidates Available
                </h3>
                <p className="text-github-fg-muted">
                  There are currently no candidates pending for review.
                </p>
              </div>
            )}
          </div>
        )
      )}

      {/* Resume Modal */}
      <ResumeModal
        isOpen={resumeModal.isOpen}
        onClose={() =>
          setResumeModal({
            isOpen: false,
            url: "",
            filename: "",
            candidateId: "",
          })
        }
        resumeUrl={resumeModal.url}
        filename={resumeModal.filename}
        onRefreshUrl={handleRefreshResumeUrl}
        candidateId={resumeModal.candidateId}
      />
    </motion.div>
  );
}
