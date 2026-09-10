const { config } = require("./core");
const { runRealtimeTrendUpdate, runTrendingProductsUpdate } = require("./worker");
const { startAffiliateBridge } = require("./affiliateBridge");
const { execFile } = require("child_process");
const path = require("path");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

let workerRunning = false;
let schedulerStarted = false;

async function ensureSupabaseCredentials() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) return;
  const projectRoot = path.resolve(__dirname, "..", "..");
  const commandArgs = ["--yes", "supabase", "projects", "api-keys", "--project-ref", "xirpfadorbmeutuijpbm", "--output", "json"];
  const executable = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npx.cmd", ...commandArgs] : commandArgs;
  const { stdout } = await execFileAsync(executable, args, {
    cwd: projectRoot,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
  });
  const keys = JSON.parse(stdout);
  const serviceRole = keys.find(item => item.name === "service_role")?.api_key;
  if (!serviceRole) throw new Error("Supabase service-role key를 가져오지 못했습니다.");
  process.env.SUPABASE_URL = "https://xirpfadorbmeutuijpbm.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRole;
}

async function isolated(label, run) {
  if (workerRunning) return;
  workerRunning = true;
  try { await run(); }
  catch (error) { console.error(`[${label}] ${error.message}`); }
  finally { workerRunning = false; }
}

function runWhenIdle(label, run) {
  if (workerRunning) {
    setTimeout(() => runWhenIdle(label, run), 15_000);
    return;
  }
  isolated(label, run);
}

async function startLocalScheduler({ log = console.log } = {}) {
  if (schedulerStarted) return;
  await ensureSupabaseCredentials();
  schedulerStarted = true;
  startAffiliateBridge({ onQueueDrained: () => runWhenIdle("affiliate-refresh", runTrendingProductsUpdate), log });
  await isolated("realtime", runRealtimeTrendUpdate);
  await isolated("products", runTrendingProductsUpdate);
  setInterval(() => isolated("realtime", runRealtimeTrendUpdate), config.REALTIME_REFRESH_MS);
  setInterval(() => isolated("products", runTrendingProductsUpdate), config.TRENDING_PRODUCT_REFRESH_MS);
  log("프로그램 내부 스케줄러 시작: 실시간 1시간 / 상품 4시간 / 파트너스 자동 처리");
}

if (require.main === module) startLocalScheduler();
module.exports = { ensureSupabaseCredentials, startLocalScheduler };
