create extension if not exists pgcrypto;

create type public.user_role as enum ('practitioner', 'billing_admin');
create type public.case_status as enum ('draft', 'submitted', 'billed');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'practitioner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger auth_user_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.profiles (id) on delete restrict,
  patient_name text not null check (length(trim(patient_name)) between 1 and 160),
  patient_reference text not null check (length(trim(patient_reference)) between 1 and 80),
  service_date date not null,
  diagnoses jsonb not null default '[]'::jsonb check (jsonb_typeof(diagnoses) = 'array'),
  procedures jsonb not null default '[]'::jsonb check (jsonb_typeof(procedures) = 'array'),
  notes text not null default '' check (length(notes) <= 2000),
  status public.case_status not null default 'draft',
  submitted_at timestamptz,
  billed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cases_status_submitted_at_idx on public.cases (status, submitted_at);
create index cases_practitioner_created_at_idx on public.cases (practitioner_id, created_at desc);

create or replace function public.is_billing_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'billing_admin'
  );
$$;

create or replace function public.is_practitioner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'practitioner'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger cases_set_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.cases enable row level security;

create policy "Users can read own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_billing_admin()));

create policy "Billing admins can update profiles"
on public.profiles for update to authenticated
using ((select public.is_billing_admin()))
with check ((select public.is_billing_admin()));

create policy "Practitioners and billing admins can read cases"
on public.cases for select to authenticated
using (practitioner_id = (select auth.uid()) or (select public.is_billing_admin()));

create policy "Practitioners can submit own cases"
on public.cases for insert to authenticated
with check (
  practitioner_id = (select auth.uid())
  and (select public.is_practitioner())
  and status = 'submitted'
  and submitted_at is not null
);

create policy "Billing admins can update cases"
on public.cases for update to authenticated
using ((select public.is_billing_admin()))
with check ((select public.is_billing_admin()));

insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', false)
on conflict (id) do update set public = false;

create policy "Case owners and billing admins can read case documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'case-documents'
  and exists (
    select 1 from public.cases
    where cases.id::text = (storage.foldername(name))[1]
      and (cases.practitioner_id = (select auth.uid()) or (select public.is_billing_admin()))
  )
);

create policy "Practitioners can upload documents to own cases"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'case-documents'
  and exists (
    select 1 from public.cases
    where cases.id::text = (storage.foldername(name))[1]
      and cases.practitioner_id = (select auth.uid())
  )
);

create policy "Case owners and billing admins can delete case documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'case-documents'
  and exists (
    select 1 from public.cases
    where cases.id::text = (storage.foldername(name))[1]
      and (cases.practitioner_id = (select auth.uid()) or (select public.is_billing_admin()))
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cases'
  ) then
    alter publication supabase_realtime add table public.cases;
  end if;
end;
$$;
