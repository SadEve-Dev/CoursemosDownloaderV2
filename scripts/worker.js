let q = [];
let isRunning = false;

/**
 * @brief 대기열 저장소 동기화
 * @return {void}
 */
const save = () => chrome.storage.local.set({ q });
chrome.storage.local.get(['q'], (res) => { 
    if (res.q) q = res.q; 
});

/**
 * @brief 오프스크린 문서 초기화
 * @return {void}
 */
async function initOff() {
    if ((await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })).length > 0) return;
    await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['BLOBS'], justification: 'merge' });
}

/**
 * @brief 대기열 순차 처리 워커
 * @return {void}
 */
async function processQueue() {
    if (isRunning) return;
    const next = q.find(x => x.status === "준비 중...");
    if (!next) return;
    isRunning = true;
    await startJob(next.url, next.filename, next.uuid);
}

/**
 * @brief 대기열 확인 후 불필요한 오프스크린 문서 종료
 * @return {void}
 */
async function closeOffscreen() {
    const hasActiveJob = q.some(item => !["완료", "오류 발생", "에러 발생"].includes(item.status));
    if (hasActiveJob) return;
    if ((await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })).length > 0) chrome.offscreen.closeDocument();
}

chrome.runtime.onMessage.addListener((msg, sender, send) => {
    if (msg.type === "ENQUEUE") {
        const uuid = Date.now().toString();
        // 세그먼트 추적 필드 초기화
        q.push({ uuid, url: msg.url, filename: msg.filename, status: "준비 중...", progress: 0, totalBytes: 0, currentSeg: 0, totalSeg: 0 });
        save();
        processQueue();
        send({ success: true });
    }
    if (msg.type === "UPDATE_PROGRESS") {
        const item = q.find(x => x.uuid === msg.uuid);
        if (!item) return;
        
        // merger.js로부터 받은 실시간 세그먼트 데이터를 큐에 저장
        if (msg.totalBytes !== undefined) item.totalBytes = msg.totalBytes;
        if (msg.currentSeg !== undefined) item.currentSeg = msg.currentSeg;
        if (msg.totalSeg !== undefined) item.totalSeg = msg.totalSeg;

        if (msg.status) {
            item.status = msg.status;
            item.progress = msg.progress ?? item.progress;
        } else {
            item.progress = msg.progress;
            item.status = `다운로드 중... (${msg.progress}%)`;
        }
        save();
        if (msg.status === "에러 발생" || msg.status === "오류 발생") {
            isRunning = false;
            processQueue();
        }
    }
    if (msg.type === "EXECUTE_DOWNLOAD") {
        chrome.downloads.download({ url: msg.url, filename: msg.filename + ".mp4", conflictAction: "uniquify" }, (id) => {
            const item = q.find(x => x.uuid === msg.uuid);
            if (item) { item.downloadId = id; item.status = "파일 저장 중..."; save(); }
        });
    }
    if (msg.type === "GET_QUEUE") send({ queue: q });
    if (msg.type === "CLEAR_ALL_QUEUE") { 
        q.forEach(item => {
            chrome.runtime.sendMessage({ type: "STOP_MERGE", uuid: item.uuid }).catch(() => {});
            chrome.runtime.sendMessage({ type: "CLEANUP_MERGE", uuid: item.uuid }).catch(() => {});
        });
        q = []; save(); closeOffscreen(); isRunning = false;
    }
    if (msg.type === "REMOVE_QUEUE") { 
        const i = q.findIndex(x => x.uuid === msg.uuid); 
        if (i > -1) { 
            chrome.runtime.sendMessage({ type: "STOP_MERGE", uuid: msg.uuid }).catch(() => {});
            chrome.runtime.sendMessage({ type: "CLEANUP_MERGE", uuid: msg.uuid }).catch(() => {});
            const wasRunning = q[i].status.includes("다운로드 중");
            q.splice(i, 1); save(); closeOffscreen();
            if (wasRunning) { isRunning = false; processQueue(); }
        } 
    }
    if (msg.type === "OPEN_FOLDER") chrome.downloads.show(msg.downloadId);
    return true;
});

chrome.downloads.onChanged.addListener((delta) => {
    const item = q.find(x => x.downloadId === delta.id);
    if (item && delta.state?.current === "complete") { 
        item.status = "완료"; item.progress = 100; save(); 
        chrome.runtime.sendMessage({ type: "CLEANUP_MERGE", uuid: item.uuid }).catch(() => {});
        closeOffscreen(); isRunning = false; processQueue();
    }
});

/**
 * @brief 작업 시작 제어
 * @return {void}
 */
async function startJob(url, filename, uuid) {
    if (url.includes(".m3u8")) {
        await initOff();
        setTimeout(() => chrome.runtime.sendMessage({ type: "START_MERGE", url, filename, uuid }), 100);
    } else {
        chrome.downloads.download({ url, filename: filename + ".mp4" }, (id) => {
            const item = q.find(x => x.uuid === uuid);
            if (item) { item.downloadId = id; save(); }
        });
    }
}