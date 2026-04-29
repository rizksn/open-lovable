import { NextResponse } from "next/server";

declare global {
  // eslint-disable-next-line no-var
  var activeSandbox: any;
  // eslint-disable-next-line no-var
  var activeSandboxProvider: any;
  // eslint-disable-next-line no-var
  var lastViteRestartTime: number | undefined;
  // eslint-disable-next-line no-var
  var viteRestartInProgress: boolean | undefined;
}

const RESTART_COOLDOWN_MS = 5000;

export async function POST() {
  const provider = global.activeSandbox || global.activeSandboxProvider;

  if (!provider) {
    return NextResponse.json(
      {
        success: false,
        restarted: false,
        reason: "no_provider",
        error: "No active sandbox",
      },
      { status: 400 },
    );
  }

  if (global.viteRestartInProgress) {
    console.log("[restart-vite] Vite restart already in progress, skipping...");

    return NextResponse.json({
      success: true,
      restarted: false,
      reason: "in_progress",
      message: "Vite restart already in progress",
    });
  }

  const now = Date.now();

  if (
    global.lastViteRestartTime &&
    now - global.lastViteRestartTime < RESTART_COOLDOWN_MS
  ) {
    const remainingMs =
      RESTART_COOLDOWN_MS - (now - global.lastViteRestartTime);
    const remainingTime = Math.ceil(remainingMs / 1000);

    console.log(`[restart-vite] Cooldown active, ${remainingTime}s remaining`);

    return NextResponse.json({
      success: true,
      restarted: false,
      reason: "cooldown",
      cooldownRemainingMs: remainingMs,
      message: `Vite was recently restarted, cooldown active (${remainingTime}s remaining)`,
    });
  }

  global.viteRestartInProgress = true;

  try {
    console.log("[restart-vite] Using provider method to restart Vite...");

    if (typeof provider.restartViteServer === "function") {
      await provider.restartViteServer();
      console.log("[restart-vite] Vite restarted via provider method");
    } else {
      console.log("[restart-vite] Fallback to manual Vite restart...");

      try {
        await provider.runCommand("pkill -f vite");
        console.log("[restart-vite] Killed existing Vite processes");

        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch {
        console.log("[restart-vite] No existing Vite processes found");
      }

      try {
        await provider.runCommand(
          'bash -c "echo \'{\\"errors\\": [], \\"lastChecked\\": ' +
            Date.now() +
            "}' > /tmp/vite-errors.json\"",
        );
      } catch {
        console.log("[restart-vite] Failed to clear vite error tracking file");
      }

      await provider.runCommand(
        'sh -c "nohup npm run dev -- --force > /tmp/vite.log 2>&1 &"',
      );
      console.log("[restart-vite] Vite dev server restarted");

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    global.lastViteRestartTime = Date.now();

    return NextResponse.json({
      success: true,
      restarted: true,
      reason: "completed",
      message: "Vite restarted successfully",
    });
  } catch (error) {
    console.error("[restart-vite] Error:", error);

    return NextResponse.json(
      {
        success: false,
        restarted: false,
        reason: "error",
        error: (error as Error).message,
      },
      { status: 500 },
    );
  } finally {
    global.viteRestartInProgress = false;
  }
}
