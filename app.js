const searchBtn = document.getElementById('searchBtn');
const keyInput = document.getElementById('apiKey');
const keywordInput = document.getElementById('keyword');
const countDisplay = document.getElementById('result-count');
const listDisplay = document.getElementById('paper-list');

// 1. 페이지 로드 시 기존에 저장된 API 키가 있으면 불러오기
window.onload = () => {
    const savedKey = localStorage.getItem('elsevier_api_key');
    if (savedKey) {
        keyInput.value = savedKey;
        console.log("기존 API 키를 불러왔습니다.");
    }
};

searchBtn.addEventListener('click', async () => {
    const apiKey = keyInput.value.trim();
    const keyword = keywordInput.value.trim();

    if (!apiKey) {
        alert('API Key를 입력해주세요! (Elsevier 사이트에서 발급받은 키)');
        return;
    }
    if (!keyword) {
        alert('검색할 키워드를 입력해주세요!');
        return;
    }

    // 2. 입력한 API 키를 브라우저에 저장 (다음번 접속 시 편리함)
    localStorage.setItem('elsevier_api_key', apiKey);

    // UI 초기화
    countDisplay.style.display = 'block';
    countDisplay.textContent = '🔍 Elsevier 서버에서 데이터를 가져오는 중...';
    listDisplay.innerHTML = '';
    searchBtn.disabled = true;

    try {
        // Scopus Search API 호출
        const url = `https://api.elsevier.com/content/search/scopus?query=TITLE-ABS-KEY(${encodeURIComponent(keyword)})&apiKey=${apiKey}&count=25`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error("API 키가 올바르지 않거나 승인되지 않았습니다.");
            throw new Error(`에러 발생! (코드: ${response.status})`);
        }

        const data = await response.json();
        const results = data['search-results'];
        const totalResults = results['opensearch:totalResults'];
        const entries = results['entry'];

        // 검색 결과 개수 표시
        countDisplay.innerHTML = `✅ <strong>"${keyword}"</strong> 검색 결과: 총 <strong>${Number(totalResults).toLocaleString()}</strong>개의 논문을 찾았습니다.`;

        // 논문 리스트 생성
        if (entries && entries.length > 0 && !entries[0].error) {
            entries.forEach(entry => {
                const item = document.createElement('div');
                item.className = 'paper-item';
                
                const title = entry['dc:title'];
                const author = entry['dc:creator'] || '저자 정보 없음';
                const date = entry['prism:coverDate'];
                const journal = entry['prism:publicationName'] || '학술지 정보 없음';
                const doi = entry['prism:doi'] || '';

                item.innerHTML = `
                    <div class="paper-title">${title}</div>
                    <div class="paper-info">
                        👤 ${author} | 📅 ${date} | 📖 ${journal}
                    </div>
                    ${doi ? `<div style="margin-top:5px;"><a href="https://doi.org/${doi}" target="_blank" style="color:#007396; font-size:0.85em;">원문 보기 (DOI)</a></div>` : ''}
                `;
                listDisplay.appendChild(item);
            });
        } else {
            listDisplay.textContent = '검색 결과가 없습니다. 키워드를 변경해 보세요.';
        }

    } catch (error) {
        console.error('오류:', error);
        countDisplay.innerHTML = `❌ 오류: ${error.message}`;
    } finally {
        searchBtn.disabled = false;
    }
});