-- SMARTKONTA - STRIPE SUBSCRIPTIONS SETUP

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan_code text not null default 'basic',
  status text not null default 'inactive',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists idx_user_subscriptions_user_id_unique
  on public.user_subscriptions(user_id);

create index if not exists idx_user_subscriptions_user_id
  on public.user_subscriptions(user_id);

create or replace function public.set_user_subscriptions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_user_subscriptions_updated_at on public.user_subscriptions;

create trigger trigger_update_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row
execute function public.set_user_subscriptions_updated_at();

alter table public.user_subscriptions enable row level security;

drop policy if exists "Users can view own subscription" on public.user_subscriptions;

create policy "Users can view own subscription"
on public.user_subscriptions for select
using (auth.uid() = user_id);

create or replace view public.active_user_plan as
select
  u.id as user_id,
  coalesce(us.plan_code, 'basic') as active_plan,
  case
    when us.status in ('active', 'trialing') then true
    else false
  end as is_premium_active
from auth.users u
left join public.user_subscriptions us
  on u.id = us.user_id;
