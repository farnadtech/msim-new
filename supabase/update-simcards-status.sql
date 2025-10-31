-- Update sim_cards status constraint to include 'reserved' status
ALTER TABLE sim_cards
DROP CONSTRAINT IF EXISTS sim_cards_status_check;

ALTER TABLE sim_cards
ADD CONSTRAINT sim_cards_status_check
CHECK (status IN ('available', 'sold', 'reserved'));
