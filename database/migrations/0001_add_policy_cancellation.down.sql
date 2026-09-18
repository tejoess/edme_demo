-- EPT-15: Policy Cancellation -- down migration.
-- NOT reversible without data loss once any cancellation has ever been
-- recorded: this drops every cancellation timestamp and history row
-- unconditionally. Only loss-free against a database where no cancellation
-- has ever happened (see plan.md "Database changes").

DROP TABLE IF EXISTS policy_status_history;
ALTER TABLE userpolicies DROP COLUMN IF EXISTS cancelled_at;
