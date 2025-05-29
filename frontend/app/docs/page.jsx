"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DocumentationPage() {
  const [activeTab, setActiveTab] = useState("database");

  const tabs = [
    { id: "database", name: "Database Design" },
    { id: "api", name: "API Design" },
    { id: "ui", name: "UI/UX Guidelines" },
    { id: "git", name: "Git Best Practices" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-white mb-4">
          Documentation Resources
        </h1>
        <p className="text-lg text-gray-200 max-w-3xl">
          Comprehensive resources to help you understand our system
          architecture, design principles, and development best practices.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === "database" && (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Database Design Best Practices
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Relational Database Design
                </h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Normalize your database to reduce redundancy</li>
                  <li>Use appropriate indexing for performance optimization</li>
                  <li>Implement proper foreign key constraints</li>
                  <li>Design with scalability in mind</li>
                  <li>Choose appropriate data types for efficiency</li>
                </ul>
                <div className="mt-4">
                  <a
                    href="https://www.postgresql.org/docs/current/ddl.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    PostgreSQL Documentation →
                  </a>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  NoSQL Database Design
                </h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Design for query patterns, not data relationships</li>
                  <li>Denormalize data for better read performance</li>
                  <li>Implement efficient document structures</li>
                  <li>Consider sharding for horizontal scaling</li>
                  <li>Plan for eventual consistency</li>
                </ul>
                <div className="mt-4">
                  <a
                    href="https://www.mongodb.com/basics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    MongoDB Best Practices →
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-indigo-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Recommended Resources
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://www.sqlstyle.guide/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    SQL Style Guide
                  </a>
                  <p className="text-sm text-gray-600">
                    A consistent approach to writing SQL that's easy to read and
                    maintain
                  </p>
                </li>
                <li>
                  <a
                    href="https://university.mongodb.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    MongoDB University
                  </a>
                  <p className="text-sm text-gray-600">
                    Free online courses on MongoDB database design
                  </p>
                </li>
                <li>
                  <a
                    href="https://use-the-index-luke.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Use The Index, Luke!
                  </a>
                  <p className="text-sm text-gray-600">
                    A guide to database performance for developers
                  </p>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              RESTful API Design Principles
            </h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Core REST Principles
                </h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>
                    Use HTTP methods appropriately (GET, POST, PUT, DELETE)
                  </li>
                  <li>Implement stateless communication</li>
                  <li>Design around resources and representations</li>
                  <li>Use meaningful URI paths</li>
                  <li>Apply consistent response formats (usually JSON)</li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  API Versioning & Documentation
                </h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Implement versioning from the start (e.g., /api/v1/)</li>
                  <li>Document your API with OpenAPI/Swagger</li>
                  <li>Provide clear error handling and status codes</li>
                  <li>Include examples in documentation</li>
                  <li>Set up a sandbox environment for testing</li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Best Practices for API Design
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Security</h4>
                  <ul className="list-disc pl-5 text-gray-700 space-y-1">
                    <li>Always use HTTPS</li>
                    <li>Implement proper authentication</li>
                    <li>Use rate limiting to prevent abuse</li>
                    <li>Validate all inputs</li>
                    <li>Follow the principle of least privilege</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Performance
                  </h4>
                  <ul className="list-disc pl-5 text-gray-700 space-y-1">
                    <li>Implement pagination for large collections</li>
                    <li>Allow filtering, sorting, and field selection</li>
                    <li>Use caching effectively</li>
                    <li>Compress responses when appropriate</li>
                    <li>Optimize database queries</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Recommended Resources
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://restfulapi.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    RESTful API Tutorial
                  </a>
                  <p className="text-sm text-gray-600">
                    Comprehensive guide to RESTful API design
                  </p>
                </li>
                <li>
                  <a
                    href="https://swagger.io/resources/articles/best-practices-in-api-design/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Swagger API Design Best Practices
                  </a>
                  <p className="text-sm text-gray-600">
                    Guidelines for creating developer-friendly APIs
                  </p>
                </li>
                <li>
                  <a
                    href="https://jsonapi.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    JSON:API Specification
                  </a>
                  <p className="text-sm text-gray-600">
                    A specification for building APIs in JSON
                  </p>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "ui" && (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Frontend UI/UX Guidelines
            </h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Design Principles
                </h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Focus on user needs and goals</li>
                  <li>Maintain consistency across the application</li>
                  <li>Design for accessibility (WCAG guidelines)</li>
                  <li>Use clear visual hierarchy</li>
                  <li>Provide feedback for user actions</li>
                  <li>Implement responsive design for all devices</li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  UI Component Guidelines
                </h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Use consistent spacing and sizing</li>
                  <li>Implement a cohesive color system</li>
                  <li>Select readable typography</li>
                  <li>Create reusable components</li>
                  <li>Follow platform conventions where appropriate</li>
                  <li>Design for different states (loading, error, empty)</li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                User Experience Best Practices
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Navigation & Information Architecture
                  </h4>
                  <ul className="list-disc pl-5 text-gray-700 space-y-1">
                    <li>Create intuitive navigation paths</li>
                    <li>Minimize the number of steps to complete tasks</li>
                    <li>Organize content logically</li>
                    <li>Provide clear wayfinding</li>
                    <li>Use progressive disclosure for complex interfaces</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Forms & User Input
                  </h4>
                  <ul className="list-disc pl-5 text-gray-700 space-y-1">
                    <li>Label inputs clearly</li>
                    <li>Provide helpful validation messages</li>
                    <li>Minimize required fields</li>
                    <li>Use appropriate input types</li>
                    <li>Implement smart defaults when possible</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Recommended Resources
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://www.nngroup.com/articles/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Nielsen Norman Group Articles
                  </a>
                  <p className="text-sm text-gray-600">
                    Research-based UX guidance
                  </p>
                </li>
                <li>
                  <a
                    href="https://material.io/design"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Material Design Guidelines
                  </a>
                  <p className="text-sm text-gray-600">
                    Google's design system for creating digital experiences
                  </p>
                </li>
                <li>
                  <a
                    href="https://www.w3.org/WAI/standards-guidelines/wcag/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Web Content Accessibility Guidelines (WCAG)
                  </a>
                  <p className="text-sm text-gray-600">
                    International standards for making web content accessible
                  </p>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "git" && (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Git Best Practices & README Templates
            </h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Git Workflow Best Practices
                </h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Use feature branches for new development</li>
                  <li>Write meaningful commit messages</li>
                  <li>Commit early and often</li>
                  <li>Regularly pull from the main branch</li>
                  <li>Use pull requests for code reviews</li>
                  <li>Tag releases with semantic versioning</li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Commit Message Guidelines
                </h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                  <li>Use a consistent format (e.g., conventional commits)</li>
                  <li>Start with a concise summary line</li>
                  <li>Separate subject from body with a blank line</li>
                  <li>Use imperative mood in the subject line</li>
                  <li>Explain what and why, not how</li>
                  <li>Reference issue numbers where appropriate</li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                README Template Sections
              </h3>
              <div className="bg-gray-50 p-4 rounded-md font-mono text-sm mb-4">
                <pre className="whitespace-pre-wrap">
                  {`# Project Title

A brief description of what this project does and who it's for.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
npm install my-project
cd my-project
npm start
\`\`\`

## Usage

\`\`\`javascript
import { myFunction } from 'my-project';

// Example usage
const result = myFunction();
\`\`\`

## API Reference

#### Get all items

\`\`\`http
  GET /api/items
\`\`\`

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file:

- \`API_KEY\`
- \`ANOTHER_API_KEY\`

## Contributing

Contributions are always welcome!

See \`contributing.md\` for ways to get started.

## License

[MIT](https://choosealicense.com/licenses/mit/)`}
                </pre>
              </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Recommended Resources
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://www.conventionalcommits.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Conventional Commits
                  </a>
                  <p className="text-sm text-gray-600">
                    A specification for adding human and machine-readable
                    meaning to commit messages
                  </p>
                </li>
                <li>
                  <a
                    href="https://github.com/github/gitignore"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    GitHub's collection of .gitignore templates
                  </a>
                  <p className="text-sm text-gray-600">
                    Collection of useful .gitignore templates
                  </p>
                </li>
                <li>
                  <a
                    href="https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/about-readmes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    GitHub README Guide
                  </a>
                  <p className="text-sm text-gray-600">
                    Official GitHub guide to creating effective README files
                  </p>
                </li>
              </ul>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
