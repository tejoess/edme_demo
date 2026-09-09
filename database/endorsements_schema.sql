-- EPT-13: customer-requested policy endorsement (vehicle detail change) records.
create table if not exists policy_endorsements (
    id serial primary key,
    user_policy_id integer not null references userpolicies(id) on delete cascade,
    requested_by integer not null references users(id),
    old_values jsonb not null,
    new_values jsonb not null,
    status varchar(20) not null default 'Pending',
    request_date timestamp default now(),
    decision_date timestamp,
    decided_by integer references users(id),
    created_at timestamp default now()
);
