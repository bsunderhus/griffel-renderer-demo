import { GriffelCSSExtractionPlugin } from "@griffel/webpack-extraction-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import webpack from "webpack";
import path from "node:path";
import { existsSync } from "node:fs";

export function createWebpackConfig(target, rawModules) {
  return {
    mode: "production",
    context: process.cwd(),
    externals: { react: "React", "react-dom": "ReactDOM", "react-dom/client": "ReactDOMClient" },
    optimization: { minimize: false },
    devtool: false,
    entry: `./src/${target.entry}`,
    output: {
      path: path.resolve("dist", path.dirname(target.name)),
      filename: `${path.basename(target.name)}.js`,
      uniqueName: target.name,
    },
    module: {
      rules: [
        ...(target.extracted
          ? [
              {
                test: /\.jsx?$/,
                include: [path.resolve("src"), /node_modules[/\\]@fluentui[/\\]/],
                use: [{ loader: GriffelCSSExtractionPlugin.loader }],
              },
            ]
          : []),
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
                  ...(target.extracted ? ["@griffel/babel-preset"] : []),
                ],
              },
            },
          ],
        },
        { test: /\.css$/, use: [MiniCssExtractPlugin.loader, "css-loader"] },
      ],
    },
    plugins: [
      ...(target.extracted
        ? [new MiniCssExtractPlugin({ filename: "[name].css" }), new GriffelCSSExtractionPlugin()]
        : []),
      ...(target.raw
        ? [
            new webpack.NormalModuleReplacementPlugin(/\.styles\.js$/, (resource) => {
              const candidate = path.resolve(
                resource.context,
                resource.request.replace(/\.js$/, ".raw.js"),
              );
              if (candidate.includes(`${path.sep}@fluentui${path.sep}`) && existsSync(candidate)) {
                resource.request = candidate;
                rawModules.push(path.relative(process.cwd(), candidate));
              }
            }),
          ]
        : []),
    ],
  };
}
