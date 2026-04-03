const apiKeyInput = document.getElementById('apiKey');
const toggleKeyBtn = document.getElementById('toggleKeyBtn');
const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keyword');
const countDiv = document.getElementById('result-count');
const listDiv = document.getElementById('paper-list');

// [기능 1] 페이지 로드 시 저장된 키 불러오기
window.onload = () => {
    const savedKey = localStorage.getItem('elsevier_api_key');
    if (savedKey) apiKeyInput.value = savedKey;
};

// [기능 2] API 키 보기/숨기기 토글
toggleKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleKeyBtn.textContent = '숨기기';
    } else {
        apiKeyInput.type = 'password';
        toggleKeyBtn.textContent = '보기';
    }
});

// [기능 3] 논문 검색 실행
searchBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const keyword = keywordInput.value.trim();

    if (!apiKey || !keyword) {
        alert('API 키와 검색어를 모두 입력해 주세요!');
        return;
    }

    // API 키 로컬 저장
    localStorage.setItem('elsevier_api_key', apiKey);

    // UI 상태 업데이트
    countDiv.style.display = 'block';
    countDiv.className = 'success';
    countDiv.textContent = '⏳ 데이터 분석 중... 잠시만 기다려 주세요.';
    listDiv.innerHTML = '';
    searchBtn.disabled = true;

    try {
        const url = `https://api.elsevier.com/content/search/scopus?query=TITLE-ABS-KEY(${encodeURIComponent(keyword)})&apiKey=${apiKey}&count=25`;
        
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        
        if (!response.ok) throw new Error(response.status === 401 ? "API 키가 올바르지 않습니다." : "서버 통신 에러");

        const data = await response.json();
        const total = data['search-results']['opensearch:totalResults'];
        const entries = data['search-results']['entry'];

        countDiv.innerHTML = `✅ "${keyword}" 관련 논문이 총 <strong>${Number(total).toLocaleString()}</strong>건 발견되었습니다.`;

        if (entries && entries.length > 0 && !entries[0].error) {
            entries.forEach(item => {
                const card = document.createElement('div');
                card.className = 'paper-card';
                
                const title = item['dc:title'];
                const author = item['dc:creator'] || '알 수 없는 저자';
                const journal = item['prism:publicationName'] || '학술지 정보 없음';
                const date = item['prism:coverDate'];
                const doi = item['prism:doi'];

                card.innerHTML = `
                    <div class="paper-title">${title}</div>
                    <div class="paper-meta">👤 ${author} | 📅 ${date} | 📖 ${journal}</div>
                    ${doi ? `<a href="https://doi.org/${doi}" target="_blank" style="font-size:0.8em; color:#007396; margin-top:10px; display:inline-block;">[원문 보기]</a>` : ''}
                `;
                listDiv.appendChild(card);
            });
        } else {
            listDiv.innerHTML = '<p style="text-align:center; color:#666;">상세 검색 결과가 없습니다.</p>';
        }

    } catch (err) {
        countDiv.className = 'error';
        countDiv.textContent = `❌ 오류: ${err.message}`;
    } finally {
        searchBtn.disabled = false;
    }
});
