"use client";

/**
 * CSRF Token Hook
 * Manages CSRF tokens for form submissions and API requests
 */

import { useState, useEffect, useCallback, useRef } from "react";

// CSRF Configuration (must match server-side lib/csrf.ts)
const CSRF_CONFIG = {
  headerName: "X-CSRF-Token",
  cookieName: "csrf-token",
  // Refresh token 15 minutes before expiry
  refreshThresholdMs: 15 * 60 * 1000,
  // Token validity is 1 hour
  tokenExpiryMs: 60 * 60 * 1000,
};

export interface CSRFToken {
  token: string;
  expiresAt: number;
}

interface CSRFState {
  token: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Get CSRF token from cookie
 */
function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === CSRF_CONFIG.cookieName) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Hook to manage CSRF tokens
 * Automatically fetches and refreshes tokens as needed
 */
export function useCSRF() {
  const [state, setState] = useState<CSRFState>({
    token: null,
    expiresAt: null,
    isLoading: false,
    error: null,
  });

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch a new CSRF token from the server
   */
  const fetchToken = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/csrf", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, clear token
          setState({
            token: null,
            expiresAt: null,
            isLoading: false,
            error: "Not authenticated",
          });
          return null;
        }
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();

      setState({
        token: data.token,
        expiresAt: data.expiresAt,
        isLoading: false,
        error: null,
      });

      return data.token;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch CSRF token";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  /**
   * Schedule token refresh before expiry
   */
  const scheduleRefresh = useCallback(
    (expiresAt: number) => {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      const now = Date.now();
      const refreshAt = expiresAt - CSRF_CONFIG.refreshThresholdMs;
      const delay = refreshAt - now;

      if (delay > 0) {
        refreshTimeoutRef.current = setTimeout(() => {
          fetchToken();
        }, delay);
      }
    },
    [fetchToken]
  );

  /**
   * Get the current token, refreshing if needed
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    // If we have a valid token, return it
    if (state.token && state.expiresAt && state.expiresAt > Date.now()) {
      return state.token;
    }

    // Try to get from cookie first
    const cookieToken = getTokenFromCookie();
    if (cookieToken) {
      setState((prev) => ({ ...prev, token: cookieToken }));
      return cookieToken;
    }

    // Fetch a new token
    return fetchToken();
  }, [state.token, state.expiresAt, fetchToken]);

  /**
   * Get headers for CSRF-protected requests
   */
  const getHeaders = useCallback((): Record<string, string> => {
    if (!state.token) {
      const cookieToken = getTokenFromCookie();
      if (cookieToken) {
        return { [CSRF_CONFIG.headerName]: cookieToken };
      }
      return {};
    }
    return { [CSRF_CONFIG.headerName]: state.token };
  }, [state.token]);

  /**
   * Invalidate the current token (e.g., after logout)
   */
  const invalidate = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    setState({
      token: null,
      expiresAt: null,
      isLoading: false,
      error: null,
    });
  }, []);

  // Initial token fetch when component mounts
  useEffect(() => {
    // Check for existing token in cookie
    const existingToken = getTokenFromCookie();
    if (existingToken) {
      setState((prev) => ({
        ...prev,
        token: existingToken,
        // Assume token is valid for default expiry if we don't know expiry time
        expiresAt: Date.now() + CSRF_CONFIG.tokenExpiryMs,
      }));
    }
  }, []);

  // Schedule refresh when token changes
  useEffect(() => {
    if (state.expiresAt) {
      scheduleRefresh(state.expiresAt);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [state.expiresAt, scheduleRefresh]);

  // Check for refreshed token in response headers
  const handleResponse = useCallback((response: Response) => {
    const newToken = response.headers.get("X-CSRF-Token-Refresh");
    const newExpires = response.headers.get("X-CSRF-Token-Expires");

    if (newToken && newExpires) {
      setState({
        token: newToken,
        expiresAt: parseInt(newExpires, 10),
        isLoading: false,
        error: null,
      });
    }
  }, []);

  return {
    token: state.token,
    expiresAt: state.expiresAt,
    isLoading: state.isLoading,
    error: state.error,
    fetchToken,
    getToken,
    getHeaders,
    invalidate,
    handleResponse,
    headerName: CSRF_CONFIG.headerName,
  };
}

/**
 * Create a fetch wrapper that automatically includes CSRF token
 */
export function createCSRFFetch(
  getHeaders: () => Record<string, string>,
  handleResponse?: (response: Response) => void
) {
  return async function csrfFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const csrfHeaders = getHeaders();

    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...csrfHeaders,
        ...options.headers,
      },
    });

    // Handle token refresh from response
    handleResponse?.(response);

    // Handle CSRF errors
    if (response.status === 403 || response.status === 419) {
      const data = await response.clone().json().catch(() => ({}));
      if (data.code?.startsWith("CSRF_")) {
        throw new CSRFError(data.error || "CSRF validation failed", data.code);
      }
    }

    return response;
  };
}

/**
 * Custom error class for CSRF errors
 */
export class CSRFError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "CSRFError";
    this.code = code;
  }
}

/**
 * Check if an error is a CSRF error
 */
export function isCSRFError(error: unknown): error is CSRFError {
  return error instanceof CSRFError;
}

/**
 * Utility to add CSRF token to form data
 */
export function addCSRFToFormData(
  formData: FormData,
  token: string | null
): FormData {
  if (token) {
    formData.append("_csrf", token);
  }
  return formData;
}

/**
 * Utility to add CSRF token to an object/body
 */
export function addCSRFToBody<T extends Record<string, unknown>>(
  body: T,
  token: string | null
): T & { _csrf?: string } {
  if (token) {
    return { ...body, _csrf: token };
  }
  return body;
}
