-- ============================================================
-- Schema completo — Antônia Lucena 80 Anos
-- Execute no SQL Editor do Supabase (substitui as migrações 001/002/003)
-- ============================================================

-- ── Presentes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gifts (
  id         integer  PRIMARY KEY,
  name       text     NOT NULL,
  brand      text     NOT NULL DEFAULT '',
  category   text     NOT NULL CHECK (category IN ('beleza','casa','calcados','cozinha','acessorios','pix')),
  gift_limit integer  DEFAULT 1,   -- NULL = ilimitado (PIX)
  active     boolean  NOT NULL DEFAULT true,
  sort_order integer  NOT NULL DEFAULT 0
);

INSERT INTO gifts (id, name, brand, category, gift_limit, sort_order) VALUES
  (1,  'Body Splash Boa Noite + Hidratante para as Mãos',  'O Boticário',   'beleza',     1,    1),
  (2,  'Colônia Águas de Framboesa',                        'Natura',         'beleza',     1,    2),
  (3,  'Colônia Thaty',                                      'O Boticário',   'beleza',     1,    3),
  (4,  'Kit Lençol com Elástico e Fronha Queen (Jogo 1)',   'São Cristóvão',  'casa',       2,    4),
  (5,  'Kit Lençol com Elástico e Fronha Queen (Jogo 2)',   'São Cristóvão',  'casa',       2,    5),
  (6,  'Jogo de Lençol Queen',                              'São Cristóvão',  'casa',       1,    6),
  (7,  'Sandália Ortopédica de Dedo Nº 37',                 'Picadilly',      'calcados',   1,    7),
  (8,  'Sandália Ortopédica Nº 37',                         'Mondare',        'calcados',   1,    8),
  (9,  'Cuscuzeira Inox 2,5 Litros',                        'Tramontina',     'cozinha',    1,    9),
  (10, 'Jogo de Pratos de Jantar (Pratos Fundos)',          '',               'cozinha',    1,   10),
  (11, '2 Pares de Brinco de Pressão',                      '',               'acessorios', 2,   11),
  (12, 'Panela de Pressão 4,5 L',                           'Tramontina',     'cozinha',    1,   12),
  (13, 'Conjunto de Corte de Bolo Inox',                    'Sanexc',         'cozinha',    1,   13),
  (14, 'Kit Lençol Queen com Elástico + 2 Travesseiros',    '',               'casa',       1,   14),
  (15, 'Escova Secadora Giratória',                         '',               'beleza',     1,   15),
  (16, 'Pix R$ 200,00',                                     '',               'pix',        NULL, 16)
ON CONFLICT (id) DO NOTHING;

-- ── Reservas ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gift_claims (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id    integer     NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  claimed_by text        NOT NULL,
  phone      text        NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

-- Uma pessoa só pode reservar o mesmo presente uma vez
CREATE UNIQUE INDEX IF NOT EXISTS gift_claims_gift_person
  ON gift_claims (gift_id, claimed_by);

CREATE INDEX IF NOT EXISTS gift_claims_gift_id_idx
  ON gift_claims (gift_id, claimed_at);

-- ── Logs de WhatsApp ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id    integer,
  claimed_by text        NOT NULL DEFAULT '',
  phone      text        NOT NULL,
  message    text        NOT NULL,
  status     text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error      text,
  sent_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_logs_sent_at_idx
  ON whatsapp_logs (sent_at DESC);

-- ── Configurações ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
  ('pix_key',            ''),
  ('pix_owner_name',     ''),
  ('pix_receipt_phone',  ''),
  ('event_date',         '16 de Agosto de 2026'),
  ('event_time',         '18h30'),
  ('event_place',        'Buffet Diferentes Sabores'),
  ('rsvp_deadline',      '20 de julho de 2026'),
  ('whatsapp_template',  E'🎊 *{name}, sua reserva está confirmada!* ✅\n\nQue alegria contar com sua presença na celebração dos *80 anos de Antônia Lucena*! 🎂\n\n🎁 *Presente escolhido*\n└ {gift}\n\n━━━━━━━━━━━━━━━━━━\n📋 *Detalhes do evento*\n📅  {date}\n⏰  {time}\n📍  {place}\n🗺️  https://maps.app.goo.gl/1SQhCcoGbJZSMuaM6\n━━━━━━━━━━━━━━━━━━\n\nTe esperamos com muito carinho! 💛')
ON CONFLICT (key) DO NOTHING;

-- ── Script de migração (rode se o banco já existe) ────────────────────────────
-- Insere apenas as chaves que ainda não existem:
INSERT INTO app_settings (key, value) VALUES
  ('pix_owner_name',    ''),
  ('pix_receipt_phone', '')
ON CONFLICT (key) DO NOTHING;

-- Atualiza o template para o novo formato (apenas se ainda tiver o texto antigo):
UPDATE app_settings
SET value = E'🎊 *{name}, sua reserva está confirmada!* ✅\n\nQue alegria contar com sua presença na celebração dos *80 anos de Antônia Lucena*! 🎂\n\n🎁 *Presente escolhido*\n└ {gift}\n\n━━━━━━━━━━━━━━━━━━\n📋 *Detalhes do evento*\n📅  {date}\n⏰  {time}\n📍  {place}\n🗺️  https://maps.app.goo.gl/1SQhCcoGbJZSMuaM6\n━━━━━━━━━━━━━━━━━━\n\nTe esperamos com muito carinho! 💛'
WHERE key = 'whatsapp_template'
  AND value LIKE 'Ola {name}%';
