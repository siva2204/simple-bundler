const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
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

  return {
    fileId,
    fileName,
    dependencies,
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

const graph = dependencyGraph("modules/entry.js");

console.log(graph);
