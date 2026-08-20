-- SME Expense Tracker - Phase 4 business onboarding.
-- Enforces the MVP rule that one authenticated owner has one business.

do $$
declare
  duplicate_owner_id uuid;
begin
  if to_regclass('public.businesses') is null then
    raise exception 'Cannot enforce business onboarding ownership: public.businesses does not exist. Apply the Phase 2 migration first.';
  end if;

  select businesses.owner_id
  into duplicate_owner_id
  from public.businesses as businesses
  group by businesses.owner_id
  having count(*) > 1
  limit 1;

  if duplicate_owner_id is not null then
    raise exception 'Cannot enforce one business per owner: owner_id % already has multiple businesses. Resolve duplicate business records manually before rerunning this migration.',
      duplicate_owner_id;
  end if;
end $$;

do $$
declare
  has_owner_unique_index boolean;
begin
  select exists (
    select 1
    from pg_index as index_info
    join pg_class as table_info
      on table_info.oid = index_info.indrelid
    join pg_namespace as namespace_info
      on namespace_info.oid = table_info.relnamespace
    where namespace_info.nspname = 'public'
      and table_info.relname = 'businesses'
      and index_info.indisunique
      and index_info.indpred is null
      and (
        select array_agg(attribute.attname order by key_columns.ordinality)
        from unnest(index_info.indkey) with ordinality as key_columns(attnum, ordinality)
        join pg_attribute as attribute
          on attribute.attrelid = index_info.indrelid
         and attribute.attnum = key_columns.attnum
      ) = array['owner_id']::text[]
  )
  into has_owner_unique_index;

  if not has_owner_unique_index then
    if to_regclass('public.businesses_owner_id_unique') is not null then
      raise exception 'Cannot create unique index public.businesses_owner_id_unique because an object with that name already exists but is not the intended unique owner_id index.';
    end if;

    execute 'create unique index businesses_owner_id_unique on public.businesses (owner_id)';
  end if;
end $$;
