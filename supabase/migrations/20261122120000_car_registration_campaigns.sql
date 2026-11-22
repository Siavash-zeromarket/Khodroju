-- ─────────────────────────────────────────────────────────────────────────────
-- Car Registration & Sales Campaign Directory
--
-- Additive migration: creates the manufacturers / vehicle models / registration
-- campaign domain. Safe to re-run. It never drops or rewrites existing data.
--
-- Depends on existing helpers: public.profiles(id, role), public.handle_updated_at.
-- The is_admin()/is_owner() functions are (re)defined idempotently so they work
-- even if this project was set up without them.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0. Shared helpers ────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and upper(role::text) = 'ADMIN'
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and upper(role::text) = 'OWNER'
  );
$$;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 1. Enums ─────────────────────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'campaign_type' and n.nspname = 'public') then
    create type public.campaign_type as enum
      ('IMMEDIATE_SALE', 'EXTRAORDINARY_SALE', 'PRE_SALE', 'OTHER');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'campaign_status' and n.nspname = 'public') then
    create type public.campaign_status as enum
      ('DRAFT', 'UPCOMING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'ARCHIVED');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'condition_type' and n.nspname = 'public') then
    create type public.condition_type as enum
      ('MIN_AGE', 'DRIVING_LICENSE', 'ACTIVE_PLATE_RESTRICTION',
       'PREVIOUS_PURCHASE_RESTRICTION', 'BANK_ACCOUNT', 'PROXY_ACCOUNT',
       'BLOCKED_FUNDS', 'MOTHERS_PLAN', 'SCRAPPAGE', 'OTHER');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'requirement_status' and n.nspname = 'public') then
    create type public.requirement_status as enum
      ('REQUIRED', 'NOT_REQUIRED', 'UNSPECIFIED');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'pricing_type' and n.nspname = 'public') then
    create type public.pricing_type as enum ('FIXED', 'TBD');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'comment_status' and n.nspname = 'public') then
    create type public.comment_status as enum
      ('PENDING', 'APPROVED', 'REJECTED', 'DELETED');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'analytics_event' and n.nspname = 'public') then
    create type public.analytics_event as enum
      ('VIEW', 'REGISTRATION_CLICK', 'FAVORITE', 'POLL_VOTE');
  end if;
end $$;

-- ── 2. Core catalogue ────────────────────────────────────────────────────────

create table if not exists public.manufacturers (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  logo_url          text,
  website_url       text,
  registration_url  text,
  description       text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.vehicle_models (
  id               uuid primary key default gen_random_uuid(),
  manufacturer_id  uuid not null references public.manufacturers(id) on delete cascade,
  name             text not null,
  slug             text not null,
  trim             text,
  image_url        text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (manufacturer_id, slug)
);

create table if not exists public.applicant_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── 3. Campaigns ─────────────────────────────────────────────────────────────

create table if not exists public.registration_campaigns (
  id                        uuid primary key default gen_random_uuid(),
  manufacturer_id           uuid references public.manufacturers(id) on delete set null,
  title                     text not null,
  slug                      text not null unique,
  announcement_number       text,
  description               text,
  campaign_type             public.campaign_type not null default 'OTHER',
  status                    public.campaign_status not null default 'DRAFT',
  published_at              timestamptz,
  registration_starts_at    timestamptz,
  registration_ends_at      timestamptz,
  official_registration_url text,
  official_document_url     text,
  source_url                text,
  last_verified_at          timestamptz,
  -- Denormalized aggregates (kept in sync by recalc_campaign_aggregates trigger)
  min_initial_payment       bigint,
  min_delivery_months       integer,
  vehicle_count             integer not null default 0,
  created_by                uuid references public.profiles(id) on delete set null,
  updated_by                uuid references public.profiles(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table if not exists public.campaign_vehicles (
  id                   uuid primary key default gen_random_uuid(),
  campaign_id          uuid not null references public.registration_campaigns(id) on delete cascade,
  vehicle_model_id     uuid references public.vehicle_models(id) on delete set null,
  display_name         text,
  official_price       bigint,
  initial_payment      bigint,
  pricing_type         public.pricing_type not null default 'TBD',
  delivery_description text,
  delivery_months      integer,
  available_colors     text[],
  notes                text,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.campaign_conditions (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references public.registration_campaigns(id) on delete cascade,
  condition_type     public.condition_type not null,
  condition_value    jsonb,
  requirement_status public.requirement_status not null default 'UNSPECIFIED',
  description        text,
  official_reference text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.campaign_applicant_categories (
  campaign_id           uuid not null references public.registration_campaigns(id) on delete cascade,
  applicant_category_id uuid not null references public.applicant_categories(id) on delete cascade,
  primary key (campaign_id, applicant_category_id)
);

create table if not exists public.campaign_amendments (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references public.registration_campaigns(id) on delete cascade,
  title               text not null,
  description         text,
  changes             jsonb,
  official_source_url text,
  document_url        text,
  published_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create table if not exists public.campaign_faqs (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.registration_campaigns(id) on delete cascade,
  question      text not null,
  answer        text not null,
  display_order integer not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.campaign_registration_guides (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.registration_campaigns(id) on delete cascade,
  title        text not null,
  description  text,
  image_url    text,
  external_url text,
  step_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── 4. User interaction ──────────────────────────────────────────────────────

create table if not exists public.campaign_favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.registration_campaigns(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, campaign_id)
);

create table if not exists public.campaign_comments (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.registration_campaigns(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid references public.campaign_comments(id) on delete cascade,
  content     text not null,
  status      public.comment_status not null default 'PENDING',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.campaign_polls (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.registration_campaigns(id) on delete cascade,
  question    text not null,
  options     jsonb not null default '[]'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.campaign_poll_votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.campaign_polls(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  option_id  text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create table if not exists public.campaign_analytics (
  id                   uuid primary key default gen_random_uuid(),
  campaign_id          uuid not null references public.registration_campaigns(id) on delete cascade,
  event_type           public.analytics_event not null,
  user_id              uuid references public.profiles(id) on delete set null,
  anonymous_session_id text,
  metadata             jsonb,
  created_at           timestamptz not null default now()
);

-- Link notifications back to a campaign (reuse existing user_notifications).
alter table public.user_notifications
  add column if not exists related_campaign_id uuid
  references public.registration_campaigns(id) on delete set null;

-- ── 5. Indexes ───────────────────────────────────────────────────────────────

create index if not exists manufacturers_active_idx on public.manufacturers (is_active);
create index if not exists vehicle_models_manufacturer_idx on public.vehicle_models (manufacturer_id);

create index if not exists registration_campaigns_status_idx on public.registration_campaigns (status);
create index if not exists registration_campaigns_type_idx on public.registration_campaigns (campaign_type);
create index if not exists registration_campaigns_manufacturer_idx on public.registration_campaigns (manufacturer_id);
create index if not exists registration_campaigns_ends_idx on public.registration_campaigns (registration_ends_at);
create index if not exists registration_campaigns_starts_idx on public.registration_campaigns (registration_starts_at);
create index if not exists registration_campaigns_status_published_idx
  on public.registration_campaigns (status, published_at desc);
create index if not exists registration_campaigns_min_payment_idx
  on public.registration_campaigns (min_initial_payment);
create index if not exists registration_campaigns_min_delivery_idx
  on public.registration_campaigns (min_delivery_months);

create index if not exists campaign_vehicles_campaign_idx on public.campaign_vehicles (campaign_id);
create index if not exists campaign_vehicles_model_idx on public.campaign_vehicles (vehicle_model_id);

create index if not exists campaign_conditions_campaign_idx on public.campaign_conditions (campaign_id);
create index if not exists campaign_applicant_categories_category_idx
  on public.campaign_applicant_categories (applicant_category_id);

create index if not exists campaign_faqs_campaign_idx on public.campaign_faqs (campaign_id);
create index if not exists campaign_guides_campaign_idx on public.campaign_registration_guides (campaign_id);
create index if not exists campaign_amendments_campaign_idx on public.campaign_amendments (campaign_id);

create index if not exists campaign_favorites_user_idx on public.campaign_favorites (user_id);
create index if not exists campaign_comments_campaign_status_idx
  on public.campaign_comments (campaign_id, status);
create index if not exists campaign_comments_user_idx on public.campaign_comments (user_id);

create index if not exists campaign_analytics_campaign_event_idx
  on public.campaign_analytics (campaign_id, event_type, created_at);

-- ── 6. updated_at triggers ───────────────────────────────────────────────────

do $$ declare t text;
begin
  foreach t in array array[
    'manufacturers', 'vehicle_models', 'registration_campaigns', 'campaign_vehicles',
    'campaign_conditions', 'campaign_faqs', 'campaign_registration_guides', 'campaign_comments'
  ] loop
    execute format(
      'drop trigger if exists set_%1$s_updated_at on public.%1$s', t);
    execute format(
      'create trigger set_%1$s_updated_at before update on public.%1$s
         for each row execute function public.handle_updated_at()', t);
  end loop;
end $$;

-- ── 6b. Aggregate maintenance for campaign_vehicles ──────────────────────────

create or replace function public.recalc_campaign_aggregates(target uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.registration_campaigns c
     set min_initial_payment = agg.min_payment,
         min_delivery_months = agg.min_delivery,
         vehicle_count       = agg.cnt
    from (
      select
        coalesce(min(initial_payment) filter (where initial_payment is not null), null) as min_payment,
        coalesce(min(delivery_months) filter (where delivery_months is not null), null) as min_delivery,
        count(*) as cnt
      from public.campaign_vehicles
      where campaign_id = target
    ) agg
   where c.id = target;
$$;

create or replace function public.campaign_vehicles_sync_aggregates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_campaign_aggregates(old.campaign_id);
    return old;
  end if;

  perform public.recalc_campaign_aggregates(new.campaign_id);
  if tg_op = 'UPDATE' and new.campaign_id <> old.campaign_id then
    perform public.recalc_campaign_aggregates(old.campaign_id);
  end if;
  return new;
end;
$$;

drop trigger if exists campaign_vehicles_sync_aggregates on public.campaign_vehicles;
create trigger campaign_vehicles_sync_aggregates
  after insert or update or delete on public.campaign_vehicles
  for each row execute function public.campaign_vehicles_sync_aggregates();

-- ── 7. Status automation (timezone-safe; run by cron + server fallback) ───────

create or replace function public.refresh_campaign_statuses()
returns void
language sql
security definer
set search_path = public
as $$
  update public.registration_campaigns
     set status = 'ACTIVE'
   where status = 'UPCOMING'
     and registration_starts_at is not null
     and registration_starts_at <= now();

  update public.registration_campaigns
     set status = 'EXPIRED'
   where status = 'ACTIVE'
     and registration_ends_at is not null
     and registration_ends_at < now();
$$;

-- ── 8. Enable RLS ────────────────────────────────────────────────────────────

alter table public.manufacturers                    enable row level security;
alter table public.vehicle_models                   enable row level security;
alter table public.applicant_categories             enable row level security;
alter table public.registration_campaigns           enable row level security;
alter table public.campaign_vehicles                enable row level security;
alter table public.campaign_conditions              enable row level security;
alter table public.campaign_applicant_categories    enable row level security;
alter table public.campaign_amendments              enable row level security;
alter table public.campaign_faqs                    enable row level security;
alter table public.campaign_registration_guides     enable row level security;
alter table public.campaign_favorites               enable row level security;
alter table public.campaign_comments                enable row level security;
alter table public.campaign_polls                   enable row level security;
alter table public.campaign_poll_votes              enable row level security;
alter table public.campaign_analytics               enable row level security;

-- ── 9. RLS policies ──────────────────────────────────────────────────────────

-- Reference data: public read, staff write.
drop policy if exists "Campaign ref public read" on public.manufacturers;
create policy "Campaign ref public read" on public.manufacturers
  for select using (is_active or public.is_admin() or public.is_owner());
drop policy if exists "Campaign ref staff write" on public.manufacturers;
create policy "Campaign ref staff write" on public.manufacturers
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

drop policy if exists "Campaign ref public read" on public.vehicle_models;
create policy "Campaign ref public read" on public.vehicle_models
  for select using (is_active or public.is_admin() or public.is_owner());
drop policy if exists "Campaign ref staff write" on public.vehicle_models;
create policy "Campaign ref staff write" on public.vehicle_models
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

drop policy if exists "Campaign ref public read" on public.applicant_categories;
create policy "Campaign ref public read" on public.applicant_categories
  for select using (is_active or public.is_admin() or public.is_owner());
drop policy if exists "Campaign ref staff write" on public.applicant_categories;
create policy "Campaign ref staff write" on public.applicant_categories
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

-- Campaigns: public may read every non-draft/archived row; staff full access.
drop policy if exists "Campaigns public read" on public.registration_campaigns;
create policy "Campaigns public read" on public.registration_campaigns
  for select
  using (
    status in ('UPCOMING', 'ACTIVE', 'EXPIRED', 'CANCELLED')
    or public.is_admin() or public.is_owner()
  );
drop policy if exists "Campaigns staff write" on public.registration_campaigns;
create policy "Campaigns staff write" on public.registration_campaigns
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

-- Campaign children: read when the parent campaign is publicly visible.
drop policy if exists "Campaign children public read" on public.campaign_vehicles;
create policy "Campaign children public read" on public.campaign_vehicles
  for select using (
    exists (select 1 from public.registration_campaigns c
            where c.id = campaign_id
              and (c.status in ('UPCOMING','ACTIVE','EXPIRED','CANCELLED')
                   or public.is_admin() or public.is_owner()))
  );
drop policy if exists "Campaign children staff write" on public.campaign_vehicles;
create policy "Campaign children staff write" on public.campaign_vehicles
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

drop policy if exists "Campaign children public read" on public.campaign_conditions;
create policy "Campaign children public read" on public.campaign_conditions
  for select using (
    exists (select 1 from public.registration_campaigns c
            where c.id = campaign_id
              and (c.status in ('UPCOMING','ACTIVE','EXPIRED','CANCELLED')
                   or public.is_admin() or public.is_owner()))
  );
drop policy if exists "Campaign children staff write" on public.campaign_conditions;
create policy "Campaign children staff write" on public.campaign_conditions
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

drop policy if exists "Campaign children public read" on public.campaign_applicant_categories;
create policy "Campaign children public read" on public.campaign_applicant_categories
  for select using (
    exists (select 1 from public.registration_campaigns c
            where c.id = campaign_id
              and (c.status in ('UPCOMING','ACTIVE','EXPIRED','CANCELLED')
                   or public.is_admin() or public.is_owner()))
  );
drop policy if exists "Campaign children staff write" on public.campaign_applicant_categories;
create policy "Campaign children staff write" on public.campaign_applicant_categories
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

drop policy if exists "Campaign children public read" on public.campaign_amendments;
create policy "Campaign children public read" on public.campaign_amendments
  for select using (
    exists (select 1 from public.registration_campaigns c
            where c.id = campaign_id
              and (c.status in ('UPCOMING','ACTIVE','EXPIRED','CANCELLED')
                   or public.is_admin() or public.is_owner()))
  );
drop policy if exists "Campaign children staff write" on public.campaign_amendments;
create policy "Campaign children staff write" on public.campaign_amendments
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

drop policy if exists "Campaign children public read" on public.campaign_faqs;
create policy "Campaign children public read" on public.campaign_faqs
  for select using (
    is_published and exists (
      select 1 from public.registration_campaigns c
      where c.id = campaign_id
        and (c.status in ('UPCOMING','ACTIVE','EXPIRED','CANCELLED')
             or public.is_admin() or public.is_owner())
    )
  );
drop policy if exists "Campaign children staff write" on public.campaign_faqs;
create policy "Campaign children staff write" on public.campaign_faqs
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

drop policy if exists "Campaign children public read" on public.campaign_registration_guides;
create policy "Campaign children public read" on public.campaign_registration_guides
  for select using (
    exists (select 1 from public.registration_campaigns c
            where c.id = campaign_id
              and (c.status in ('UPCOMING','ACTIVE','EXPIRED','CANCELLED')
                   or public.is_admin() or public.is_owner()))
  );
drop policy if exists "Campaign children staff write" on public.campaign_registration_guides;
create policy "Campaign children staff write" on public.campaign_registration_guides
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

-- Favorites: a user manages only their own rows.
drop policy if exists "Favorites owner read" on public.campaign_favorites;
create policy "Favorites owner read" on public.campaign_favorites
  for select using (user_id = auth.uid() or public.is_admin() or public.is_owner());
drop policy if exists "Favorites owner write" on public.campaign_favorites;
create policy "Favorites owner write" on public.campaign_favorites
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Comments: approved visible to all; authors see their own; staff see all.
drop policy if exists "Comments read" on public.campaign_comments;
create policy "Comments read" on public.campaign_comments
  for select using (
    status = 'APPROVED'
    or user_id = auth.uid()
    or public.is_admin() or public.is_owner()
  );
drop policy if exists "Comments insert" on public.campaign_comments;
create policy "Comments insert" on public.campaign_comments
  for insert with check (
    user_id = auth.uid() and status = 'PENDING'
  );
-- Authors may edit their own pending content but cannot change moderation state.
drop policy if exists "Comments author edit" on public.campaign_comments;
create policy "Comments author edit" on public.campaign_comments
  for update using (user_id = auth.uid() and status = 'PENDING')
  with check (user_id = auth.uid() and status = 'PENDING');
drop policy if exists "Comments staff moderate" on public.campaign_comments;
create policy "Comments staff moderate" on public.campaign_comments
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

-- Polls: public read, staff write.
drop policy if exists "Polls public read" on public.campaign_polls;
create policy "Polls public read" on public.campaign_polls
  for select using (true);
drop policy if exists "Polls staff write" on public.campaign_polls;
create policy "Polls staff write" on public.campaign_polls
  for all using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());

-- Votes: a user may insert/read/delete only their own vote.
drop policy if exists "Votes owner" on public.campaign_poll_votes;
create policy "Votes owner" on public.campaign_poll_votes
  for all using (user_id = auth.uid() or public.is_admin() or public.is_owner())
  with check (user_id = auth.uid());

-- Analytics: anyone may record an event; only staff may read.
drop policy if exists "Analytics insert" on public.campaign_analytics;
create policy "Analytics insert" on public.campaign_analytics
  for insert with check (true);
drop policy if exists "Analytics staff read" on public.campaign_analytics;
create policy "Analytics staff read" on public.campaign_analytics
  for select using (public.is_admin() or public.is_owner());

-- ── 10. Seed reusable applicant categories (reference data) ──────────────────

insert into public.applicant_categories (name, slug, description)
values
  ('متقاضیان عمومی', 'general', 'ثبت‌نام آزاد برای عموم متقاضیان'),
  ('طرح مادران', 'mothers', 'سهمیه ویژه طرح حمایت از مادران'),
  ('طرح خودروهای فرسوده', 'scrappage', 'سهمیه جایگزینی خودروهای فرسوده')
on conflict (slug) do nothing;

-- ── 11. Storage buckets ──────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('campaign-documents', 'campaign-documents', false)
on conflict (id) do nothing;

drop policy if exists "Campaign assets public read" on storage.objects;
create policy "Campaign assets public read" on storage.objects
  for select using (bucket_id = 'campaign-assets');

drop policy if exists "Campaign assets staff write" on storage.objects;
create policy "Campaign assets staff write" on storage.objects
  for all to authenticated
  using (bucket_id = 'campaign-assets' and (public.is_admin() or public.is_owner()))
  with check (bucket_id = 'campaign-assets' and (public.is_admin() or public.is_owner()));

drop policy if exists "Campaign docs staff read" on storage.objects;
create policy "Campaign docs staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'campaign-documents' and (public.is_admin() or public.is_owner()));

drop policy if exists "Campaign docs staff write" on storage.objects;
create policy "Campaign docs staff write" on storage.objects
  for all to authenticated
  using (bucket_id = 'campaign-documents' and (public.is_admin() or public.is_owner()))
  with check (bucket_id = 'campaign-documents' and (public.is_admin() or public.is_owner()));
