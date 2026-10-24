param([int]$Port=55443,[string]$Runtime='C:/Users/breno/AppData/Local/Temp/office-template-runtime-20261022/pgsql/bin')
$ErrorActionPreference='Stop'
$data=Join-Path $env:TEMP ('office-review-'+[guid]::NewGuid().ToString('N'))
$ctl=Join-Path $Runtime 'pg_ctl.exe'; $psql=Join-Path $Runtime 'psql.exe'
$connection="host=127.0.0.1 port=$Port user=office_lab dbname=postgres connect_timeout=5"
$started=$false; $children=@()
function Query([string]$Sql) {
 $answer=& $psql -X --dbname=$connection -v ON_ERROR_STOP=1 -t -A -c $Sql
 if ($LASTEXITCODE -ne 0) { throw 'Consulta local falhou.' }; return ($answer -join "`n").Trim()
}
function Session([string]$Name,[string]$Sql) {
 $file=$data+'.'+$Name+'.sql'; [IO.File]::WriteAllText($file,$Sql,[Text.UTF8Encoding]::new($false))
 $process=Start-Process -FilePath $psql -ArgumentList @('-X',('--dbname="'+$connection+' application_name='+$Name+'"'),'-v','ON_ERROR_STOP=1','-f',('"'+$file+'"')) -PassThru -WindowStyle Hidden -RedirectStandardOutput ($data+'.'+$Name+'.out') -RedirectStandardError ($data+'.'+$Name+'.err')
 $script:children += $process; return $process
}
function Barrier([string]$Name,[string]$Wait) {
 $deadline=[DateTime]::UtcNow.AddSeconds(10)
 while ([DateTime]::UtcNow -lt $deadline) {
  if ((Query "SELECT count(*) FROM pg_stat_activity WHERE application_name='$Name' AND wait_event='$Wait'") -eq '1') { return }
  Start-Sleep -Milliseconds 50
 }; throw "Barreira não observada: $Name/$Wait"
}
function Finished($Process,[string]$Name,[bool]$Success=$true) {
 if (-not $Process.WaitForExit(15000)) { throw 'Timeout da sessão local.' }; $Process.Refresh()
 if ($Success -and $Process.ExitCode -ne 0) { Get-Content ($data+'.'+$Name+'.err'); throw 'Sessão local falhou.' }
 if (-not $Success -and ($Process.ExitCode -eq 0 -or -not (Select-String -LiteralPath ($data+'.'+$Name+'.err') -Pattern 'ITEM_ALREADY_REVIEWED' -Quiet))) { throw 'Decisão concorrente não foi rejeitada como esperado.' }
}
try {
 & (Join-Path $Runtime 'initdb.exe') -D $data -U office_lab -A trust --encoding=UTF8 --no-locale | Out-Null
 if ($LASTEXITCODE -ne 0) { throw 'Falha initdb local.' }
 $start=Start-Process -FilePath $ctl -ArgumentList @('-D',('"'+$data+'"'),'-l',('"'+$data+'.log"'),'-o',('"-h 127.0.0.1 -p '+$Port+'"'),'-w','start') -PassThru -WindowStyle Hidden -RedirectStandardOutput ($data+'.start.out') -RedirectStandardError ($data+'.start.err')
 $start.WaitForExit(); $start.Refresh(); if ($start.ExitCode -ne 0) { throw 'Falha servidor local.' }; $started=$true
 & $psql -X --dbname=$connection -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'presentation-review-versions-lab.sql')
 if ($LASTEXITCODE -ne 0) { throw 'Fixture de revisão falhou.' }
 Query "INSERT INTO content_assets(id,content_id,asset_type,file_url,file_name,mime_type,file_size_bytes) VALUES(lab_uuid(401),lab_uuid(38),'image','workspace/'||lab_uuid(1)||'/clients/'||lab_uuid(11)||'/contents/'||lab_uuid(38)||'/'||lab_uuid(401)||'.png','old.png','image/png',100); INSERT INTO storage.objects VALUES('content-assets','workspace/'||lab_uuid(1)||'/clients/'||lab_uuid(11)||'/contents/'||lab_uuid(38)||'/'||lab_uuid(402)||'.png');" | Out-Null
 $identity="SELECT set_config('request.jwt.claim.role','authenticated',false); SELECT set_config('request.jwt.claim.sub',lab_uuid(201)::text,false);"
 $first=Session 'review_prepare' ("BEGIN;"+$identity+" SELECT prepare_presentation_review(lab_uuid(52)); SELECT pg_sleep(3); COMMIT;")
 Barrier 'review_prepare' 'PgSleep'
 $second=Session 'review_replace' ($identity+" SELECT mutate_content_asset_version(lab_uuid(38),lab_uuid(401),jsonb_build_object('file_url','workspace/'||lab_uuid(1)||'/clients/'||lab_uuid(11)||'/contents/'||lab_uuid(38)||'/'||lab_uuid(402)||'.png','file_name','new.png','mime_type','image/png','file_size_bytes',120));")
 Finished $first 'review_prepare'; Finished $second 'review_replace'
 if ((Query "SELECT (SELECT review_assets->0->>'file_name'='old.png' FROM presentation_items WHERE id=lab_uuid(74)) AND (SELECT count(*)=1 AND max(version)=2 FROM content_assets WHERE content_id=lab_uuid(38) AND is_current)") -ne 't') { throw 'Snapshot misturou versões concorrentes.' }
 Write-Output 'PASS: concorrência preparar/substituir preserva snapshot v1 e arquivo atual v2'
 $decision="SELECT submit_presentation_review_decision(lab_uuid(74),(SELECT review_id FROM presentation_items WHERE id=lab_uuid(74)),'approved',NULL,repeat('h',64));"
 $first=Session 'review_decide_one' ("BEGIN;"+$decision+" SELECT pg_sleep(3); COMMIT;")
 Barrier 'review_decide_one' 'PgSleep'
 $second=Session 'review_decide_two' $decision
 Finished $first 'review_decide_one'; Finished $second 'review_decide_two' $false
 Write-Output 'PASS: duas decisões concorrentes registram somente o primeiro parecer'
} finally {
 foreach($child in $children) { if (-not $child.HasExited) { $child.Kill(); $child.WaitForExit() } }
 if ($started) { & $ctl -D $data -m fast -w stop }
 # Preserva cluster fictício no TEMP; nunca acessa Supabase nem apaga trabalho do usuário.
}
