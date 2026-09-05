원벌룬앤파티 관리자형 홈페이지 - 1차 파일

이 파일 세트에는:
- 기존 홈페이지의 기본 디자인/문구
- 이메일 문의 제거
- 전화 + 네이버 블로그 상담 연결
- 검색용 업체 정보 보강
- 원본 로고 기반 파비콘
- /admin 관리자 화면
- 시공사례 직접 등록 구조
- 대표사진/추가사진/사진설명(alt)/본문/검색설명 입력칸
- 시공사례 개별 페이지 자동 생성
- sitemap 자동 생성
- 네이버 인증파일/robots.txt 유지
가 들어 있습니다.

중요:
src/admin/config.yml의 base_url은 아직 OAuth Worker 주소가 정해지지 않아
REPLACE-WITH-OAUTH-WORKER 로 남겨두었습니다.
그래서 파일을 GitHub에 올린 뒤, 다음 단계에서 GitHub OAuth 앱 + Cloudflare Worker를 연결하고
그 주소를 한 번만 교체해야 관리자 로그인이 실제로 작동합니다.

Cloudflare Pages 연결 시:
- Production branch: main
- Build command: npm run build
- Build output directory: _site
- Root directory: 비워두기

현재 oneballoon.co.kr 라이브 사이트는 새 사이트가 완전히 확인될 때까지 그대로 유지하세요.
