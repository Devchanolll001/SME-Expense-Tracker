-- SME Expense Tracker - Phase 8 reports and analytics read helpers.
-- These functions do not accept a client-selected business_id. They scope all
-- report reads to the authenticated user's owned business.

create or replace function public.sme_reports_summary(
  period_starts_on date default null,
  period_ends_on date default null
)
returns table (
  first_transaction_date date,
  last_transaction_date date,
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
  ),
  filtered_transactions as (
    select transactions.*
    from owned_business
    join public.transactions as transactions
      on transactions.business_id = owned_business.id
    where (period_starts_on is null or transactions.transaction_date >= period_starts_on)
      and (period_ends_on is null or transactions.transaction_date <= period_ends_on)
  )
  select
    min(filtered_transactions.transaction_date) as first_transaction_date,
    max(filtered_transactions.transaction_date) as last_transaction_date,
    coalesce(
      sum(filtered_transactions.amount) filter (where filtered_transactions.type = 'income'),
      0
    ) as income_total,
    coalesce(
      sum(filtered_transactions.amount) filter (where filtered_transactions.type = 'expense'),
      0
    ) as expense_total,
    count(filtered_transactions.id) as transaction_count
  from filtered_transactions;
$$;

create or replace function public.sme_reports_time_series(
  period_starts_on date default null,
  period_ends_on date default null,
  report_bucket text default 'month'
)
returns table (
  bucket_starts_on date,
  income_total numeric,
  expense_total numeric
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
  bounds as (
    select
      owned_business.id as business_id,
      coalesce(period_starts_on, min(transactions.transaction_date)) as starts_on,
      coalesce(period_ends_on, max(transactions.transaction_date)) as ends_on
    from owned_business
    left join public.transactions as transactions
      on transactions.business_id = owned_business.id
     and (period_starts_on is null or transactions.transaction_date >= period_starts_on)
     and (period_ends_on is null or transactions.transaction_date <= period_ends_on)
    group by owned_business.id
  ),
  normalized_bounds as (
    select
      bounds.business_id,
      bounds.starts_on,
      bounds.ends_on,
      case
        when report_bucket = 'month' then date_trunc('month', bounds.starts_on::timestamp)::date
        else bounds.starts_on
      end as series_starts_on,
      case
        when report_bucket = 'month' then date_trunc('month', bounds.ends_on::timestamp)::date
        else bounds.ends_on
      end as series_ends_on
    from bounds
    where report_bucket in ('day', 'month')
      and bounds.starts_on is not null
      and bounds.ends_on is not null
      and bounds.starts_on <= bounds.ends_on
  ),
  buckets as (
    select
      normalized_bounds.business_id,
      normalized_bounds.starts_on,
      normalized_bounds.ends_on,
      generate_series(
        normalized_bounds.series_starts_on::timestamp,
        normalized_bounds.series_ends_on::timestamp,
        case
          when report_bucket = 'day' then interval '1 day'
          else interval '1 month'
        end
      )::date as bucket_starts_on
    from normalized_bounds
  )
  select
    buckets.bucket_starts_on,
    coalesce(
      sum(transactions.amount) filter (where transactions.type = 'income'),
      0
    ) as income_total,
    coalesce(
      sum(transactions.amount) filter (where transactions.type = 'expense'),
      0
    ) as expense_total
  from buckets
  left join public.transactions as transactions
    on transactions.business_id = buckets.business_id
   and transactions.transaction_date >= buckets.starts_on
   and transactions.transaction_date <= buckets.ends_on
   and (
      (
        report_bucket = 'day'
        and transactions.transaction_date = buckets.bucket_starts_on
      )
      or
      (
        report_bucket = 'month'
        and transactions.transaction_date >= buckets.bucket_starts_on
        and transactions.transaction_date < (buckets.bucket_starts_on + interval '1 month')
      )
   )
  group by buckets.bucket_starts_on
  order by buckets.bucket_starts_on;
$$;

create or replace function public.sme_reports_category_breakdown(
  period_starts_on date default null,
  period_ends_on date default null,
  report_transaction_type text default 'expense'
)
returns table (
  category_name text,
  transaction_type text,
  transaction_total numeric,
  transaction_count bigint,
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
      transactions.type as transaction_type,
      sum(transactions.amount) as transaction_total,
      count(transactions.id) as transaction_count
    from owned_business
    join public.transactions as transactions
      on transactions.business_id = owned_business.id
    left join public.categories as categories
      on categories.id = transactions.category_id
     and categories.business_id = transactions.business_id
    where report_transaction_type in ('income', 'expense')
      and transactions.type = report_transaction_type
      and (period_starts_on is null or transactions.transaction_date >= period_starts_on)
      and (period_ends_on is null or transactions.transaction_date <= period_ends_on)
    group by coalesce(categories.name, 'Uncategorized'), transactions.type
  ),
  total_amount as (
    select sum(category_totals.transaction_total) as amount
    from category_totals
  )
  select
    category_totals.category_name,
    category_totals.transaction_type,
    category_totals.transaction_total,
    category_totals.transaction_count,
    round(
      category_totals.transaction_total * 100 / nullif(total_amount.amount, 0),
      1
    ) as percentage
  from category_totals
  cross join total_amount
  order by category_totals.transaction_total desc, category_totals.category_name;
$$;

create or replace function public.sme_reports_largest_expenses(
  period_starts_on date default null,
  period_ends_on date default null,
  max_transactions integer default 5
)
returns table (
  id uuid,
  description text,
  category_name text,
  transaction_date date,
  amount numeric
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
    transactions.id,
    transactions.description,
    coalesce(categories.name, 'Uncategorized') as category_name,
    transactions.transaction_date,
    transactions.amount
  from owned_business
  join public.transactions as transactions
    on transactions.business_id = owned_business.id
  left join public.categories as categories
    on categories.id = transactions.category_id
   and categories.business_id = transactions.business_id
  where transactions.type = 'expense'
    and (period_starts_on is null or transactions.transaction_date >= period_starts_on)
    and (period_ends_on is null or transactions.transaction_date <= period_ends_on)
  order by transactions.amount desc, transactions.transaction_date desc, transactions.created_at desc
  limit greatest(1, least(coalesce(max_transactions, 5), 10));
$$;

revoke all on function public.sme_reports_summary(date, date) from public;
grant execute on function public.sme_reports_summary(date, date) to authenticated;

revoke all on function public.sme_reports_time_series(date, date, text) from public;
grant execute on function public.sme_reports_time_series(date, date, text) to authenticated;

revoke all on function public.sme_reports_category_breakdown(date, date, text) from public;
grant execute on function public.sme_reports_category_breakdown(date, date, text) to authenticated;

revoke all on function public.sme_reports_largest_expenses(date, date, integer) from public;
grant execute on function public.sme_reports_largest_expenses(date, date, integer) to authenticated;
