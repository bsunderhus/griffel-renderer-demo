import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";
import webpack from "webpack";
import { GriffelCSSExtractionPlugin } from "@griffel/webpack-extraction-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "node:path";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/app.jsx"],
  bundle: true,
  outfile: "dist/app.js",
  define: { "process.env.NODE_ENV": '"production"' },
  sourcemap: false,
});
await copyFile("index.html", "dist/index.html");

const common = {
  mode: "production",
  context: process.cwd(),
  externals: {
    react: "React",
    "react-dom": "ReactDOM",
    "react-dom/client": "ReactDOMClient",
  },
  optimization: { minimize: false },
  devtool: false,
};
const rawModules = [];
for (const target of ["host-extracted", "host-runtime", "shared/host-extracted", "shared/host-runtime", "integration", "persona", "feedback-standard", "feedback-raw"]) {
  const extracted = target.endsWith("host-extracted");
  const shared = target.startsWith("shared/");
  const entry = target === "integration" ? "runtime-integration" :
    target === "persona" ? "persona-actor" : target.startsWith("feedback-") ? "feedback-actor" : "host";
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      ...common,
      entry: `./src/${entry}.jsx`,
      output: { path: path.resolve(shared ? "dist/shared" : "dist"),
        filename: `${path.basename(target)}.js`, uniqueName: target },
      module: {
        rules: [
          ...(extracted ? [{
            test: /\.jsx?$/,
            include: [path.resolve("src"), /node_modules[/\\]@fluentui[/\\]/],
            use: [{ loader: GriffelCSSExtractionPlugin.loader }],
          }] : []),
          {
            test: /\.jsx$/,
            exclude: /node_modules/,
            use: [
              {
                loader: "babel-loader",
                options: {
                  babelrc: false,
                  configFile: false,
                  presets: [
                    ["@babel/preset-react", { runtime: "classic" }],
                    ...(extracted ? ["@griffel/babel-preset"] : []),
                  ],
                },
              },
            ],
          },
          { test: /\.css$/, use: [MiniCssExtractPlugin.loader, "css-loader"] },
        ],
      },
      plugins: [...(extracted ? [
        new MiniCssExtractPlugin({ filename: "[name].css" }),
        new GriffelCSSExtractionPlugin(),
      ] : []), ...(shared ? [
        new webpack.NormalModuleReplacementPlugin(/^\.\/host-controls\.jsx$/, resource => {
          resource.request = "./host-shared-controls.jsx";
        }),
      ] : []), ...(target === "feedback-raw" ? [
        new webpack.NormalModuleReplacementPlugin(/\.styles\.js$/, resource => {
          const candidate = path.resolve(resource.context, resource.request.replace(/\.js$/, ".raw.js"));
          if (candidate.includes(`${path.sep}@fluentui${path.sep}`) && existsSync(candidate)) {
            resource.request = candidate;
            rawModules.push(path.relative(process.cwd(), candidate));
          }
        }),
      ] : [])],
    });
    compiler.run((error, stats) => compiler.close(closeError => {
      if (error || closeError) return reject(error || closeError);
      if (stats.hasErrors()) return reject(new Error(stats.toString({ all: false, errors: true })));
      console.log(`${target}: build complete`);
      resolve();
    }));
  });
}
await writeFile("dist/feedback-raw-modules.json", JSON.stringify([...new Set(rawModules)].sort(), null, 2));
