import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const blueprintDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(blueprintDir);
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'android', 'ios']);

const walk = (directory, files = []) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolutePath, files);
    else files.push(absolutePath);
  }
  return files;
};

const allFiles = walk(repoRoot);
const relativeFiles = allFiles.map((file) => path.relative(repoRoot, file).split(path.sep).join('/'));
const sourceFiles = relativeFiles.filter((file) => /\.(ts|tsx)$/.test(file));

const graphContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(blueprintDir, 'graph-data.js'), 'utf8'), graphContext);
const graph = graphContext.window.BLUEPRINT_DATA;
const mappedFiles = [...new Set(graph.nodes.flatMap((node) => node.files))];
const missingMappedFiles = mappedFiles.filter((file) => !relativeFiles.includes(file));

const stats = {
  generatedAt: new Date().toISOString(),
  sourceFiles: sourceFiles.length,
  services: sourceFiles.filter((file) => file.startsWith('services/')).length,
  views: sourceFiles.filter((file) => file.startsWith('views/')).length,
  components: sourceFiles.filter((file) => file.startsWith('components/')).length,
  audits: relativeFiles.filter((file) => file.startsWith('scripts/audit-')).length,
  mappedFiles: mappedFiles.length,
  missingMappedFiles,
  graphNodes: graph.nodes.length,
  graphEdges: graph.edges.length,
  journeys: graph.journeys.length
};

const output = `window.BLUEPRINT_REPO_STATS = ${JSON.stringify(stats, null, 2)};\n`;
fs.writeFileSync(path.join(blueprintDir, 'source-index.js'), output);

console.log(JSON.stringify(stats, null, 2));
if (missingMappedFiles.length) process.exitCode = 1;
