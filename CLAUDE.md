@AGENTS.md

## 프로젝트 정보
- 개발 포트: **3013** 고정 (`npm run dev` → http://localhost:3013)
- GitHub: https://github.com/tntkorea-glitch/beautica

## 작업 워크플로우 (글로벌 규칙 따름)
- 로컬에서 작업 + http://localhost:3013 으로 검토 먼저
- **수시 배포 금지** — 매 수정마다 자동 commit/push/deploy 안 함
- 사용자가 `/bye` 호출 시에만 1회 배포
- 백업만 필요하면 `/save` (commit+push, 배포 없음)

## 세션 시작 시 자동 실행 (필수)
매 세션 시작 시 사용자의 첫 메시지를 처리하기 전에:
```bash
[ -f setup.sh ] && { [ ! -f .git/hooks/pre-commit ] || [ ! -d node_modules ]; } && bash setup.sh
git pull
```
