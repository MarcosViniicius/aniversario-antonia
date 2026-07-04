-- Gift claims table for Antônia Lucena 80 Anos
-- Run this in the Supabase SQL Editor before deploying the app.

CREATE TABLE IF NOT EXISTS gift_claims (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id    integer     NOT NULL,
  claimed_by text        NOT NULL,
  phone      text        NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent the same person from claiming the same gift twice.
-- PIX (unlimited) still respects this: one person = one PIX contribution.
CREATE UNIQUE INDEX IF NOT EXISTS gift_claims_gift_person
  ON gift_claims (gift_id, claimed_by);

-- Speed up reads grouped by gift_id
CREATE INDEX IF NOT EXISTS gift_claims_gift_id_idx
  ON gift_claims (gift_id, claimed_at);

-- Disable Row Level Security (server-side calls use service_role key which bypasses RLS).
-- If you want to enable RLS, add: ALTER TABLE gift_claims ENABLE ROW LEVEL SECURITY;
-- Then add a policy that allows service_role full access.
