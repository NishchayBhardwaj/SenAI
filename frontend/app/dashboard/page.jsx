"use client";

import React, { useEffect } from "react";
import ProtectedZone from "../../components/Protected";
import CandidateToolbox from "../../components/ResumeProcessor";
import { useRouteProtection } from "../../src/lib/routes";

const Workspace = () => {
  // Use route protection to verify authentication
  useRouteProtection();

  return (
    <ProtectedZone>
      <div className="space-y-6">
        <CandidateToolbox />
      </div>
    </ProtectedZone>
  );
};

export default Workspace;
