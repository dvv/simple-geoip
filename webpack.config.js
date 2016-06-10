"use strict";

var Path = require("path");

module.exports = {
  entry: Path.resolve(__dirname, "./lib/index.js"),
  output: {
    library: true,
    libraryTarget: "commonjs2",
    path: __dirname,
    filename: "bundle.js",
  },
  module: {
    loaders: [
      {
        test: /.dat$/,
        loaders: ["buffer"],
      },
    ],
  },
};
