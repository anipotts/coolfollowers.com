import { build, context } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const extensionRoot = resolve(root, "extension");
const outdir = resolve(extensionRoot, "dist");
const watch = process.argv.includes("--watch");

const options = {
  entryPoints: {
    background: resolve(extensionRoot, "src/background.ts"),
    bridge: resolve(extensionRoot, "src/bridge.ts"),
    instagram: resolve(extensionRoot, "src/instagram.ts"),
    sidepanel: resolve(extensionRoot, "src/sidepanel.ts"),
  },
  bundle: true,
  entryNames: "[name]",
  format: "iife",
  target: "chrome120",
  outdir,
  sourcemap: watch,
  minify: !watch,
  legalComments: "none",
};

async function copyStaticFiles() {
  await mkdir(resolve(outdir, "icons"), { recursive: true });
  const manifest = JSON.parse(
    await readFile(resolve(extensionRoot, "manifest.json"), "utf8"),
  );
  if (watch) {
    manifest.content_scripts[0].matches.push(
      "http://localhost/*",
      "http://127.0.0.1/*",
    );
  }
  await writeFile(
    resolve(outdir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await cp(resolve(extensionRoot, "sidepanel.html"), resolve(outdir, "sidepanel.html"));
  await cp(resolve(extensionRoot, "sidepanel.css"), resolve(outdir, "sidepanel.css"));
  for (const size of [16, 48, 128]) {
    await cp(
      resolve(extensionRoot, "icons", "icon-" + size + ".png"),
      resolve(outdir, "icons", "icon-" + size + ".png"),
    );
  }
}

if (watch) {
  await mkdir(outdir, { recursive: true });
  const buildContext = await context(options);
  await buildContext.watch();
  await copyStaticFiles();
  console.log("watching the coolfollowers extension");
} else {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  await build(options);
  await copyStaticFiles();
  console.log("built extension/dist");
}
