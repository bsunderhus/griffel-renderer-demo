import { build } from "esbuild";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
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
