import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DEV_PASSWORD = "password123";

function buildInstitutionUserIdentity(slug: string, role: "editor" | "viewer") {
  return {
    email: `${slug}-${role}@example.edu`,
    displayName: `${slug}-${role}`,
    role,
  };
}

export async function POST(request: Request) {
  const supabaseServer = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();

  let createdOrganizationId: string | null = null;
  let createdAuthUserIds: string[] = [];
  let createdProfileUserIds: string[] = [];

  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const slug = String(body.slug ?? "")
      .trim()
      .toLowerCase();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Organization name is required" },
        { status: 400 },
      );
    }

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Organization slug is required" },
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
        {
          success: false,
          error: "Only platform admins can create organizations",
        },
        { status: 403 },
      );
    }

    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name,
        slug,
      })
      .select("id, name, slug, created_at")
      .single();

    if (organizationError || !organization) {
      console.error(
        "[organizations.POST] Supabase organization insert failed:",
        organizationError,
      );

      return NextResponse.json(
        {
          success: false,
          error: organizationError?.message ?? "Failed to create organization",
        },
        { status: 500 },
      );
    }

    createdOrganizationId = organization.id;

    const editorIdentity = buildInstitutionUserIdentity(slug, "editor");
    const viewerIdentity = buildInstitutionUserIdentity(slug, "viewer");

    const { data: editorAuth, error: editorAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email: editorIdentity.email,
        password: DEV_PASSWORD,
        email_confirm: true,
      });

    if (editorAuthError || !editorAuth.user) {
      throw new Error(
        editorAuthError?.message ?? "Failed to create editor auth user",
      );
    }

    createdAuthUserIds.push(editorAuth.user.id);

    const { data: viewerAuth, error: viewerAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email: viewerIdentity.email,
        password: DEV_PASSWORD,
        email_confirm: true,
      });

    if (viewerAuthError || !viewerAuth.user) {
      throw new Error(
        viewerAuthError?.message ?? "Failed to create viewer auth user",
      );
    }

    createdAuthUserIds.push(viewerAuth.user.id);

    const { error: profileInsertError } = await supabaseAdmin
      .from("users")
      .insert([
        {
          id: editorAuth.user.id,
          organization_id: organization.id,
          email: editorIdentity.email,
          role: editorIdentity.role,
          display_name: editorIdentity.displayName,
        },
        {
          id: viewerAuth.user.id,
          organization_id: organization.id,
          email: viewerIdentity.email,
          role: viewerIdentity.role,
          display_name: viewerIdentity.displayName,
        },
      ]);

    if (profileInsertError) {
      throw new Error(profileInsertError.message);
    }

    createdProfileUserIds.push(editorAuth.user.id, viewerAuth.user.id);

    return NextResponse.json({
      success: true,
      organization,
      users: {
        editor: {
          id: editorAuth.user.id,
          email: editorIdentity.email,
          role: editorIdentity.role,
          displayName: editorIdentity.displayName,
        },
        viewer: {
          id: viewerAuth.user.id,
          email: viewerIdentity.email,
          role: viewerIdentity.role,
          displayName: viewerIdentity.displayName,
        },
      },
    });
  } catch (error) {
    console.error("[organizations.POST] Unexpected error:", error);

    if (createdProfileUserIds.length > 0) {
      try {
        await supabaseAdmin
          .from("users")
          .delete()
          .in("id", createdProfileUserIds);
      } catch (cleanupError) {
        console.error(
          "[organizations.POST] Failed to clean up user profiles:",
          cleanupError,
        );
      }
    }

    if (createdAuthUserIds.length > 0) {
      for (const authUserId of createdAuthUserIds) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        } catch (cleanupError) {
          console.error("[organizations.POST] Failed to clean up auth user:", {
            authUserId,
            cleanupError,
          });
        }
      }
    }

    if (createdOrganizationId) {
      try {
        await supabaseAdmin
          .from("organizations")
          .delete()
          .eq("id", createdOrganizationId);
      } catch (cleanupError) {
        console.error("[organizations.POST] Failed to clean up organization:", {
          createdOrganizationId,
          cleanupError,
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error creating organization",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabaseServer = await createSupabaseServerClient();

    const { data, error } = await supabaseServer
      .from("organizations")
      .select("id, name, slug, created_at")
      .order("name", { ascending: true });

    if (error) {
      console.error("[organizations.GET] Supabase query failed:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      organizations: data ?? [],
    });
  } catch (error) {
    console.error("[organizations.GET] Unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error fetching organizations",
      },
      { status: 500 },
    );
  }
}
