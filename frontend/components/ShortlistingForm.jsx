"use client";

import { useState } from "react";
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
} from "@heroicons/react/24/outline";
import { resumeApi } from "@/src/lib/api";

// Resume Modal Component
const ResumeModal = ({ isOpen, onClose, resumeUrl, filename }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const getFileType = (filename) => {
    const extension = filename.split(".").pop().toLowerCase();
    return extension;
  };

  const isPdfFile = (filename) => {
    return getFileType(filename) === "pdf";
  };

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
              <h3 className="text-lg font-medium text-github-fg-default dark:text-github-fg-default-dark">
                {filename}
              </h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-subtle-dark rounded-full"
              >
                <XMarkIcon className="w-5 h-5 text-github-fg-muted dark:text-github-fg-muted-dark" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              {isPdfFile(filename) ? (
                <iframe
                  src={resumeUrl}
                  className="w-full h-[600px] border border-github-border-default dark:border-github-border-default-dark rounded"
                  title="Resume Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[600px] bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle rounded-lg">
                  <DocumentIcon className="w-16 h-16 text-github-fg-muted mb-4" />
                  <p className="text-github-fg-default mb-4">
                    Preview not available for{" "}
                    {getFileType(filename).toUpperCase()} files
                  </p>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="btn-github-primary flex items-center space-x-2"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>
                      {isDownloading ? "Downloading..." : "Download File"}
                    </span>
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-github-border-default dark:border-github-border-default-dark bg-github-canvas-subtle flex justify-end space-x-3">
              {isPdfFile(filename) && (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-github-primary"
                >
                  Open in New Tab
                </a>
              )}
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
    required_skills: "",
    preferred_skills: "",
    preferred_locations: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(true);
  const [inputMethod, setInputMethod] = useState("text");
  const [file, setFile] = useState(null);
  const [previewResults, setPreviewResults] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [resumeModal, setResumeModal] = useState({
    isOpen: false,
    url: "",
    filename: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      });
    } catch (error) {
      console.error("Error viewing resume:", error);
      toast.error("Failed to load resume");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setPreviewError(null);

    try {
      // Convert skill categories to uppercase for backend compatibility
      const formDataWithUpperCase = {
        ...formData,
        required_skills: formData.required_skills.map((skill) => ({
          skill_name: skill,
          skill_category: "TECHNICAL",
          proficiency_level: "INTERMEDIATE",
        })),
        preferred_skills: formData.preferred_skills.map((skill) => ({
          skill_name: skill,
          skill_category: "TECHNICAL",
          proficiency_level: "INTERMEDIATE",
        })),
      };

      let response;
      if (inputMethod === "text") {
        response = isPreview
          ? await resumeApi.shortlistPreview(formDataWithUpperCase)
          : await resumeApi.shortlistByDescription(formDataWithUpperCase);
      } else {
        response = isPreview
          ? await resumeApi.shortlistPreviewByFile(file, formDataWithUpperCase)
          : await resumeApi.shortlistByFile(file, formDataWithUpperCase);
      }

      setPreviewResults(response);
      toast.success(
        isPreview
          ? "Preview generated successfully"
          : "Shortlisting completed successfully"
      );
    } catch (error) {
      setPreviewError(
        error.message || "No candidates are currently pending for review"
      );
      toast.error(error.message || "Failed to process shortlisting request");
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

      {/* Input Method Toggle */}
      <div className="flex space-x-4 border-b border-github-border-default dark:border-github-border-default-dark mb-6">
        <button
          onClick={() => setInputMethod("text")}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            inputMethod === "text"
              ? "border-github-accent-fg text-github-accent-fg"
              : "border-transparent text-github-fg-muted hover:text-github-fg-default"
          }`}
        >
          Write Job Description
        </button>
        <button
          onClick={() => setInputMethod("file")}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            inputMethod === "file"
              ? "border-github-accent-fg text-github-accent-fg"
              : "border-transparent text-github-fg-muted hover:text-github-fg-default"
          }`}
        >
          Upload Job Description
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {inputMethod === "text" ? (
          <>
        {/* Basic Job Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
                <label className="block text-sm font-medium mb-2">
                  Job Title
                </label>
            <input
              type="text"
              name="job_title"
              value={formData.job_title}
              onChange={handleInputChange}
              className="github-input w-full"
              placeholder="e.g. Senior Software Engineer"
            />
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
            Job Description
          </label>
          <textarea
            name="job_description"
            value={formData.job_description}
            onChange={handleInputChange}
            className="github-input w-full h-32"
            placeholder="Enter detailed job description..."
          />
        </div>

        {/* Skills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
                  Required Skills
            </label>
                <div className="space-y-2">
            <input
              type="text"
                    value={inputValues.required_skills}
                    onChange={(e) =>
                      handleArrayInputChange(e, "required_skills")
                    }
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
                          onClick={() =>
                            removeArrayItem("required_skills", index)
                          }
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
                    onChange={(e) =>
                      handleArrayInputChange(e, "preferred_skills")
                    }
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
                          onClick={() =>
                            removeArrayItem("preferred_skills", index)
                          }
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
                      validationErrors.preferred_locations
                        ? "border-red-500"
                        : ""
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
          </>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
                isDragActive
                  ? "border-github-accent-fg bg-github-canvas-subtle"
                  : "border-github-border-default hover:border-github-accent-fg"
              }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              {file ? (
                <>
                  <DocumentIcon className="w-12 h-12 text-github-accent-fg" />
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-github-fg-default">
                      {file.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="p-1 hover:bg-github-canvas-subtle rounded-full"
                    >
                      <XMarkIcon className="w-5 h-5 text-github-fg-muted" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <FolderIcon className="w-12 h-12 text-github-fg-muted" />
                  <p className="text-github-fg-default">
                    {isDragActive
                      ? "Drop your job description here"
                      : "Drag and drop job description, or click to browse"}
                  </p>
                  <p className="text-sm text-github-fg-muted">
                    Supports PDF, DOCX, and TXT files up to 10MB
                  </p>
                </>
              )}
            </div>
          </div>
        )}

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
            <h3 className="text-lg font-semibold">Preview Results</h3>

            {previewResults.preview_results &&
            previewResults.preview_results.length > 0 ? (
              <>
                <div className="mb-4 p-4 bg-github-canvas-subtle rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-github-fg-default">
                        {previewResults.total_candidates}
                      </div>
                      <div className="text-sm text-github-fg-muted">
                        Total Candidates
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-github-success-fg">
                        {previewResults.predicted_shortlisted}
                      </div>
                      <div className="text-sm text-github-fg-muted">
                        Predicted Shortlist
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-github-danger-fg">
                        {previewResults.predicted_rejected}
                      </div>
                      <div className="text-sm text-github-fg-muted">
                        Predicted Reject
                      </div>
                    </div>
                  </div>
                </div>

                {previewResults.preview_results.map((candidate, index) => (
                  <div
                    key={candidate.candidate_id || index}
                    className="github-card p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-medium">
                          {candidate.candidate_name}
                        </h4>
                        <p className="text-sm text-github-fg-muted">
                          ID: {candidate.candidate_id}
                        </p>
                      </div>
                      <div
                        className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getScoreColor(
                          candidate.combined_score * 100
                        )}`}
                      >
                        {getScoreIcon(candidate.combined_score * 100)}
                        <span className="font-medium">
                          {Math.round(candidate.combined_score * 100)}/100
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm">{candidate.reasoning}</p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-github-success-fg mb-2">
                          Strengths
                        </h5>
                        <ul className="text-sm space-y-1">
                          {candidate.strengths &&
                            candidate.strengths.map((strength, idx) => (
                              <li key={idx}>• {strength}</li>
                            ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-github-danger-fg mb-2">
                          Areas for Consideration
                        </h5>
                        <ul className="text-sm space-y-1">
                          {candidate.weaknesses &&
                            candidate.weaknesses.map((weakness, idx) => (
                              <li key={idx}>• {weakness}</li>
                            ))}
                        </ul>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    {candidate.score_breakdown && (
                      <div className="mt-4 p-3 bg-github-canvas-subtle rounded-lg">
                        <h5 className="font-medium text-github-fg-default mb-2">
                          Score Breakdown
                        </h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {Object.entries(candidate.score_breakdown).map(
                            ([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-github-fg-muted capitalize">
                                  {key.replace(/_/g, " ")}
                                </span>
                                <span className="text-github-fg-default">
                                  {typeof value === "number"
                                    ? `${Math.round(value * 100)}%`
                                    : value}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* View Resume Button */}
                    <div className="mt-4">
                      <button
                        onClick={() => handleViewResume(candidate.candidate_id)}
                        className="btn-github text-sm"
                      >
                        <EyeIcon className="w-4 h-4 mr-1 inline" />
                        View Resume
                      </button>
                    </div>
                  </div>
                ))}
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

            {/* Scoring Explanation */}
            {previewResults.criteria_summary && (
              <div className="github-card bg-github-canvas-subtle p-4">
                <h4 className="font-medium text-github-fg-default mb-2">
                  Applied Criteria
                </h4>
                <div className="text-sm text-github-fg-muted space-y-2">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(previewResults.criteria_summary, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* Resume Modal */}
      <ResumeModal
        isOpen={resumeModal.isOpen}
        onClose={() => setResumeModal({ isOpen: false, url: "", filename: "" })}
        resumeUrl={resumeModal.url}
        filename={resumeModal.filename}
      />
    </motion.div>
  );
}
