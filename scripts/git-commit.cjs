const { execSync } = require("child_process");
const msg = process.argv[2] || "feat: support multiple product images per item";
const cwd = "D:/korean proxy shopping";

const tree = execSync("git write-tree", { cwd, encoding: "utf8" }).trim();
const parent = execSync("git rev-parse HEAD", { cwd, encoding: "utf8" }).trim();
const commit = execSync(`git commit-tree ${tree} -p ${parent} -m "${msg}"`, {
  cwd,
  encoding: "utf8",
}).trim();
execSync(`git update-ref refs/heads/main ${commit}`, { cwd });
console.log("Committed:", commit);
