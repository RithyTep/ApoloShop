/**
 * Session [id] API
 * Manage individual sessions
 *
 * DELETE - Revoke a specific session
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuthAndParams, AuthenticatedRequest } from "@/lib/auth-middleware";
import { revokeSession } from "@/lib/session-service";

/**
 * DELETE /api/sessions/[id]
 * Revoke a specific session by ID
 */
export const DELETE = withAuthAndParams(
  async (
    request: AuthenticatedRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    try {
      const params = await context.params;
      const sessionId = params.id;

      if (!sessionId) {
        return NextResponse.json(
          { error: "Session ID is required" },
          { status: 400 }
        );
      }

      // Revoke the session (only if it belongs to the authenticated user)
      const revoked = await revokeSession(sessionId, request.user.id);

      if (!revoked) {
        return NextResponse.json(
          { error: "Session not found or already revoked" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Session revoked successfully",
      });
    } catch (error) {
      console.error("Error revoking session:", error);
      return NextResponse.json(
        { error: "Failed to revoke session" },
        { status: 500 }
      );
    }
  }
);
