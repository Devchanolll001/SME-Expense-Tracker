-- SME Expense Tracker - Phase 2 database, RLS, and storage foundation.
-- This migration is additive and avoids dropping or deleting existing data.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_id_auth_users_fk
    foreign key (id) references auth.users (id) on delete cascade
);

create table if not exists public.businesses (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null,
  business_name text not null,
  business_type text,
  email text,
  phone text,
  address text,
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_owner_id_auth_users_fk
    foreign key (owner_id) references auth.users (id) on delete restrict,
  constraint businesses_business_name_required
    check (business_name is not null and btrim(business_name) <> ''),
  constraint businesses_currency_required
    check (currency is not null and btrim(currency) <> '')
);

create table if not exists public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null,
  name text not null,
  type text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_business_id_businesses_fk
    foreign key (business_id) references public.businesses (id) on delete cascade,
  constraint categories_name_required
    check (name is not null and btrim(name) <> ''),
  constraint categories_type_check
    check (type in ('income', 'expense', 'both'))
);

create table if not exists public.transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null,
  category_id uuid,
  user_id uuid not null default auth.uid(),
  type text not null,
  amount numeric(14, 2) not null,
  description text not null,
  transaction_date date not null default current_date,
  payment_method text not null default 'cash',
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_business_id_businesses_fk
    foreign key (business_id) references public.businesses (id) on delete restrict,
  constraint transactions_category_id_categories_fk
    foreign key (category_id) references public.categories (id) on delete set null,
  constraint transactions_user_id_auth_users_fk
    foreign key (user_id) references auth.users (id) on delete restrict,
  constraint transactions_type_check
    check (type in ('income', 'expense')),
  constraint transactions_amount_positive
    check (amount > 0),
  constraint transactions_payment_method_check
    check (
      payment_method in (
        'cash',
        'bank_transfer',
        'card',
        'pos',
        'mobile_money',
        'other'
      )
    )
);

do $$
declare
  required_column record;
  has_rows boolean;
  existing_type text;
  pk_columns text[];
begin
  for required_column in
    select *
    from (
      values
        ('public.profiles'::regclass, 'profiles', 'id', 'uuid', 'profiles.id must contain auth.users.id values before the table can use id as its primary key.'),
        ('public.businesses'::regclass, 'businesses', 'id', 'uuid', 'businesses.id must contain UUID values before the table can use id as its primary key.'),
        ('public.businesses'::regclass, 'businesses', 'owner_id', 'uuid', 'businesses.owner_id must be backfilled with the owning auth.users.id for every existing business.'),
        ('public.businesses'::regclass, 'businesses', 'business_name', 'text', 'businesses.business_name must be populated for every existing business.'),
        ('public.businesses'::regclass, 'businesses', 'currency', 'text', 'businesses.currency must be populated, for example NGN, for every existing business.'),
        ('public.categories'::regclass, 'categories', 'id', 'uuid', 'categories.id must contain UUID values before the table can use id as its primary key.'),
        ('public.categories'::regclass, 'categories', 'business_id', 'uuid', 'categories.business_id must be backfilled to the owning businesses.id value for every existing category.'),
        ('public.categories'::regclass, 'categories', 'name', 'text', 'categories.name must be populated for every existing category.'),
        ('public.categories'::regclass, 'categories', 'type', 'text', 'categories.type must be income, expense, or both for every existing category.'),
        ('public.transactions'::regclass, 'transactions', 'id', 'uuid', 'transactions.id must contain UUID values before the table can use id as its primary key.'),
        ('public.transactions'::regclass, 'transactions', 'business_id', 'uuid', 'transactions.business_id must be backfilled to the owning businesses.id value for every existing transaction.'),
        ('public.transactions'::regclass, 'transactions', 'user_id', 'uuid', 'transactions.user_id must be backfilled with the auth.users.id that created every existing transaction.'),
        ('public.transactions'::regclass, 'transactions', 'type', 'text', 'transactions.type must be income or expense for every existing transaction.'),
        ('public.transactions'::regclass, 'transactions', 'amount', 'numeric(14,2)', 'transactions.amount must be repaired with the recorded positive financial amount for every existing transaction.'),
        ('public.transactions'::regclass, 'transactions', 'description', 'text', 'transactions.description must be populated from the original transaction record for every existing transaction.'),
        ('public.transactions'::regclass, 'transactions', 'transaction_date', 'date', 'transactions.transaction_date must be repaired with the original transaction date for every existing transaction.'),
        ('public.transactions'::regclass, 'transactions', 'payment_method', 'text', 'transactions.payment_method must be repaired with the actual payment method for every existing transaction.')
    ) as columns_to_check(table_regclass, table_name, column_name, expected_type, repair_message)
  loop
    execute format('select exists (select 1 from %s)', required_column.table_regclass)
      into has_rows;

    if not exists (
      select 1
      from pg_attribute
      where attrelid = required_column.table_regclass
        and attname = required_column.column_name
        and not attisdropped
    ) then
      if has_rows then
        raise exception 'Cannot safely migrate existing %.%: required column %.% is missing. %',
          'public',
          required_column.table_name,
          required_column.table_name,
          required_column.column_name,
          required_column.repair_message;
      end if;
    else
      select format_type(atttypid, atttypmod)
      into existing_type
      from pg_attribute
      where attrelid = required_column.table_regclass
        and attname = required_column.column_name
        and not attisdropped;

      if existing_type is distinct from required_column.expected_type then
        raise exception 'Cannot safely migrate public.%: column % has type %, expected %. Repair the column type manually before rerunning this migration.',
          required_column.table_name,
          required_column.column_name,
          existing_type,
          required_column.expected_type;
      end if;
    end if;
  end loop;

  for required_column in
    select *
    from (
      values
        ('public.profiles'::regclass, 'profiles'),
        ('public.businesses'::regclass, 'businesses'),
        ('public.categories'::regclass, 'categories'),
        ('public.transactions'::regclass, 'transactions')
    ) as tables_to_check(table_regclass, table_name)
  loop
    select array_agg(attribute.attname order by key_columns.ordinality)
    into pk_columns
    from pg_constraint as constraint_info
    cross join unnest(constraint_info.conkey) with ordinality as key_columns(attnum, ordinality)
    join pg_attribute as attribute
      on attribute.attrelid = constraint_info.conrelid
     and attribute.attnum = key_columns.attnum
    where constraint_info.conrelid = required_column.table_regclass
      and constraint_info.contype = 'p';

    if pk_columns is not null and pk_columns <> array['id']::text[] then
      raise exception 'Cannot safely migrate public.%: existing primary key is %, expected primary key is exactly (id). Resolve the primary key conflict manually before rerunning this migration.',
        required_column.table_name,
        pk_columns;
    end if;
  end loop;
end $$;

alter table public.profiles
  add column if not exists id uuid,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.businesses
  add column if not exists id uuid,
  add column if not exists owner_id uuid,
  add column if not exists business_name text,
  add column if not exists business_type text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists currency text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.categories
  add column if not exists id uuid,
  add column if not exists business_id uuid,
  add column if not exists name text,
  add column if not exists type text,
  add column if not exists description text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.transactions
  add column if not exists id uuid,
  add column if not exists business_id uuid,
  add column if not exists category_id uuid,
  add column if not exists user_id uuid,
  add column if not exists type text,
  add column if not exists amount numeric(14, 2),
  add column if not exists description text,
  add column if not exists transaction_date date,
  add column if not exists payment_method text,
  add column if not exists reference text,
  add column if not exists notes text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

do $$
declare
  default_rule record;
  current_default text;
  normalized_default text;
begin
  for default_rule in
    select *
    from (
      values
        ('public.businesses'::regclass, 'businesses', 'id', 'extensions.gen_random_uuid()', array['extensions.gen_random_uuid()', 'gen_random_uuid()']::text[]),
        ('public.categories'::regclass, 'categories', 'id', 'extensions.gen_random_uuid()', array['extensions.gen_random_uuid()', 'gen_random_uuid()']::text[]),
        ('public.transactions'::regclass, 'transactions', 'id', 'extensions.gen_random_uuid()', array['extensions.gen_random_uuid()', 'gen_random_uuid()']::text[]),
        ('public.businesses'::regclass, 'businesses', 'currency', '''NGN''', array['''NGN''::text', '''NGN''']::text[]),
        ('public.transactions'::regclass, 'transactions', 'user_id', 'auth.uid()', array['auth.uid()']::text[]),
        ('public.transactions'::regclass, 'transactions', 'transaction_date', 'current_date', array['CURRENT_DATE', 'current_date']::text[]),
        ('public.transactions'::regclass, 'transactions', 'payment_method', '''cash''', array['''cash''::text', '''cash''']::text[]),
        ('public.profiles'::regclass, 'profiles', 'created_at', 'now()', array['now()']::text[]),
        ('public.profiles'::regclass, 'profiles', 'updated_at', 'now()', array['now()']::text[]),
        ('public.businesses'::regclass, 'businesses', 'created_at', 'now()', array['now()']::text[]),
        ('public.businesses'::regclass, 'businesses', 'updated_at', 'now()', array['now()']::text[]),
        ('public.categories'::regclass, 'categories', 'created_at', 'now()', array['now()']::text[]),
        ('public.categories'::regclass, 'categories', 'updated_at', 'now()', array['now()']::text[]),
        ('public.transactions'::regclass, 'transactions', 'created_at', 'now()', array['now()']::text[]),
        ('public.transactions'::regclass, 'transactions', 'updated_at', 'now()', array['now()']::text[])
    ) as defaults_to_check(table_regclass, table_name, column_name, default_sql, accepted_defaults)
  loop
    select pg_get_expr(default_value.adbin, default_value.adrelid)
    into current_default
    from pg_attribute as attribute
    left join pg_attrdef as default_value
      on default_value.adrelid = attribute.attrelid
     and default_value.adnum = attribute.attnum
    where attribute.attrelid = default_rule.table_regclass
      and attribute.attname = default_rule.column_name
      and not attribute.attisdropped;

    if current_default is null then
      execute format(
        'alter table %s alter column %I set default %s',
        default_rule.table_regclass,
        default_rule.column_name,
        default_rule.default_sql
      );
    else
      normalized_default := regexp_replace(current_default, '\s+', '', 'g');

      if normalized_default <> all(default_rule.accepted_defaults) then
        raise exception 'Cannot safely migrate public.%: column % already has default %, expected one of %. Inspect the intentional default manually before rerunning this migration.',
          default_rule.table_name,
          default_rule.column_name,
          current_default,
          default_rule.accepted_defaults;
      end if;
    end if;
  end loop;
end $$;

do $$
declare
  required_column record;
  has_nulls boolean;
begin
  for required_column in
    select *
    from (
      values
        ('public.profiles'::regclass, 'profiles', 'id', 'profiles.id must be filled with auth.users.id values.'),
        ('public.businesses'::regclass, 'businesses', 'id', 'businesses.id must be filled with UUID values.'),
        ('public.businesses'::regclass, 'businesses', 'owner_id', 'businesses.owner_id must be filled with the owning auth.users.id.'),
        ('public.businesses'::regclass, 'businesses', 'business_name', 'businesses.business_name must be filled.'),
        ('public.businesses'::regclass, 'businesses', 'currency', 'businesses.currency must be filled, for example NGN.'),
        ('public.categories'::regclass, 'categories', 'id', 'categories.id must be filled with UUID values.'),
        ('public.categories'::regclass, 'categories', 'business_id', 'categories.business_id must be filled with businesses.id values.'),
        ('public.categories'::regclass, 'categories', 'name', 'categories.name must be filled.'),
        ('public.categories'::regclass, 'categories', 'type', 'categories.type must be income, expense, or both.'),
        ('public.transactions'::regclass, 'transactions', 'id', 'transactions.id must be filled with UUID values.'),
        ('public.transactions'::regclass, 'transactions', 'business_id', 'transactions.business_id must be filled with businesses.id values.'),
        ('public.transactions'::regclass, 'transactions', 'user_id', 'transactions.user_id must be filled with auth.users.id values.'),
        ('public.transactions'::regclass, 'transactions', 'type', 'transactions.type must be income or expense.'),
        ('public.transactions'::regclass, 'transactions', 'amount', 'transactions.amount must be filled with the original positive financial amount.'),
        ('public.transactions'::regclass, 'transactions', 'description', 'transactions.description must be filled from the original transaction record.'),
        ('public.transactions'::regclass, 'transactions', 'transaction_date', 'transactions.transaction_date must be filled with the original transaction date.'),
        ('public.transactions'::regclass, 'transactions', 'payment_method', 'transactions.payment_method must be filled with the actual payment method.')
    ) as columns_to_check(table_regclass, table_name, column_name, repair_message)
  loop
    execute format(
      'select exists (select 1 from %s where %I is null)',
      required_column.table_regclass,
      required_column.column_name
    )
    into has_nulls;

    if has_nulls then
      raise exception 'Cannot safely set public.%.% to NOT NULL because existing rows contain NULL. %',
        required_column.table_name,
        required_column.column_name,
        required_column.repair_message;
    end if;

    execute format(
      'alter table %s alter column %I set not null',
      required_column.table_regclass,
      required_column.column_name
    );
  end loop;
end $$;

do $$
declare
  pk_rule record;
  pk_columns text[];
  has_duplicate_ids boolean;
begin
  for pk_rule in
    select *
    from (
      values
        ('public.profiles'::regclass, 'profiles'),
        ('public.businesses'::regclass, 'businesses'),
        ('public.categories'::regclass, 'categories'),
        ('public.transactions'::regclass, 'transactions')
    ) as primary_keys_to_check(table_regclass, table_name)
  loop
    select array_agg(attribute.attname order by key_columns.ordinality)
    into pk_columns
    from pg_constraint as constraint_info
    cross join unnest(constraint_info.conkey) with ordinality as key_columns(attnum, ordinality)
    join pg_attribute as attribute
      on attribute.attrelid = constraint_info.conrelid
     and attribute.attnum = key_columns.attnum
    where constraint_info.conrelid = pk_rule.table_regclass
      and constraint_info.contype = 'p';

    if pk_columns = array['id']::text[] then
      continue;
    end if;

    if pk_columns is not null then
      raise exception 'Cannot safely migrate public.%: existing primary key is %, expected primary key is exactly (id). Resolve the primary key conflict manually before rerunning this migration.',
        pk_rule.table_name,
        pk_columns;
    end if;

    execute format(
      'select exists (
        select 1
        from %s
        group by id
        having count(*) > 1
        limit 1
      )',
      pk_rule.table_regclass
    )
    into has_duplicate_ids;

    if has_duplicate_ids then
      raise exception 'Cannot safely add primary key public.%(id): duplicate id values exist. De-duplicate ids manually before rerunning this migration.',
        pk_rule.table_name;
    end if;

    execute format(
      'alter table %s add primary key (id)',
      pk_rule.table_regclass
    );
  end loop;
end $$;

do $$
declare
  fk_rule record;
  local_attnums smallint[];
  referenced_attnums smallint[];
  equivalent_fk name;
  conflicting_fk record;
  has_orphans boolean;
begin
  for fk_rule in
    select *
    from (
      values
        ('public.profiles'::regclass, 'profiles', 'profiles_id_auth_users_fk', 'id', 'auth.users'::regclass, 'id', 'c', 'cascade', 'profiles.id values must all exist in auth.users.id. Repair or remove orphan profiles before rerunning this migration.'),
        ('public.businesses'::regclass, 'businesses', 'businesses_owner_id_auth_users_fk', 'owner_id', 'auth.users'::regclass, 'id', 'r', 'restrict', 'businesses.owner_id values must all exist in auth.users.id. Repair orphan businesses before rerunning this migration.'),
        ('public.categories'::regclass, 'categories', 'categories_business_id_businesses_fk', 'business_id', 'public.businesses'::regclass, 'id', 'c', 'cascade', 'categories.business_id values must all exist in businesses.id. Repair orphan categories before rerunning this migration.'),
        ('public.transactions'::regclass, 'transactions', 'transactions_business_id_businesses_fk', 'business_id', 'public.businesses'::regclass, 'id', 'r', 'restrict', 'transactions.business_id values must all exist in businesses.id. Repair orphan transactions before rerunning this migration.'),
        ('public.transactions'::regclass, 'transactions', 'transactions_category_id_categories_fk', 'category_id', 'public.categories'::regclass, 'id', 'n', 'set null', 'transactions.category_id values must be null or exist in categories.id. Repair orphan transaction categories before rerunning this migration.'),
        ('public.transactions'::regclass, 'transactions', 'transactions_user_id_auth_users_fk', 'user_id', 'auth.users'::regclass, 'id', 'r', 'restrict', 'transactions.user_id values must all exist in auth.users.id. Repair orphan transaction users before rerunning this migration.')
    ) as foreign_keys_to_check(
      local_table,
      local_table_name,
      constraint_name,
      local_column,
      referenced_table,
      referenced_column,
      delete_action_code,
      delete_action_sql,
      repair_message
    )
  loop
    select array[attribute.attnum]::smallint[]
    into local_attnums
    from pg_attribute as attribute
    where attribute.attrelid = fk_rule.local_table
      and attribute.attname = fk_rule.local_column
      and not attribute.attisdropped;

    select array[attribute.attnum]::smallint[]
    into referenced_attnums
    from pg_attribute as attribute
    where attribute.attrelid = fk_rule.referenced_table
      and attribute.attname = fk_rule.referenced_column
      and not attribute.attisdropped;

    select constraint_info.conname, pg_get_constraintdef(constraint_info.oid) as definition
    into conflicting_fk
    from pg_constraint as constraint_info
    where constraint_info.conrelid = fk_rule.local_table
      and constraint_info.contype = 'f'
      and constraint_info.conkey = local_attnums
      and not (
        constraint_info.confrelid = fk_rule.referenced_table
        and constraint_info.confkey = referenced_attnums
        and constraint_info.confdeltype = fk_rule.delete_action_code::"char"
        and constraint_info.confupdtype = 'a'
      )
    limit 1;

    if found then
      raise exception 'Cannot safely migrate public.%: existing foreign key % conflicts with intended %. Existing definition: %. Resolve the FK conflict manually before rerunning this migration.',
        fk_rule.local_table_name,
        conflicting_fk.conname,
        fk_rule.constraint_name,
        conflicting_fk.definition;
    end if;

    execute format(
      'select exists (
        select 1
        from %s as child
        where child.%I is not null
          and not exists (
            select 1
            from %s as parent
            where parent.%I = child.%I
          )
      )',
      fk_rule.local_table,
      fk_rule.local_column,
      fk_rule.referenced_table,
      fk_rule.referenced_column,
      fk_rule.local_column
    )
    into has_orphans;

    if has_orphans then
      raise exception 'Cannot safely enforce foreign key %. %',
        fk_rule.constraint_name,
        fk_rule.repair_message;
    end if;

    select constraint_info.conname
    into equivalent_fk
    from pg_constraint as constraint_info
    where constraint_info.conrelid = fk_rule.local_table
      and constraint_info.contype = 'f'
      and constraint_info.conkey = local_attnums
      and constraint_info.confrelid = fk_rule.referenced_table
      and constraint_info.confkey = referenced_attnums
      and constraint_info.confdeltype = fk_rule.delete_action_code::"char"
      and constraint_info.confupdtype = 'a'
    order by (constraint_info.conname = fk_rule.constraint_name) desc
    limit 1;

    if equivalent_fk is null then
      execute format(
        'alter table %s add constraint %I foreign key (%I) references %s (%I) on delete %s',
        fk_rule.local_table,
        fk_rule.constraint_name,
        fk_rule.local_column,
        fk_rule.referenced_table,
        fk_rule.referenced_column,
        fk_rule.delete_action_sql
      );
    elsif exists (
      select 1
      from pg_constraint
      where conrelid = fk_rule.local_table
        and conname = equivalent_fk
        and not convalidated
    ) then
      execute format(
        'alter table %s validate constraint %I',
        fk_rule.local_table,
        equivalent_fk
      );
    end if;
  end loop;
end $$;

do $$
declare
  check_rule record;
  target_attnums smallint[];
  normalized_expression text;
  equivalent_constraint name;
  conflicting_constraint record;
  has_invalid_rows boolean;
begin
  for check_rule in
    select *
    from (
      values
        (
          'public.businesses'::regclass,
          'businesses',
          'businesses_business_name_required',
          array['business_name']::text[],
          $check$business_name is not null and btrim(business_name) <> ''$check$,
          $invalid$business_name is null or btrim(business_name) = ''$invalid$,
          array[
            $expr$((business_nameisnotnull)and(btrim(business_name)<>''::text))$expr$,
            $expr$(business_nameisnotnullandbtrim(business_name)<>''::text)$expr$
          ]::text[],
          'businesses.business_name must be non-empty for every existing business.'
        ),
        (
          'public.businesses'::regclass,
          'businesses',
          'businesses_currency_required',
          array['currency']::text[],
          $check$currency is not null and btrim(currency) <> ''$check$,
          $invalid$currency is null or btrim(currency) = ''$invalid$,
          array[
            $expr$((currencyisnotnull)and(btrim(currency)<>''::text))$expr$,
            $expr$(currencyisnotnullandbtrim(currency)<>''::text)$expr$
          ]::text[],
          'businesses.currency must be non-empty for every existing business.'
        ),
        (
          'public.categories'::regclass,
          'categories',
          'categories_name_required',
          array['name']::text[],
          $check$name is not null and btrim(name) <> ''$check$,
          $invalid$name is null or btrim(name) = ''$invalid$,
          array[
            $expr$((nameisnotnull)and(btrim(name)<>''::text))$expr$,
            $expr$(nameisnotnullandbtrim(name)<>''::text)$expr$
          ]::text[],
          'categories.name must be non-empty for every existing category.'
        ),
        (
          'public.categories'::regclass,
          'categories',
          'categories_type_check',
          array['type']::text[],
          $check$type in ('income', 'expense', 'both')$check$,
          $invalid$type not in ('income', 'expense', 'both')$invalid$,
          array[
            $expr$(type=any(array['income'::text,'expense'::text,'both'::text]))$expr$
          ]::text[],
          'categories.type must be income, expense, or both for every existing category.'
        ),
        (
          'public.transactions'::regclass,
          'transactions',
          'transactions_type_check',
          array['type']::text[],
          $check$type in ('income', 'expense')$check$,
          $invalid$type not in ('income', 'expense')$invalid$,
          array[
            $expr$(type=any(array['income'::text,'expense'::text]))$expr$
          ]::text[],
          'transactions.type must be income or expense for every existing transaction.'
        ),
        (
          'public.transactions'::regclass,
          'transactions',
          'transactions_amount_positive',
          array['amount']::text[],
          $check$amount > 0$check$,
          $invalid$amount <= 0$invalid$,
          array[
            $expr$(amount>(0)::numeric)$expr$,
            $expr$(amount>0)$expr$,
            $expr$(amount>0.00)$expr$
          ]::text[],
          'transactions.amount must be greater than zero. Repair non-positive transaction amounts from source records before rerunning this migration.'
        ),
        (
          'public.transactions'::regclass,
          'transactions',
          'transactions_payment_method_check',
          array['payment_method']::text[],
          $check$payment_method in ('cash', 'bank_transfer', 'card', 'pos', 'mobile_money', 'other')$check$,
          $invalid$payment_method not in ('cash', 'bank_transfer', 'card', 'pos', 'mobile_money', 'other')$invalid$,
          array[
            $expr$(payment_method=any(array['cash'::text,'bank_transfer'::text,'card'::text,'pos'::text,'mobile_money'::text,'other'::text]))$expr$
          ]::text[],
          'transactions.payment_method must be cash, bank_transfer, card, pos, mobile_money, or other for every existing transaction.'
        )
    ) as checks_to_enforce(
      table_regclass,
      table_name,
      constraint_name,
      column_names,
      check_sql,
      invalid_where_sql,
      accepted_expressions,
      repair_message
    )
  loop
    select array_agg(attribute.attnum order by array_position(check_rule.column_names, attribute.attname))
    into target_attnums
    from pg_attribute as attribute
    where attribute.attrelid = check_rule.table_regclass
      and attribute.attname = any(check_rule.column_names)
      and not attribute.attisdropped;

    if array_length(target_attnums, 1) is distinct from array_length(check_rule.column_names, 1) then
      raise exception 'Cannot safely enforce constraint % on public.%: one or more target columns are missing.',
        check_rule.constraint_name,
        check_rule.table_name;
    end if;

    select regexp_replace(lower(pg_get_expr(constraint_info.conbin, constraint_info.conrelid)), '\s+', '', 'g')
    into normalized_expression
    from pg_constraint as constraint_info
    where constraint_info.conrelid = check_rule.table_regclass
      and constraint_info.contype = 'c'
      and constraint_info.conname = check_rule.constraint_name;

    if found and normalized_expression <> all(check_rule.accepted_expressions) then
      raise exception 'Cannot safely migrate public.%: check constraint % exists but is not the intended rule. Existing expression: %. Resolve the constraint conflict manually before rerunning this migration.',
        check_rule.table_name,
        check_rule.constraint_name,
        normalized_expression;
    end if;

    select constraint_info.conname, pg_get_constraintdef(constraint_info.oid) as definition
    into conflicting_constraint
    from pg_constraint as constraint_info
    where constraint_info.conrelid = check_rule.table_regclass
      and constraint_info.contype = 'c'
      and constraint_info.conkey && target_attnums
      and constraint_info.conname <> check_rule.constraint_name
      and regexp_replace(lower(pg_get_expr(constraint_info.conbin, constraint_info.conrelid)), '\s+', '', 'g') <> all(check_rule.accepted_expressions)
    limit 1;

    if found then
      raise exception 'Cannot safely migrate public.%: existing check constraint % references % and may conflict with intended %. Existing definition: %. Review manually before rerunning this migration.',
        check_rule.table_name,
        conflicting_constraint.conname,
        check_rule.column_names,
        check_rule.constraint_name,
        conflicting_constraint.definition;
    end if;

    select constraint_info.conname
    into equivalent_constraint
    from pg_constraint as constraint_info
    where constraint_info.conrelid = check_rule.table_regclass
      and constraint_info.contype = 'c'
      and regexp_replace(lower(pg_get_expr(constraint_info.conbin, constraint_info.conrelid)), '\s+', '', 'g') = any(check_rule.accepted_expressions)
    order by (constraint_info.conname = check_rule.constraint_name) desc
    limit 1;

    execute format(
      'select exists (select 1 from %s where %s)',
      check_rule.table_regclass,
      check_rule.invalid_where_sql
    )
    into has_invalid_rows;

    if has_invalid_rows then
      raise exception 'Cannot safely enforce check constraint %. %',
        check_rule.constraint_name,
        check_rule.repair_message;
    end if;

    if equivalent_constraint is null then
      execute format(
        'alter table %s add constraint %I check (%s)',
        check_rule.table_regclass,
        check_rule.constraint_name,
        check_rule.check_sql
      );
    elsif exists (
      select 1
      from pg_constraint
      where conrelid = check_rule.table_regclass
        and conname = equivalent_constraint
        and not convalidated
    ) then
      execute format(
        'alter table %s validate constraint %I',
        check_rule.table_regclass,
        equivalent_constraint
      );
    end if;
  end loop;
end $$;

create or replace function public.sme_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sme_user_owns_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses as businesses
    where businesses.id = target_business_id
      and businesses.owner_id = auth.uid()
  );
$$;

create or replace function public.sme_user_owns_storage_object(
  object_bucket_id text,
  object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  path_business_id text;
begin
  if object_bucket_id is distinct from 'financial-documents' then
    return false;
  end if;

  if object_name is null or btrim(object_name) = '' then
    return false;
  end if;

  path_business_id := split_part(object_name, '/', 1);

  if path_business_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;

  return public.sme_user_owns_business(path_business_id::uuid);
end;
$$;

create or replace function public.sme_handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_full_name text;
begin
  profile_full_name := coalesce(
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(
      btrim(
        concat_ws(
          ' ',
          nullif(btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), ''),
          nullif(btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '')
        )
      ),
      ''
    )
  );

  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    profile_full_name,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.sme_seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (business_id, name, type, description)
  select new.id, seed.name, seed.type, seed.description
  from (
    values
      ('Rent', 'expense', 'Default expense category'),
      ('Utilities', 'expense', 'Default expense category'),
      ('Transport', 'expense', 'Default expense category'),
      ('Salaries', 'expense', 'Default expense category'),
      ('Marketing', 'expense', 'Default expense category'),
      ('Supplies', 'expense', 'Default expense category'),
      ('Equipment', 'expense', 'Default expense category'),
      ('Internet', 'expense', 'Default expense category'),
      ('Maintenance', 'expense', 'Default expense category'),
      ('Other', 'expense', 'Default expense category'),
      ('Sales', 'income', 'Default income category'),
      ('Services', 'income', 'Default income category'),
      ('Consulting', 'income', 'Default income category'),
      ('Investment', 'income', 'Default income category'),
      ('Other', 'income', 'Default income category')
  ) as seed(name, type, description)
  where not exists (
    select 1
    from public.categories as categories
    where categories.business_id = new.id
      and lower(categories.name) = lower(seed.name)
      and categories.type = seed.type
  );

  return new;
end;
$$;

create or replace function public.sme_enforce_transaction_category_business()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.category_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.categories as categories
    where categories.id = new.category_id
      and categories.business_id = new.business_id
      and categories.type in (new.type, 'both')
  ) then
    raise exception 'Transaction category must belong to the same business and support the transaction type'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.sme_user_owns_business(uuid) from public;
grant execute on function public.sme_user_owns_business(uuid) to authenticated;

revoke all on function public.sme_user_owns_storage_object(text, text) from public;
grant execute on function public.sme_user_owns_storage_object(text, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and tgname = 'sme_profiles_set_updated_at'
  ) then
    execute 'create trigger sme_profiles_set_updated_at before update on public.profiles for each row execute function public.sme_set_updated_at()';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.businesses'::regclass
      and tgname = 'sme_businesses_set_updated_at'
  ) then
    execute 'create trigger sme_businesses_set_updated_at before update on public.businesses for each row execute function public.sme_set_updated_at()';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.categories'::regclass
      and tgname = 'sme_categories_set_updated_at'
  ) then
    execute 'create trigger sme_categories_set_updated_at before update on public.categories for each row execute function public.sme_set_updated_at()';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.transactions'::regclass
      and tgname = 'sme_transactions_set_updated_at'
  ) then
    execute 'create trigger sme_transactions_set_updated_at before update on public.transactions for each row execute function public.sme_set_updated_at()';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'sme_on_auth_user_created'
  ) then
    execute 'create trigger sme_on_auth_user_created after insert on auth.users for each row execute function public.sme_handle_new_user_profile()';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.businesses'::regclass
      and tgname = 'sme_on_business_created_seed_categories'
  ) then
    execute 'create trigger sme_on_business_created_seed_categories after insert on public.businesses for each row execute function public.sme_seed_default_categories()';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.transactions'::regclass
      and tgname = 'sme_transactions_category_business_check'
  ) then
    execute 'create trigger sme_transactions_category_business_check before insert or update of business_id, category_id, type on public.transactions for each row execute function public.sme_enforce_transaction_category_business()';
  end if;
end $$;

create index if not exists businesses_owner_id_idx
  on public.businesses (owner_id);

create index if not exists categories_business_id_idx
  on public.categories (business_id);

create index if not exists categories_business_id_type_idx
  on public.categories (business_id, type);

create index if not exists transactions_business_id_idx
  on public.transactions (business_id);

create index if not exists transactions_category_id_idx
  on public.transactions (category_id);

create index if not exists transactions_user_id_idx
  on public.transactions (user_id);

create index if not exists transactions_transaction_date_idx
  on public.transactions (transaction_date);

create index if not exists transactions_type_idx
  on public.transactions (type);

create index if not exists transactions_business_id_transaction_date_idx
  on public.transactions (business_id, transaction_date desc);

create index if not exists transactions_business_id_type_transaction_date_idx
  on public.transactions (business_id, type, transaction_date desc);

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.businesses to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'sme_profiles_select_own'
  ) then
    execute 'create policy sme_profiles_select_own on public.profiles for select to authenticated using (id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'sme_profiles_insert_own'
  ) then
    execute 'create policy sme_profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'sme_profiles_update_own'
  ) then
    execute 'create policy sme_profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'businesses'
      and policyname = 'sme_businesses_select_own'
  ) then
    execute 'create policy sme_businesses_select_own on public.businesses for select to authenticated using (owner_id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'businesses'
      and policyname = 'sme_businesses_insert_own'
  ) then
    execute 'create policy sme_businesses_insert_own on public.businesses for insert to authenticated with check (owner_id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'businesses'
      and policyname = 'sme_businesses_update_own'
  ) then
    execute 'create policy sme_businesses_update_own on public.businesses for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'businesses'
      and policyname = 'sme_businesses_delete_own'
  ) then
    execute 'create policy sme_businesses_delete_own on public.businesses for delete to authenticated using (owner_id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'sme_categories_select_own_business'
  ) then
    execute 'create policy sme_categories_select_own_business on public.categories for select to authenticated using (public.sme_user_owns_business(business_id))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'sme_categories_insert_own_business'
  ) then
    execute 'create policy sme_categories_insert_own_business on public.categories for insert to authenticated with check (public.sme_user_owns_business(business_id))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'sme_categories_update_own_business'
  ) then
    execute 'create policy sme_categories_update_own_business on public.categories for update to authenticated using (public.sme_user_owns_business(business_id)) with check (public.sme_user_owns_business(business_id))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'sme_categories_delete_own_business'
  ) then
    execute 'create policy sme_categories_delete_own_business on public.categories for delete to authenticated using (public.sme_user_owns_business(business_id))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'sme_transactions_select_own_business'
  ) then
    execute 'create policy sme_transactions_select_own_business on public.transactions for select to authenticated using (public.sme_user_owns_business(business_id))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'sme_transactions_insert_own_business'
  ) then
    execute 'create policy sme_transactions_insert_own_business on public.transactions for insert to authenticated with check (user_id = auth.uid() and public.sme_user_owns_business(business_id))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'sme_transactions_update_own_business'
  ) then
    execute 'create policy sme_transactions_update_own_business on public.transactions for update to authenticated using (public.sme_user_owns_business(business_id)) with check (user_id = auth.uid() and public.sme_user_owns_business(business_id))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'sme_transactions_delete_own_business'
  ) then
    execute 'create policy sme_transactions_delete_own_business on public.transactions for delete to authenticated using (public.sme_user_owns_business(business_id))';
  end if;
end $$;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    execute $storage_bucket$
      insert into storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
      )
      values (
        'financial-documents',
        'financial-documents',
        false,
        10485760,
        array[
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp'
        ]
      )
      on conflict (id) do nothing
    $storage_bucket$;
  end if;

  if to_regclass('storage.objects') is not null then
    execute 'alter table storage.objects enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'sme_financial_documents_select_own'
    ) then
      execute 'create policy sme_financial_documents_select_own on storage.objects for select to authenticated using (bucket_id = ''financial-documents'' and public.sme_user_owns_storage_object(bucket_id, name))';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'sme_financial_documents_insert_own'
    ) then
      execute 'create policy sme_financial_documents_insert_own on storage.objects for insert to authenticated with check (bucket_id = ''financial-documents'' and public.sme_user_owns_storage_object(bucket_id, name))';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'sme_financial_documents_update_own'
    ) then
      execute 'create policy sme_financial_documents_update_own on storage.objects for update to authenticated using (bucket_id = ''financial-documents'' and public.sme_user_owns_storage_object(bucket_id, name)) with check (bucket_id = ''financial-documents'' and public.sme_user_owns_storage_object(bucket_id, name))';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'sme_financial_documents_delete_own'
    ) then
      execute 'create policy sme_financial_documents_delete_own on storage.objects for delete to authenticated using (bucket_id = ''financial-documents'' and public.sme_user_owns_storage_object(bucket_id, name))';
    end if;
  end if;
end $$;
