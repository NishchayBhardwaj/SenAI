"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  FolderIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";
import { resumeApi } from "../src/lib/api";

export default function UploadFile({
  onSuccess = () => {},
  onUploadStart = () => {},
  allowedFileTypes = [".pdf", ".docx", ".doc", ".txt", ".rtf"],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  showTabs = false,
}) {
  const [files, setFiles] = useState([]);
  const [saveToDb, setSaveToDb] = useState(true);
  const [batchResult, setBatchResult] = useState(null);
  const [uploadMode, setUploadMode] = useState("batch");
  const [uploading, setUploading] = useState(false);

  // Single file upload mutation (for backward compatibility)
  const uploadSingle = {
    mutate: () => {
      if (files.length === 0) return;
      const fileToUpload = files[0];
      setFiles(
        files.map((file) => ({
          ...file,
          status: file.id === fileToUpload.id ? "uploading" : file.status,
        }))
      );
      onUploadStart();

      toast.promise(
        resumeApi
          .uploadResume(fileToUpload.file)
          .then((result) => {
            // Check if the result came from cache
            const fromCache = result.fromCache === true;

            setFiles(
              files.map((file) =>
                file.id === fileToUpload.id
                  ? {
                      ...file,
                      status: "success",
                      candidate_id: result.candidate_id,
                      fromCache,
                    }
                  : file
              )
            );

            // Use different success messages for cache hits vs. processing
            if (fromCache) {
              toast.success("Resume loaded from cache!");
            } else {
              toast.success("Resume processed successfully!");
            }

            onSuccess(result);
            return result;
          })
          .catch((error) => {
            console.error("Upload error:", error);

            // Provide more specific error messages
            let errorMessage = "Upload failed";

            if (
              error.code === "ECONNABORTED" ||
              error.message.includes("timeout")
            ) {
              errorMessage =
                "Processing timed out. The resume may be too complex or the server is busy.";
            } else if (
              error.message.includes("Invalid file type") ||
              error.message.includes("empty file")
            ) {
              // Handle file validation errors with clear messages
              errorMessage = error.message;
            } else if (
              error.message.includes("couldn't be processed") ||
              error.message.includes("corrupted")
            ) {
              // Handle content validation errors
              errorMessage = error.message;
            } else if (error.response) {
              // The server responded with a status code outside the 2xx range
              errorMessage = `Server error: ${error.response.status}`;
              if (error.response.data && error.response.data.detail) {
                errorMessage += ` - ${error.response.data.detail}`;
              }
            } else if (error.request) {
              // The request was made but no response was received
              errorMessage =
                "No response from server. Please check your connection.";
            }

            setFiles(
              files.map((file) =>
                file.id === fileToUpload.id
                  ? {
                      ...file,
                      status: "error",
                      error: errorMessage,
                    }
                  : file
              )
            );
            throw new Error(errorMessage);
          }),
        {
          loading: "Processing resume...",
          success: (result) =>
            result.fromCache
              ? "Loaded from cache!"
              : "Resume processed successfully!",
          error: (err) => err.message || "Failed to process resume",
        }
      );
    },
    isPending: false,
  };

  // Batch upload mutation
  const uploadBatch = {
    mutate: () => {
      if (files.length === 0) return;

      // Set all files to uploading status
      setFiles(
        files.map((file) => ({
          ...file,
          status: "uploading",
        }))
      );
      onUploadStart();

      const filesToUpload = files.map((file) => file.file);

      toast.promise(
        resumeApi
          .uploadResumesBatch(filesToUpload)
          .then((result) => {
            setBatchResult(result);

            // Update file statuses based on the batch result
            const updatedFiles = files.map((file) => {
              const resultItem = result.results.find(
                (r) => r.filename === file.file.name
              );
              if (!resultItem) {
                return {
                  ...file,
                  status: "error",
                  error: "No result found for this file",
                };
              }
              return {
                ...file,
                status: resultItem.status === "success" ? "success" : "error",
                error:
                  resultItem.status === "error" ? resultItem.message : null,
                candidate_id: resultItem.candidate_id,
                fromCache: resultItem.fromCache,
              };
            });
            setFiles(updatedFiles);

            // Call onSuccess with the first successful result
            const firstSuccess = result.results.find(
              (r) => r.status === "success"
            );
            if (firstSuccess) {
              onSuccess(firstSuccess);
            }

            return result;
          })
          .catch((error) => {
            console.error("Batch upload error:", error);

            // Provide more specific error messages for batch uploads
            let errorMessage = "Batch upload failed";

            if (
              error.code === "ECONNABORTED" ||
              error.message.includes("timeout")
            ) {
              errorMessage =
                "Processing timed out. The batch may be too large or complex.";
            } else if (error.response) {
              errorMessage = `Server error: ${error.response.status}`;
              if (error.response.data && error.response.data.detail) {
                errorMessage += ` - ${error.response.data.detail}`;
              }
            } else if (error.request) {
              errorMessage =
                "No response from server. Please check your connection.";
            }

            // Mark all files as error
            setFiles(
              files.map((file) => ({
                ...file,
                status: "error",
                error: errorMessage,
              }))
            );
            throw new Error(errorMessage);
          }),
        {
          loading: "Processing resume batch...",
          success: `Processed ${files.length} resume(s)`,
          error: (err) => err.message || "Failed to process resumes",
        }
      );
    },
    isPending: false,
  };

  // File drop handler
  const onDrop = useCallback(
    (acceptedFiles) => {
      // Additional validation for corrupted or empty files
      const validatedFiles = acceptedFiles.filter((file) => {
        // Basic size check - files under 100 bytes are likely empty or corrupted
        if (file.size < 100) {
          toast.error(`${file.name} appears to be empty or corrupted`);
          return false;
        }
        return true;
      });

      const newFiles = validatedFiles.map((file) => ({
        id: `${file.name}-${Date.now()}`,
        file,
        status: "idle", // idle, uploading, success, error
        error: null,
        candidate_id: null,
      }));

      setFiles([...files, ...newFiles]);
    },
    [files]
  );

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
      "application/rtf": [".rtf"],
    },
    maxSize: maxFileSize,
    multiple: uploadMode === "batch",
    onDropRejected: (rejections) => {
      rejections.forEach((rejection) => {
        const { file, errors } = rejection;
        if (errors[0]?.code === "file-too-large") {
          toast.error(`${file.name} is too large. Max size is 10MB.`);
        } else if (errors[0]?.code === "file-invalid-type") {
          toast.error(
            `${file.name} has an invalid file type. Please upload PDF, DOCX, DOC, TXT, or RTF.`
          );
        } else {
          toast.error(`Error uploading ${file.name}: ${errors[0]?.message}`);
        }
      });
    },
  });

  // Remove a file from the list
  const removeFile = (fileId) => {
    setFiles(files.filter((file) => file.id !== fileId));
  };

  // Clear all files
  const clearAll = () => {
    setFiles([]);
    setBatchResult(null);
  };

  // Handle file upload
  const handleUpload = () => {
    if (files.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    if (uploadMode === "single" || files.length === 1) {
      uploadSingle.mutate();
    } else {
      uploadBatch.mutate();
    }
  };

  // Get status icon based on file status
  const getStatusIcon = (status) => {
    switch (status) {
      case "uploading":
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "error":
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <DocumentArrowUpIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  // Get status color based on file status
  const getStatusColor = (status) => {
    switch (status) {
      case "uploading":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "success":
        return "bg-green-50 text-green-700 border-green-200";
      case "error":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const isUploading =
    files.some((file) => file.status === "uploading") ||
    uploadSingle.isPending ||
    uploadBatch.isPending;

  return (
    <div className="space-y-6">
      {showTabs && (
        <div className="flex border-b border-gray-200">
          <button
            className={`py-2 px-4 font-medium text-sm ${
              uploadMode === "single"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setUploadMode("single")}
          >
            Single Resume
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm ${
              uploadMode === "batch"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setUploadMode("batch")}
          >
            Batch Upload
          </button>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-indigo-300 bg-indigo-50"
            : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-900">
          Drag and drop your resume{uploadMode === "batch" ? "s" : ""}, or{" "}
          <span className="text-indigo-600">browse</span>
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Supported formats: PDF, DOCX, DOC, TXT, RTF (max 10MB)
        </p>
      </div>

      {files.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">
              {files.length} file{files.length !== 1 && "s"} selected
            </h3>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-indigo-600 hover:text-indigo-800"
              disabled={isUploading}
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-auto pr-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-3 rounded-md border ${getStatusColor(
                  file.status
                )}`}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium truncate">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {file.status === "error" && (
                    <p className="text-xs text-red-700 max-w-xs truncate">
                      {file.error || "Upload failed"}
                    </p>
                  )}
                  {file.status === "success" && file.fromCache && (
                    <p className="text-xs text-green-700">Loaded from cache</p>
                  )}
                  {file.status !== "uploading" && (
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="p-1 rounded-full text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleUpload}
              disabled={
                isUploading || files.every((f) => f.status === "success")
              }
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Processing...
                </>
              ) : files.every((f) => f.status === "success") ? (
                <>
                  <DocumentCheckIcon className="-ml-1 mr-2 h-5 w-5" />
                  All files processed
                </>
              ) : (
                <>
                  <DocumentArrowUpIcon className="-ml-1 mr-2 h-5 w-5" />
                  {uploadMode === "batch" && files.length > 1
                    ? `Process ${files.length} resumes`
                    : "Process resume"}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {batchResult && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Batch Summary
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white p-2 rounded border border-gray-200">
              <p className="text-gray-500">Total</p>
              <p className="font-medium">{batchResult.total_files}</p>
            </div>
            <div className="bg-white p-2 rounded border border-gray-200">
              <p className="text-gray-500">Successful</p>
              <p className="font-medium text-green-600">
                {batchResult.successful}
              </p>
            </div>
            <div className="bg-white p-2 rounded border border-gray-200">
              <p className="text-gray-500">Failed</p>
              <p className="font-medium text-red-600">{batchResult.failed}</p>
            </div>
            <div className="bg-white p-2 rounded border border-gray-200">
              <p className="text-gray-500">Duplicates</p>
              <p className="font-medium text-amber-600">
                {batchResult.duplicates}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
