# 간단한 데이터 관리 웹 뷰

순수 자바스크립트와 HTML을 사용하여 만든 데이터 입력/수정 및 HTML 페이지 자동 생성 웹 애플리케이션입니다.

## 주요 기능

- 데이터 입력 및 관리
- localStorage를 사용한 데이터 저장
- 동적 HTML 페이지 생성
- 모바일 반응형 디자인

## 파일 구조

```
/
├── index.html           # 메인 페이지
├── edit.html            # 데이터 수정 페이지
├── preview.html         # HTML 미리보기 페이지
├── css/
│   ├── style.css        # 메인 스타일시트
│   └── form.css         # 폼 스타일
├── js/
│   ├── main.js          # 메인 자바스크립트
│   ├── storage.js       # 데이터 저장 관련 기능
│   ├── form.js          # 폼 처리 관련 기능
│   └── generator.js     # HTML 생성 관련 기능
└── templates/
    └── default.js       # 기본 HTML 템플릿
```

## 설치 및 실행

1. 저장소 클론

```bash
git clone https://github.com/username/data-management-web-view.git
cd data-management-web-view
```

2. 웹 서버로 실행

- 로컬에서 간단히 실행:
  - VS Code의 Live Server 확장 프로그램 사용
  - 또는 Python 내장 웹서버 실행: `python -m http.server`

3. 브라우저에서 열기

웹 브라우저에서 `http://localhost:8000`(또는 사용한 서버의 포트)를 열어 웹 애플리케이션 접속

## Vercel 배포

1. GitHub 저장소에 푸시
2. Vercel에서 해당 저장소 가져오기
3. 배포 설정 후 완료

## 사용 방법

1. **메인 페이지 (index.html)**
   - 새 데이터 입력 폼으로 제목, 작성자, 내용 입력
   - 저장된 데이터 목록 표시 및 클릭 시 편집 페이지로 이동

2. **편집 페이지 (edit.html)**
   - 드롭다운에서 편집할 페이지 선택
   - 데이터 수정 및 저장 또는 삭제 기능

3. **미리보기 페이지 (preview.html)**
   - 드롭다운에서 페이지 선택하여 HTML 미리보기
   - 새 탭에서 보기 또는 HTML 파일 다운로드 기능

## 기술 스택

- HTML5
- CSS3
- JavaScript (ES6+)
- localStorage API
- Vercel 배포 