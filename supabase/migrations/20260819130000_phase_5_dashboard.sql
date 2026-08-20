-- SME Expense Tracker - Phase 5 dashboard read helpers.
-- These functions do not accept a client-selected business_id. They scope all
-- financial reads to the authenticated user's owned business.

create or replace function public.sme_dashboard_summary(
  period_starts_on date,
  period_ends_on date
)
returns table (
  income_total numeric,
  expense_total numeric,
  transaction_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with owned_business as (
    select businesses.id
    from public.businesses as businesses
    where businesses.owner_id = auth.uid()
    limit 1
  )
  select
    coalesce(
      sum(transactions.amount) filter (where transactions.type = 'income'),
      0
    ) as income_total,
    coalesce(
      sum(transactions.amount) filter (where transactions.type = 'expense'),
      0
    ) as expense_total,
    count(transactions.id) as transaction_count
  from owned_business
  left join public.transactions as transactions
    on transactions.business_id = owned_business.id
   and transactions.transaction_date >= period_starts_on
   and transactions.transaction_date <= period_ends_on;
$$;

create or replace function public.sme_dashboard_monthly_summary(
  period_starts_on date,
  period_ends_on date
)
returns table (
  month_starts_on date,
  income_total numeric,
  expense_total numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with months as (
    select generate_series(
      date_trunc('month', period_starts_on::timestamp)::date,
      date_trunc('month', period_ends_on::timestamp)::date,
      interval '1 month'
    )::date as month_starts_on
  ),
  owned_business as (
    select businesses.id
    from public.businesses as businesses
    where businesses.owner_id = auth.uid()
    limit 1
  )
  select
    months.month_starts_on,
    coalesce(
      sum(transactions.amount) filter (where transactions.type = 'income'),
      0
    ) as income_total,
    coalesce(
      sum(transactions.amount) filter (where transactions.type = 'expense'),
      0
    ) as expense_total
  from months
  left join owned_business on true
  left join public.transactions as transactions
    on transactions.business_id = owned_business.id
   and transactions.transaction_date >= months.month_starts_on
   and transactions.transaction_date < (months.month_starts_on + interval '1 month')
   and transactions.transaction_date >= period_starts_on
   and transactions.transaction_date <= period_ends_on
  group by months.month_starts_on
  order by months.month_starts_on;
$$;

create or replace function public.sme_dashboard_expense_breakdown(
  period_starts_on date,
  period_ends_on date,
  max_categories integer default 5
)
returns table (
  category_name text,
  expense_total numeric,
  percentage numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with owned_business as (
    select businesses.id
    from public.businesses as businesses
    where businesses.owner_id = auth.uid()
    limit 1
  ),
  category_totals as (
    select
      coalesce(categories.name, 'Uncategorized') as category_name,
      sum(transactions.amount) as expense_total
    from owned_business
    join public.transactions as transactions
      on transactions.business_id = owned_business.id
    left join public.categories as categories
      on categories.id = transactions.category_id
     and categories.business_id = transactions.business_id
    where transactions.type = 'expense'
      and transactions.transaction_date >= period_starts_on
      and transactions.transaction_date <= period_ends_on
    group by coalesce(categories.name, 'Uncategorized')
  ),
  total_expense as (
    select sum(category_totals.expense_total) as amount
    from category_totals
  )
  select
    category_totals.category_name,
    category_totals.expense_total,
    round(
      category_totals.expense_total * 100 / nullif(total_expense.amount, 0),
      1
    ) as percentage
  from category_totals
  cross join total_expense
  order by category_totals.expense_total desc, category_totals.category_name
  limit greatest(1, least(coalesce(max_categories, 5), 10));
$$;

revoke all on function public.sme_dashboard_summary(date, date) from public;
grant execute on function public.sme_dashboard_summary(date, date) to authenticated;

revoke all on function public.sme_dashboard_monthly_summary(date, date) from public;
grant execute on function public.sme_dashboard_monthly_summary(date, date) to authenticated;

revoke all on function public.sme_dashboard_expense_breakdown(date, date, integer) from public;
grant execute on function public.sme_dashboard_expense_breakdown(date, date, integer) to authenticated;
