// [전역 변수 설정]
let currentKeyword = "";
let accumulatedPapers = new Map(); 

// [요소 가져오기] - 안전하게 가져오기 위해 함수로 감싸거나 null 체크를 합니다.
const apiKeyInput = document.getElementById('apiKey');
const eyeBtn = document.getElementById('eyeBtn');
const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keyword');
const countDiv = document.getElementById('result-count');
const listDiv = document.getElementById('paper-list');
const insightDiv = document.getElementById('ai-intelligent-insight');

// [1] 페이지 로드 시 API 키 불러오기
window.onload = () => {
    const savedKey = localStorage.getItem('elsevier_api_key');
    if (savedKey && apiKeyInput) apiKeyInput.value = savedKey;
};

// [2] 눈 버튼 기능 (요소가 있을 때만 실행하도록 안전장치!)
if (eyeBtn && apiKeyInput) {
    eyeBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        apiKeyInput.type = (apiKeyInput.type === 'password') ? 'text' : 'password';
        eyeBtn.textContent = (apiKeyInput.type === 'password') ? '👁️' : '🔒';
    });
}

// [3] 검색 버튼 클릭 (요소가 있을 때만 실행!)
if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
        currentKeyword = keywordInput ? keywordInput.value.trim() : "";
        if (!currentKeyword) {
            alert("리즈, 검색어를 입력해 줘야 보물을 찾으러 갈 수 있어! 🧐");
            return;
        }
        
        // 초기화
        accumulatedPapers.clear();
        if (listDiv) listDiv.innerHTML = '';
        
        await fetchAllData();
    });
}

// [4] 데이터 자동 전량 수집 함수
async function fetchAllData() {
    const apiKey = apiKeyInput.value.trim();
    const startYear = document.getElementById('startYear').value;
    const endYear = document.getElementById('endYear').value;

    if (!apiKey) { alert("API 키를 확인해줄래? 🧐"); return; }
    localStorage.setItem('elsevier_api_key', apiKey);

    const formattedKeyword = currentKeyword.split(' ').filter(x => x).join(' AND ');
    let dateQuery = "";
    if (startYear && endYear) dateQuery = ` AND PUBYEAR AFT ${startYear - 1} AND PUBYEAR BEF ${endYear + 1}`;

    try {
        searchBtn.disabled = true;
        countDiv.style.display = 'block';
        
        let start = 0;
        const countPerPage = 25; // Scopus 최대 호출 단위
        
        // 테이블 뼈대 먼저 생성
        initTable();
        const tbody = document.getElementById('table-body');

        while (true) {
            searchBtn.innerText = `🔍 수집 중... (${start}건 완료)`;
            
            const params = new URLSearchParams({
                query: `TITLE-ABS-KEY(${formattedKeyword})${dateQuery}`,
                apiKey: apiKey,
                count: countPerPage,
                start: start,
                sort: '-coverDate'
            });
            
            const url = `https://api.elsevier.com/content/search/scopus?${params.toString()}`;
            const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
            
            if (!response.ok) break;

            const data = await response.json();
            const results = data['search-results'];
            const totalFound = parseInt(results['opensearch:totalResults'] || "0");
            const entries = results['entry'] || [];

            if (entries.length === 0) break;

            // 실시간으로 행 추가 및 Map 저장
            entries.forEach(paper => {
                const paperId = paper['prism:doi'] || paper['dc:title'] || Math.random().toString(36).substr(2, 9);
                if (!accumulatedPapers.has(paperId)) {
                    accumulatedPapers.set(paperId, paper);
                    appendRow(paper, tbody); 
                }
            });

            countDiv.innerHTML = `✨ <strong>리즈님, 보물을 찾았습니다!</strong> (총 ${totalFound}건 중 ${accumulatedPapers.size}건 수집 중)`;

            start += countPerPage;
            // 탈출 조건: 다 가져왔거나 API 안정성을 위해 500건에서 일단 제한 (필요시 조절)
            if (start >= totalFound || start >= 500) break;

            // API 부하 방지용 짧은 휴식
            await new Promise(r => setTimeout(r, 200));
        }

        searchBtn.innerText = "보물 탐사 완료! 🚀";
        addControls(); // 다운로드 및 AI 버튼 추가

    } catch (err) {
        console.error(err);
        countDiv.innerHTML = `❌ API 연결 오류 발생!`;
    } finally {
        searchBtn.disabled = false;
    }
}

// [4] 테이블 뼈대 초기화 (Journal / Info / Abstract)
function initTable() {
    listDiv.innerHTML = `
        <table class="paper-table" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <thead style="background:#f1f5f9; position:sticky; top:0; z-index:10; font-size:0.85rem;">
                <tr>
                    <th style="width:15%; padding:12px; border-bottom:2px solid #ddd; text-align:left; color:#475569;">Journal</th>
                    <th style="width:40%; padding:12px; border-bottom:2px solid #ddd; text-align:left; color:#475569;">Title / DOI / Date</th>
                    <th style="width:45%; padding:12px; border-bottom:2px solid #ddd; text-align:left; color:#475569;">Abstract</th>
                </tr>
            </thead>
            <tbody id="table-body"></tbody>
        </table>
    `;
}

// [5] 실시간 행 추가 (DOI 유무에 따른 안내 문구 차별화)
function appendRow(item, tbody) {
    const tr = document.createElement('tr');
    const doi = item['prism:doi'];
    const title = item['dc:title'] || 'No Title';
    const date = item['prism:coverDate'] || 'N/A';
    const journal = item['prism:publicationName'] || 'N/A';
    
    // Scopus 기본 데이터 확인
    const initialAbs = item['dc:description'] || item['abstract'] || "";
    
    const abstractId = `abs-${doi ? doi.replace(/[^a-zA-Z0-9]/g, '') : Math.random().toString(36).substr(2, 9)}`;

    tr.innerHTML = `
        <td style="padding:15px; border-bottom:1px solid #eee; vertical-align:top; font-size:0.8rem; color:#64748b; word-break:break-word;">
            ${journal}
        </td>
        <td style="padding:15px; border-bottom:1px solid #eee; vertical-align:top; word-break:break-word;">
            <div style="font-weight:bold; color:#1e293b; font-size:0.9rem; margin-bottom:8px; line-height:1.4;">${title}</div>
            <div style="display:flex; flex-direction:column; gap:5px;">
                ${doi 
                    ? `<a href="https://doi.org/${doi}" target="_blank" style="font-size:0.75rem; color:#6c5ce7; text-decoration:none;">🔗 DOI: ${doi}</a>` 
                    : `<span style="font-size:0.75rem; color:#f87171; font-style:italic;">🚫 DOI 정보 없음</span>`}
                <span style="font-size:0.75rem; color:#94a3b8; font-weight:500;">📅 날짜: ${date}</span>
            </div>
        </td>
        <td style="padding:15px; border-bottom:1px solid #eee; vertical-align:top;">
            <div id="${abstractId}" 
                 contenteditable="true"
                 style="font-size:0.85rem; color:#475569; max-height:150px; min-height:80px; overflow-y:auto; line-height:1.6; word-break:break-word; border:1px solid #e2e8f0; padding:10px; border-radius:8px; background:white; outline:none;"
                 oninput="updateMapData('${doi || title}', this.innerText)">
                ${initialAbs 
                    ? initialAbs 
                    : (doi 
                        ? '🔍 외부 데이터 탐색 중...' 
                        : '⚠️ DOI 미제공으로 초록을 검색할 수 없습니다. 😢')}
            </div>
        </td>
    `;
    tbody.appendChild(tr);

    // DOI가 있을 때만 탐사대 출발!
    if (!initialAbs && doi) {
        fillMissingAbstract(doi, abstractId);
    }
}

// [7] 3단계 초록 수집 (데이터를 못 찾으면 innerText에 안내 문구 삽입)
async function fillMissingAbstract(doi, abstractId) {
    const apiKey = apiKeyInput.value.trim();
    let finalAbs = "";
    const displayDiv = document.getElementById(abstractId);

    // 1. Elsevier
    try {
        const res = await fetch(`https://api.elsevier.com/content/abstract/doi/${doi}?apiKey=${apiKey}&httpAccept=application/json`);
        if (res.ok) {
            const data = await res.json();
            finalAbs = data['abstracts-view']?.['coredata']?.['dc:description'] || "";
        }
    } catch (e) { console.warn("Elsevier 실패"); }

    // 2. Crossref (데이터 부족 시)
    if (!finalAbs || finalAbs.length < 10) {
        try {
            const res = await fetch(`https://api.crossref.org/works/${doi}`);
            if (res.ok) {
                const data = await res.json();
                finalAbs = (data.message?.abstract || "").replace(/<[^>]*>/g, "").replace("Abstract", "").trim();
            }
        } catch (e) { console.warn("Crossref 실패"); }
    }

    // 3. OpenAlex (마지막 보루)
    if (!finalAbs || finalAbs.length < 10) {
        try {
            const res = await fetch(`https://api.openalex.org/works/https://doi.org/${doi}`);
            if (res.ok) {
                const data = await res.json();
                const index = data.abstract_inverted_index;
                if (index) {
                    let tempArray = [];
                    for (const [word, positions] of Object.entries(index)) {
                        positions.forEach(pos => { tempArray[pos] = word; });
                    }
                    finalAbs = tempArray.join(" ");
                }
            }
        } catch (e) { console.warn("OpenAlex 실패"); }
    }

    // --- [화면 반영 핵심 로직] ---
    if (displayDiv) {
        if (finalAbs && finalAbs.length > 10) {
            // 데이터를 찾았다면? 해당 내용을 innerText로 채워줍니다.
            displayDiv.innerText = finalAbs;
            displayDiv.style.color = "#475569";
            displayDiv.style.fontStyle = "normal";

            // Map 업데이트
            if (accumulatedPapers.has(doi)) {
                let paper = accumulatedPapers.get(doi);
                paper['dc:description'] = finalAbs;
                accumulatedPapers.set(doi, paper);
            }
        } else {
            // 진짜 못 찾았다면? 리즈님 요청대로 "초록 정보를 찾을 수 없습니다"를 innerText로 넣어버립니다!
            displayDiv.innerText = "초록 정보를 찾을 수 없습니다. (직접 입력 요망) 😢";
            displayDiv.style.color = "#f87171"; // 빨간색으로 경고!
            displayDiv.style.fontStyle = "italic";
        }
    }
}

// Map 업데이트용 헬퍼 함수 (필요시 추가)
function updateMapData(id, val) {
    if (accumulatedPapers.has(id)) {
        let paper = accumulatedPapers.get(id);
        paper['dc:description'] = val;
        accumulatedPapers.set(id, paper);
    }
}

// [8] 하단 컨트롤 버튼 (CSV & AI 결과창)
function addControls() {
    const controls = document.createElement('div');
    controls.style = "text-align:right; margin-top:20px; padding:20px; background:#f8f9fa; border-radius:12px;";
    controls.innerHTML = `
        <button onclick="downloadCSV()" style="background:#2ecc71; color:white; padding:10px 20px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; margin-right:10px;">📥 Download CSV</button>
    `;
    listDiv.appendChild(controls);
}

// [기타 기능: CSV 다운로드, AI 분석]
function downloadCSV() {
    const allData = Array.from(accumulatedPapers.values());
    let csvContent = "\ufeffJournal,Title,Date,DOI,Abstract\n";
    allData.forEach(item => {
        const row = [
            `"${(item['prism:publicationName'] || '').replace(/"/g, '""')}"`,
            `"${(item['dc:title'] || '').replace(/"/g, '""')}"`,
            `"${item['prism:coverDate'] || ''}"`,
            `"${item['prism:doi'] || ''}"`,
            `"${(item['dc:description'] || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ];
        csvContent += row.join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Liz_Research_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

function closeAiModal() { document.getElementById('ai-modal').style.display = 'none'; }

async function executeAiAnalysis() {
    const aiKey = "";
    const promptInput = document.getElementById('ai-prompt-input').value;
    
    if (!promptInput) { alert("질문을 입력해 주세요!"); return; }

    insightDiv.style.display = 'block';
    insightDiv.innerHTML = `<div style="padding:20px; color:#6c5ce7;">🤖 <b>Gemini가 ${accumulatedPapers.size}건의 논문을 분석 중입니다...</b></div>`;
    closeAiModal();

    const papersContext = Array.from(accumulatedPapers.values())
        .map((p, idx) => `[${idx+1}] ${p['dc:title']}: ${p['dc:description']}`).join("\n\n");

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `사용자 질문: ${promptInput}\n\n논문 데이터:\n${papersContext}` }] }]
            })
        });

        const data = await response.json();
        const result = data.candidates[0].content.parts[0].text;

        insightDiv.innerHTML = `
            <div style="padding:25px; border:2px solid #6c5ce7; border-radius:15px; background:white;">
                <h3 style="color:#6c5ce7; margin-top:0;">✨ AI Insight Result</h3>
                <div style="white-space: pre-wrap; line-height:1.7;">${result}</div>
            </div>
        `;
        insightDiv.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        insightDiv.innerHTML = `<div style="color:red;">❌ 분석 실패: ${e.message}</div>`;
    }
}