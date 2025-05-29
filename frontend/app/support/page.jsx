"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export default function SupportPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-white mb-4">
          Support & Contact
        </h1>
        <p className="text-lg text-gray-200 max-w-3xl">
          Get in touch with our team for assistance with the Resume Processing
          System.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* Contact Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="col-span-2"
        >
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">
                Contact Options
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <EnvelopeIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Email Support
                  </h3>
                  <p className="mt-1 text-gray-600">
                    For general inquiries and support requests
                  </p>
                  <a
                    href="mailto:support@resumeai.example.com"
                    className="mt-2 inline-block text-indigo-600 hover:text-indigo-800"
                  >
                    support@resumeai.example.com
                  </a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <PhoneIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Phone Support
                  </h3>
                  <p className="mt-1 text-gray-600">
                    Available Monday-Friday, 9am-5pm EST
                  </p>
                  <a
                    href="tel:+15551234567"
                    className="mt-2 inline-block text-indigo-600 hover:text-indigo-800"
                  >
                    +1 (555) 123-4567
                  </a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Live Chat
                  </h3>
                  <p className="mt-1 text-gray-600">
                    Chat with our support team in real-time
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">
                Common Questions
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <QuestionMarkCircleIcon className="h-5 w-5 text-indigo-600 mr-2" />
                    How do I upload multiple resumes at once?
                  </h3>
                  <p className="mt-1 text-gray-600 pl-7">
                    You can upload multiple files by selecting them together in
                    the file picker or by dragging and dropping multiple files
                    onto the upload area in the Import Profiles section.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <QuestionMarkCircleIcon className="h-5 w-5 text-indigo-600 mr-2" />
                    What file formats are supported for resume uploads?
                  </h3>
                  <p className="mt-1 text-gray-600 pl-7">
                    Our system supports PDF, DOCX, DOC, and plain text (TXT)
                    formats for resume uploads. For best results, we recommend
                    using PDF format.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <QuestionMarkCircleIcon className="h-5 w-5 text-indigo-600 mr-2" />
                    How do I export candidate data?
                  </h3>
                  <p className="mt-1 text-gray-600 pl-7">
                    You can export candidate data from the Talent Pool section
                    by clicking the Export button. The data will be downloaded
                    as a CSV file that can be opened in any spreadsheet
                    application.
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/docs"
                  className="text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  <DocumentTextIcon className="h-5 w-5 mr-1" />
                  View full documentation
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
