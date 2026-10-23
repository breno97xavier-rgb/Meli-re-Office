param([Parameter(Mandatory=$true)][string]$Psql,[Parameter(Mandatory=$true)][string]$Connection,[Parameter(Mandatory=$true)][string]$ArtifactPrefix,[ValidateSet('briefing','templates')][string]$Domain='briefing')
$ErrorActionPreference='Stop'
# Exclusivamente o cluster fictício que o runner acabou de criar.
if ($Connection -notmatch '^host=127\.0\.0\.1 port=\d+ user=office_lab dbname=postgres connect_timeout=5$') { throw 'Conexão de laboratório inesperada.' }
$firstSql=$ArtifactPrefix+'.first.sql'; $secondSql=$ArtifactPrefix+'.second.sql'
$firstQuery=@'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
SELECT save_client_briefing('00000000-0000-0000-0000-000000000021',2,'[]','draft');
SELECT pg_sleep(3);
COMMIT;
'@
$secondQuery=@'
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
SELECT save_client_briefing('00000000-0000-0000-0000-000000000021',2,'[]','ready');
'@
$rpcName='save_client_briefing'
$stateQuery="SELECT revision=3 AND status='draft' AND (SELECT count(*)=3 FROM client_briefing_revisions WHERE client_id='00000000-0000-0000-0000-000000000021') FROM client_briefings WHERE client_id='00000000-0000-0000-0000-000000000021';"
if ($Domain -eq 'templates') {
 $rpcName='save_client_editorial_template'
 $firstQuery=@'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',3,lab_template_input()||'{"name":"template-first"}');
SELECT pg_sleep(3);
COMMIT;
'@
 $secondQuery=@'
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);
SELECT save_client_editorial_template('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000101',3,lab_template_input()||'{"name":"template-second"}');
'@
 $stateQuery="SELECT revision=4 AND name='template-first' AND (SELECT count(*)=4 FROM client_editorial_template_revisions WHERE template_id='00000000-0000-0000-0000-000000000101') FROM client_editorial_templates WHERE id='00000000-0000-0000-0000-000000000101';"
}
[IO.File]::WriteAllText($firstSql,$firstQuery,[Text.UTF8Encoding]::new($false)); [IO.File]::WriteAllText($secondSql,$secondQuery,[Text.UTF8Encoding]::new($false))
$firstConnection=$Connection+' application_name=office_planning_first'
$args=@('-X',('--dbname="'+$firstConnection+'"'),'-v','ON_ERROR_STOP=1','-f',('"'+$firstSql+'"'))
$first=Start-Process -FilePath $Psql -ArgumentList $args -PassThru -WindowStyle Hidden -RedirectStandardOutput ($ArtifactPrefix+'.first.out') -RedirectStandardError ($ArtifactPrefix+'.first.err')
try {
 $sleeping=$false
 for($attempt=0;$attempt -lt 20;$attempt++) {
  $probe=& $Psql -X --dbname=$Connection -t -A -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='office_planning_first' AND wait_event='PgSleep';"
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao observar concorrência local.' }
  if (($probe -join '').Trim() -eq '1') {$sleeping=$true;break}; Start-Sleep -Milliseconds 100
 }
 if (-not $sleeping) { throw 'Não foi possível confirmar primeira sessão mantendo a transação aberta.' }
 $secondArgs=@('-X',('--dbname="'+$Connection+'"'),'-v','ON_ERROR_STOP=1','-f',('"'+$secondSql+'"'))
 $second=Start-Process -FilePath $Psql -ArgumentList $secondArgs -PassThru -WindowStyle Hidden -RedirectStandardOutput ($ArtifactPrefix+'.second.out') -RedirectStandardError ($ArtifactPrefix+'.second.err')
 $waited=$false
 for($attempt=0;$attempt -lt 15;$attempt++) {
  $probe=& $Psql -X --dbname=$Connection -t -A -c "SELECT count(*) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND query LIKE 'SELECT $rpcName%' AND wait_event_type='Lock';"
  if (($probe -join '').Trim() -eq '1') {$waited=$true;break}; Start-Sleep -Milliseconds 100
 }
 $first.WaitForExit();$second.WaitForExit()
 if (-not $waited -or $first.ExitCode -ne 0 -or $second.ExitCode -eq 0) { throw 'Concorrência não cumpriu bloqueio/sucesso/conflito esperados.' }
 if ((Get-Content -Raw -LiteralPath ($ArtifactPrefix+'.second.err')) -notmatch 'revision_conflict') {throw 'template-second falhou por motivo diferente de conflito.'}
 $state=& $Psql -X --dbname=$Connection -t -A -c $stateQuery
 if ($LASTEXITCODE -ne 0 -or ($state -join '').Trim() -ne 't') {throw 'Revisão ou histórico divergente após concorrência.'}
 Write-Output "PASS: $Domain concurrency confirmed waiting lock; first persisted; second conflicted; history preserved"
} finally {
 # O runner desliga todo o cluster em finally, mesmo em falha de teste.
}
