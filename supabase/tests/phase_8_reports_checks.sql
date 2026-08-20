-- SME Expense Tracker - Phase 8 reports verification helper.
-- Run against a disposable Supabase branch/local database after migrations.
-- The final rollback leaves no test data behind.

begin;

do $$
declare
  user_a uuid := '00000000-0000-4000-8000-000000000081';
  user_b uuid := '00000000-0000-4000-8000-000000000082';
  business_a uuid;
  business_b uuid;
  sales_category_a uuid;
  services_category_a uuid;
  rent_category_a uuid;
  transport_category_a uuid;
  supplies_category_a uuid;
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
      'phase8-user-a@example.test',
      '',
      now(),
      now(),
      now(),
      '{"first_name":"Phase","last_name":"Eight A"}'::jsonb
    ),
    (
      user_b,
      'authenticated',
      'authenticated',
      'phase8-user-b@example.test',
      '',
      now(),
      now(),
      now(),
      '{"first_name":"Phase","last_name":"Eight B"}'::jsonb
    )
  on conflict (id) do nothing;

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.businesses (owner_id, business_name, currency)
  values (user_a, 'Phase 8 Business A', 'NGN')
  returning id into business_a;

  select id into sales_category_a
  from public.categories
  where business_id = business_a
    and type = 'income'
    and name = 'Sales'
  limit 1;

  select id into services_category_a
  from public.categories
  where business_id = business_a
    and type = 'income'
    and name = 'Services'
  limit 1;

  select id into rent_category_a
  from public.categories
  where business_id = business_a
    and type = 'expense'
    and name = 'Rent'
  limit 1;

  select id into transport_category_a
  from public.categories
  where business_id = business_a
    and type = 'expense'
    and name = 'Transport'
  limit 1;

  select id into supplies_category_a
  from public.categories
  where business_id = business_a
    and type = 'expense'
    and name = 'Supplies'
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
      1000000.00,
      'Opening month sales',
      '2026-08-01',
      'bank_transfer'
    ),
    (
      business_a,
      services_category_a,
      user_a,
      'income',
      500000.00,
      'Month-end services',
      '2026-08-31',
      'bank_transfer'
    ),
    (
      business_a,
      rent_category_a,
      user_a,
      'expense',
      200000.00,
      'Office rent',
      '2026-08-15',
      'bank_transfer'
    ),
    (
      business_a,
      transport_category_a,
      user_a,
      'expense',
      100000.00,
      'Delivery transport',
      '2026-08-31',
      'cash'
    ),
    (
      business_a,
      supplies_category_a,
      user_a,
      'expense',
      50000.00,
      'Shop supplies',
      '2026-08-01',
      'card'
    ),
    (
      business_a,
      sales_category_a,
      user_a,
      'income',
      999.00,
      'Outside range income',
      '2026-07-31',
      'bank_transfer'
    ),
    (
      business_a,
      rent_category_a,
      user_a,
      'expense',
      999.00,
      'Outside range expense',
      '2026-09-01',
      'bank_transfer'
    );

  select
    reports_summary.income_total,
    reports_summary.expense_total,
    reports_summary.transaction_count
  into income_total, expense_total, transaction_count
  from public.sme_reports_summary('2026-08-01', '2026-08-31') as reports_summary;

  if income_total <> 1500000.00 or expense_total <> 350000.00 or transaction_count <> 5 then
    raise exception 'Reports summary is incorrect: income %, expense %, count %',
      income_total,
      expense_total,
      transaction_count;
  end if;

  select count(*) into visible_count
  from public.sme_reports_time_series('2026-08-01', '2026-08-31', 'day');

  if visible_count <> 31 then
    raise exception 'Expected 31 daily report rows, found %', visible_count;
  end if;

  select count(*) into visible_count
  from public.sme_reports_time_series('2026-08-01', '2026-08-31', 'day')
  where bucket_starts_on = '2026-08-01'
    and income_total = 1000000.00
    and expense_total = 50000.00;

  if visible_count <> 1 then
    raise exception 'Daily report did not include first-day boundary transactions';
  end if;

  select count(*) into visible_count
  from public.sme_reports_time_series('2026-08-01', '2026-08-31', 'day')
  where bucket_starts_on = '2026-08-31'
    and income_total = 500000.00
    and expense_total = 100000.00;

  if visible_count <> 1 then
    raise exception 'Daily report did not include last-day boundary transactions';
  end if;

  select count(*) into visible_count
  from public.sme_reports_category_breakdown('2026-08-01', '2026-08-31', 'income')
  where category_name = 'Sales'
    and transaction_total = 1000000.00
    and percentage = 66.7;

  if visible_count <> 1 then
    raise exception 'Income category breakdown did not include the expected Sales row';
  end if;

  select count(*) into visible_count
  from public.sme_reports_category_breakdown('2026-08-01', '2026-08-31', 'expense')
  where category_name = 'Rent'
    and transaction_total = 200000.00
    and percentage = 57.1;

  if visible_count <> 1 then
    raise exception 'Expense category breakdown did not include the expected Rent row';
  end if;

  delete from public.categories
  where business_id = business_a
    and id = supplies_category_a;

  select count(*) into visible_count
  from public.sme_reports_category_breakdown('2026-08-01', '2026-08-31', 'expense')
  where category_name = 'Uncategorized'
    and transaction_total = 50000.00;

  if visible_count <> 1 then
    raise exception 'Deleted category transactions were not reported as Uncategorized';
  end if;

  select count(*) into visible_count
  from public.sme_reports_largest_expenses('2026-08-01', '2026-08-31', 5)
  where description = 'Office rent'
    and category_name = 'Rent'
    and amount = 200000.00;

  if visible_count <> 1 then
    raise exception 'Largest expenses did not include the expected top expense';
  end if;

  reset role;
  perform set_config('request.jwt.claim.sub', user_b::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.businesses (owner_id, business_name, currency)
  values (user_b, 'Phase 8 Business B', 'NGN')
  returning id into business_b;

  select
    reports_summary.income_total,
    reports_summary.expense_total,
    reports_summary.transaction_count
  into income_total, expense_total, transaction_count
  from public.sme_reports_summary('2026-08-01', '2026-08-31') as reports_summary;

  if income_total <> 0 or expense_total <> 0 or transaction_count <> 0 then
    raise exception 'User B can see User A report data: income %, expense %, count %',
      income_total,
      expense_total,
      transaction_count;
  end if;

  select count(*) into visible_count
  from public.sme_reports_category_breakdown('2026-08-01', '2026-08-31', 'expense');

  if visible_count <> 0 then
    raise exception 'User B can see User A report breakdown rows';
  end if;

  reset role;
end $$;

rollback;
