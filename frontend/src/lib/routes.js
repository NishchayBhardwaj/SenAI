"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-context";

// Define public routes that don't require authentication
export const publicRoutes = ["/", "/login", "/register", "/docs", "/support"];

// Define routes that require authentication
export const protectedRoutes = [
  "/dashboard",
  "/profile",
  "/settings",
  "/candidates",
];

// Hook to use in components that need route protection
export function useRouteProtection() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip route protection on public routes
    if (publicRoutes.includes(pathname)) {
      return;
    }

    // Handle protected routes
    if (
      !isLoading &&
      !isAuthenticated &&
      protectedRoutes.some((route) => pathname.startsWith(route))
    ) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  return { isAuthenticated, isLoading };
}
