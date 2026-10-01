-- Add a distinct least-privilege database role for Managing Brokers.
-- Kept separate because PostgreSQL does not allow a newly added enum label to
-- be used until the transaction that adds it has committed.
alter type rcre_user_role add value if not exists 'managing_broker';
