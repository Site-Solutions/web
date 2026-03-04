const { execSync } = require("child_process");

try {
  const output = execSync("npx convex deploy -y", {
    stdio: "pipe",
    encoding: "utf-8",
    cwd: process.cwd(),
  });
  console.log(output);
} catch (error) {
  console.error("Deploy failed:", error.stdout || error.stderr || error.message);
  process.exit(1);
}
