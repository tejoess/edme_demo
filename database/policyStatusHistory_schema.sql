-- EPT-15: Policy Cancellation -- audit trail of userpolicies status changes.
CREATE TABLE policy_status_history (
    id SERIAL PRIMARY KEY,
    user_policy_id INTEGER NOT NULL
        REFERENCES userpolicies(id) ON DELETE CASCADE,
    previous_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_policy_status_history_user_policy_id
    ON policy_status_history(user_policy_id);
