import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ResolveInstitutionUserRequest = {
  organizationId?: string;
  role?: "editor" | "viewer";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResolveInstitutionUserRequest;

    const organizationId = String(body.organizationId ?? "").trim();
    const role = body.role;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "organizationId is required" },
        { status: 400 },
      );
    }

    if (role !== "editor" && role !== "viewer") {
      return NextResponse.json(
        { success: false, error: "role must be editor or viewer" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, email, role, organization_id")
      .eq("organization_id", organizationId)
      .eq("role", role)
      .single();

    if (error || !data) {
      console.error(
        "[auth/user.POST] Failed to resolve institution user:",
        error,
      );

      return NextResponse.json(
        {
          success: false,
          error: `No ${role} user found for this organization`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.id,
        email: data.email,
        role: data.role,
        organizationId: data.organization_id,
      },
    });
  } catch (error) {
    console.error("[auth/user.POST] Unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error resolving institution user",
      },
      { status: 500 },
    );
  }
}
