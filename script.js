// [전역 변수 설정]
let currentKeyword = "";
let accumulatedPapers = new Map(); 

const apiKeyInput = document.getElementById('apiKey');
const eyeBtn = document.getElementById('eyeBtn');
const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keyword');
const countDiv = document.getElementById('result-count');
const listDiv = document.getElementById('paper-list');

// [1] CSS 추가 (Placeholder를 위해 코드 최상단에 배치)
const style = document.createElement('style');
style.textContent = `
    [contenteditable=true]:empty:before {
        content: attr(data-placeholder);
        color: #94a3b8; /* 흐릿한 회색 */
        font-style: italic;
        cursor: text;
        display: block;
    }
`;
document.head.appendChild(style);

window.onload = () => {
    const savedKey = localStorage.getItem('elsevier_api_key');
    if (savedKey && apiKeyInput) apiKeyInput.value = savedKey;
};

if (eyeBtn && apiKeyInput) {
    eyeBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        apiKeyInput.type = (apiKeyInput.type === 'password') ? 'text' : 'password';
        eyeBtn.textContent = (apiKeyInput.type === 'password') ? '👁️' : '🔒';
    });
}

if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
        currentKeyword = keywordInput ? keywordInput.value.trim() : "";
        if (!currentKeyword) {
            alert("리즈, 검색어를 입력해 줘야 보물을 찾으러 갈 수 있어! 🧐");
            return;
        }
        accumulatedPapers.clear();
        if (listDiv) listDiv.innerHTML = '';
        await fetchAllData();
    });
}

// [4] 데이터 수집 (종료 연도 고정/가변 로직 반영)
async function fetchAllData() {
    const apiKey = apiKeyInput.value.trim();
    // HTML에 endYear input이 있다면 그 값을 쓰고, 없거나 비어있으면 2026을 기본으로 사용
    const startYear = parseInt(document.getElementById('startYear').value) || 2020;
    const endYearInput = document.getElementById('endYear');
    const endYear = endYearInput && endYearInput.value ? parseInt(endYearInput.value) : 2026;

    if (!apiKey) { alert("API 키를 확인해줄래? 🧐"); return; }
    localStorage.setItem('elsevier_api_key', apiKey);

    const formattedKeyword = currentKeyword.split(' ').filter(x => x).join(' AND ');
    // AFT/BEF 로직: 입력 연도를 포함시키기 위해 -1, +1 적용
    let dateQuery = ` AND PUBYEAR AFT ${startYear - 1} AND PUBYEAR BEF ${endYear + 1}`;

    try {
        searchBtn.disabled = true;
        countDiv.style.display = 'block';
        let start = 0;
        const countPerPage = 25; 
        let doiMissingCount = 0;
        
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

            entries.forEach(paper => {
                const doi = paper['prism:doi']; // DOI 존재 여부 확인
                if (!doi) {
                    doiMissingCount++;
                }
                const paperId = doi || paper['dc:title'] || Math.random().toString(36).substr(2, 9);
                if (!accumulatedPapers.has(paperId)) {
                    accumulatedPapers.set(paperId, paper);
                    appendRow(paper, tbody); 
                }
            });
            countDiv.innerHTML = `
                ✨ <strong>보물을 찾았습니다!</strong> (${startYear}~${endYear}년)<br>
                ✅ 수집된 보물: <strong>${accumulatedPapers.size}건</strong> 
                / ❗ DOI 없음: <span style="color:#f87171;">${doiMissingCount}건</span>
            `;
            start += countPerPage;
            if (start >= totalFound || start >= 500) break;
            await new Promise(r => setTimeout(r, 200));
        }
        searchBtn.innerText = "보물 탐사 완료! 🚀";
        addControls();
    } catch (err) {
        console.error(err);
        countDiv.innerHTML = `❌ API 연결 오류 발생!`;
    } finally {
        searchBtn.disabled = false;
    }
}

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

function appendRow(item, tbody) {
    const tr = document.createElement('tr');
    const doi = item['prism:doi'];
    const title = item['dc:title'] || 'No Title';
    const date = item['prism:coverDate'] || 'N/A';
    const journal = item['prism:publicationName'] || 'N/A';
    const initialAbs = item['dc:description'] || item['abstract'] || "";
    const abstractId = `abs-${doi ? doi.replace(/[^a-zA-Z0-9]/g, '') : Math.random().toString(36).substr(2, 9)}`;

    tr.innerHTML = `
        <td style="padding:15px; border-bottom:1px solid #eee; vertical-align:top; font-size:0.8rem; color:#64748b; word-break:break-word;">${journal}</td>
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
                ${initialAbs ? initialAbs : (doi ? '🔍 외부 데이터 탐색 중...' : '')}
            </div>
        </td>
    `;
    

    // DOI가 없으면 즉시 Placeholder 설정
    if (!initialAbs && !doi) {
        const div = tr.querySelector(`#${abstractId}`);
        div.innerText = ""; // 내용을 비워야 placeholder가 뜹니다
        div.setAttribute('data-placeholder', "🚫 DOI 정보 없음 (초록 자동 검색 불가)");
    }

    tbody.appendChild(tr);
    if (!initialAbs && doi) fillMissingAbstract(doi, abstractId);
}

async function fillMissingAbstract(doi, abstractId) {
    const apiKey = apiKeyInput.value.trim();
    let finalAbs = "";
    const displayDiv = document.getElementById(abstractId);

    // 1. Elsevier -> 2. Crossref -> 3. OpenAlex 순차 탐색
    try {
        const res = await fetch(`https://api.elsevier.com/content/abstract/doi/${doi}?apiKey=${apiKey}&httpAccept=application/json`);
        if (res.ok) {
            const data = await res.json();
            finalAbs = data['abstracts-view']?.['coredata']?.['dc:description'] || "";
        }
    } catch (e) {}

    if (!finalAbs || finalAbs.length < 10) {
        try {
            const res = await fetch(`https://api.crossref.org/works/${doi}`);
            if (res.ok) {
                const data = await res.json();
                finalAbs = (data.message?.abstract || "").replace(/<[^>]*>/g, "").replace("Abstract", "").trim();
            }
        } catch (e) {}
    }

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
        } catch (e) {}
    }

    if (displayDiv) {
        if (finalAbs && finalAbs.length > 10) {
            displayDiv.innerText = finalAbs;
            if (accumulatedPapers.has(doi)) {
                let paper = accumulatedPapers.get(doi);
                paper['dc:description'] = finalAbs;
                accumulatedPapers.set(doi, paper);
            }
        } else {
            // 못 찾았을 때 Placeholder 처리
            displayDiv.innerText = ""; 
            displayDiv.setAttribute('data-placeholder', "🔍 초록 정보를 찾지 못했습니다. (직접 입력 요망) 😢");
        }
    }
}

// 1. 실제 파일을 생성하고 다운로드하는 함수 (이름 통일!)
function downloadAsCSV() {
    if (!accumulatedPapers || accumulatedPapers.size === 0) {
        alert("저장할 보물이 하나도 없어요! 😢");
        return;
    }

    const allData = Array.from(accumulatedPapers.values());
    // 한글 깨짐 방지용 BOM (\ufeff) 포함
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.href = url;
    link.download = `Liz_Research_${new Date().toISOString().slice(0,10)}.csv`;
    
    // ✨ 안전장치: 문서에 잠시 추가해야 확실히 클릭됩니다!
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 메모리 해제
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

// 2. 버튼을 생성하고 이벤트를 연결하는 함수
function addControls() {
    let controlDiv = document.getElementById('csv-download-container');
    const paperList = document.getElementById('paper-list');

    if (!controlDiv && paperList) {
        controlDiv = document.createElement('div');
        controlDiv.id = 'csv-download-container';
        controlDiv.style.textAlign = 'center';
        controlDiv.style.padding = '30px 0';
        paperList.parentNode.insertBefore(controlDiv, paperList.nextSibling);
    }

    if (controlDiv) {
        controlDiv.innerHTML = ''; 

        const csvBtn = document.createElement('button');
        csvBtn.className = 'btn-upload'; 
        csvBtn.style.background = '#10b981'; 
        csvBtn.style.width = '300px'; 
        csvBtn.style.cursor = 'pointer'; // ✨ 마우스 올리면 손가락 모양으로!
        csvBtn.innerText = `📊 수집된 보물 (${accumulatedPapers.size}건) 저장하기`;
        
        // ✨ 여기서 이름을 downloadAsCSV로 정확히 연결!
        csvBtn.onclick = () => {
            console.log("CSV 다운로드 시작..."); 
            downloadAsCSV(); 
        };

        controlDiv.appendChild(csvBtn);
    }
}

// //////////////////////////////////// AI 결과 ////////////////////////////////////
// //////////////////////////////////// AI 결과 ////////////////////////////////////
// //////////////////////////////////// AI 결과 ////////////////////////////////////
// //////////////////////////////////// AI 결과 ////////////////////////////////////
// //////////////////////////////////// AI 결과 ////////////////////////////////////

function updateMapData(id, val) {
    if (accumulatedPapers.has(id)) {
        let paper = accumulatedPapers.get(id);
        paper['dc:description'] = val;
        accumulatedPapers.set(id, paper);
    }
}

async function downloadAllPdfs() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) { alert("Elsevier API Key가 필요합니다!"); return; }

    const rows = document.querySelectorAll("#analysis-table tbody tr");
    const candidateRows = Array.from(rows).filter(row => {
        const doiElement = row.querySelector('.doi-val');
        return doiElement && doiElement.innerText.includes('🔗');
    });

    if (candidateRows.length === 0) { alert("탐사할 DOI 정보가 없습니다!"); return; }

    if (!confirm(`총 ${rows.length}건 중, DOI가 확인된 ${candidateRows.length}건에 대해 PDF 확보를 '시도'해볼까요?`)) return;

    let realSuccessCount = 0;
    const batchBtn = document.querySelector('.btn-pdf-all');
    batchBtn.disabled = true; // 중복 클릭 방지

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const statusCell = document.getElementById(`status-${i}`);
        const doiElement = row.querySelector('.doi-val');
        const doi = doiElement && doiElement.innerText.includes('🔗') 
                    ? doiElement.innerText.replace('🔗 ', '').trim() 
                    : null;
        
        const titleText = row.querySelector('div').innerText;
        const safeTitle = titleText.substring(0, 30).replace(/[^a-z0-9]/gi, '_');

        batchBtn.innerText = `⏳ 탐색 중... (${i + 1}/${rows.length})`;

        if (!doi) {
            if (statusCell) { statusCell.innerText = "❌"; statusCell.style.color = "#ef4444"; }
            continue;
        }

        if (statusCell) { statusCell.innerText = "🔍"; statusCell.style.color = "#6366f1"; }

        // --- ✨ [실제 3중 탐사 시작] ---
        let isSuccess = false;

        // 1단계: Elsevier
        try {
            const url = `https://api.elsevier.com/content/article/doi/${doi}?apiKey=${apiKey}&httpAccept=application/pdf`;
            const res = await fetch(url);
            if (res.ok) isSuccess = await triggerDownload(res, safeTitle);
        } catch (e) { console.log("Elsevier 패스"); }

        // 2단계: Unpaywall (실패 시)
        if (!isSuccess) {
            try {
                const email = "liz_dev@example.com"
                const upRes = await fetch(`https://api.unpaywall.org/v2/${doi}?email=${email}`);
                if (upRes.ok) {
                    const upData = await upRes.json();
                    
                    // 1. Unpaywall이 추천하는 '최적의 위치' 리스트 가져오기
                    const locations = upData.oa_locations || [];
                    
                    // 2. ✨ 모든 위치를 순회하며 PDF 링크가 있는지 확인하고 시도!
                    for (const loc of locations) {
                        if (loc.url_for_pdf) {
                            try {
                                const pdfRes = await fetch(loc.url_for_pdf);
                                if (pdfRes.ok) {
                                    isSuccess = await triggerDownload(pdfRes, safeTitle);
                                    if (isSuccess) break; // 하나라도 성공하면 루프 탈출!
                                }
                            } catch (fetchErr) {
                                console.log("특정 링크 접근 실패, 다음 링크 시도...");
                            }
                        }
                    }
                }
            } catch (e) { console.log("Unpaywall 패스"); }
        }

        // 3단계: OpenAlex (실패 시)
        if (!isSuccess) {
            try {
                const oaRes = await fetch(`https://api.openalex.org/works/doi:${doi}`);
                if (oaRes.ok) {
                    const oaData = await oaRes.json();
                    
                    // 1. 가장 먼저 '공식 PDF URL' 확인
                    let targetPdf = oaData.pdf_url || oaData.best_oa_location?.pdf_url;

                    // 2. ✨ 만약 없다면? 모든 'locations'를 뒤져서 pdf_url이 있는 곳을 수집
                    if (!targetPdf && oaData.locations) {
                        const possibleLocation = oaData.locations.find(loc => loc.pdf_url);
                        if (possibleLocation) targetPdf = possibleLocation.pdf_url;
                    }

                    // 3. 🚀 찾았다면 다운로드 시도!
                    if (targetPdf) {
                        const pdfResponse = await fetch(targetPdf);
                        if (pdfResponse.ok) {
                            isSuccess = await triggerDownload(pdfResponse, safeTitle);
                        }
                    }
                }
            } catch (e) { console.log("OpenAlex 패스"); }
        }

        // --- 결과 반영 ---
        if (isSuccess) {
            realSuccessCount++;
            if (statusCell) { statusCell.innerText = "✅"; statusCell.style.color = "#22c55e"; }
        } else {
            if (statusCell) { statusCell.innerText = "❌"; statusCell.style.color = "#ef4444"; }
        }

        await new Promise(r => setTimeout(r, 1000)); // 브라우저 숨통 틔워주기
    }

    batchBtn.innerText = `📑 탐사 완료! (최종 확보: ${realSuccessCount}건) 🚀`;
    batchBtn.disabled = false;

    await new Promise(r => setTimeout(r, 1000));
    alert(`작업 끝!\n실제로 건진 PDF는 ${realSuccessCount}개입니다!`);
}

// [공통: 브라우저에 다운로드 명령 내리는 함수 - 그대로 유지]
async function triggerDownload(response, safeTitle) {
    try {
        const blob = await response.blob();
        if (blob.type !== "application/pdf" && blob.size < 1000) return false;
        
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Liz_${safeTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        return true;
    } catch (err) { return false; }
}

// [AI 센터 - CSV 읽기 및 테이블 생성]
document.getElementById('csv-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const display = document.getElementById('file-name-display');
    const resultBox = document.getElementById('ai-result'); 

    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        const rows = text.split('\n').filter(row => row.trim() !== "");
        if (rows.length <= 1) {
            resultBox.innerHTML = "<p style='color:#ef4444; padding:20px;'>데이터가 없는 CSV 파일입니다. 😢</p>";
            return;
        }

        const dataRows = rows.slice(1);

        let tableHtml = `
            <div style="margin-bottom:15px; font-weight:bold; color:#1e293b; font-size:0.95rem;">
                📊 분석 대상 목록 (${dataRows.length}건)
            </div>
            <table id="analysis-table" style="width:100%; border-collapse:collapse; font-size:0.85rem; text-align:left;">
                <thead>
                    <tr>
                        <th style="width:10%; padding:15px; border-bottom:2px solid #edf2f7; color:#64748b; text-align:center;">Status</th>
                        <th style="width:20%; padding:15px; border-bottom:2px solid #edf2f7; color:#64748b;">Journal</th>
                        <th style="width:50%; padding:15px; border-bottom:2px solid #edf2f7; color:#64748b;">Title / DOI</th>
                        <th style="width:20%; padding:15px; border-bottom:2px solid #edf2f7; color:#64748b;">Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        dataRows.forEach((row, index) => {
            const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const cleanCols = cols.map(c => c.replace(/^"|"$/g, '').trim());
            
            const journal = cleanCols[0] || "N/A";
            const title   = cleanCols[1] || "제목 없음";
            const date    = cleanCols[2] || "N/A";
            const doi     = cleanCols[3] || "";

            tableHtml += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td id="status-${index}" style="padding:15px; text-align:center; font-size:1.1rem; color:#cbd5e1;">⏳</td>
                    <td style="padding:15px; color:#64748b; font-size:0.8rem;">${journal}</td>
                    <td style="padding:15px;">
                        <div style="font-weight:600; color:#1e293b; margin-bottom:5px;">${title}</div>
                        ${doi ? `<span class="doi-val" style="color:#6366f1; font-size:0.75rem;">🔗 ${doi}</span>` : `<span style="color:#f87171; font-size:0.75rem;">🚫 DOI 없음</span>`}
                    </td>
                    <td style="padding:15px; color:#94a3b8;">${date}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        
        resultBox.innerHTML = tableHtml;
        display.innerText = `✅ 데이터 로드 완료: ${file.name}`;
        display.style.color = "#22c55e";
        
        const pdfCenter = document.getElementById('right-pdf-center');
        if (pdfCenter) pdfCenter.style.display = "block";
    };

    reader.readAsText(file, "UTF-8");
});