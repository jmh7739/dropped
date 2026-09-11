-- GitHub Actions의 지연·누락 가능한 schedule 대신 Supabase pg_cron이
-- workflow_dispatch를 정해진 시각에 직접 호출한다.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname in ('dropped-realtime-dispatch', 'dropped-products-dispatch')
  loop
    perform cron.unschedule(existing_job);
  end loop;
end
$$;

select cron.schedule(
  'dropped-realtime-dispatch',
  '7 * * * *',
  $job$
  select net.http_post(
    url := 'https://api.github.com/repos/jmh7739/dropped/actions/workflows/trends.yml/dispatches',
    headers := jsonb_build_object(
      'Accept', 'application/vnd.github+json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'github_actions_dispatch_token'
        limit 1
      ),
      'X-GitHub-Api-Version', '2022-11-28',
      'Content-Type', 'application/json',
      'User-Agent', 'dropped-supabase-scheduler'
    ),
    body := '{"ref":"main","inputs":{"mode":"realtime"}}'::jsonb
  );
  $job$
);

select cron.schedule(
  'dropped-products-dispatch',
  '17 */4 * * *',
  $job$
  select net.http_post(
    url := 'https://api.github.com/repos/jmh7739/dropped/actions/workflows/trends.yml/dispatches',
    headers := jsonb_build_object(
      'Accept', 'application/vnd.github+json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'github_actions_dispatch_token'
        limit 1
      ),
      'X-GitHub-Api-Version', '2022-11-28',
      'Content-Type', 'application/json',
      'User-Agent', 'dropped-supabase-scheduler'
    ),
    body := '{"ref":"main","inputs":{"mode":"products"}}'::jsonb
  );
  $job$
);
