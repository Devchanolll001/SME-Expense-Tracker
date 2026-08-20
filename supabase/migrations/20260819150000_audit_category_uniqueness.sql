-- Audit stabilization: prevent duplicate category names within a business and type.
-- The expression matches the application normalization rule (trim and collapse whitespace).

do $$
begin
  if exists (
    select 1
    from public.categories
    group by
      business_id,
      type,
      lower(btrim(regexp_replace(name, '\\s+', ' ', 'g')))
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce category uniqueness: duplicate normalized category names exist within a business and type. Resolve duplicates before rerunning this migration.';
  end if;
end $$;

create unique index if not exists categories_business_type_normalized_name_unique
  on public.categories (
    business_id,
    type,
    lower(btrim(regexp_replace(name, '\\s+', ' ', 'g')))
  );
