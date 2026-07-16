-- Seeds one classroom and its student roster into the Demo School tenant,
-- so the loan flow (Select Class & Student -> Confirm & Loan) has real
-- `students.id` foreign keys to insert into `loans`, instead of the dummy
-- client-side names used elsewhere in the UI mocks.
insert into classrooms (id, school_id, class_label, academic_year)
values ('11111111-1111-1111-1111-111111111111', 'effdf624-c3c2-437b-b634-703fcff9def5', 'Squirrels', '2025-2026')
on conflict (id) do nothing;

insert into students (school_id, classroom_id, first_name, last_initial)
select 'effdf624-c3c2-437b-b634-703fcff9def5', '11111111-1111-1111-1111-111111111111', first_name, last_initial
from (
  values
    ('Ava', 'M'), ('Noah', 'T'), ('Isla', 'P'), ('Leo', 'R'), ('Mia', 'K'),
    ('Oscar', 'B'), ('Freya', 'L'), ('Jack', 'W'), ('Amelia', 'S'), ('Harry', 'D'), ('Grace', 'N')
) as seed(first_name, last_initial)
where not exists (
  select 1 from students
  where students.school_id = 'effdf624-c3c2-437b-b634-703fcff9def5'
    and students.first_name = seed.first_name
    and students.last_initial = seed.last_initial
);
