-- =============================================================
-- Private Chat App — Full Schema + RLS + Indexes
-- Run this in your Supabase SQL Editor
-- =============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,
  display_name  text,
  avatar_url    text,
  public_key    text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles
  add constraint username_format
  check (username ~ '^[a-z0-9_]{3,30}$');

-- ─── USER_KEYS ────────────────────────────────────────────────────────────────
-- Stores the user's private key encrypted client-side with PBKDF2(password)
-- Server never sees the plaintext private key
create table public.user_keys (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid not null unique references auth.users(id) on delete cascade,
  encrypted_private_key  text not null,
  key_salt               text not null,
  key_iv                 text not null,
  created_at             timestamptz not null default now()
);

-- ─── CONVERSATIONS ───────────────────────────────────────────────────────────
create table public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  is_group    boolean not null default false,
  name        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── CONVERSATION_PARTICIPANTS ───────────────────────────────────────────────
create table public.conversation_participants (
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  joined_at        timestamptz not null default now(),
  last_read_at     timestamptz,
  primary key (conversation_id, user_id)
);

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
create table public.messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references auth.users(id) on delete cascade,
  ciphertext       text not null,
  iv               text not null,
  message_type     text not null default 'text',
  is_deleted       boolean not null default false,
  created_at       timestamptz not null default now(),
  constraint message_type_check check (message_type in ('text', 'image'))
);

-- ─── TYPING_INDICATORS ───────────────────────────────────────────────────────
create table public.typing_indicators (
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  updated_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
create index idx_profiles_username on public.profiles(username);
create index idx_participants_user_id on public.conversation_participants(user_id);
create index idx_participants_conversation_id on public.conversation_participants(conversation_id);
create index idx_messages_conversation_id on public.messages(conversation_id);
create index idx_messages_conversation_created on public.messages(conversation_id, created_at desc);
create index idx_typing_conversation on public.typing_indicators(conversation_id);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute procedure public.handle_updated_at();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name, public_key)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'public_key'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.user_keys enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.typing_indicators enable row level security;

-- PROFILES
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated using (true);

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- USER_KEYS
create policy "user_keys_select_own"
  on public.user_keys for select to authenticated using (auth.uid() = user_id);

create policy "user_keys_insert_own"
  on public.user_keys for insert to authenticated with check (auth.uid() = user_id);

create policy "user_keys_update_own"
  on public.user_keys for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CONVERSATIONS
create policy "conversations_select_participant"
  on public.conversations for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

create policy "conversations_insert_authenticated"
  on public.conversations for insert to authenticated with check (true);

create policy "conversations_update_participant"
  on public.conversations for update to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

-- CONVERSATION_PARTICIPANTS
create policy "participants_select_own_conversations"
  on public.conversation_participants for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()
    )
  );

create policy "participants_insert_authenticated"
  on public.conversation_participants for insert to authenticated with check (true);

create policy "participants_update_own"
  on public.conversation_participants for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- MESSAGES
create policy "messages_select_participant"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "messages_insert_participant"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "messages_update_own"
  on public.messages for update to authenticated
  using (auth.uid() = sender_id) with check (auth.uid() = sender_id);

-- TYPING_INDICATORS
create policy "typing_select_participant"
  on public.typing_indicators for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = typing_indicators.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "typing_upsert_own"
  on public.typing_indicators for insert to authenticated with check (auth.uid() = user_id);

create policy "typing_update_own"
  on public.typing_indicators for update to authenticated using (auth.uid() = user_id);

create policy "typing_delete_own"
  on public.typing_indicators for delete to authenticated using (auth.uid() = user_id);

-- ─── HELPER: GET OR CREATE 1:1 CONVERSATION ──────────────────────────────────
create or replace function public.get_or_create_conversation(other_user_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_conversation_id uuid;
begin
  select cp1.conversation_id into v_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp1.conversation_id = cp2.conversation_id
  join public.conversations c
    on c.id = cp1.conversation_id
  where cp1.user_id = auth.uid()
    and cp2.user_id = other_user_id
    and c.is_group = false
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (is_group)
  values (false)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values
    (v_conversation_id, auth.uid()),
    (v_conversation_id, other_user_id);

  return v_conversation_id;
end;
$$;

-- ─── STORAGE BUCKET SETUP ────────────────────────────────────────────────────
-- Run these commands in Supabase Dashboard > Storage OR using the SQL editor
-- after enabling the storage extension. The SQL below is for reference.
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('chat-images', 'chat-images', false);
--
-- Storage RLS Policies (apply in Dashboard > Storage > chat-images > Policies):
--
-- Policy 1: Allow authenticated users to upload to their own folder
-- Operation: INSERT
-- Check: auth.uid()::text = (storage.foldername(name))[1]
--
-- Policy 2: Allow authenticated users to read images
-- Operation: SELECT
-- Using: auth.uid() IS NOT NULL
--
-- Policy 3: Allow users to delete their own images
-- Operation: DELETE
-- Using: auth.uid()::text = (storage.foldername(name))[1]
