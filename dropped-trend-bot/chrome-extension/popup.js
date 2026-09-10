const $ = id => document.getElementById(id);
const queueInput = $("queueInput");
const endpointInput = $("endpointInput");
const tokenInput = $("tokenInput");
const statusBox = $("status");
let queue = [];
let index = 0;
let running = false;

function setStatus(message) { statusBox.textContent = message; }
function counts() {
  return queue.reduce((result, item) => { result[item.status === "success" ? "success" : item.status === "error" ? "failed" : "pending"] += 1; return result; }, { success: 0, failed: 0, pending: 0 });
}
function parseQueue() {
  try {
    const value = JSON.parse(queueInput.value);
    if (!Array.isArray(value)) throw new Error("배열 형식이 아닙니다.");
    queue = value.map(item => ({ ...item, originalUrl: item.originalUrl || item.original_url, status: item.status === "success" ? "success" : "pending" }));
    index = queue.findIndex(item => item.status !== "success");
    if (index < 0) index = queue.length;
    setStatus(`대기열 ${queue.length}개 · 시작 위치 ${Math.min(index + 1, queue.length)}/${queue.length}`);
    return true;
  } catch (error) { setStatus(`JSON 오류\n${error.message}`); return false; }
}
async function activePartnersTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !String(tab.url || "").includes("partners.coupang.com")) throw new Error("쿠팡 파트너스 간편링크 페이지에서 실행해주세요.");
  return tab;
}
async function saveLocal() {
  queueInput.value = JSON.stringify(queue, null, 2);
  await chrome.storage.local.set({ droppedResults: queue, droppedEndpoint: endpointInput.value.trim(), droppedToken: tokenInput.value });
}
async function report(item) {
  if (!item.id || !endpointInput.value.trim() || !tokenInput.value) return;
  const response = await fetch(endpointInput.value.trim(), { method: "POST", headers: { "content-type": "application/json", "x-dropped-worker-token": tokenInput.value }, body: JSON.stringify({ id: item.id, status: item.status, affiliateUrl: item.affiliateUrl, error: item.error }) });
  if (!response.ok) throw new Error(`Dropped 저장 실패 (${response.status})`);
}
async function processAt(position, tab) {
  const item = queue[position];
  setStatus(`[${position + 1}/${queue.length}] ${item.keyword || item.productTitle || "항목"}\n링크 생성 중...`);
  let response;
  try { response = await chrome.tabs.sendMessage(tab.id, { type: "DROPPED_GENERATE", item }); }
  catch (error) { response = { ok: false, error: error.message, fatal: false }; }
  if (response?.ok) queue[position] = { ...item, affiliateUrl: response.affiliateUrl, status: "success", error: null };
  else queue[position] = { ...item, status: "error", error: response?.error || "링크 생성 실패" };
  await saveLocal();
  try { await report(queue[position]); } catch (error) { queue[position].syncError = error.message; await saveLocal(); }
  return { ok: Boolean(response?.ok), fatal: Boolean(response?.fatal), error: response?.error };
}
async function processCurrent() {
  if (!queue.length && !parseQueue()) return;
  if (index >= queue.length) { setStatus("모든 항목 처리가 완료되었습니다."); return; }
  const tab = await activePartnersTab();
  const result = await processAt(index, tab);
  setStatus(`[${index + 1}/${queue.length}] ${result.ok ? "성공" : "실패"}\n${result.ok ? queue[index].affiliateUrl : result.error}`);
}
async function processAll() {
  if (running) return;
  if (!queue.length && !parseQueue()) return;
  const tab = await activePartnersTab();
  running = true;
  try {
    for (; index < queue.length; index += 1) {
      if (queue[index].status === "success") continue;
      const result = await processAt(index, tab);
      const summary = counts();
      setStatus(`[${index + 1}/${queue.length}] ${result.ok ? "성공" : "실패"}\n성공 ${summary.success} / 실패 ${summary.failed}`);
      if (result.fatal) { setStatus(`전체 자동 생성 중단\n${result.error}\n성공 ${summary.success} / 실패 ${summary.failed}`); return; }
      await new Promise(resolve => setTimeout(resolve, 900));
    }
    const summary = counts();
    setStatus(`전체 ${queue.length} / 성공 ${summary.success} / 실패 ${summary.failed}`);
  } finally { running = false; }
}

$("pasteButton").addEventListener("click", async () => { try { queueInput.value = await navigator.clipboard.readText(); parseQueue(); } catch (error) { setStatus(`클립보드 읽기 실패\n${error.message}`); } });
$("loadButton").addEventListener("click", async () => {
  try {
    const response = await fetch(endpointInput.value.trim(), { headers: { "x-dropped-worker-token": tokenInput.value } });
    if (!response.ok) throw new Error(`대기열 요청 실패 (${response.status})`);
    queueInput.value = JSON.stringify(await response.json(), null, 2); parseQueue(); await saveLocal();
  } catch (error) { setStatus(error.message); }
});
$("startButton").addEventListener("click", () => processCurrent().catch(error => setStatus(error.message)));
$("autoButton").addEventListener("click", () => processAll().catch(error => { running = false; setStatus(error.message); }));
$("nextButton").addEventListener("click", () => { index = Math.min(index + 1, queue.length); processCurrent().catch(error => setStatus(error.message)); });
$("copyButton").addEventListener("click", async () => { await navigator.clipboard.writeText(JSON.stringify(queue, null, 2)); setStatus("생성 결과 JSON을 복사했습니다."); });

chrome.storage.local.get(["droppedResults", "droppedEndpoint", "droppedToken"], data => {
  if (data.droppedEndpoint) endpointInput.value = data.droppedEndpoint;
  if (data.droppedToken) tokenInput.value = data.droppedToken;
  if (Array.isArray(data.droppedResults) && data.droppedResults.length) { queue = data.droppedResults; queueInput.value = JSON.stringify(queue, null, 2); index = queue.findIndex(item => item.status !== "success"); if (index < 0) index = queue.length; setStatus(`이전 작업 ${queue.length}개 복구`); }
});
