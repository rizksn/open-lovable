import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hydrateGeneratedAppFromSupabaseTemplate } from "@/lib/apps/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const { templateId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { success: false, error: "Invalid user" },
        { status: 401 },
      );
    }

    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select(
        "id, name, slug, visibility, organization_id, storage_path, created_at, updated_at",
      )
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 },
      );
    }

    const isPlatformAdmin = userProfile.role === "platform_admin";
    const isPublicTemplate = template.visibility === "public";
    const isOwnOrganizationTemplate =
      template.visibility === "organization" &&
      userProfile.organization_id === template.organization_id;

    if (!isPlatformAdmin && !isPublicTemplate && !isOwnOrganizationTemplate) {
      return NextResponse.json(
        { success: false, error: "Not allowed to load this template" },
        { status: 403 },
      );
    }

    if (!template.storage_path) {
      return NextResponse.json(
        { success: false, error: "Template has no storage path" },
        { status: 500 },
      );
    }

    const files = await hydrateGeneratedAppFromSupabaseTemplate({
      supabase,
      storagePath: template.storage_path,
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        slug: template.slug,
        visibility: template.visibility,
        organizationId: template.organization_id,
        storagePath: template.storage_path,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
      },
      hydratedPath: "generated-app",
      files,
    });
  } catch (error) {
    console.error("[load-template] failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load template" },
      { status: 500 },
    );
  }
}
