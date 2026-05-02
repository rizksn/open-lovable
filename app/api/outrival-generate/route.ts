import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

/**
 * Internal representation of files returned by the code generator.
 * We keep this intentionally small: the generator may produce text,
 * but this route only cares about explicit file path + file content pairs.
 */
type GeneratedFile = {
  path: string;
  content: string;
};

type UnsafeMatch = {
  path: string;
  rule: string;
  snippet: string;
};

const execAsync = promisify(exec);

/**
 * The upstream generator returns a server-sent-event style response.
 * This extracts only the final completed generatedCode payload and ignores
 * partial stream chunks or malformed lines.
 */
function extractSseText(raw: string): string {
  return raw
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => {
      try {
        const data = JSON.parse(line.slice(6));
        return data.type === "complete" ? (data.generatedCode ?? "") : "";
      } catch {
        return "";
      }
    })
    .join("");
}

/**
 * The upstream generator can return complete files in two formats:
 *
 * 1. Create-mode format:
 *    <file path="src/App.jsx">...</file>
 *
 * 2. Edit-mode format:
 *    <edit target_file="src/App.jsx">
 *      <instructions>...</instructions>
 *      <update>...</update>
 *    </edit>
 *
 * We normalize both into the same GeneratedFile shape, but only when the
 * content is a complete file. Partial edit snippets are intentionally rejected
 * because this route does not apply patches or AST merges.
 */
function extractFiles(generatedCode: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
  const editRegex =
    /<edit target_file="([^"]+)">[\s\S]*?<update>([\s\S]*?)<\/update>[\s\S]*?<\/edit>/g;

  function looksLikeCompleteSourceFile(filePath: string, content: string) {
    const normalizedPath = normalizeGeneratedFilePath(filePath);
    const trimmedContent = content.trim();

    if (!trimmedContent) return false;

    if (trimmedContent.startsWith("<")) {
      return false;
    }

    if (normalizedPath.endsWith(".css")) {
      return true;
    }

    if (normalizedPath.endsWith(".ts") && !normalizedPath.endsWith(".tsx")) {
      return /\bexport\b/.test(trimmedContent);
    }

    if (
      normalizedPath.endsWith(".tsx") ||
      normalizedPath.endsWith(".jsx") ||
      normalizedPath.endsWith(".js")
    ) {
      const hasExport = /\bexport\b/.test(trimmedContent);
      const hasRenderableReactShape =
        trimmedContent.includes("return (") ||
        trimmedContent.includes("return <") ||
        trimmedContent.includes("=> (") ||
        trimmedContent.includes("=> <");

      return hasExport && hasRenderableReactShape;
    }

    return false;
  }

  let fileMatch;
  while ((fileMatch = fileRegex.exec(generatedCode)) !== null) {
    const path = fileMatch[1];
    const content = fileMatch[2].trim();

    if (!looksLikeCompleteSourceFile(path, content)) {
      console.warn("[outrival-generate] skipped incomplete file block", {
        path,
        preview: content.slice(0, 200),
      });

      continue;
    }

    files.push({ path, content });
  }

  let editMatch;
  while ((editMatch = editRegex.exec(generatedCode)) !== null) {
    const path = editMatch[1];
    const content = editMatch[2].trim();

    if (!looksLikeCompleteSourceFile(path, content)) {
      console.warn("[outrival-generate] skipped partial edit block", {
        path,
        preview: content.slice(0, 200),
      });

      continue;
    }

    files.push({ path, content });
  }

  return files;
}

/**
 * All generated code is isolated inside generated-app.
 * This keeps the AI write boundary separate from the host Next.js app.
 */
function generatedAppRoot() {
  return path.join(process.cwd(), "generated-app");
}

/**
 * Temporary local checkpoint used only during generation.
 * Supabase remains the durable source of truth; this protects the live
 * generated-app workspace from failed candidate edits.
 */
function generatedAppBackupRoot() {
  return path.join(process.cwd(), ".outrival-backups", "generated-app-src");
}

/**
 * Resolves generated file paths defensively before writing to disk.
 * This prevents path traversal from escaping generated-app, even if the model
 * returns something malicious or malformed like ../../app/api/route.ts.
 */
function safeGeneratedAppPath(filePath: string) {
  const root = generatedAppRoot();
  const resolvedPath = path.resolve(root, filePath);
  const safeRoot = path.resolve(root);

  if (
    resolvedPath !== safeRoot &&
    !resolvedPath.startsWith(safeRoot + path.sep)
  ) {
    throw new Error(`Unsafe file path: ${filePath}`);
  }

  return resolvedPath;
}

/**
 * Normalizes Windows-style paths to POSIX-style paths so validation is
 * consistent regardless of what the model returns.
 */
function normalizeGeneratedFilePath(filePath: string) {
  return filePath.replaceAll("\\", "/");
}

/**
 * Defines the write policy for generated files.
 * The AI is only allowed to modify application source files, not project
 * scaffolding, dependencies, Vite config, HTML entrypoints, or src/main.jsx.
 */
function isWritableGeneratedFile(filePath: string) {
  const normalizedPath = normalizeGeneratedFilePath(filePath);

  if (!normalizedPath.startsWith("src/")) return false;
  if (normalizedPath === "src/main.jsx") return false;
  if (normalizedPath.includes("../")) return false;

  const blockedSegments = [
    "node_modules",
    "dist",
    ".git",
    ".env",
    "package.json",
    "vite.config",
    "index.html",
  ];

  if (blockedSegments.some((segment) => normalizedPath.includes(segment))) {
    return false;
  }

  return (
    normalizedPath.endsWith(".jsx") ||
    normalizedPath.endsWith(".js") ||
    normalizedPath.endsWith(".tsx") ||
    normalizedPath.endsWith(".ts") ||
    normalizedPath.endsWith(".css")
  );
}

function scanFilesForUnsafePatterns(files: GeneratedFile[]) {
  const unsafeRules = [
    { rule: "eval()", regex: /\beval\s*\(/ },
    { rule: "new Function()", regex: /\bnew\s+Function\s*\(/ },
    { rule: "Function()", regex: /\bFunction\s*\(/ },
    { rule: "dangerouslySetInnerHTML", regex: /dangerouslySetInnerHTML/ },
    { rule: "document.write()", regex: /document\.write\s*\(/ },
    { rule: "innerHTML assignment", regex: /\.innerHTML\s*=/ },
    { rule: "outerHTML assignment", regex: /\.outerHTML\s*=/ },
    { rule: "insertAdjacentHTML()", regex: /insertAdjacentHTML\s*\(/ },
    { rule: "string setTimeout()", regex: /setTimeout\s*\(\s*["'`]/ },
    { rule: "string setInterval()", regex: /setInterval\s*\(\s*["'`]/ },
  ];

  const matches: UnsafeMatch[] = [];

  for (const file of files) {
    for (const unsafeRule of unsafeRules) {
      const match = file.content.match(unsafeRule.regex);

      if (!match) continue;

      const index = match.index ?? 0;
      const snippet = file.content.slice(
        Math.max(0, index - 80),
        Math.min(file.content.length, index + 120),
      );

      matches.push({
        path: file.path,
        rule: unsafeRule.rule,
        snippet,
      });
    }
  }

  return {
    isSafe: matches.length === 0,
    matches,
  };
}

/**
 * Build validation is the commit gate.
 * Files may be generated and written temporarily, but they are not considered
 * accepted unless the generated Vite app can successfully build.
 */
async function validateGeneratedApp() {
  try {
    const result = await execAsync("npm run build", {
      cwd: generatedAppRoot(),
      timeout: 30_000,
    });

    console.log("[outrival-generate] validation succeeded", {
      stdout: result.stdout,
      stderr: result.stderr,
    });

    return { success: true, error: null };
  } catch (error: any) {
    console.error("[outrival-generate] validation failed", {
      message: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
      code: error.code,
      signal: error.signal,
    });

    return {
      success: false,
      error: error.stderr || error.stdout || error.message,
    };
  }
}

/**
 * Recursively walks generated-app/src and stores current source files as
 * AI edit context.
 *
 * This is not the rollback snapshot. Rollback uses snapshotGeneratedSrc()
 * so the full working src folder can be restored exactly.
 */
async function readCurrentGeneratedFiles() {
  const root = generatedAppRoot();
  const srcRoot = path.join(root, "src");
  const currentFiles: Record<string, string> = {};

  try {
    await fs.access(srcRoot);
  } catch {
    return currentFiles;
  }

  /**
   * Recursively walks generated-app/src and stores current text source files
   * as context for the generator.
   */
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      const relativePath = path.relative(root, absolutePath);
      currentFiles[relativePath] = await fs.readFile(absolutePath, "utf8");
    }
  }

  await walk(srcRoot);
  return currentFiles;
}

/**
 * Copies the full generated-app/src folder before applying candidate AI writes.
 * This preserves the exact current working app, including successful unsaved
 * edits, so failed generations can rollback locally without re-fetching from
 * Supabase.
 */
async function snapshotGeneratedSrc() {
  const srcRoot = path.join(generatedAppRoot(), "src");
  const backupRoot = generatedAppBackupRoot();

  await fs.rm(backupRoot, { recursive: true, force: true });

  try {
    await fs.access(srcRoot);
  } catch {
    return false;
  }

  await fs.mkdir(path.dirname(backupRoot), { recursive: true });
  await fs.cp(srcRoot, backupRoot, { recursive: true });

  return true;
}

/**
 * Restores the previous generated app state after a failed validation.
 * This gives the route transactional behavior: a bad generation does not leave
 * the preview app in a broken or partially-written state.
 */
async function restoreGeneratedSrcFromSnapshot(hasSnapshot: boolean) {
  const srcRoot = path.join(generatedAppRoot(), "src");
  const backupRoot = generatedAppBackupRoot();

  await fs.rm(srcRoot, { recursive: true, force: true });

  if (!hasSnapshot) {
    await fs.mkdir(srcRoot, { recursive: true });
    return;
  }

  await fs.cp(backupRoot, srcRoot, { recursive: true });
}

async function ensureViteRelativeBase() {
  const viteConfigPath = path.join(generatedAppRoot(), "vite.config.js");

  const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
  `;

  await fs.writeFile(viteConfigPath, viteConfig, "utf8");
}

async function ensureTailwindImport() {
  const indexCssPath = path.join(generatedAppRoot(), "src", "index.css");

  let content = "";

  try {
    content = await fs.readFile(indexCssPath, "utf8");
  } catch {
    content = "";
  }

  const hasTailwindImport =
    content.includes('@import "tailwindcss";') ||
    content.includes("@import 'tailwindcss';");

  if (!hasTailwindImport) {
    await fs.mkdir(path.dirname(indexCssPath), { recursive: true });
    await fs.writeFile(
      indexCssPath,
      `@import "tailwindcss";\n\n${content}`,
      "utf8",
    );
  }
}

async function ensureGeneratedAppScaffold() {
  await ensureTailwindImport();
  await ensureViteRelativeBase();
}

/**
 * Main generation endpoint.
 *
 * High-level flow:
 * 1. Validate request input.
 * 2. Snapshot the current generated app.
 * 3. Ask the upstream generator for file blocks.
 * 4. Parse and filter generated files through the write policy.
 * 5. Write candidate files.
 * 6. Build the generated app.
 * 7. Rollback on failure or commit on success.
 */
export async function POST(request: Request) {
  const { prompt, isEdit = false } = await request.json();

  if (!prompt) {
    return NextResponse.json(
      { success: false, error: "Prompt is required" },
      { status: 400 },
    );
  }

  const hasSnapshot = await snapshotGeneratedSrc();
  const currentFiles = await readCurrentGeneratedFiles();

  console.log("[outrival-generate]", {
    prompt,
    isEdit,
    currentFileCount: Object.keys(currentFiles).length,
  });

  /**
   * Edit mode uses stricter instructions than first-generation mode.
   * The goal is to preserve existing working behavior and make the smallest
   * necessary change instead of allowing the model to regenerate the app.
   */
  const generationPrompt = isEdit
    ? `
You are editing an existing Vite React app.

User request:
${prompt}

Current app files are provided in context.

Critical edit rules:
- Preserve the existing app structure and behavior.
- Do NOT rewrite the app from scratch.
- Do NOT remove working JSX, state, handlers, imports, or components unless explicitly requested.
- Make the smallest possible change needed.
- If the request is purely visual, prefer Tailwind class updates in existing JSX.
- If the request requires global styles, animations, or custom CSS not practical with Tailwind, update src/index.css.
- The generated app is configured for Tailwind CSS.
- Use Tailwind utility classes for layout, spacing, typography, colors, responsive behavior, hover states, shadows, rounded surfaces, and polished product UI.
- Use plain React state only.
- Do NOT use external packages.
- Do NOT use eval(), Function(), dangerouslySetInnerHTML, or dynamic code execution.
- Do NOT generate index.html, package.json, vite.config.js, or src/main.jsx.
- Only generate source files under src/.
- Allowed file types are .js, .jsx, .ts, .tsx, and .css.
- You may generate JavaScript/TypeScript React files under src/ using .js, .jsx, .ts, or .tsx extensions.
- Do NOT generate image files or binary assets, including png, jpg, jpeg, gif, webp, or svg files.
- Do NOT reference local image paths unless the file already exists in the provided project context.
- Use Tailwind gradients, CSS shapes, inline SVG inside JSX, emoji, or text-based visuals instead of external image assets.
- Return ONLY the full contents of files that changed.
- Each returned file must be complete from first line to last line.
- Return files using <file path="...">...</file> blocks only.
- Do NOT return partial snippets.
- Do NOT wrap file contents in markdown fences like \`\`\`javascript.
- Do NOT include explanations outside the <file> blocks.
- Always return complete files, not partial snippets. Even for edits, return the full updated file content.
`
    : `
Build this as a complete Vite React app.

User request:
${prompt}

Important constraints:
- Build the actual requested app, not a landing page.
- If the user asks for a game, build a playable game with working React state.
- Prioritize the interactive product experience over generic hero/features/footer sections unless the user explicitly asks for a landing page.
- The generated app is configured for Tailwind CSS.
- Use Tailwind utility classes to create a polished, modern product UI by default.
- Use strong layout, spacing, typography, color, responsive behavior, hover states, shadows, rounded surfaces, and clear visual hierarchy.
- You may use src/index.css for global resets, custom animations, or styles that are awkward to express with Tailwind utilities.
- Use plain React state only.
- Do NOT use external packages.
- Do NOT use eval(), Function(), dangerouslySetInnerHTML, or dynamic code execution.
- Do NOT generate index.html, package.json, vite.config.js, or src/main.jsx.
- Only generate source files under src/.
- Allowed file types are .js, .jsx, .ts, .tsx, and .css.
- You may generate JavaScript/TypeScript React files under src/ using .js, .jsx, .ts, or .tsx extensions.
- Do NOT generate image files or binary assets, including png, jpg, jpeg, gif, webp, or svg files.
- Do NOT reference local image paths unless the file already exists in the provided project context.
- Use Tailwind gradients, CSS shapes, inline SVG inside JSX, emoji, or text-based visuals instead of external image assets.
- Return complete files using <file path="...">...</file> blocks.
- Do NOT wrap file contents in markdown fences like \`\`\`javascript.
- Do NOT include explanations outside the <file> blocks.
- Always return complete files, not partial snippets.
`;

  /**
   * Delegates actual code generation to the existing Open Lovable streaming
   * endpoint, while this route owns the safer orchestration layer around it:
   * context injection, file extraction, write filtering, validation, rollback.
   *
   * This is intentionally separate from the request's isEdit flag:
   * - request.isEdit means "the user wants to modify the current app."
   * - Open Lovable's isEdit means "use its native patch workflow."
   *
   * Native edit mode is disabled because this local wrapper does not use
   * Open Lovable's sandbox/file-cache/manifest system, and native edit mode can
   * return partial patches that are not safe to write as complete files.
   */
  const useNativeOpenLovableEditMode = false;

  const generatorResponse = await fetch(
    "http://localhost:3000/api/generate-ai-code-stream",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: generationPrompt,
        model: "openai/gpt-4o-mini",
        context: {
          currentFiles,
        },
        isEdit: useNativeOpenLovableEditMode,
      }),
    },
  );

  if (!generatorResponse.ok) {
    const errorText = await generatorResponse.text();

    return NextResponse.json(
      {
        success: false,
        error: "Open Lovable generator failed",
        details: errorText,
      },
      { status: 500 },
    );
  }

  /**
   * Converts the streaming generator output into concrete file objects.
   * We intentionally reject responses that do not use explicit <file> blocks
   * because free-form generated text is not safe or deterministic to write.
   */
  const rawStreamText = await generatorResponse.text();
  const generatedCode = extractSseText(rawStreamText);
  const files = extractFiles(generatedCode);

  if (files.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No complete file blocks were generated",
        raw: rawStreamText.slice(0, 2000),
      },
      { status: 500 },
    );
  }

  /**
   * Applies the route-level write policy.
   * The model may suggest many files, but only safe src-level app files are
   * allowed through to disk.
   */
  const writableFiles = Array.from(
    new Map(
      files
        .filter((file) => isWritableGeneratedFile(file.path))
        .map((file) => [normalizeGeneratedFilePath(file.path), file]),
    ).values(),
  );

  if (writableFiles.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No writable src files were generated",
        generatedFiles: files.map((file) => file.path),
      },
      { status: 500 },
    );
  }

  const unsafeScan = scanFilesForUnsafePatterns(writableFiles);

  if (!unsafeScan.isSafe) {
    console.warn("[outrival-generate] rejected unsafe generated code", {
      matches: unsafeScan.matches,
    });

    return NextResponse.json(
      {
        success: false,
        error:
          "Generated code was rejected because it used unsafe patterns like eval() or raw HTML injection.",
        unsafeMatches: unsafeScan.matches.map((match) => ({
          path: match.path,
          rule: match.rule,
        })),
      },
      { status: 400 },
    );
  }

  /**
   * Writes candidate files into generated-app.
   *
   * Tailwind must remain loaded even if the model rewrites src/index.css.
   * The generated app relies on Tailwind utilities, so we enforce the import
   * here instead of trusting the model to preserve it.
   */
  for (const file of writableFiles) {
    const normalizedPath = normalizeGeneratedFilePath(file.path);
    const targetPath = safeGeneratedAppPath(normalizedPath);

    let content = file.content;

    if (normalizedPath === "src/index.css") {
      const hasTailwindImport =
        content.includes('@import "tailwindcss";') ||
        content.includes("@import 'tailwindcss';");

      if (!hasTailwindImport) {
        content = `@import "tailwindcss";\n\n${content}`;
      }
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf8");
  }

  await ensureGeneratedAppScaffold();

  const validation = await validateGeneratedApp();

  /**
   * Failed builds are rolled back to the pre-generation snapshot.
   * This prevents the UI from being left in a broken state after a bad model
   * response and gives us a clear error payload for debugging.
   */
  if (!validation.success) {
    console.error("[outrival-generate] generated app failed validation", {
      validationError: validation.error,
      filesWritten: writableFiles.map((file) => file.path),
    });

    await restoreGeneratedSrcFromSnapshot(hasSnapshot);

    return NextResponse.json(
      {
        success: false,
        error: "Generated app failed validation",
        validationError: validation.error,
        filesWritten: writableFiles.map((file) => file.path),
        restoredPreviousApp: true,
      },
      { status: 500 },
    );
  }

  /**
   * At this point the generated app built successfully, so the provisional
   * writes become the accepted generated state.
   */
  return NextResponse.json({
    success: true,
    prompt,
    isEdit,
    filesWritten: writableFiles.map((file) => file.path),
  });
}
