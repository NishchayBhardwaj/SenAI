"use client";

import React from "react";
import ProtectedZone from "../../components/Protected";
import CandidateToolbox from "../../components/ResumeProcessor";

const Workspace = () => {
  return (
    <ProtectedZone>
      <div className="space-y-6">
        <CandidateToolbox />
      </div>
    </ProtectedZone>
  );
};

export default Workspace;
