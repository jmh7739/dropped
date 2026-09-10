const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const authFile = path.join(projectRoot, "dropped-trend-bot", "chrome-extension", "auth.local.js");
const token = `drp_${crypto.randomBytes(48).toString("base64url")}`;
const common = ["--yes", "vercel", "env", "add", "DROPPED_WORKER_TOKEN", "production", "--force", "--sensitive", "--yes", "--scope", "minhyeongs-projects-d0b01945"];
const executable = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";
const args = process.platform === "win32" ? ["/d", "/s", "/c", "npx.cmd", ...common] : common;
const result = spawnSync(executable, args, { cwd: projectRoot, input: `${token}\n`, encoding: "utf8", windowsHide: true });
if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "Vercel 환경 변수 설정 실패");
  process.exit(result.status || 1);
}
fs.writeFileSync(authFile, `self.DROPPED_WORKER_TOKEN = ${JSON.stringify(token)};\n`, { encoding: "utf8", mode: 0o600 });
console.log("확장 프로그램과 Vercel 작업 토큰 설정 완료");
