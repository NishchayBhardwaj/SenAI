"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FolderIcon,
  DocumentIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";

// Helper to convert markdown resume data into structured JS object
function transformMarkdownToData(md) {
  const resumeData = {
    fullName: "Unknown",
    email: undefined,
    phone: undefined,
    location: undefined,
    education: [],
    workExperience: [],
    skills: [],
    yearsExperience: undefined,
  };

  const sections = md.split("## ");

  sections.forEach((section) => {
    if (!section.trim()) return;

    const lines = section.trim().split("\n");
    const header = lines[0].toLowerCase();
    const body = lines.slice(1).join("\n").trim();

    if (header.includes("full name")) {
      resumeData.fullName = body && body !== "Not found" ? body : "Unknown";
    } else if (header.includes("email")) {
      resumeData.email = body && body !== "Not found" ? body : undefined;
    } else if (header.includes("phone")) {
      resumeData.phone = body && body !== "Not found" ? body : undefined;
    } else if (header.includes("location")) {
      resumeData.location = body && body !== "Not found" ? body : undefined;
    } else if (header.includes("education")) {
      const eduLines = body.split("\n").filter((line) => line.startsWith("- "));
      eduLines.forEach((line) => {
        const content = line.substring(2).trim();
        if (content.includes(",")) {
          const parts = content.split(",").map((p) => p.trim());
          resumeData.education.push({
            degree: parts[0] || "",
            institution: parts[1] || "",
            year: parts[2] || "",
          });
        }
      });
    } else if (header.includes("work experience")) {
      const workLines = body
        .split("\n")
        .filter((line) => line.startsWith("- "));
      workLines.forEach((line) => {
        const content = line.substring(2).trim();
        if (content.includes(",")) {
          const parts = content.split(",").map((p) => p.trim());
          resumeData.workExperience.push({
            company: parts[0] || "",
            position: parts[1] || "",
            duration: parts[2] || "",
          });
        }
      });
    } else if (header.includes("skills")) {
      const skillsContent = body.replace("Not found", "").trim();
      if (skillsContent) {
        if (skillsContent.includes("\n-")) {
          const skillItems = skillsContent
            .split("\n")
            .filter((line) => line.startsWith("- "));
          skillItems.forEach((item) => {
            const skill = item.substring(2).trim();
            if (skill) resumeData.skills.push(skill);
          });
        } else {
          const skillList = skillsContent
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          resumeData.skills.push(...skillList);
        }
      }
    } else if (header.includes("years of experience")) {
      const yearsText = body.replace("Not found", "0").trim();
      const match = yearsText.match(/\d+/);
      if (match) {
        resumeData.yearsExperience = parseInt(match[0], 10);
      }
    }
  });

  return resumeData;
}

const AnimatedDiv = motion.div;

export default function UploadFile() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [persistToDb, setPersistToDb] = useState(true);
  const [uploadResult, setUploadResult] = useState(null);
  const [structuredResume, setStructuredResume] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) return;

      const payload = new FormData();
      payload.append("file", selectedFile);
      payload.append("parse", "true");
      payload.append("save_to_db", persistToDb ? "true" : "false");

      const res = await fetch("http://localhost:8000/upload-resume/", {
        method: "POST",
        body: payload,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      if (data) {
        setUploadResult(data);
        if (data.parsed_data) {
          try {
            const structured = transformMarkdownToData(data.parsed_data);
            setStructuredResume(structured);
          } catch (error) {
            console.error("Parsing error:", error);
          }
        }
        toast.success("Resume uploaded and parsed successfully!");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Upload error");
    },
  });

  const handleDrop = useCallback((acceptedFiles) => {
    const f = acceptedFiles[0];
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File must be smaller than 10MB");
      return;
    }
    setSelectedFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
  });

  const startUpload = () => {
    if (!selectedFile) {
      toast.error("No file selected to upload");
      return;
    }
    uploadMutation.mutate();
  };

  const resetUploader = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setStructuredResume(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-github-fg-default dark:text-github-dark-fg-default mb-2">
          Upload Resume
        </h2>
        <p className="text-github-fg-muted dark:text-github-dark-fg-muted">
          Upload PDF, DOC, DOCX files or paste resume text for AI-powered
          parsing
        </p>
      </div>
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? "border-github-accent-emphasis dark:border-github-dark-accent-emphasis bg-github-accent-subtle dark:bg-github-dark-accent-subtle"
              : "border-github-border-default dark:border-github-dark-border-default hover:border-github-accent-emphasis dark:hover:border-github-dark-accent-emphasis"
          }`}
      >
        <input {...getInputProps()} />{" "}
        <div className="flex flex-col items-center space-y-4">
          {file ? (
            <>
              <DocumentIcon className="w-12 h-12 text-github-accent-fg dark:text-github-dark-accent-fg" />
              <div className="flex items-center space-x-2">
                <span className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
                  {file.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="p-1 hover:bg-github-neutral-muted dark:hover:bg-github-dark-neutral-muted rounded-full"
                >
                  <XMarkIcon className="w-5 h-5 text-github-fg-muted dark:text-github-dark-fg-muted" />
                </button>
              </div>
            </>
          ) : (
            <>
              <FolderIcon className="w-12 h-12 text-github-fg-muted dark:text-github-dark-fg-muted" />
              <p className="text-github-fg-muted dark:text-github-dark-fg-muted">
                {isDragActive
                  ? "Drop your resume here"
                  : "Drag and drop your resume, or click to browse"}
              </p>
              <p className="text-sm text-github-fg-subtle dark:text-github-dark-fg-subtle">
                Supports PDF, DOCX, and TXT files up to 10MB
              </p>
            </>
          )}
        </div>
      </div>{" "}
      {/* Controls */}
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={saveToDb}
            onChange={(e) => setSaveToDb(e.target.checked)}
            className="rounded text-github-accent-emphasis dark:text-github-dark-accent-emphasis focus:ring-github-accent-emphasis dark:focus:ring-github-dark-accent-emphasis"
          />
          <span className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
            Save to database
          </span>
        </label>

        <button
          onClick={handleUpload}
          disabled={!file || upload.isPending}
          className={`btn-github-primary ${
            !file || upload.isPending ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {" "}
          {upload.isPending ? (
            <span className="inline-flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
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
            </span>
          ) : (
            "Upload and Process"
          )}
        </button>
      </div>
      {/* Results */}
      <AnimatePresence>
        {result && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* LLM Processed Results */}
            {parsedData && (
              <div className="space-y-6">
                {" "}
                <div>
                  <h3 className="text-lg font-semibold text-github-fg-default dark:text-github-dark-fg-default">
                    Extracted Information
                  </h3>
                  <div className="mt-4 space-y-4 github-card p-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-github-fg-default dark:text-github-dark-fg-default">
                          Name
                        </h4>
                        <p className="text-github-fg-muted dark:text-github-dark-fg-muted">
                          {parsedData.fullName}
                        </p>
                      </div>
                      {parsedData.email && (
                        <div>
                          <h4 className="font-medium text-github-fg-default dark:text-github-dark-fg-default">
                            Email
                          </h4>
                          <p className="text-github-fg-muted dark:text-github-dark-fg-muted">
                            {parsedData.email}
                          </p>
                        </div>
                      )}
                      {parsedData.phone && (
                        <div>
                          <h4 className="font-medium text-github-fg-default dark:text-github-dark-fg-default">
                            Phone
                          </h4>
                          <p className="text-github-fg-muted dark:text-github-dark-fg-muted">
                            {parsedData.phone}
                          </p>
                        </div>
                      )}
                      {parsedData.location && (
                        <div>
                          <h4 className="font-medium text-github-fg-default dark:text-github-dark-fg-default">
                            Location
                          </h4>
                          <p className="text-github-fg-muted dark:text-github-dark-fg-muted">
                            {parsedData.location}
                          </p>
                        </div>
                      )}
                      {parsedData.yearsExperience !== undefined && (
                        <div>
                          <h4 className="font-medium text-github-fg-default dark:text-github-dark-fg-default">
                            Years of Experience
                          </h4>
                          <p className="text-github-fg-muted dark:text-github-dark-fg-muted">
                            {parsedData.yearsExperience} years
                          </p>
                        </div>
                      )}
                    </div>{" "}
                    {/* Education */}
                    {parsedData.education.length > 0 && (
                      <div>
                        <h4 className="font-medium text-github-fg-default dark:text-github-dark-fg-default mb-2">
                          Education
                        </h4>
                        <div className="space-y-2">
                          {parsedData.education.map((edu, index) => (
                            <div
                              key={index}
                              className="bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle p-3 rounded-md border border-github-border-muted dark:border-github-dark-border-muted"
                            >
                              <p className="font-medium text-github-fg-default dark:text-github-dark-fg-default">
                                {edu.degree}
                              </p>
                              <p className="text-github-fg-muted dark:text-github-dark-fg-muted">
                                {edu.institution}, {edu.year}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}{" "}
                    {/* Work Experience */}
                    {parsedData.workExperience.length > 0 && (
                      <div>
                        <h4 className="font-medium text-github-fg-default dark:text-github-dark-fg-default mb-2">
                          Work Experience
                        </h4>
                        <div className="space-y-3">
                          {parsedData.workExperience.map((exp, index) => (
                            <div
                              key={index}
                              className="bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle p-3 rounded-md border border-github-border-muted dark:border-github-dark-border-muted"
                            >
                              <p className="font-medium text-github-fg-default dark:text-github-dark-fg-default">
                                {exp.position}
                              </p>
                              <p className="text-github-fg-muted dark:text-github-dark-fg-muted">
                                {exp.company} • {exp.duration}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}{" "}
                    {/* Skills */}
                    {parsedData.skills.length > 0 && (
                      <div>
                        <h4 className="font-medium text-github-fg-default dark:text-github-dark-fg-default mb-2">
                          Skills
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {parsedData.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-full bg-github-accent-subtle dark:bg-github-dark-accent-subtle px-3 py-1 text-sm font-medium text-github-accent-fg dark:text-github-dark-accent-fg border border-github-accent-muted dark:border-github-dark-accent-muted"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}{" "}
            {/* Raw Text */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-github-fg-default dark:text-github-dark-fg-default mb-2">
                Extracted Raw Text
              </h3>
              <div className="github-card p-4">
                <pre className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted whitespace-pre-wrap font-mono">
                  {result.extracted_text}
                </pre>
              </div>
            </div>
            {/* Database Save Status */}
            {result.candidate_id && (
              <div className="bg-github-success-subtle dark:bg-github-dark-success-subtle border border-github-success-muted dark:border-github-dark-success-muted p-4 rounded-md">
                <p className="text-github-success-fg dark:text-github-dark-success-fg font-medium">
                  Resume data saved to database with ID: {result.candidate_id}
                </p>
              </div>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
