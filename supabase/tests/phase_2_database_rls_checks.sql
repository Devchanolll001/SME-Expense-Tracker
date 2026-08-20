-- SME Expense Tracker - Phase 2 database/RLS verification helper.
-- Run this after applying the migration, preferably against a disposable
-- Supabase branch/local database. It is intentionally read-heavy and leaves
-- no data behind if the final rollback is reached.

begin;

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'businesses', 'categories', 'transactions')
order by table_name;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'businesses', 'categories', 'transactions')
order by tablename;

select schemaname, tablename, policyname, cmd
from pg_policies
where (schemaname = 'public' and tablename in (
  'profiles',
  'businesses',
  'categories',
  'transactions'
))
or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select
  conrelid::regclass as table_name,
  conname,
  contype,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in (
  'public.profiles'::regclass,
  'public.businesses'::regclass,
  'public.categories'::regclass,
  'public.transactions'::regclass
)
order by table_name::text, conname;

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('businesses', 'categories', 'transactions')
order by tablename, indexname;

select trigger_schema, event_object_table, trigger_name
from information_schema.triggers
where trigger_schema in ('public', 'auth')
  and trigger_name like 'sme_%'
order by trigger_schema, event_object_table, trigger_name;

-- Optional write/RLS checks. These require permission to seed auth.users and
-- set a simulated Supabase JWT claim in SQL. Keep the rollback at the end.
do $$
declare
  user_a uuid := '00000000-0000-4000-8000-000000000001';
  user_b uuid := '00000000-0000-4000-8000-000000000002';
  business_a uuid;
  business_b uuid;
  expense_category_a uuid;
  transaction_a uuid;
  visible_count integer;
begin
  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
  )
  values
    (
      user_a,
      'authenticated',
      'authenticated',
      'phase2-user-a@example.test',
      '',
      now(),
      now(),
      now(),
      '{"first_name":"User","last_name":"A"}'::jsonb
    ),
    (
      user_b,
      'authenticated',
      'authenticated',
      'phase2-user-b@example.test',
      '',
      now(),
      now(),
      now(),
      '{"first_name":"User","last_name":"B"}'::jsonb
    )
  on conflict (id) do nothing;

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.businesses (owner_id, business_name, currency)
  values (user_a, 'Phase 2 Business A', 'NGN')
  returning id into business_a;

  select id into expense_category_a
  from public.categories
  where business_id = business_a
    and type = 'expense'
    and name = 'Rent'
  limit 1;

  if expense_category_a is null then
    raise exception 'Default category seeding failed for Business A';
  end if;

  insert into public.transactions (
    business_id,
    category_id,
    user_id,
    type,
    amount,
    description,
    payment_method
  )
  values (
    business_a,
    expense_category_a,
    user_a,
    'expense',
    100.00,
    'Valid expense',
    'cash'
  )
  returning id into transaction_a;

  begin
    insert into public.transactions (
      business_id,
      user_id,
      type,
      amount,
      description,
      payment_method
    )
    values (
      business_a,
      user_a,
      'expense',
      0,
      'Invalid zero amount',
      'cash'
    );
    raise exception 'Zero amount was not rejected';
  exception
    when check_violation then
      null;
  end;

  reset role;
  perform set_config('request.jwt.claim.sub', user_b::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.businesses (owner_id, business_name, currency)
  values (user_b, 'Phase 2 Business B', 'NGN')
  returning id into business_b;

  select count(*) into visible_count
  from public.businesses
  where id = business_a;

  if visible_count <> 0 then
    raise exception 'User B can see Business A';
  end if;

  begin
    insert into public.transactions (
      business_id,
      user_id,
      type,
      amount,
      description,
      payment_method
    )
    values (
      business_a,
      user_b,
      'expense',
      25.00,
      'Cross-business transaction should fail',
      'cash'
    );
    raise exception 'User B inserted into Business A';
  exception
    when insufficient_privilege or check_violation or foreign_key_violation then
      null;
  end;

  reset role;
end $$;

rollback;
