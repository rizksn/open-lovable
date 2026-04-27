import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

    const supabaseServer = await createSupabaseServerClient();

    const { data, error } = await supabaseServer
      .from("organizations")
      .insert({
        name,
        slug,
      })
      .select("id, name, slug, created_at")
      .single();

    if (error) {
      console.error("[organizations.POST] Supabase insert failed:", error);

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
      organization: data,
    });
  } catch (error) {
    console.error("[organizations.POST] Unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error creating organization",
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
