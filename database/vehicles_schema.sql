-- EPT-13: per user-policy vehicle record (auto policies).
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
