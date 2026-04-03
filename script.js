// [전역 변수 설정]
let currentPage = 0;
const itemsPerPage = 25;
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
    if (!apiKey) {
        alert("어라? 리즈, API 키가 배고픈가 봐요. 다시 확인해줄래? 🧐");
        return;
    }

    // 입력한 키를 브라우저 금고에 저장
    localStorage.setItem('elsevier_api_key', apiKey);

    // UI 상태 초기화 (로딩 중)
    searchBtn.disabled = true;
    listDiv.innerHTML = '<p style="text-align:center; font-size:1.1em; color:#d63384; padding:40px;">리즈를 위해 열심히 도서관 뒤지는 중... 🏃‍♀️💨</p>';
    [pagT, pagB].forEach(p => p.innerHTML = '');
    countDiv.style.display = 'none';

    try {
        const start = currentPage * itemsPerPage;
        const url = `https://api.elsevier.com/content/search/scopus?query=TITLE-ABS-KEY(${encodeURIComponent(currentKeyword)})&apiKey=${apiKey}&count=${itemsPerPage}&start=${start}`;
        
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        
        if (!response.ok) {
            throw new Error("API 키가 배고픈가 봐요. 다시 확인해줄래? 🧐");
        }

        const data = await response.json();
        const results = data['search-results'];
        const total = parseInt(results['opensearch:totalResults'] || "0");
        const entries = results['entry'];

        // 결과 표시창 스타일 설정
        countDiv.style.display = 'block';
        
        // [로직] 결과가 0건일 때와 있을 때 문구 분기
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
            
            renderList(entries);
        }

        // 페이징 버튼 생성
        renderPagination(total);

    } catch (err) {
        countDiv.style.display = 'block';
        countDiv.style.background = '#fff5f5';
        countDiv.style.color = '#e03131';
        countDiv.innerHTML = `❌ 어라? 리즈, API 키가 배고픈가 봐요. 다시 확인해줄래? 🧐`;
        listDiv.innerHTML = '';
    } finally {
        searchBtn.disabled = false;
        window.scrollTo(0, 0); // 페이지 이동 시 맨 위로 스크롤
    }
}

// [5] 논문 목록 그리기 함수
function renderList(entries) {
    listDiv.innerHTML = '';
    if (entries && entries.length > 0 && !entries[0].error) {
        entries.forEach(item => {
            const card = document.createElement('div');
            card.className = 'paper-card';
            const doi = item['prism:doi'];
            const title = item['dc:title'];
            const author = item['dc:creator'] || '저자 미상';
            const date = item['prism:coverDate'];
            const journal = item['prism:publicationName'] || '학술지 정보 없음';

            card.innerHTML = `
                <a href="${doi ? 'https://doi.org/' + doi : '#'}" target="_blank" class="paper-title">${title}</a>
                <div style="font-size:0.85em; color:#666; margin-top:5px;">
                    👤 ${author} | 📅 ${date} | 📖 ${journal}
                </div>
            `;
            listDiv.appendChild(card);
        });
    }
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
