try { importScripts("auth.local.js"); } catch (_) {}

const API_ENDPOINT = "https://dropped.kr/api/affiliate-queue";
const PARTNERS_URL = "https://partners.coupang.com/#affiliate/ws/link-to-any-page";
const ALARM_NAME = "dropped-affiliate-auto";
const BATCH_SIZE = 10;

let running = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitUntilLoaded(tabId, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === "complete") return tab;
    await sleep(400);
  }
  throw new Error("쿠팡 파트너스 페이지 로딩 시간 초과");
}

async function getPartnersTab() {
  const tabs = await chrome.tabs.query({ url: "https://partners.coupang.com/*" });
  let tab = tabs.find(item => String(item.url || "").includes("link-to-any-page")) || tabs[0];
  if (!tab?.id) tab = await chrome.tabs.create({ url: PARTNERS_URL, active: false });
  else if (!String(tab.url || "").includes("link-to-any-page")) tab = await chrome.tabs.update(tab.id, { url: PARTNERS_URL, active: false });
  await waitUntilLoaded(tab.id);
  return tab;
}

async function request(options = {}) {
  const { droppedToken = "" } = await chrome.storage.local.get("droppedToken");
  const workerToken = self.DROPPED_WORKER_TOKEN || droppedToken;
  if (!workerToken) throw new Error("확장 프로그램 작업 토큰이 설정되지 않았습니다.");
  const response = await fetch(API_ENDPOINT, {
    ...options,
    headers: { "content-type": "application/json", "x-dropped-worker-token": workerToken, ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`Dropped API 연결 실패 (${response.status})`);
  return response.json();
}

async function sendToContent(tabId, item) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "DROPPED_GENERATE", item: { ...item, originalUrl: item.originalUrl || item.original_url } });
  } catch (error) {
    await chrome.tabs.reload(tabId);
    await waitUntilLoaded(tabId);
    return chrome.tabs.sendMessage(tabId, { type: "DROPPED_GENERATE", item: { ...item, originalUrl: item.originalUrl || item.original_url } });
  }
}

async function runAffiliateQueue() {
  if (running) return;
  running = true;
  try {
    const queue = await request();
    if (!Array.isArray(queue) || !queue.length) {
      await chrome.action.setBadgeText({ text: "" });
      return;
    }
    const tab = await getPartnersTab();
    let completed = 0;
    for (const item of queue.slice(0, BATCH_SIZE)) {
      const result = await sendToContent(tab.id, item);
      await request({
        method: "POST",
        body: JSON.stringify({ id: item.id, status: result?.ok ? "success" : "error", affiliateUrl: result?.affiliateUrl || "", error: result?.error || "링크 생성 실패" }),
      });
      completed += 1;
      await chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
      await chrome.action.setBadgeText({ text: String(completed) });
      if (result?.fatal) {
        await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
        await chrome.action.setBadgeText({ text: "!" });
        return;
      }
      await sleep(900);
    }
    await chrome.action.setBadgeText({ text: "" });
  } catch (error) {
    // 프로그램이 꺼져 있거나 로그인이 만료된 경우 다음 알람에서 자동 재시도한다.
    console.warn("Dropped affiliate automation:", error?.message || String(error));
  } finally {
    running = false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: 0.2, periodInMinutes: 1 });
  runAffiliateQueue();
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: 0.2, periodInMinutes: 1 });
  runAffiliateQueue();
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) runAffiliateQueue();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.droppedToken?.newValue) runAffiliateQueue();
});
