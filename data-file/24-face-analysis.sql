-- Migration 24: 얼굴형 & 눈썹 분석 결과 저장
CREATE TABLE IF NOT EXISTS face_analysis_results (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id     UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID        REFERENCES customers(id) ON DELETE SET NULL,
  analysis_json JSONB     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS face_analysis_shop_idx     ON face_analysis_results(shop_id);
CREATE INDEX IF NOT EXISTS face_analysis_customer_idx ON face_analysis_results(customer_id);
