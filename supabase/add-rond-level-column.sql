-- Add rond_level column to sim_cards table
ALTER TABLE sim_cards 
ADD COLUMN rond_level INTEGER CHECK (rond_level IN (1, 2, 3, 4, 5));

-- Add index for rond_level
CREATE INDEX idx_sim_cards_rond_level ON sim_cards(rond_level);
