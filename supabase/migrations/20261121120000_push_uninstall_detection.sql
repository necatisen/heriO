-- Silent uninstall detection: send-push-message keeps the Expo ticket id of the last push per device and checks its
-- receipt on the next push. Expo answers "DeviceNotRegistered" when the app was removed from the phone; the function
-- then deletes the token and sets push_diagnostics.stage = 'uninstalled' (no extra notification is ever sent).
-- Opening the app again (reinstall) sets the stage back to 'ok'.
alter table public.push_tokens add column if not exists last_ticket_id text;
alter table public.push_tokens add column if not exists last_ticket_at timestamptz;
