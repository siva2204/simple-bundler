const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const babel = require("@babel/core");
const path = require("path");

let id = 0;

function createFileAsset(fileName) {
  const dependencies = [];
  const fileContent = fs.readFileSync(fileName, "utf-8");

  const fileAst = parser.parse(fileContent, {
    sourceType: "module",
  });

  traverse(fileAst, {
    ImportDeclaration: ({ node }) => {
      dependencies.push(node.source.value);
    },
  });

  id++;
  const fileId = id;

  const { code } = babel.transformFromAst(fileAst, null, {
    presets: ["@babel/preset-env"],
  });

  return {
    fileId,
    fileName,
    dependencies,
    code,
  };
}

function dependencyGraph(entry) {
  const entryFileAsset = createFileAsset(entry);

  const queue = [entryFileAsset];

  for (const asset of queue) {
    const dirname = path.dirname(asset.fileName);
    asset.mapping = {};

    asset.dependencies.forEach((relativePath) => {
      const absolutePath = path.join(dirname, relativePath);
      const childAsset = createFileAsset(absolutePath);
      asset.mapping[relativePath] = childAsset.fileId;
      queue.push(childAsset);
    });
  }
  return queue;
}

function bundleModules(graph) {
  let modules = ``;
  graph.forEach((asset) => {
    modules += `${asset.fileId}: [
      function(require, exports) {${asset.code}},
      ${JSON.stringify(asset.mapping)}
    ],`;
  });
  const bundle = `(function(modules) {
    function require(id) {
      const [moduleFunction,mapping] = modules[id];

      function localRequire(localpath) {
        return require(mapping[localpath]);
      }

      const module = { exports : {}};

      moduleFunction(localRequire,module.exports);

      return module.exports;

    }
    require(1);
  })({${modules}})`;

  return bundle;
}

const graph = dependencyGraph("modules/entry.js");
const resultBundle = bundleModules(graph);
fs.writeFileSync("main.js", resultBundle);
