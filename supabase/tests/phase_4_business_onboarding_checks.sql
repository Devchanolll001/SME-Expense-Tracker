-- SME Expense Tracker - Phase 4 onboarding verification helper.
-- Run against a disposable Supabase branch/local database after migrations.
-- The final rollback leaves no test data behind.

begin;

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'businesses'
  and indexname = 'businesses_owner_id_unique';

do $$
declare
  user_a uuid := '00000000-0000-4000-8000-000000000041';
  user_b uuid := '00000000-0000-4000-8000-000000000042';
  business_a uuid;
  seeded_category_count integer;
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
      'phase4-user-a@example.test',
      '',
      now(),
      now(),
      now(),
      '{"first_name":"Phase","last_name":"Four A"}'::jsonb
    ),
    (
      user_b,
      'authenticated',
      'authenticated',
      'phase4-user-b@example.test',
      '',
      now(),
      now(),
      now(),
      '{"first_name":"Phase","last_name":"Four B"}'::jsonb
    )
  on conflict (id) do nothing;

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.businesses (
    owner_id,
    business_name,
    business_type,
    email,
    phone,
    address,
    currency
  )
  values (
    user_a,
    'Phase 4 Business A',
    'Retail',
    'phase4-business-a@example.test',
    '+2348012345678',
    '1 Market Road',
    'NGN'
  )
  returning id into business_a;

  select count(*)
  into seeded_category_count
  from public.categories
  where business_id = business_a
    and (
      (type = 'expense' and name in (
        'Rent',
        'Utilities',
        'Transport',
        'Salaries',
        'Marketing',
        'Supplies',
        'Equipment',
        'Internet',
        'Maintenance',
        'Other'
      ))
      or
      (type = 'income' and name in (
        'Sales',
        'Services',
        'Consulting',
        'Investment',
        'Other'
      ))
    );

  if seeded_category_count <> 15 then
    raise exception 'Expected 15 default categories, found %', seeded_category_count;
  end if;

  begin
    insert into public.businesses (owner_id, business_name, currency)
    values (user_a, 'Duplicate Phase 4 Business A', 'NGN');
    raise exception 'Duplicate business insert was not rejected';
  exception
    when unique_violation then
      null;
  end;

  begin
    insert into public.businesses (owner_id, business_name, currency)
    values (user_b, 'Cross-owner Business Attempt', 'NGN');
    raise exception 'Cross-owner business insert was not rejected by RLS';
  exception
    when insufficient_privilege or check_violation then
      null;
  end;

  reset role;
end $$;

rollback;
