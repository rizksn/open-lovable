import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Missing organization id" },
        { status: 400 },
      );
    }

    const supabaseServer = await createSupabaseServerClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabaseServer
      .from("users")
      .select("id, role, organization_id")
      .eq("id", authUser.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "Failed to load user profile" },
        { status: 500 },
      );
    }

    const isPlatformAdmin = profile.role === "platform_admin";
    const belongsToOrganization = profile.organization_id === organizationId;

    if (!isPlatformAdmin && !belongsToOrganization) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { data: organization, error: organizationError } =
      await supabaseServer
        .from("organizations")
        .select("id, name, slug, created_at")
        .eq("id", organizationId)
        .single();

    if (organizationError || !organization) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error("[GET /api/organizations/[organizationId]] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
