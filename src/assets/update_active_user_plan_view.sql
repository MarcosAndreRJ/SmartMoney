-- Atualização da view active_user_plan para considerar cancelamento pendente

create or replace view public.active_user_plan as
select
  u.id as user_id,
  coalesce(us.plan_code, 'basic') as active_plan,
  case
    when us.status in ('active', 'trialing') and (us.cancel_at_period_end = false or us.cancel_at_period_end is null) then true
    when us.status in ('active', 'trialing') and us.cancel_at_period_end = true then true
    else false
  end as is_premium_active,
  case
    when us.cancel_at_period_end = true then true
    else false
  end as is_pending_cancellation,
  us.current_period_end as premium_end_date
from auth.users u
left join public.user_subscriptions us
  on u.id = us.user_id;
