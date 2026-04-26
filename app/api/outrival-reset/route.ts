import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST() {
  const root = path.join(process.cwd(), "generated-app");

  const appPath = path.join(root, "src", "App.jsx");
  const cssPath = path.join(root, "src", "index.css");

  const appCode = `
export default function App() {
  return (
    <main className="starter-shell">
      <div>
        <h1>Ready to generate</h1>
        <p>Describe an app in the OutRival panel to begin.</p>
      </div>
    </main>
  );
}
`;

  const cssCode = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
}

.starter-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #111827;
  color: white;
  text-align: center;
}
`;

  await fs.writeFile(appPath, appCode.trimStart(), "utf8");
  await fs.writeFile(cssPath, cssCode.trimStart(), "utf8");

  return NextResponse.json({ success: true });
}
