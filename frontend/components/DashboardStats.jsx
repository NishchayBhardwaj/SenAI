"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { resumeApi } from "../src/lib/api";
import {
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="github-card p-6"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
          {title}
        </p>
        <h3 className="text-2xl font-bold mt-1 text-github-fg-default dark:text-github-dark-fg-default">
          {value}
        </h3>
      </div>
      <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
  </motion.div>
);

export default function DashboardStats() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: resumeApi.getDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="github-card p-6 animate-pulse">
            <div className="h-16 bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-github-danger-fg dark:text-github-dark-danger-fg text-center py-4">
        Error loading dashboard stats
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Candidates",
      value: stats?.total_candidates || 0,
      icon: UserGroupIcon,
      color: "text-github-accent-fg dark:text-github-dark-accent-fg",
      delay: 0,
    },
    {
      title: "Shortlisted",
      value: stats?.shortlisted_candidates || 0,
      icon: CheckCircleIcon,
      color: "text-github-success-fg dark:text-github-dark-success-fg",
      delay: 0.1,
    },
    {
      title: "Rejected",
      value: stats?.rejected_candidates || 0,
      icon: XCircleIcon,
      color: "text-github-danger-fg dark:text-github-dark-danger-fg",
      delay: 0.2,
    },
    {
      title: "Pending Review",
      value: stats?.pending_candidates || 0,
      icon: ClockIcon,
      color: "text-github-neutral-fg dark:text-github-dark-neutral-fg",
      delay: 0.3,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
}
