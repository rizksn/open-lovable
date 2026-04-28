import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PublishedAssetRouteProps = {
  params: Promise<{
    slug: string;
    path?: string[];
  }>;
};

function getContentType(filePath: string) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg"))
    return "image/jpeg";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  if (filePath.endsWith(".woff")) return "font/woff";
  if (filePath.endsWith(".woff2")) return "font/woff2";

  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: PublishedAssetRouteProps,
) {
  const { slug, path: assetPath = [] } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: app, error: appError } = await supabase
    .from("apps")
    .select("id, slug, organization_id, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (appError || !app) {
    return NextResponse.json(
      { success: false, error: "Published app not found" },
      { status: 404 },
    );
  }

  const requestedPath =
    assetPath.length > 0 ? assetPath.join("/") : "index.html";

  const storagePath = `${app.organization_id}/${app.slug}/dist/${requestedPath}`;

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("published-apps")
    .download(storagePath);

  if (downloadError || !fileBlob) {
    console.error("[published-app] Failed to load asset:", {
      slug,
      requestedPath,
      storagePath,
      downloadError,
    });

    return NextResponse.json(
      { success: false, error: "Published asset not found" },
      { status: 404 },
    );
  }

  if (requestedPath === "index.html") {
    let html = await fileBlob.text();

    // Inject base tag so relative asset paths (./assets/...) resolve
    // under /published/{slug}/ instead of /published/
    html = html.replace(
      "<head>",
      `<head>\n    <base href="/published/${app.slug}/">`,
    );

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  return new NextResponse(fileBlob, {
    headers: {
      "Content-Type": getContentType(requestedPath),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
