"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserProfile from "./UserProfile";
import { useAuth } from "../src/lib/auth-context";
import { motion } from "framer-motion";

export default function Layout({ children }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const navLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Documentation", href: "/docs" },
    { name: "Support", href: "/support" },
    { name: "Redis Cache", href: "/advanced/cache", badge: "New" },
    { name: "Skills Graph", href: "/advanced/skills-graph", badge: "New" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="font-bold text-xl text-indigo-600">
                  ResumeAI
                </Link>
              </div>
              {isAuthenticated && (
                <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        pathname === link.href
                          ? "border-indigo-500 text-gray-900"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                    >
                      {link.name}
                      {link.badge && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
            <div className="flex items-center">
              {isAuthenticated ? (
                <UserProfile />
              ) : (
                pathname !== "/login" && (
                  <Link
                    href="/login"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Sign in
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-grow"
      >
        {children}
      </motion.main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} ResumeAI. All rights reserved.
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/docs" className="text-gray-400 hover:text-gray-500">
                Documentation
              </Link>
              <Link
                href="/support"
                className="text-gray-400 hover:text-gray-500"
              >
                Support & Contact
              </Link>
              <Link href="/" className="text-gray-400 hover:text-gray-500">
                Home
              </Link>
              <Link
                href="/advanced/cache"
                className="text-gray-400 hover:text-gray-500"
              >
                Redis Cache
              </Link>
              <Link
                href="/advanced/skills-graph"
                className="text-gray-400 hover:text-gray-500"
              >
                Skills Graph
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
