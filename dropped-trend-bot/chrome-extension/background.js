try { importScripts("auth.local.js"); } catch (_) {}

const API_ENDPOINT = "https://dropped.kr/api/affiliate-queue";
const PARTNERS_URL = "https://partners.coupang.com/#affiliate/ws/link-to-any-page";
const ALARM_NAME = "dropped-affiliate-auto";
const BATCH_SIZE = 10;

let running = false;

async function saveHealth(values) {
  await chrome.storage.local.set(values);
}

async function showError(message) {
  await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
  await chrome.action.setBadgeText({ text: "!" });
  await saveHealth({ droppedLastError: String(message || "알 수 없는 오류"), droppedLastErrorAt: new Date().toISOString() });
}

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

function tabUrl(tab) {
  return String(tab?.pendingUrl || tab?.url || "");
}

function isPartnersUrl(url) {
  try {
    return new URL(url).hostname === "partners.coupang.com";
  } catch (_) {
    return false;
  }
}

function isCoupangLoginUrl(url) {
  try {
    return new URL(url).hostname === "login.coupang.com";
  } catch (_) {
    return false;
  }
}

async function getPartnersTab() {
  // 파트너스가 로그인 화면으로 리다이렉트되면 URL이 login.coupang.com으로 바뀐다.
  // 이 탭을 놓치면 매 알람마다 새 탭을 만드는 루프가 생기므로 전체 탭에서 함께 찾는다.
  const tabs = await chrome.tabs.query({});
  const partnersTabs = tabs.filter(item => isPartnersUrl(tabUrl(item)));
  let tab = partnersTabs.find(item => tabUrl(item).includes("link-to-any-page")) || partnersTabs[0];

  if (!tab?.id) {
    const loginTab = tabs.find(item => isCoupangLoginUrl(tabUrl(item)));
    if (loginTab?.id) {
      throw new Error("쿠팡 파트너스 로그인이 필요합니다. 기존 쿠팡 로그인 탭에서 직접 로그인해주세요.");
    }
    throw new Error("쿠팡 파트너스 탭이 없습니다. 자동으로 열지 않으므로 필요할 때 직접 열어주세요.");
  }

  if (!tabUrl(tab).includes("link-to-any-page")) tab = await chrome.tabs.update(tab.id, { url: PARTNERS_URL, active: false });

  const loadedTab = await waitUntilLoaded(tab.id);
  if (isCoupangLoginUrl(tabUrl(loadedTab))) {
    throw new Error("쿠팡 파트너스 로그인이 필요합니다. 열린 로그인 탭에서 직접 로그인해주세요.");
  }
  if (!isPartnersUrl(tabUrl(loadedTab))) {
    throw new Error("쿠팡 파트너스 페이지를 열지 못했습니다. 열린 쿠팡 탭을 확인해주세요.");
  }
  return loadedTab;
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
      await saveHealth({ droppedLastCheckAt: new Date().toISOString(), droppedLastError: "", droppedLastErrorAt: "" });
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
        await showError(result?.error || "쿠팡 파트너스 확인이 필요합니다.");
        return;
      }
      await sleep(900);
    }
    await saveHealth({ droppedLastCheckAt: new Date().toISOString(), droppedLastSuccessAt: new Date().toISOString(), droppedLastError: "", droppedLastErrorAt: "" });
    await chrome.action.setBadgeText({ text: "" });
  } catch (error) {
    await showError(error?.message || String(error));
    console.warn("Dropped affiliate automation:", error?.message || String(error));
  } finally {
    running = false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: 0.2, periodInMinutes: 5 });
  runAffiliateQueue();
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: 0.2, periodInMinutes: 5 });
  runAffiliateQueue();
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) runAffiliateQueue();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.droppedToken?.newValue) runAffiliateQueue();
});

// 수동 재로드에서도 즉시 알람을 복구하고 첫 대기열을 처리한다.
chrome.alarms.create(ALARM_NAME, { delayInMinutes: 0.2, periodInMinutes: 5 });
runAffiliateQueue();
