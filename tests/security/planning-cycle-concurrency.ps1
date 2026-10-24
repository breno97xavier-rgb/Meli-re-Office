param([string]$Psql,[string]$Connection,[string]$ArtifactPrefix)
$ErrorActionPreference='Stop'
& $Psql -X --dbname=$Connection -v ON_ERROR_STOP=1 -c "UPDATE client_editorial_templates SET slots=(SELECT snapshot->'slots' FROM editorial_cycle_applications WHERE editorial_plan_id='00000000-0000-0000-0000-000000000051');"
if($LASTEXITCODE -ne 0){throw 'Preparação fictícia da concorrência falhou.'}
$apply="SELECT apply_editorial_template('00000000-0000-0000-0000-000000000021',cycle_id(3),'00000000-0000-0000-0000-000000000101',3);"
$resolve="SELECT resolve_editorial_slot_content('00000000-0000-0000-0000-000000000021',(SELECT id FROM editorial_cycle_applications WHERE editorial_plan_id=cycle_id(3)),'00000000-0000-0000-0000-000000000201',1,NULL,'{`"internal_title`":`"Concorrência fictícia`",`"format`":`"reels`",`"editorial_status`":`"draft`"}');"
foreach($case in @(@{Name='application';Query=$apply;Check="SELECT count(*)=1 FROM editorial_cycle_applications WHERE editorial_plan_id=cycle_id(3)"},@{Name='content';Query=$resolve;Check="SELECT count(*)=1 AND count(DISTINCT content_id)=1 FROM editorial_cycle_content_links WHERE application_id=(SELECT id FROM editorial_cycle_applications WHERE editorial_plan_id=cycle_id(3))"})) {
 $prefix=$ArtifactPrefix+'.'+$case.Name
 $auth="SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false);"
 [IO.File]::WriteAllText($prefix+'.first.sql',"BEGIN; $auth $($case.Query) SELECT pg_sleep(3); COMMIT;",[Text.UTF8Encoding]::new($false))
 [IO.File]::WriteAllText($prefix+'.second.sql',"$auth $($case.Query)",[Text.UTF8Encoding]::new($false))
 $first=Start-Process -FilePath $Psql -ArgumentList @('-X',('--dbname="'+$Connection+' application_name=cycle_first"'),'-v','ON_ERROR_STOP=1','-f',('"'+$prefix+'.first.sql"')) -PassThru -WindowStyle Hidden -RedirectStandardOutput ($prefix+'.first.out') -RedirectStandardError ($prefix+'.first.err')
 $sleeping=$false
 for($i=0;$i -lt 25;$i++) { $state=& $Psql -X --dbname=$Connection -t -A -c "SELECT count(*)=1 FROM pg_stat_activity WHERE application_name='cycle_first' AND wait_event='PgSleep'";if(($state -join '').Trim() -eq 't'){$sleeping=$true;break};Start-Sleep -Milliseconds 100 }
 if(-not $sleeping){throw 'Primeira sessão não confirmou bloqueio.'}
 $second=Start-Process -FilePath $Psql -ArgumentList @('-X',('--dbname="'+$Connection+' application_name=cycle_second"'),'-v','ON_ERROR_STOP=1','-f',('"'+$prefix+'.second.sql"')) -PassThru -WindowStyle Hidden -RedirectStandardOutput ($prefix+'.second.out') -RedirectStandardError ($prefix+'.second.err')
 $waiting=$false
 for($i=0;$i -lt 20;$i++) {$state=& $Psql -X --dbname=$Connection -t -A -c "SELECT count(*)=1 FROM pg_stat_activity WHERE application_name='cycle_second' AND wait_event_type='Lock'";if(($state -join '').Trim() -eq 't'){$waiting=$true;break};Start-Sleep -Milliseconds 100}
 $first.WaitForExit();$second.WaitForExit()
 if(-not $waiting -or $first.ExitCode -ne 0 -or $second.ExitCode -ne 0){throw "Falha da concorrência $($case.Name). Consultar os artefatos locais."}
 $state=& $Psql -X --dbname=$Connection -t -A -c $case.Check
 if($LASTEXITCODE -ne 0 -or ($state -join '').Trim() -ne 't'){throw 'Concorrência duplicou aplicação ou conteúdo.'}
 Write-Output "PASS: cycle $($case.Name) concurrent retry waited and returned one shared record"
}
