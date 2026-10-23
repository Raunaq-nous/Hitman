-- Account erasure: the scoring ledger stays append-only, except inside a transaction that sets
-- app.allow_erasure = 'on' (only the delete-my-account service does this, with SET LOCAL).
CREATE OR REPLACE FUNCTION scoring_event_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.allow_erasure', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'ScoringEvent is append-only: % is not allowed (write a new event with a new config version instead)', TG_OP;
END;
$$ LANGUAGE plpgsql;
