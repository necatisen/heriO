-- Add plan_type to subscriptions for display (monthly, 3month, yearly)
alter table public.subscriptions
  add column if not exists plan_type text check (plan_type in ('monthly', '3month', 'yearly'));

comment on column public.subscriptions.plan_type is 'Premium plan: monthly, 3month, or yearly';
