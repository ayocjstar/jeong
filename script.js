let currentPage = 0;       // 현재 페이지 (0부터 시작)
const itemsPerPage = 25;    // 한 페이지당 보여줄 논문 수
let currentKeyword = "";    // 검색어 유지용

const apiKeyInput = document.getElementById('apiKey');
const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keyword');
const countDiv = document.getElementById('result-count');
const listDiv = document.getElementById('paper-list');
const pagTop = document.getElementById('pagination-top');
const pagBottom = document.getElementById('pagination-bottom');

// 검색 버튼 클릭 시 (첫 페이지부터 시작)
searchBtn.addEventListener('click', () => {
    currentPage = 0;
    currentKeyword = keywordInput.value.trim();
    fetchPapers();
});

// 실제 API 호출 함수
async function fetchPapers() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey || !currentKeyword) {
        alert('API 키와 검색어를 확인해 주세요!');
        return;
    }

    localStorage.setItem('elsevier_api_key', apiKey);
    
    // UI 초기화 및 로딩 표시
    listDiv.innerHTML = '⏳ 데이터를 불러오는 중입니다...';
    searchBtn.disabled = true;
    [pagTop, pagBottom].forEach(el => el.innerHTML = '');

    try {
        // start 파라미터가 페이징의 핵심입니다 (0, 25, 50...)
        const start = currentPage * itemsPerPage;
        const url = `https://api.elsevier.com/content/search/scopus?query=TITLE-ABS-KEY(${encodeURIComponent(currentKeyword)})&apiKey=${apiKey}&count=${itemsPerPage}&start=${start}`;
        
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) throw new Error("데이터를 가져오지 못했습니다.");

        const data = await response.json();
        const results = data['search-results'];
        const total = parseInt(results['opensearch:totalResults']);
        const entries = results['entry'];

        // 결과 개수 및 정보 표시
        countDiv.style.display = 'block';
        countDiv.className = 'success';
        countDiv.innerHTML = `✅ <strong>"${currentKeyword}"</strong> 결과: 총 ${total.toLocaleString()}건 (현재 ${currentPage + 1}페이지)`;

        // 논문 리스트 렌더링
        renderList(entries);

        // 페이징 버튼 생성
        renderPagination(total);

    } catch (err) {
        countDiv.className = 'error';
        countDiv.textContent = `❌ 오류: ${err.message}`;
        listDiv.innerHTML = '';
    } finally {
        searchBtn.disabled = false;
        window.scrollTo(0, 0); // 페이지 상단으로 이동
    }
}

function renderList(entries) {
    listDiv.innerHTML = '';
    if (entries && entries.length > 0 && !entries[0].error) {
        entries.forEach(item => {
            const card = document.createElement('div');
            card.className = 'paper-card';
            card.innerHTML = `
                <div class="paper-title">${item['dc:title']}</div>
                <div class="paper-meta">👤 ${item['dc:creator'] || '저자 미상'} | 📅 ${item['prism:coverDate']}</div>
                ${item['prism:doi'] ? `<a href="https://doi.org/${item['prism:doi']}" target="_blank" class="doi-link">[원문 보기]</a>` : ''}
            `;
            listDiv.appendChild(card);
        });
    } else {
        listDiv.innerHTML = '<p>검색 결과가 없습니다.</p>';
    }
}

function renderPagination(total) {
    const maxPage = Math.ceil(total / itemsPerPage);
    const html = `
        <button class="btn-page" id="prevBtn" ${currentPage === 0 ? 'disabled' : ''}>이전</button>
        <span class="page-info">${currentPage + 1} / ${maxPage}</span>
        <button class="btn-page" id="nextBtn" ${currentPage >= maxPage - 1 ? 'disabled' : ''}>다음</button>
    `;
    
    [pagTop, pagBottom].forEach(el => {
        el.innerHTML = html;
        el.querySelector('#prevBtn').onclick = () => { currentPage--; fetchPapers(); };
        el.querySelector('#nextBtn').onclick = () => { currentPage++; fetchPapers(); };
    });
}
