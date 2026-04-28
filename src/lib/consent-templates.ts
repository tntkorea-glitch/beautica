/**
 * 기본 동의서 템플릿 (MVP — 코드 상수)
 * 매장이 자기 템플릿 추가/편집은 Phase 4 (consent_form_templates 테이블 활용).
 */

export type DefaultConsentTemplate = {
  key: string;
  name: string;
  content: string; // markdown-lite (개행 + 단순 강조)
};

export const DEFAULT_CONSENT_TEMPLATES: DefaultConsentTemplate[] = [
  {
    key: "GENERAL_TREATMENT",
    name: "일반 시술 동의서",
    content: `[시술 동의서]

본인은 아래 시술에 대해 충분한 설명을 듣고 자발적으로 시술에 동의합니다.

▸ 알러지/부작용 위험성에 대해 안내받았으며, 시술 전 알러지 정보를 정확히 제공하였습니다.
▸ 시술 결과는 개인의 피부 상태/체질에 따라 차이가 있을 수 있음을 이해합니다.
▸ 시술 후 주의사항을 안내받았으며, 이를 준수하지 않을 경우 결과에 영향을 줄 수 있음을 이해합니다.
▸ 시술 사진/기록이 본인 관리 목적으로 매장 내부에 저장됨에 동의합니다 (외부 공개 X).

위 내용에 모두 동의하며, 자필 서명으로 확인합니다.`,
  },
  {
    key: "SEMI_PERMANENT",
    name: "반영구 시술 동의서",
    content: `[반영구 시술 동의서]

본인은 반영구 시술(눈썹/아이라인/입술/헤어라인 등)에 대해 다음 사항에 동의합니다.

▸ 시술 후 1~2주의 발색 변화 과정을 이해하며, 색소가 점차 안정화됨을 안내받았습니다.
▸ 알러지 반응(붓기/가려움/홍반 등)이 나타날 수 있으며, 즉시 매장에 알리겠습니다.
▸ 헤르페스 이력이 있는 경우(특히 입술 시술) 미리 안내하였습니다.
▸ 시술 후 24~48시간 동안 물/땀/메이크업 접촉을 피할 것을 안내받았습니다.
▸ 리터치 시기/횟수에 대한 안내를 받았으며, 추가 비용이 발생할 수 있음을 이해합니다.
▸ 시술 사진(전/후) 이 본인 관리 목적으로 저장되며, 본인 동의 없이 외부 공개되지 않습니다.

위 내용에 모두 동의하며, 자필 서명으로 확인합니다.`,
  },
  {
    key: "PHOTO_USAGE",
    name: "사진 활용 추가 동의서 (홍보용)",
    content: `[사진 활용 동의서]

본인은 시술 전/후 사진을 매장의 다음 목적으로 사용하는 것에 동의합니다 (선택).

▸ 매장 SNS (인스타그램/블로그) 게시
▸ 홈페이지 포트폴리오 게시
▸ 광고/홍보 자료

※ 얼굴/식별 가능한 부위는 모자이크 또는 부분 노출만 사용됩니다.
※ 동의를 철회하실 경우 즉시 게시물 삭제됩니다.

위 내용에 동의합니다.`,
  },
];

export function getDefaultTemplate(key: string): DefaultConsentTemplate {
  return (
    DEFAULT_CONSENT_TEMPLATES.find((t) => t.key === key) ??
    DEFAULT_CONSENT_TEMPLATES[0]
  );
}
