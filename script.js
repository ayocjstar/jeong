// [전역 변수 설정]
let currentPage = 0;
const itemsPerPage = 10;
let currentKeyword = "";

// [요소 가져오기]
const apiKeyInput = document.getElementById('apiKey');
const eyeBtn = document.getElementById('eyeBtn');
const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keyword');
const countDiv = document.getElementById('result-count');
const listDiv = document.getElementById('paper-list');
const pagT = document.getElementById('pagination-top');
const pagB = document.getElementById('pagination-bottom');

// [1] 페이지 로드 시 브라우저 금고(localStorage)에서 키 불러오기
window.onload = () => {
    const savedKey = localStorage.getItem('elsevier_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }
};

// [2] 눈 버튼 기능 (API 키 보기/숨기기 토글)
eyeBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        eyeBtn.textContent = '🔒'; 
    } else {
        apiKeyInput.type = 'password';
        eyeBtn.textContent = '👁️';
    }
});

// [3] 검색 버튼 클릭 이벤트
searchBtn.addEventListener('click', () => {
    currentKeyword = keywordInput.value.trim();
    if (!currentKeyword) {
        alert("리즈, 검색어를 입력해 줘야 보물을 찾으러 갈 수 있어! 🧐");
        return;
    }
    currentPage = 0; // 새로운 검색은 항상 1페이지부터
    fetchData();
});

// [4] 실제 데이터 가져오기 함수
async function fetchData() {
    const apiKey = apiKeyInput.value.trim();
    const keyword = keywordInput.value.trim(); // 원래 입력값
    const startYear = document.getElementById('startYear').value;
    const endYear = document.getElementById('endYear').value;

    // 1. 필수 체크
    if (!apiKey) {
        alert("어라? 리즈, API 키가 배고픈가 봐요. 다시 확인해줄래? 🧐");
        return;
    }
    if (!keyword) {
        alert("리즈, 검색어를 입력해 줘야 보물을 찾으러 갈 수 있어! 🧐");
        return;
    }

    // 2. [중요] 키워드 포맷팅 (이 줄이 빠져서 에러가 났을 거예요!)
    // 띄어쓰기를 기준으로 단어들을 분리한 뒤 ' AND '로 연결해줍니다.
    const formattedKeyword = keyword.split(' ').filter(x => x).join(' AND ');

    // 3. 날짜 쿼리 생성
    let dateQuery = "";
    if (startYear && endYear) {
        dateQuery = ` AND PUBYEAR AFT ${startYear - 1} AND PUBYEAR BEF ${endYear + 1}`;
    } else if (startYear) {
        dateQuery = ` AND PUBYEAR AFT ${startYear - 1}`;
    } else if (endYear) {
        dateQuery = ` AND PUBYEAR BEF ${endYear + 1}`;
    }

    // 입력한 키를 브라우저 금고에 저장
    localStorage.setItem('elsevier_api_key', apiKey);

    // UI 상태 초기화
    searchBtn.disabled = true;
    listDiv.innerHTML = '<p style="text-align:center; font-size:1.1em; color:#d63384; padding:40px;">리즈를 위해 열심히 도서관 뒤지는 중... 🏃‍♀️💨</p>';
    [pagT, pagB].forEach(p => p.innerHTML = '');
    countDiv.style.display = 'none';

    try {
        const start = currentPage * itemsPerPage;
        // 4. [수정] URL 생성 (view=COMPLETE는 안정성을 위해 일단 제거했습니다)
        const params = new URLSearchParams({
                query: `TITLE-ABS-KEY(${formattedKeyword})${dateQuery}`,
                apiKey: apiKey,
                count: itemsPerPage,
                start: start,
                sort: '-coverDate'
            });
        const url = `https://api.elsevier.com/content/search/scopus?${params.toString()}`;
        
        // 5. [중요] fetch 실행 줄이 빠져있었습니다!
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        
        if (!response.ok) {
            throw new Error("API 응답 에러");
        }

        const data = await response.json();
        const results = data['search-results'];
        const total = parseInt(results['opensearch:totalResults'] || "0");
        const entries = results['entry'];

        countDiv.style.display = 'block';
        
        if (total === 0) {
            countDiv.style.background = '#f8f9fa';
            countDiv.style.color = '#6c757d';
            countDiv.style.border = '1px solid #ddd';
            countDiv.innerHTML = `😢 <strong>미안해 리즈, 관련 보물을 찾지 못했어...</strong> 다시 한번 검색해줄래?`;
            listDiv.innerHTML = '<p style="text-align:center; padding:50px; color:#999;">검색 결과가 없어요. 키워드를 조금 더 넓게 잡아볼까요? 🧐</p>';
        } else {
            countDiv.style.background = '#fff0f6'; 
            countDiv.style.color = '#d63384';
            countDiv.style.border = '1px solid #ffc9c9';
            countDiv.innerHTML = `✨ <strong>리즈님, 요청하신 보물들을 찾았습니다!</strong> (총 ${total.toLocaleString()}건 / ${currentPage + 1}페이지)`;
            
            renderList(entries); // 데이터가 있으면 테이블 그리기
        }

        renderPagination(total); // 페이지 버튼 생성

    } catch (err) {
        console.error(err);
        countDiv.style.display = 'block';
        countDiv.style.background = '#fff5f5';
        countDiv.style.color = '#e03131';
        countDiv.innerHTML = `❌ 어라? 리즈, API 키가 배고픈가 봐요. 다시 확인해줄래? 🧐`;
        listDiv.innerHTML = '';
    } finally {
        searchBtn.disabled = false;
        window.scrollTo(0, 0);
    }
}

// [5] 논문 목록 그리기 함수
async function renderList(entries) {
    listDiv.innerHTML = '';
    
    const table = document.createElement('table');
    table.className = 'paper-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th class="col-journal">Journal</th>
                <th class="col-title">Title (Click)</th>
                <th class="col-abstract">Abstract (Smart Search)</th>
                <th class="col-author">Authors</th>
                <th class="col-date">Date</th>
                <th class="col-doi">DOI</th>
            </tr>
        </thead>
        <tbody id="table-body"></tbody>
    `;
    listDiv.appendChild(table);
    const tbody = document.getElementById('table-body');

    for (const item of entries) {
        const tr = document.createElement('tr');
        const doi = item['prism:doi'];
        const title = item['dc:title'] || 'No Title';
        const paperLink = doi ? `https://doi.org/${doi}` : '#';
        
        // 초기 초록 데이터 (Scopus에서 준 것)
        let initialAbstract = item['dc:description'] || "";
        const abstractId = `abs-${doi ? doi.replace(/[^a-zA-Z0-9]/g, '') : Math.random().toString(36).substr(2, 9)}`;

        tr.innerHTML = `
            <td class="col-journal">${item['prism:publicationName'] || 'N/A'}</td>
            <td class="col-title">
                <a href="${paperLink}" target="_blank" style="text-decoration: none; color: inherit; font-weight:bold;">${title}</a>
            </td>
            <td class="col-abstract">
                <div id="${abstractId}" class="abstract-text">
                    ${initialAbstract ? initialAbstract : '<span style="color:#94a3b8; font-style:italic;">데이터 도서관 순회 중... 🔍</span>'}
                </div>
            </td>
            <td>${item['dc:creator'] || 'Unknown'}</td>
            <td style="text-align:center;">${item['prism:coverDate'] || 'N/A'}</td>
            <td>${doi ? `<a href="${paperLink}" target="_blank" class="doi-link">🔗 ${doi}</a>` : '-'}</td>
        `;
        tbody.appendChild(tr);

        // 만약 처음부터 초록이 없다면 보충 수사 시작!
        if (!initialAbstract && doi) {
            fillMissingAbstract(doi, abstractId);
        }
    }
}

// [핵심 로직] 3단계 초록 보충 함수
async function fillMissingAbstract(doi, elementId) {
    const targetDiv = document.getElementById(elementId);

    // --- 1단계: Crossref 시도 ---
    try {
        const crResponse = await fetch(`https://api.crossref.org/works/${doi}`);
        if (crResponse.ok) {
            const crData = await crResponse.json();
            let crAbs = crData.message.abstract;
            if (crAbs) {
                targetDiv.innerHTML = crAbs.replace(/<[^>]*>?/gm, ''); // 태그 제거 후 삽입
                return; // 찾았으면 종료!
            }
        }
    } catch (e) { console.log("Crossref fail"); }

    // --- 2단계: Semantic Scholar 시도 (Crossref에 없을 때만 실행) ---
    try {
        const ssResponse = await fetch(`https://api.semanticscholar.org/graph/v1/paper/DOI:${doi}?fields=abstract`);
        if (ssResponse.ok) {
            const ssData = await ssResponse.json();
            if (ssData.abstract) {
                targetDiv.innerText = ssData.abstract;
                return; // 찾았으면 종료!
            }
        }
    } catch (e) { console.log("Semantic Scholar fail"); }

    // --- 3단계: 모두 실패했을 때 ---
    targetDiv.innerHTML = `<span style="color:#e03131;">😢 모든 도서관을 뒤졌지만 초록을 찾지 못했어요. <br> <a href="https://doi.org/${doi}" target="_blank" style="color:#d63384; font-weight:bold;">[여기]</a>를 눌러 원문 사이트에서 확인해 주세요!</span>`;
}


// [6] 페이징 버튼 그리기 함수
function renderPagination(total) {
    const maxPage = Math.ceil(total / itemsPerPage);
    if (maxPage <= 1) {
        [pagT, pagB].forEach(el => el.innerHTML = '');
        return;
    }

    const navHtml = `
        <button class="btn-page" id="prevBtn" ${currentPage === 0 ? 'disabled' : ''}>이전</button>
        <span style="font-weight:bold; color:#d63384;">${currentPage + 1} / ${maxPage}</span>
        <button class="btn-page" id="nextBtn" ${currentPage >= maxPage - 1 ? 'disabled' : ''}>다음</button>
    `;

    [pagT, pagB].forEach(el => {
        el.innerHTML = navHtml;
        // 버튼 이벤트 연결
        const pBtn = el.querySelector('#prevBtn');
        const nBtn = el.querySelector('#nextBtn');
        
        if (pBtn) pBtn.onclick = () => { currentPage--; fetchData(); };
        if (nBtn) nBtn.onclick = () => { currentPage++; fetchData(); };
    });
}




// [테스트 전용] 버튼 클릭 시 실행되는 함수
async function runTest() {
    const inputVal = document.getElementById('testDoiInput').value.trim();
    const resultDiv = document.getElementById('testResult');
    
    if (!inputVal) {
        alert("테스트할 DOI 주소를 넣어줘, 리즈! 🧐");
        return;
    }

    // 1. DOI 번호만 추출 (주소가 통째로 들어와도 OK)
    const doiOnly = inputVal.replace("https://doi.org/", "");
    
    resultDiv.innerHTML = "📡 도서관 연결 중...";

    // 2. 데이터 가져오기 실행
    const abstract = await getAbstractFromCrossref(doiOnly);
    
    // 3. 결과 표시 (HTML 태그 제거 포함)
    resultDiv.innerHTML = `<strong>결과:</strong><br>${abstract.replace(/<[^>]*>?/gm, '')}`;
}

// [핵심 로직] Crossref API 호출 함수
async function getAbstractFromCrossref(doi) {
    try {
        const response = await fetch(`https://api.crossref.org/works/${doi}`);
        if (!response.ok) throw new Error("도서관에 정보가 없나 봐요.");
        
        const data = await response.json();
        
        // Crossref는 초록을 'abstract' 필드에 담아줍니다.
        return data.message.abstract || "초록 정보를 찾을 수 없습니다.";
    } catch (error) {
        console.error("Crossref 호출 에러:", error);
        return "데이터 로드 실패 (DOI 번호를 다시 확인해줘!)";
    }
}