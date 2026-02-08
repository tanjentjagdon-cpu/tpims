-- Create table for TikTok Shop Integration
create table public.tiktok_integrations (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    access_token text not null,
    refresh_token text not null,
    access_token_expire_in bigint,
    refresh_token_expire_in bigint,
    seller_name text,
    shop_cipher text,
    shop_id text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.tiktok_integrations enable row level security;

-- Create Policy
create policy "Enable all for authenticated" on public.tiktok_integrations
    for all to authenticated
    using (true)
    with check (true);

-- Create Index
create index if not exists idx_tiktok_integrations_user_id on public.tiktok_integrations(user_id);
