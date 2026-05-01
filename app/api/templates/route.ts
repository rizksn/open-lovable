import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  uploadGeneratedAppToSupabaseTemplate,
  deleteSupabaseTemplateStorage,
  templateStoragePath,
} from "@/lib/apps/storage";

type TemplateVisibility = "public" | "organization";

type SaveTemplateRequest = {
  templateId?: string | null;
  name: string;
  visibility: TemplateVisibility;
  organizationId?: string | null;
};

function createSlug(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  const supabaseServer = await createSupabaseServerClient();

  let createdTemplateId: string | null = null;
  let uploadedStoragePath: string | null = null;

  try {
    const body = (await request.json()) as SaveTemplateRequest;

    const trimmedName = body.name?.trim();

    if (!trimmedName || !body.visibility) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!["public", "organization"].includes(body.visibility)) {
      return NextResponse.json(
        { success: false, error: "Invalid template visibility" },
        { status: 400 },
      );
    }

    if (body.visibility === "public" && body.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Public templates cannot have an organizationId",
        },
        { status: 400 },
      );
    }

    if (body.visibility === "organization" && !body.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Organization templates require an organizationId",
        },
        { status: 400 },
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: userProfile, error: userError } = await supabaseServer
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { success: false, error: "Invalid user" },
        { status: 401 },
      );
    }

    if (userProfile.role !== "platform_admin") {
      return NextResponse.json(
        { success: false, error: "Only platform admins can save templates" },
        { status: 403 },
      );
    }

    if (body.visibility === "organization") {
      const { data: organization, error: organizationError } =
        await supabaseServer
          .from("organizations")
          .select("id")
          .eq("id", body.organizationId)
          .single();

      if (organizationError || !organization) {
        return NextResponse.json(
          { success: false, error: "Invalid organization" },
          { status: 400 },
        );
      }
    }

    let templateId: string;
    let slug: string;

    if (body.templateId) {
      const { data: existingTemplate, error: existingTemplateError } =
        await supabaseServer
          .from("templates")
          .select("id, slug")
          .eq("id", body.templateId)
          .single();

      if (existingTemplateError || !existingTemplate) {
        return NextResponse.json(
          { success: false, error: "Template not found" },
          { status: 404 },
        );
      }

      templateId = existingTemplate.id;
      slug = existingTemplate.slug;
    } else {
      templateId = crypto.randomUUID();
      slug = createSlug(trimmedName);
      createdTemplateId = templateId;
    }

    const storagePath = templateStoragePath({ templateId });
    const now = new Date().toISOString();

    let template;

    if (body.templateId) {
      const { data: updatedTemplate, error: templateError } =
        await supabaseServer
          .from("templates")
          .update({
            name: trimmedName,
            visibility: body.visibility,
            organization_id:
              body.visibility === "organization" ? body.organizationId : null,
            storage_path: storagePath,
            updated_at: now,
          })
          .eq("id", templateId)
          .select("id, name, slug, visibility, organization_id, storage_path")
          .single();

      if (templateError || !updatedTemplate) {
        throw new Error(templateError?.message ?? "Failed to update template");
      }

      template = updatedTemplate;
    } else {
      const { data: createdTemplate, error: templateError } =
        await supabaseServer
          .from("templates")
          .insert({
            id: templateId,
            name: trimmedName,
            slug,
            visibility: body.visibility,
            organization_id:
              body.visibility === "organization" ? body.organizationId : null,
            created_by_user_id: user.id,
            storage_path: storagePath,
            created_at: now,
            updated_at: now,
          })
          .select("id, name, slug, visibility, organization_id, storage_path")
          .single();

      if (templateError || !createdTemplate) {
        throw new Error(templateError?.message ?? "Failed to create template");
      }

      template = createdTemplate;
    }

    uploadedStoragePath = await uploadGeneratedAppToSupabaseTemplate({
      supabase: supabaseServer,
      templateId: template.id,
    });

    if (uploadedStoragePath !== template.storage_path) {
      throw new Error("Template storage path mismatch");
    }

    return NextResponse.json({
      success: true,
      templateId: template.id,
      name: template.name,
      slug: template.slug,
      visibility: template.visibility,
      organizationId: template.organization_id,
      storagePath: template.storage_path,
    });
  } catch (error) {
    if (uploadedStoragePath) {
      try {
        await deleteSupabaseTemplateStorage({
          supabase: supabaseServer,
          storagePath: uploadedStoragePath,
        });
      } catch (cleanupError) {
        console.error("Failed to clean up uploaded template storage", {
          uploadedStoragePath,
          cleanupError,
        });
      }
    }

    if (createdTemplateId) {
      try {
        await supabaseServer
          .from("templates")
          .delete()
          .eq("id", createdTemplateId);
      } catch (cleanupError) {
        console.error("Failed to clean up template row", {
          createdTemplateId,
          cleanupError,
        });
      }
    }

    console.error("[save-template] failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabaseServer = await createSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: userProfile, error: profileError } = await supabaseServer
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

    let query = supabaseServer
      .from("templates")
      .select(
        `
        id,
        name,
        slug,
        visibility,
        organization_id,
        storage_path,
        created_at,
        updated_at,
        organization:organizations (
          id,
          name,
          slug,
          created_at
        )
        `,
      )
      .order("updated_at", { ascending: false });

    if (userProfile.role === "platform_admin") {
      if (organizationId) {
        query = query.or(
          `visibility.eq.public,organization_id.eq.${organizationId}`,
        );
      } else {
        query = query.eq("visibility", "public");
      }
    } else {
      query = query.or(
        `visibility.eq.public,organization_id.eq.${userProfile.organization_id}`,
      );
    }

    const { data: templates, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("[get-templates] failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
