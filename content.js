const ICONS = {
    folder: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    x: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
};

let uiInterval = null;

/**
 * @brief UI 업데이트 타이머 시작
 * @return {void}
 */
function startUIUpdater() {
    if (uiInterval) return;
    updateUI();
    uiInterval = setInterval(updateUI, 1000);
}

/**
 * @brief UI 업데이트 타이머 정지
 * @return {void}
 */
function stopUIUpdater() {
    if (!uiInterval) return;
    clearInterval(uiInterval);
    uiInterval = null;
}

/**
 * @brief 약관 모달을 페이지 중앙에 생성
 * @return {void}
 */
function injectTermsModal() {
    if (document.getElementById('lxp-terms-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'lxp-terms-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:10001; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(5px); font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif;";

    overlay.innerHTML = `
        <div style="background: white; width: 360px; padding: 32px 24px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: lxp-fade 0.3s ease-out;">
            <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 32px; margin-bottom: 8px; display: block;">⚠️</span>
                <h3 style="margin: 0; color: #111; font-size: 20px; font-weight: 700;">이용 약관 및 주의사항</h3>
            </div>
            
            <div style="background: #FFF9E6; padding: 16px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #FFEDCC;">
                <p style="font-size: 15px; color: #855D00; font-weight: 700; margin: 0; line-height: 1.5; text-align: center;">
                    본 프로그램은 개인의 복습 및 학습 보조를 위한<br>개인 소장용 도구입니다.
                </p>
            </div>

            <div style="margin-bottom: 28px;">
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; color: #444; line-height: 1.6;">
                    <li style="display: flex; gap: 10px; margin-bottom: 12px;">
                        <span style="color: #FFD45A;">•</span>
                        <span>사용자는 다운로드 콘텐츠를 <strong>개인 학습 목적 범위 내</strong>에서만 이용해야 합니다.</span>
                    </li>
                    <li style="display: flex; gap: 10px; margin-bottom: 12px;">
                        <span style="color: #FFD45A;">•</span>
                        <span>무단 배포 및 상업적 이용 시 발생하는 <strong>모든 법적 책임은 사용자 본인</strong>에게 있습니다.</span>
                    </li>
                    <li style="display: flex; gap: 10px; margin-bottom: 16px;">
                        <span style="color: #FFD45A;">•</span>
                        <span>본 프로그램은 기술적 보호조치(DRM) 무력화 기능을 포함하지 않습니다.</span>
                    </li>
                </ul>
                <div style="font-size: 12px; color: #999; padding-left: 18px; line-height: 1.5; border-top: 1px solid #F0F0F0; pt: 12px; margin-top: 16px;">
                    * 잘못된 사용으로 인한 불이익에 대해 개발자는 어떤 책임도 지지 않습니다.
                </div>
            </div>
            
            <button id="lxp-agree-btn" style="width: 100%; padding: 18px; background: #111; color: white; border: none; border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer; transition: transform 0.1s active; box-shadow: 0 8px 16px rgba(0,0,0,0.1);">
                내용을 확인했으며, 동의합니다
            </button>
        </div>
        <style>
            @keyframes lxp-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            #lxp-agree-btn:active { transform: scale(0.98); }
        </style>
    `;

    document.body.appendChild(overlay);

    document.getElementById('lxp-agree-btn').onclick = () => {
        chrome.storage.local.set({ agreedToTerms: true }, () => {
            overlay.remove();
            if (typeof updateButtonState === 'function') updateButtonState();
        });
    };
}

/**
 * @brief 버튼 상태 갱신
 * @return {void}
 */
function updateButtonState() {
    const btn = document.getElementById('lxp-btn');
    if (!btn) return;
    chrome.storage.local.get(['agreedToTerms'], (res) => {
        const agreed = res.agreedToTerms === true;
        btn.style.background = agreed ? "#27ae60" : "#999";
        btn.style.opacity = agreed ? "1" : "0.7";
        btn.title = agreed ? "" : "약관에 동의해야 다운로드가 가능합니다. 버튼을 클릭해주세요.";
    });
}

/**
 * @brief UI 갱신 (진행률 및 상태 반영)
 * @return {void}
 */
function updateUI() {
    if (!chrome.runtime?.id) return stopUIUpdater();
    const list = document.getElementById('lxp-list');
    if (!list || document.getElementById('lxp-layer').style.display === 'none') return stopUIUpdater();

    chrome.runtime.sendMessage({ type: "GET_QUEUE" }, (res) => {
        if (chrome.runtime.lastError || !res?.queue) return stopUIUpdater();
        const hasActiveJob = res.queue.some(item => !["완료", "오류 발생", "에러 발생"].includes(item.status));
        if (res.queue.length === 0) { list.innerHTML = '<li style="text-align:center; padding:20px; color:#aaa; font-size:12px;">비어 있음</li>'; return stopUIUpdater(); }
        if (list.innerText.includes("비어 있음")) list.innerHTML = "";

        res.queue.forEach(item => {
            let li = list.querySelector(`li[data-uuid="${item.uuid}"]`);
            if (!li) {
                li = document.createElement('li');
                li.className = 'lxp-item';
                li.setAttribute('data-uuid', item.uuid);
                li.innerHTML = `<div class="lxp-btns"></div><div class="lxp-name" style="font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:200px;"></div><div class="lxp-status" style="font-size:11px; color:#666;"></div><div class="lxp-bar-bg"><div class="lxp-bar-fill"></div></div>`;
                list.appendChild(li);
            }
            li.querySelector('.lxp-name').innerText = item.filename;
            
            // 용량 정보 추가 (MB 단위)
            let sizeDisplay = "";
            if (item.totalBytes > 0 && item.currentSeg > 0) {
                const currentMB = (item.totalBytes / 1024 / 1024).toFixed(1);
                // 예상 총 용량 = (현재까지의 평균 조각 크기) * 전체 조각 수
                const estimatedTotal = (item.totalBytes / item.currentSeg) * item.totalSeg;
                const totalMB = (estimatedTotal / 1024 / 1024).toFixed(1);
                
                // 완료된 경우 또는 저장 중인 경우 실제 용량만 표시하거나 완료 문구 유지
                if (item.status === "완료") sizeDisplay = ` (${currentMB}MB)`;
                else sizeDisplay = ` (${currentMB}MB / 약 ${totalMB}MB)`;
            }
            
            li.querySelector('.lxp-status').innerText = item.status + sizeDisplay;
            
            const isActive = !["완료", "오류 발생", "에러 발생"].includes(item.status);
            li.querySelector('.lxp-bar-bg').style.display = isActive ? "block" : "none";
            if (isActive) li.querySelector('.lxp-bar-fill').style.width = `${item.progress}%`;
            
            const btns = li.querySelector('.lxp-btns');
            let btnHtml = isActive ? `<button class="lxp-btn-i c-btn">${ICONS.x}</button>` : (item.status === "완료" ? `<button class="lxp-btn-i f-btn">${ICONS.folder}</button>` : "") + `<button class="lxp-btn-i r-btn">${ICONS.trash}</button>`;
            
            if (btns.innerHTML !== btnHtml) {
                btns.innerHTML = btnHtml;
                const checkEmpty = () => { if (list.querySelectorAll('li[data-uuid]').length === 0) list.innerHTML = '<li style="text-align:center; padding:20px; color:#aaa; font-size:12px;">비어 있음</li>'; };
                if (btns.querySelector('.c-btn')) btns.querySelector('.c-btn').onclick = () => { chrome.runtime.sendMessage({ type: "REMOVE_QUEUE", uuid: item.uuid }); li.remove(); checkEmpty(); };
                if (btns.querySelector('.f-btn')) btns.querySelector('.f-btn').onclick = () => chrome.runtime.sendMessage({ type: "OPEN_FOLDER", downloadId: item.downloadId });
                if (btns.querySelector('.r-btn')) btns.querySelector('.r-btn').onclick = () => { chrome.runtime.sendMessage({ type: "REMOVE_QUEUE", uuid: item.uuid }); li.remove(); checkEmpty(); };
            }
        });
        list.querySelectorAll('li[data-uuid]').forEach(n => { if (!res.queue.find(q => q.uuid === n.dataset.uuid)) n.remove(); });
        if (list.querySelectorAll('li[data-uuid]').length === 0 && !list.innerText.includes("비어 있음")) list.innerHTML = '<li style="text-align:center; padding:20px; color:#aaa; font-size:12px;">비어 있음</li>';
        if (!hasActiveJob) stopUIUpdater();
    });
}

/**
 * @brief 페이지 내 요소에서 순수 강의 제목만 정밀 추출
 * @return {string} 추출된 강의 제목
 */
function getLectureTitle() {
    const infoTitle = document.querySelector(".mod-info-title")?.innerText?.trim();
    if (infoTitle) return infoTitle.replace(/[<>:"/\\|?*]/g, "");

    const rawTitle = document.querySelector("h3")?.innerText?.trim() || document.title.split('|')[0].trim();
    const lastBracketIndex = rawTitle.lastIndexOf(')');
    
    let name = lastBracketIndex > -1 ? rawTitle.substring(lastBracketIndex + 1).trim() : rawTitle;

    if (!name || name === "이루리") name = "강의영상";
    return name.replace(/[<>:"/\\|?*]/g, "");
}

/**
 * @brief 다운로드 버튼 및 기능 초기화
 * @return {void}
 */
function init() {
    if (document.getElementById('lxp-btn')) return;
    const header = document.querySelector("#vod_header") || document.body;
    if (!header) return;
    const btn = document.createElement("button");
    btn.id = "lxp-btn";
    btn.innerText = "📥 강의 영상 다운로드";
    btn.style.cssText = "position:absolute; right:120px; top:15px; padding:10px 15px; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold; z-index:9999;";
    
    btn.onclick = () => {
        chrome.storage.local.get(['agreedToTerms'], (res) => {
            if (!res.agreedToTerms) return injectTermsModal();
            
            const video = document.querySelector('video');
            const url = video?.currentSrc || video?.src || document.querySelector('video source')?.src;
            if (!url) return alert("영상을 찾을 수 없습니다");
            
            const finalName = getLectureTitle();
            
            chrome.runtime.sendMessage({ type: "ENQUEUE", url, filename: finalName });
            document.getElementById('lxp-layer').style.display = 'block';
            startUIUpdater();
        });
    };

    header.appendChild(btn);
    injectLayer();
    updateButtonState();
}

/**
 * @brief 대기열 레이어 주입
 * @return {void}
 */
function injectLayer() {
    if (document.getElementById('lxp-layer')) return;
    const layer = document.createElement('div');
    layer.id = 'lxp-layer';
    layer.innerHTML = `<div id="lxp-h"><span>📥 대기열</span><div style="display:flex; gap:10px;"><span id="lxp-clear" style="font-size:10px; cursor:pointer; background:rgba(255,255,255,0.1); padding:2px 4px; border-radius:3px;">비우기</span><span id="lxp-close" style="cursor:pointer; font-size: 16px;">×</span></div></div><ul id="lxp-list"><li style="text-align:center; padding:20px; color:#aaa; font-size:12px;">비어 있음</li></ul>`;
    document.body.appendChild(layer);
    
    document.getElementById('lxp-close').onclick = () => {
        layer.style.display = 'none';
        stopUIUpdater();
    };
    
    document.getElementById('lxp-clear').onclick = () => { 
        if (!confirm("대기열을 비우시겠습니까?")) return;
        chrome.runtime.sendMessage({ type: "CLEAR_ALL_QUEUE" }); 
        document.getElementById('lxp-list').innerHTML = '<li style="text-align:center; padding:20px; color:#aaa; font-size:12px;">비어 있음</li>';
    };
    makeDraggable(layer, document.getElementById('lxp-h'));
}

/**
 * @brief 드래그 이벤트 적용
 * @param {HTMLElement} el 대상 엘리먼트
 * @param {HTMLElement} h 핸들러 엘리먼트
 * @return {void}
 */
function makeDraggable(el, h) {
    let x = 0, y = 0;
    h.onmousedown = (e) => {
        if (el.style.top !== 'auto') {
            const rect = el.getBoundingClientRect();
            el.style.bottom = (window.innerHeight - rect.bottom) + "px";
            el.style.left = rect.left + "px";
            el.style.top = "auto";
            el.style.transform = "none";
        }
        x = e.clientX; 
        y = e.clientY;
        document.onmousemove = (e) => {
            const dy = y - e.clientY;
            el.style.left = (el.offsetLeft - (x - e.clientX)) + "px";
            el.style.bottom = (parseFloat(el.style.bottom) || 0) + dy + "px";
            x = e.clientX; 
            y = e.clientY;
        };
        document.onmouseup = () => document.onmousemove = null;
    };
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE_LAYER") {
        const layer = document.getElementById('lxp-layer');
        if (layer) { 
            layer.style.display = layer.style.display === 'none' ? 'block' : 'none'; 
            if (layer.style.display === 'block') startUIUpdater();
            else stopUIUpdater();
        }
    }
    if (msg.type === "SHOW_TERMS") injectTermsModal();
});

const observer = new MutationObserver(() => {
    if (!document.getElementById('lxp-btn')) init();
    else observer.disconnect();
});
const targetNode = document.querySelector("#vod_header") || document.body;
observer.observe(targetNode, { childList: true, subtree: targetNode === document.body });