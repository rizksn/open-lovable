import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST() {
  const root = path.join(process.cwd(), "generated-app");
  const srcPath = path.join(root, "src");

  const componentsPath = path.join(srcPath, "components");
  const appPath = path.join(srcPath, "App.jsx");
  const indexCssPath = path.join(srcPath, "index.css");
  const appCssPath = path.join(srcPath, "App.css");

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

  await fs.rm(componentsPath, { recursive: true, force: true });
  await fs.mkdir(componentsPath, { recursive: true });

  await fs.rm(appCssPath, { force: true });

  await fs.writeFile(appPath, appCode.trimStart(), "utf8");
  await fs.writeFile(indexCssPath, cssCode.trimStart(), "utf8");

  return NextResponse.json({ success: true });
}
