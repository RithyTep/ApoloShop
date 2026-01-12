/**
 * Sessions API
 * Allows users to view and manage their active sessions
 *
 * GET - List all active sessions for current user
 * DELETE - Revoke all sessions except current (log out all devices)
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  getUserSessions,
  revokeAllSessionsExcept,
  getSessionStats,
  formatSessionForDisplay,
} from "@/lib/session-service";

/**
 * GET /api/sessions
 * List all active sessions for the authenticated user
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Get current session ID from token/cookie
    const currentSessionToken = request.cookies.get("auth-token")?.value;

    // Get all sessions
    const sessions = await getUserSessions(
      request.user.id,
      undefined // We'll mark current based on token match
    );

    // Get session statistics
    const stats = await getSessionStats(request.user.id);

    // Format for display and mark current session
    const formattedSessions = sessions.map((session) => ({
      ...formatSessionForDisplay(session),
      // Mark as current if this is the session making the request
      isCurrent: currentSessionToken ? session.id === sessions.find(s =>
        // In production, we'd match the token, but for now match by most recent activity
        s.isCurrent
      )?.id : false,
    }));

    return NextResponse.json({
      sessions: formattedSessions,
      stats: {
        totalActive: stats.totalActive,
        deviceTypes: stats.deviceTypes,
        mostRecentActivity: stats.mostRecentActivity?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/sessions
 * Revoke all sessions except the current one (log out all other devices)
 */
export const DELETE = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const currentSessionId = body.currentSessionId;

    // Revoke all sessions except the current one
    const revokedCount = await revokeAllSessionsExcept(
      request.user.id,
      currentSessionId
    );

    return NextResponse.json({
      success: true,
      revokedCount,
      message: `Logged out from ${revokedCount} device${revokedCount !== 1 ? "s" : ""}`,
    });
  } catch (error) {
    console.error("Error revoking sessions:", error);
    return NextResponse.json(
      { error: "Failed to revoke sessions" },
      { status: 500 }
    );
  }
});
