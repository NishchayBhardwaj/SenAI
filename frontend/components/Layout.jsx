"use client";

import { motion } from "framer-motion";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-github-canvas-default dark:bg-github-dark-canvas-default">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen"
      >
        {/* Header */}
        <header className="bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle border-b border-github-border-default dark:border-github-dark-border-default">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-github-fg-default dark:text-github-dark-fg-default">
                Resume Parser
              </h1>
              {/* Add any header content here */}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow">{children}</main>

        {/* Footer */}
        <footer className="bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle border-t border-github-border-default dark:border-github-dark-border-default mt-8">
          <div className="container mx-auto px-4 py-4">
            <div className="text-center text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
              © {new Date().getFullYear()} Resume Parser. All rights reserved.
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
