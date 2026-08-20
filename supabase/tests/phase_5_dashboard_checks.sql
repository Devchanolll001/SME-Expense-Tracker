-- SME Expense Tracker - Phase 5 dashboard verification helper.
-- Run against a disposable Supabase branch/local database after migrations.
-- The final rollback leaves no test data behind.

begin;

do $$
declare
  user_a uuid := '00000000-0000-4000-8000-000000000051';
  user_b uuid := '00000000-0000-4000-8000-000000000052';
  business_a uuid;
  business_b uuid;
  sales_category_a uuid;
  rent_category_a uuid;
  income_total numeric;
  expense_total numeric;
  transaction_count bigint;
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
      'phase5-user-a@example.test',
      '',
      now(),
      now(),
      now(),
      '{"first_name":"Phase","last_name":"Five A"}'::jsonb
    ),
    (
      user_b,
      'authenticated',
      'authenticated',
      'phase5-user-b@example.test',
      '',
      now(),
      now(),
      now(),
      '{"first_name":"Phase","last_name":"Five B"}'::jsonb
    )
  on conflict (id) do nothing;

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.businesses (owner_id, business_name, currency)
  values (user_a, 'Phase 5 Business A', 'NGN')
  returning id into business_a;

  select
    dashboard_summary.income_total,
    dashboard_summary.expense_total,
    dashboard_summary.transaction_count
  into income_total, expense_total, transaction_count
  from public.sme_dashboard_summary('2026-01-01', '2026-12-31') as dashboard_summary;

  if income_total <> 0 or expense_total <> 0 or transaction_count <> 0 then
    raise exception 'Empty dashboard summary is incorrect: income %, expense %, count %',
      income_total,
      expense_total,
      transaction_count;
  end if;

  select id into sales_category_a
  from public.categories
  where business_id = business_a
    and type = 'income'
    and name = 'Sales'
  limit 1;

  select id into rent_category_a
  from public.categories
  where business_id = business_a
    and type = 'expense'
    and name = 'Rent'
  limit 1;

  insert into public.transactions (
    business_id,
    category_id,
    user_id,
    type,
    amount,
    description,
    transaction_date,
    payment_method
  )
  values
    (
      business_a,
      sales_category_a,
      user_a,
      'income',
      100000.00,
      'Client payment',
      '2026-08-10',
      'bank_transfer'
    ),
    (
      business_a,
      rent_category_a,
      user_a,
      'expense',
      30000.00,
      'Office rent',
      '2026-08-11',
      'bank_transfer'
    );

  select
    dashboard_summary.income_total,
    dashboard_summary.expense_total,
    dashboard_summary.transaction_count
  into income_total, expense_total, transaction_count
  from public.sme_dashboard_summary('2026-08-01', '2026-08-31') as dashboard_summary;

  if income_total <> 100000.00 or expense_total <> 30000.00 or transaction_count <> 2 then
    raise exception 'Dashboard summary is incorrect: income %, expense %, count %',
      income_total,
      expense_total,
      transaction_count;
  end if;

  select count(*) into visible_count
  from public.sme_dashboard_monthly_summary('2026-01-01', '2026-12-31');

  if visible_count <> 12 then
    raise exception 'Expected 12 monthly summary rows, found %', visible_count;
  end if;

  select count(*) into visible_count
  from public.sme_dashboard_expense_breakdown('2026-08-01', '2026-08-31', 5)
  where category_name = 'Rent'
    and expense_total = 30000.00
    and percentage = 100.0;

  if visible_count <> 1 then
    raise exception 'Expense breakdown did not include the expected Rent row';
  end if;

  reset role;
  perform set_config('request.jwt.claim.sub', user_b::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.businesses (owner_id, business_name, currency)
  values (user_b, 'Phase 5 Business B', 'NGN')
  returning id into business_b;

  select
    dashboard_summary.income_total,
    dashboard_summary.expense_total,
    dashboard_summary.transaction_count
  into income_total, expense_total, transaction_count
  from public.sme_dashboard_summary('2026-08-01', '2026-08-31') as dashboard_summary;

  if income_total <> 0 or expense_total <> 0 or transaction_count <> 0 then
    raise exception 'User B can see User A dashboard data: income %, expense %, count %',
      income_total,
      expense_total,
      transaction_count;
  end if;

  select count(*) into visible_count
  from public.transactions
  where business_id = business_a;

  if visible_count <> 0 then
    raise exception 'User B can see User A transactions';
  end if;

  reset role;
end $$;

rollback;
