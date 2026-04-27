"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { AuthButton } from "@/components/auth/AuthButton";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type HistoryItem = {
  id: string;
  prompt: string;
  mode: "create" | "edit";
  filesWritten: string[];
};

const EXAMPLE_PROMPTS = [
  "Build a financial aid calculator for college students",
  "Create an admissions FAQ chatbot for a university",
  "Build a scholarship eligibility checker",
  "Create a campus visit planner tool",
];

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedApp, setHasGeneratedApp] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastFilesWritten, setLastFilesWritten] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "generating" | "validating" | "error" | "success"
  >("idle");

  const mode = hasGeneratedApp ? "edit" : "create";

  async function handleSaveApp() {
    if (!user) return;

    const latestPrompt = history[0]?.prompt ?? prompt;

    const payload = {
      userId: user.id,
      organizationId: user.organizationId,
      name: "My Generated App",
      prompt: latestPrompt,
      files: lastFilesWritten,
    };

    console.log("Save payload:", payload);

    const res = await fetch("/api/apps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    console.log("Save status:", res.status);
    console.log("Save response:", data);

    if (!data.success) {
      console.error("Failed to save app:", data.error);
      return;
    }

    router.push(`/apps/${data.slug}`);
  }

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;

    const submittedPrompt = prompt.trim();
    const submittedMode = hasGeneratedApp ? "edit" : "create";

    setIsGenerating(true);
    setErrorMessage(null);
    setStatus("generating");

    try {
      const response = await fetch("/api/outrival-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: submittedPrompt,
          isEdit: hasGeneratedApp,
        }),
      });

      setStatus("validating");

      const data = await response.json();

      if (!response.ok) {
        console.warn("[outrival-generate] request failed", data);

        const message =
          data.validationError ||
          data.details ||
          data.error ||
          "Generation failed";

        setLastFilesWritten([]);
        setErrorMessage(message);
        setStatus("error");
        return;
      }

      const filesWritten = data.filesWritten ?? [];

      setLastFilesWritten(filesWritten);

      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          prompt: submittedPrompt,
          mode: submittedMode,
          filesWritten,
        },
        ...prev,
      ]);

      setHasGeneratedApp(true);
      setPrompt("");
      setStatus("success");
    } catch (error) {
      console.warn("[outrival-generate] unexpected client error", error);

      setLastFilesWritten([]);
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected generation error",
      );

      setStatus("error");
    } finally {
      setIsGenerating(false);
    }
  }

  function clearBuilderState() {
    setStatus("idle");
    setPrompt("");
    setHasGeneratedApp(false);
    setHistory([]);
    setLastFilesWritten([]);
    setErrorMessage(null);
  }

  useEffect(() => {
    async function resetOnLogout() {
      if (!user) {
        await fetch("/api/generated-app/reset", { method: "POST" });
        clearBuilderState();
      }
    }

    resetOnLogout();
  }, [user]);

  useEffect(() => {
    console.log("Supabase connected:", supabase);
  }, []);

  async function handleReset() {
    await fetch("/api/generated-app/reset", { method: "POST" });

    clearBuilderState();
  }

  return (
    <main className="h-screen w-screen bg-[#050505] text-white flex overflow-hidden">
      <aside className="w-[420px] border-r border-white/10 bg-[#090909] flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white text-black grid place-items-center font-bold"></div>

              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  OutRival
                </h1>
                <p className="text-xs text-white/45">AI app builder</p>
              </div>
            </div>

            <AuthButton />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-20">
          {user && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
              Acting as{" "}
              <span className="font-medium text-white">
                {user.role === "platform_admin"
                  ? "OutRival Admin"
                  : "Institution User"}
              </span>
            </div>
          )}

          <div className="mb-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            <div
              className={`rounded-xl px-3 py-2 text-center text-xs font-semibold transition ${
                mode === "create" ? "bg-white text-black" : "text-white/35"
              }`}
            >
              Create app
            </div>
            <div
              className={`rounded-xl px-3 py-2 text-center text-xs font-semibold transition ${
                mode === "edit" ? "bg-white text-black" : "text-white/35"
              }`}
            >
              Edit app
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <label className="text-sm font-medium text-white/80">
              {mode === "edit" ? "Describe your edit" : "Describe your app"}
            </label>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={
                hasGeneratedApp
                  ? "Describe your edit..."
                  : "Describe the app you want to build..."
              }
              rows={5}
              className="min-h-36 max-h-72 w-full resize-none overflow-y-auto rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/50 focus:bg-black/40 focus:ring-4 focus:ring-emerald-400/10"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((examplePrompt) => (
              <button
                key={examplePrompt}
                type="button"
                onClick={() => setPrompt(examplePrompt)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
              >
                {examplePrompt}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-400/10 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isGenerating
                ? mode === "edit"
                  ? "Applying edit..."
                  : "Generating..."
                : mode === "edit"
                  ? "Apply edit"
                  : "Generate app"}
            </button>

            {errorMessage && (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/[0.08] p-4">
                <p className="text-xs font-semibold text-red-200">
                  Generation failed
                </p>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-red-100/80">
                  {errorMessage}
                </pre>

                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(errorMessage)}
                  className="mt-3 text-xs font-medium text-red-100/70 transition hover:text-red-100"
                >
                  Copy error
                </button>
              </div>
            )}

            <button
              onClick={handleReset}
              disabled={isGenerating}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset project
            </button>
          </div>

          {status !== "idle" && (
            <p className="text-xs text-white/40">
              {status === "generating" && "Generating code..."}
              {status === "validating" && "Validating build..."}
              {status === "success" && "Ready"}
              {status === "error" && "Failed"}
            </p>
          )}

          {lastFilesWritten.length > 0 && (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
              <p className="text-xs font-medium text-emerald-200">
                {mode === "edit" ? "Updated files" : "Generated files"}
              </p>

              <div className="mt-3 space-y-1">
                {lastFilesWritten.map((file) => (
                  <p
                    key={file}
                    className="truncate rounded-lg bg-black/30 px-2 py-1 font-mono text-[11px] text-emerald-100/70"
                  >
                    {file}
                  </p>
                ))}
              </div>
            </div>
          )}

          {lastFilesWritten.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              {user ? (
                <button
                  type="button"
                  onClick={handleSaveApp}
                  className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-300"
                >
                  Save app
                </button>
              ) : (
                <p className="text-xs text-white/45">
                  Sign in to save, deploy, and share this app publicly.
                </p>
              )}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-medium text-white/70">Pipeline</p>
            <div className="mt-3 space-y-2 text-xs text-white/45">
              <p>Prompt → Open Lovable generator</p>
              <p>Generated files → local Vite app</p>
              <p>Preview → live iframe</p>
            </div>
          </div>

          {history.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-white/70">History</p>
                <p className="text-[11px] text-white/35">
                  {history.length} run{history.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="mt-3 space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] uppercase tracking-wide text-white/55">
                        {item.mode}
                      </span>

                      <span className="text-[11px] text-white/35">
                        {item.filesWritten.length} file
                        {item.filesWritten.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-white/80">
                      {item.prompt}
                    </p>

                    <button
                      type="button"
                      onClick={() => setPrompt(item.prompt)}
                      className="mt-3 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-400/[0.14]"
                    >
                      Use prompt
                    </button>

                    {item.filesWritten.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {item.filesWritten.map((file) => (
                          <p
                            key={file}
                            className="truncate rounded-lg bg-black/30 px-2 py-1 font-mono text-[11px] text-white/45"
                          >
                            {file}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 text-xs text-white/35">
          Running preview at localhost:5173
        </div>
      </aside>

      <section className="flex-1 bg-[#111827] p-4">
        <div className="h-full overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
          <iframe
            src="http://localhost:5173"
            className="h-full w-full border-0"
            title="Generated App Preview"
          />
        </div>
      </section>
    </main>
  );
}
