"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamically import components to avoid SSR issues with client components
const UploadFile = dynamic(() => import("./UploadFile"), {
  ssr: false,
});
const Candidateslist = dynamic(() => import("./Candidateslist"), {
  ssr: false,
});
const ShortlistingForm = dynamic(() => import("./ShortlistingForm"), {
  ssr: false,
});
const DashboardStats = dynamic(() => import("./DashboardStats"), {
  ssr: false,
});

export default function TalentHub() {
  const [activeTab, setActiveTab] = useState("intro"); // intro, upload, candidates, shortlisting
  const [shortlistPreview, setShortlistPreview] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    // Show dashboard after intro animation
    const timer = setTimeout(() => {
      setShowDashboard(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handlePreviewResults = (results) => {
    setShortlistPreview(results);
    setActiveTab("candidates");
  };

  const tabs = [
    { id: "upload", name: "Import Profiles" },
    { id: "candidates", name: "Talent Pool" },
    { id: "shortlisting", name: "Evaluation" },
  ];

  const introVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  const dashboardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Animated Introduction */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={introVariants}
        className="mb-12 text-center"
      >
        <h1 className="text-4xl font-bold text-github-fg-default dark:text-github-dark-fg-default mb-6">
          AI-Powered Talent Acquisition Suite
        </h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-3xl mx-auto text-github-fg-muted dark:text-github-dark-fg-muted space-y-4"
        >
          <p className="text-lg">
            Welcome to the next generation of talent acquisition. Our AI-driven
            platform streamlines your recruitment process by automatically
            analyzing resumes, identifying top candidates, and providing
            intelligent shortlisting recommendations.
          </p>
          <p className="text-lg">
            With advanced machine learning algorithms and natural language
            processing, we help you find the perfect match for your organization
            while saving valuable time and resources.
          </p>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={() => setActiveTab("upload")}
            className="mt-6 btn-github-primary text-lg px-8 py-3"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Processing Resumes
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Analytics Summary */}
      <motion.div
        variants={dashboardVariants}
        initial="hidden"
        animate={showDashboard ? "visible" : "hidden"}
        className="mb-8"
      >
        <DashboardStats />
      </motion.div>

      {/* Navigation Tabs */}
      {activeTab !== "intro" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex space-x-4 mb-6"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-github-accent-subtle dark:bg-github-dark-accent-subtle text-github-accent-fg dark:text-github-dark-accent-fg"
                  : "text-github-fg-muted dark:text-github-dark-fg-muted hover:bg-github-canvas-subtle dark:hover:bg-github-dark-canvas-subtle"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </motion.div>
      )}

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab !== "intro" && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="github-card p-6 shadow-sm"
          >
            {activeTab === "upload" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <UploadFile
                  onUploadSuccess={() => setActiveTab("candidates")}
                />
              </motion.div>
            )}

            {activeTab === "candidates" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Candidateslist previewResults={shortlistPreview} />
              </motion.div>
            )}

            {activeTab === "shortlisting" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <ShortlistingForm onPreviewResults={handlePreviewResults} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
