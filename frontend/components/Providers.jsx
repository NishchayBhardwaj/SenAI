"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, domMax } from "framer-motion";

export default function Providers({ children }) {
  const [client] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <LazyMotion features={domMax}>
        <>{children}</>
      </LazyMotion>
    </QueryClientProvider>
  );
}
