-- EPT-15: Policy Cancellation
-- Adds userpolicies.cancelled_at and a new policy_status_history audit table.
-- No migration runner exists in this repo (see plan.md) -- apply manually:
--   psql "$DATABASE_URL" -f database/migrations/0001_add_policy_cancellation.up.sql

ALTER TABLE userpolicies ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS policy_status_history (
    id SERIAL PRIMARY KEY,
    user_policy_id INTEGER NOT NULL
        REFERENCES userpolicies(id) ON DELETE CASCADE,
    previous_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_policy_status_history_user_policy_id
    ON policy_status_history(user_policy_id);
