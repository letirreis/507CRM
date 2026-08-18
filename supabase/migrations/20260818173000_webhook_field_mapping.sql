-- Permite mapear campos arbitrários do payload do webhook de entrada para
-- os "Campos Personalizados" (custom_field_definitions) de deal/contato.
--
-- field_mapping: array de objetos, ex.:
-- [
--   { "source_key": "cnpj", "target_entity": "deal", "target_key": "cnpj" },
--   { "source_key": "utm_campaign", "target_entity": "deal", "target_key": "campanha" }
-- ]
--
-- - "source_key" é o nome do campo no JSON enviado pelo provedor (Hotmart/n8n/Make/etc).
--   Suporta path simples com ponto para objetos aninhados (ex.: "utm.campaign").
-- - "target_key" deve corresponder à `key` de um registro em `custom_field_definitions`
--   (da mesma organização) para aparecer na UI de deal/contato; se não corresponder a
--   nenhuma definição, o valor ainda é gravado em custom_fields, apenas não terá rótulo/tipo na UI.
ALTER TABLE public.integration_inbound_sources
ADD COLUMN IF NOT EXISTS field_mapping JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.integration_inbound_sources.field_mapping IS
  'Mapeamento de campos do payload do webhook -> custom_fields de deal/contato. Array de {source_key, target_entity, target_key}.';
