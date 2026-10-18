import { build } from "esbuild";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { SITE_FILES } from "./server.mjs";
import webpack from "webpack";
import { targets } from "./build/targets.mjs";
import { createWebpackConfig } from "./build/webpack-config.mjs";

await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/browser-entry.jsx"],
  bundle: true,
  outfile: "dist/app.js",
  define: { "process.env.NODE_ENV": '"production"' },
  sourcemap: false,
});
await copyFile("index.html", "dist/index.html");

const rawModules = [];
const bundleModules = {};
function moduleNames(modules) {
  return modules.flatMap(module => [module.name, ...moduleNames(module.modules || [])]).filter(Boolean);
}
for (const target of targets) {
  await new Promise((resolve, reject) => {
    const compiler = webpack(createWebpackConfig(target, rawModules));
    compiler.run((error, stats) => compiler.close(closeError => {
      if (error || closeError) return reject(error || closeError);
      if (stats.hasErrors()) return reject(new Error(stats.toString({ all: false, errors: true })));
      bundleModules[target.name] = [...new Set(moduleNames(
        stats.toJson({ all: false, modules: true, nestedModules: true }).modules))].sort();
      console.log(`${target.name}: build complete`);
      resolve();
    }));
  });
}
await writeFile("dist/feedback-raw-modules.json", JSON.stringify([...new Set(rawModules)].sort(), null, 2));
await writeFile("dist/bundle-modules.json", JSON.stringify(bundleModules, null, 2));

// Static artifact for GitHub Pages: the same allowlisted files, with each route
// written as an .html page so extensionless URLs keep their query strings.
const pagesDir = "dist/pages";
await rm(pagesDir, { recursive: true, force: true });
for (const [route, [file, type]] of Object.entries(SITE_FILES)) {
  const target = type === "text/html" ? `${route === "/" ? "index" : route.slice(1)}.html` : file;
  await mkdir(dirname(join(pagesDir, target)), { recursive: true });
  await copyFile(join("dist", file), join(pagesDir, target));
}
for (const legacy of ["source", "three-actors"]) await copyFile("dist/index.html", join(pagesDir, `${legacy}.html`));
await writeFile(join(pagesDir, ".nojekyll"), "");
console.log("pages: artifact complete");
