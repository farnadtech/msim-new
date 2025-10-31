-- Update transactions type constraint to include new types
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions
ADD CONSTRAINT transactions_type_check
CHECK (type IN ('deposit', 'withdrawal', 'purchase', 'sale', 'credit', 'debit_blocked'));
