let currentUuid = null;
let stop = false;
const blobMap = new Map();

chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg.type === "START_MERGE") download(msg);
    if (msg.type === "STOP_MERGE" && msg.uuid === currentUuid) stop = true;
    if (msg.type === "CLEANUP_MERGE") {
        if (blobMap.has(msg.uuid)) URL.revokeObjectURL(blobMap.get(msg.uuid));
        blobMap.delete(msg.uuid);
        const root = await navigator.storage.getDirectory();
        root.removeEntry(`${msg.uuid}.mp4`).catch(() => {});
    }
});

/**
 * @brief m3u8 청크를 파싱하고 OPFS를 이용해 디스크에 직접 병합 및 정리
 */
async function download({ url, filename, uuid }) {
    currentUuid = uuid; stop = false;
    try {
        const res = await fetch(url);
        const text = await res.text();
        const base = url.substring(0, url.lastIndexOf('/') + 1);
        const ts = text.split('\n').filter(l => l && !l.startsWith('#') && !l.endsWith('.m3u8')).map(l => l.startsWith('http') ? l : base + l);
        
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(`${uuid}.mp4`, { create: true });
        const writable = await fileHandle.createWritable();

        let totalBytes = 0;
        for (let i = 0; i < ts.length; i++) {
            if (stop) {
                await writable.close();
                try { await root.removeEntry(`${uuid}.mp4`); } catch(e) {}
                return;
            }
            const r = await fetch(ts[i]);
            const buffer = await r.arrayBuffer();
            totalBytes += buffer.byteLength;
            await writable.write(buffer);
            
            const p = Math.round(((i + 1) / ts.length) * 100);
            // 5%마다 혹은 마지막 조각일 때 상태 전송
            if (p % 5 === 0 || i === ts.length - 1) {
                chrome.runtime.sendMessage({ 
                    type: "UPDATE_PROGRESS", 
                    uuid, 
                    progress: p, 
                    totalBytes,
                    currentSeg: i + 1,
                    totalSeg: ts.length
                });
            }
        }
        
        await writable.close();
        const file = await fileHandle.getFile();
        const blobUrl = URL.createObjectURL(file);
        blobMap.set(uuid, blobUrl);
        chrome.runtime.sendMessage({ type: "EXECUTE_DOWNLOAD", url: blobUrl, filename, uuid });
    } catch (e) {
        chrome.runtime.sendMessage({ type: "UPDATE_PROGRESS", uuid, progress: 0, status: "에러 발생" });
    }
}