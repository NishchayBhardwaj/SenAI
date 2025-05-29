"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/login");
  };

  // Home page should always render and not redirect
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="relative pt-16 pb-32 flex content-center items-center justify-center">
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center">
            <div className="w-full lg:w-1/2 px-4 ml-auto mr-auto text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-4xl md:text-5xl font-bold mb-6 text-indigo-700">
                  AI-Powered Talent Acquisition Suite
                </h1>
                <p className="text-lg mb-4 text-gray-700">
                  Welcome to the next generation of talent acquisition. Our
                  AI-driven platform streamlines your recruitment process by
                  automatically analyzing resumes, identifying top candidates,
                  and providing intelligent shortlisting recommendations.
                </p>
                <p className="text-lg mb-8 text-gray-700">
                  With advanced machine learning algorithms and natural language
                  processing, we help you find the perfect match for your
                  organization while saving valuable time and resources.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGetStarted}
                    className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 shadow-lg"
                  >
                    Get Started
                  </motion.button>
                  <button className="mt-3 sm:mt-0 sm:ml-3 px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10">
                    Learn More
                  </button>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="w-full lg:w-1/2 px-4 mt-12 lg:mt-0"
            >
              <div className="rounded-lg shadow-xl overflow-hidden bg-white">
                <div className="px-6 py-8 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg
                    className="h-48 w-48 text-white opacity-25"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
                <div className="px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Streamline Your Hiring Process
                  </h3>
                  <p className="mt-1 text-gray-600">
                    Process hundreds of resumes in minutes with our AI-powered
                    solution
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">
              Features
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              A better way to hire
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Everything you need to streamline your recruitment process
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
