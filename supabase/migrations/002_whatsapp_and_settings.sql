-- WhatsApp message log
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id    integer     NOT NULL,
  claimed_by text        NOT NULL,
  phone      text        NOT NULL,
  message    text        NOT NULL,
  status     text        NOT NULL DEFAULT 'pending',  -- pending | sent | failed
  error      text,
  sent_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_logs_sent_at_idx ON whatsapp_logs (sent_at DESC);

-- App settings (key/value store for owner-editable config)
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Default values (only inserted if the key does not exist yet)
INSERT INTO app_settings (key, value) VALUES
  ('pix_key',           ''),
  ('event_date',        '16 de Agosto de 2026'),
  ('event_time',        '18h30'),
  ('event_place',       'Buffet Diferentes Sabores'),
  ('rsvp_deadline',     '20 de julho de 2026'),
  ('whatsapp_template', 'Ola {name}! Sua escolha de "{gift}" para o aniversario de 80 anos de Antonia Lucena foi confirmada. Te esperamos no dia {date} as {time} no {place}. Obrigada!')
ON CONFLICT (key) DO NOTHING;
