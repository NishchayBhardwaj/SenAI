"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ForceGraph2D } from "react-force-graph";
import { useQuery } from "@tanstack/react-query";
import { resumeApi } from "../src/lib/api";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function SkillGraphVisualizer({
  candidates,
  isSimplified = false,
}) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [minCoOccurrence, setMinCoOccurrence] = useState(2);
  const [graphRef, setGraphRef] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate skill co-occurrence from candidates data
  const buildGraph = useCallback(() => {
    if (!candidates || candidates.length === 0) {
      setGraphData({ nodes: [], links: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Extract all skills
      const skillsMap = new Map(); // Map to store skills and their frequency
      const coOccurrence = new Map(); // Map to store skill co-occurrences

      // Process candidates to extract skills and co-occurrences
      candidates.forEach((candidate) => {
        if (
          !candidate.skills ||
          !Array.isArray(candidate.skills) ||
          candidate.skills.length === 0
        ) {
          return;
        }

        // Extract skill names
        const candidateSkills = candidate.skills
          .map((skill) => {
            if (typeof skill === "string") return skill;
            if (typeof skill === "object" && skill && skill.skill_name)
              return skill.skill_name;
            return null;
          })
          .filter(Boolean);

        // Update skill frequencies
        candidateSkills.forEach((skill) => {
          if (!skillsMap.has(skill)) {
            skillsMap.set(skill, 0);
          }
          skillsMap.set(skill, skillsMap.get(skill) + 1);
        });

        // Calculate co-occurrences for this candidate
        for (let i = 0; i < candidateSkills.length; i++) {
          for (let j = i + 1; j < candidateSkills.length; j++) {
            const pair = [candidateSkills[i], candidateSkills[j]]
              .sort()
              .join("|||");
            if (!coOccurrence.has(pair)) {
              coOccurrence.set(pair, 0);
            }
            coOccurrence.set(pair, coOccurrence.get(pair) + 1);
          }
        }
      });

      // Create nodes from skills
      const nodes = Array.from(skillsMap.entries())
        .filter(([_, count]) => count >= minCoOccurrence / 2)
        .map(([skill, count]) => ({
          id: skill,
          name: skill,
          val: count,
          color: getSkillColor(skill),
        }));

      // Create links from co-occurrences
      const links = [];
      coOccurrence.forEach((count, pair) => {
        if (count >= minCoOccurrence) {
          const [source, target] = pair.split("|||");

          // Ensure both source and target exist in nodes
          if (
            nodes.find((n) => n.id === source) &&
            nodes.find((n) => n.id === target)
          ) {
            links.push({
              source,
              target,
              value: count,
            });
          }
        }
      });

      setGraphData({ nodes, links });
    } catch (error) {
      console.error("Error building skill graph:", error);
      toast.error("Failed to build skill graph");
    } finally {
      setIsLoading(false);
    }
  }, [candidates, minCoOccurrence]);

  // Generate a consistent color based on the skill name
  const getSkillColor = (skill) => {
    const skillCategories = {
      // Programming Languages
      python: "#3776AB",
      javascript: "#F7DF1E",
      typescript: "#3178C6",
      java: "#007396",
      "c#": "#68217A",
      "c++": "#00599C",
      php: "#777BB4",
      ruby: "#CC342D",
      go: "#00ADD8",
      rust: "#000000",
      swift: "#FA7343",
      kotlin: "#7F52FF",

      // Web Development
      react: "#61DAFB",
      vue: "#4FC08D",
      angular: "#DD0031",
      node: "#339933",
      express: "#000000",
      html: "#E34F26",
      css: "#1572B6",
      sass: "#CC6699",
      webpack: "#8DD6F9",
      "next.js": "#000000",
      nuxt: "#00C58E",

      // Data Science / ML
      tensorflow: "#FF6F00",
      pytorch: "#EE4C2C",
      pandas: "#150458",
      numpy: "#013243",
      "scikit-learn": "#F7931E",
      "machine learning": "#01A9DB",
      "deep learning": "#8904B1",
      "data science": "#4C0B5F",

      // Cloud / DevOps
      aws: "#FF9900",
      azure: "#0089D6",
      gcp: "#4285F4",
      docker: "#2496ED",
      kubernetes: "#326CE5",
      terraform: "#623CE4",
      jenkins: "#D33833",
      "ci/cd": "#40E0D0",

      // Databases
      sql: "#003B57",
      mysql: "#4479A1",
      postgresql: "#336791",
      mongodb: "#47A248",
      redis: "#DC382D",
      firebase: "#FFCA28",

      // Soft Skills
      leadership: "#9370DB",
      communication: "#20B2AA",
      teamwork: "#6A5ACD",
      "problem solving": "#9932CC",
      "project management": "#8A2BE2",
    };

    // Check if the skill exists in our categories (case insensitive)
    const lowerSkill = skill.toLowerCase();
    for (const [key, color] of Object.entries(skillCategories)) {
      if (lowerSkill.includes(key) || key.includes(lowerSkill)) {
        return color;
      }
    }

    // Generate a color based on the string if not found
    let hash = 0;
    for (let i = 0; i < skill.length; i++) {
      hash = skill.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  // Handle node hover
  const handleNodeHover = (node) => {
    if (!node) {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      setHoverNode(null);
      return;
    }

    setHoverNode(node);

    // Get connected nodes and links
    const connectedNodes = new Set([node.id]);
    const connectedLinks = new Set();

    graphData.links.forEach((link) => {
      if (link.source.id === node.id || link.target.id === node.id) {
        connectedNodes.add(link.source.id);
        connectedNodes.add(link.target.id);
        connectedLinks.add(link);
      }
    });

    setHighlightNodes(connectedNodes);
    setHighlightLinks(connectedLinks);
  };

  // Handle node click
  const handleNodeClick = (node) => {
    if (graphRef) {
      // Center the view on the clicked node
      graphRef.centerAt(node.x, node.y, 1000);
    }
  };

  // Filter graph by search term
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      buildGraph();
      return;
    }

    const lowerSearch = searchTerm.toLowerCase();

    // Filter nodes based on search
    const filteredNodes = graphData.nodes.filter((node) =>
      node.name.toLowerCase().includes(lowerSearch)
    );

    // Get IDs of filtered nodes
    const nodeIds = new Set(filteredNodes.map((node) => node.id));

    // Filter links that connect filtered nodes
    const filteredLinks = graphData.links.filter(
      (link) =>
        nodeIds.has(link.source.id || link.source) &&
        nodeIds.has(link.target.id || link.target)
    );

    setGraphData({ nodes: filteredNodes, links: filteredLinks });
  };

  // Initialize graph data
  useEffect(() => {
    buildGraph();
  }, [buildGraph, minCoOccurrence]);

  // Simple version for embedding in other components
  if (isSimplified) {
    return (
      <div className="h-[300px] w-full bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle rounded-md">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-github-accent-fg dark:text-github-dark-accent-fg" />
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-github-fg-muted dark:text-github-dark-fg-muted">
            No skill data available
          </div>
        ) : (
          <ForceGraph2D
            ref={setGraphRef}
            graphData={graphData}
            nodeRelSize={5}
            nodeLabel="name"
            linkWidth={(link) => (highlightLinks.has(link) ? 3 : 1)}
            linkColor={(link) =>
              highlightLinks.has(link) ? "#F9A826" : "#cccccc"
            }
            nodeColor={(node) => node.color}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            width={600}
            height={300}
          />
        )}
      </div>
    );
  }

  // Full version with controls
  return (
    <div className="github-card p-6 overflow-hidden">
      <h2 className="text-xl font-semibold mb-4 text-github-fg-default dark:text-github-dark-fg-default">
        Skill Co-occurrence Graph
      </h2>

      <div className="mb-6">
        <p className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted mb-4">
          This visualization shows how skills appear together across candidates'
          resumes. Larger nodes represent more common skills, while thicker
          connections show skills that frequently appear together.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Search input */}
          <div className="col-span-2">
            <div className="flex items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search skills..."
                className="github-input w-full"
              />
              <button onClick={handleSearch} className="ml-2 btn-github">
                <MagnifyingGlassIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setSearchTerm("");
                  buildGraph();
                }}
                className="ml-2 btn-github"
                title="Reset search"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Min. Co-occurrence</label>
              <select
                value={minCoOccurrence}
                onChange={(e) => setMinCoOccurrence(Number(e.target.value))}
                className="github-input text-sm py-1"
              >
                <option value={1}>1+ (All)</option>
                <option value={2}>2+</option>
                <option value={3}>3+</option>
                <option value={5}>5+</option>
                <option value={10}>10+</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Graph visualization */}
      <div className="h-[600px] w-full bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle rounded-md overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <ArrowPathIcon className="h-12 w-12 animate-spin text-github-accent-fg dark:text-github-dark-accent-fg" />
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-github-fg-muted dark:text-github-dark-fg-muted">
            No skill data available for visualization
          </div>
        ) : (
          <ForceGraph2D
            ref={setGraphRef}
            graphData={graphData}
            nodeRelSize={7}
            nodeLabel="name"
            linkWidth={(link) => (highlightLinks.has(link) ? 3 : 1)}
            linkColor={(link) =>
              highlightLinks.has(link) ? "#F9A826" : "#cccccc"
            }
            nodeColor={(node) => node.color}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            cooldownTicks={100}
            linkDirectionalParticles={(link) =>
              highlightLinks.has(link) ? 4 : 0
            }
            linkDirectionalParticleWidth={2}
          />
        )}
      </div>

      {/* Hover information */}
      {hoverNode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle rounded-md"
        >
          <h3 className="text-lg font-medium text-github-fg-default dark:text-github-dark-fg-default">
            {hoverNode.name}
          </h3>
          <p className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
            Found in {hoverNode.val} candidate{hoverNode.val !== 1 ? "s" : ""}
          </p>
          <div className="mt-2">
            <p className="text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default">
              Related Skills:
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {Array.from(highlightNodes)
                .filter((id) => id !== hoverNode.id)
                .map((id) => {
                  const node = graphData.nodes.find((n) => n.id === id);
                  return node ? (
                    <span
                      key={id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-github-accent-subtle dark:bg-github-dark-accent-subtle text-github-accent-fg dark:text-github-dark-accent-fg"
                      style={{
                        backgroundColor: `${node.color}22`,
                        color: node.color,
                      }}
                    >
                      {node.name}
                    </span>
                  ) : null;
                })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
