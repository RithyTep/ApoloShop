import { NextRequest, NextResponse } from "next/server";
import { getRecentErrors } from "@/lib/performance";

/**
 * GET /api/performance/errors - Get recent errors
 * Query params: limit, resolved, path
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const resolved = searchParams.get("resolved");
    const path = searchParams.get("path");

    const errors = await getRecentErrors({
      limit: limit ? parseInt(limit, 10) : 50,
      resolved: resolved === "true" ? true : resolved === "false" ? false : undefined,
      path: path || undefined,
    });

    return NextResponse.json({ errors });
  } catch (err) {
    console.error("[Performance Errors API] Error:", err);
    return NextResponse.json(
      { error: "Failed to get errors" },
      { status: 500 }
    );
  }
}
