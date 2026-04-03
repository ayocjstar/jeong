// 전역 변수 설정
let currentPage = 0;
const itemsPerPage = 25;
let currentKeyword = "";

// 요소 가져오기
const apiKeyInput = document.getElementById('apiKey');
const eyeBtn = document.getElementById('eyeBtn');
const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keyword');
const countDiv = document.getElementById('result-count');
const listDiv = document.getElementById('paper-list');
const pagT = document.getElementById('pagination-top');
const pagB = document.getElementById('pagination-bottom');

// [1] 저장된 키 불러오기
window.onload = () => {
    const savedKey = localStorage.getItem('elsevier_api_key');
    if (savedKey) apiKeyInput.value = savedKey;
};

// [2] 눈 버튼 기능 (클릭 시 보기/숨기기 토글)
eyeBtn.addEventListener('click', (e) => {
    e.preventDefault(); // 폼 제출 방지
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        eyeBtn.textContent = '🔒'; // 가릴 때는 자물쇠 모양으로 변경 가능
    } else {
        apiKeyInput.type = 'password';
        eyeBtn.textContent = '👁️';
    }
});

// [3] 검색 시작
searchBtn.addEventListener('click', () => {
    currentKeyword = keywordInput.value.trim();
    if (!currentKeyword) {
        alert("검색어를 입력해 주세요.");
        return;
    }
    currentPage = 0; // 새 검색 시 첫 페이지로
    fetchData();
});

async function fetchData() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert("API 키를 입력해 주세요.");
        return;
    }

    // 키 저장
    localStorage.setItem('elsevier_api_key', apiKey);

    // 상태 초기화
    searchBtn.disabled = true;
    listDiv.innerHTML = '<p style="text-align:center;">데이터를 불러오는 중입니다...</p>';
    [pagT, pagB].forEach(p => p.innerHTML = '');

    try {
        const start = currentPage * itemsPerPage;
        const url = `https://api.elsevier.com/content/search/scopus?query=TITLE-ABS-KEY(${encodeURIComponent(currentKeyword)})&apiKey=${apiKey}&count=${itemsPerPage}&start=${start}`;
        
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) throw new Error("API 응답 에러 (키를 확인하세요)");

        const data = await response.json();
        const results = data['search-results'];
        const total = parseInt(results['opensearch:totalResults']);
        const entries = results['entry'];

        // 결과 표시
        countDiv.style.display = 'block';
        countDiv.innerHTML = `✅ "${currentKeyword}" 결과: 총 ${total.toLocaleString()}건 (${currentPage + 1}페이지)`;

        renderList(entries);
        renderPagination(total);

    } catch (err) {
        countDiv.style.display = 'block';
        countDiv.innerHTML = `❌ 오류: ${err.message}`;
        listDiv.innerHTML = '';
    } finally {
        searchBtn.disabled = false;
        window.scrollTo(0, 0);
    }
}

function renderList(entries) {
    listDiv.innerHTML = '';
    if (entries && entries.length > 0 && !entries[0].error) {
        entries.forEach(item => {
            const card = document.createElement('div');
            card.className = 'paper-card';
            const doi = item['prism:doi'];
            card.innerHTML = `
                <a href="${doi ? 'https://doi.org/' + doi : '#'}" target="_blank" class="paper-title">${item['dc:title']}</a>
                <div style="font-size:0.85em; color:#666;">👤 ${item['dc:creator'] || '저자 미상'} | 📅 ${item['prism:coverDate']}</div>
            `;
            listDiv.appendChild(card);
        });
    } else {
        listDiv.innerHTML = '<p>검색 결과가 없습니다.</p>';
    }
}

function renderPagination(total) {
    const maxPage = Math.ceil(total / itemsPerPage);
    if (maxPage <= 1) return;

    const nav = `
        <button class="btn-page" id="prev" ${currentPage === 0 ? 'disabled' : ''}>이전</button>
        <span><strong>${currentPage + 1}</strong> / ${maxPage}</span>
        <button class="btn-page" id="next" ${currentPage >= maxPage - 1 ? 'disabled' : ''}>다음</button>
    `;

    [pagT, pagB].forEach(el => {
        el.innerHTML = nav;
        el.querySelector('#prev').onclick = () => { currentPage--; fetchData(); };
        el.querySelector('#next').onclick = () => { currentPage++; fetchData(); };
    });
}
