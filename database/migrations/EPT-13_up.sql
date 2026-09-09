-- EPT-13 up migration: vehicles + policy_endorsements tables.
create table if not exists vehicles (
    id serial primary key,
    user_policy_id integer not null unique references userpolicies(id) on delete cascade,
    make varchar(50) not null,
    model varchar(50) not null,
    year integer not null,
    vin varchar(17) not null,
    registration varchar(20) not null,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

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
