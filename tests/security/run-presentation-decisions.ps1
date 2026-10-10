param([int]$Port = 55439, [switch]$IncludeWorkspaceScope)
$ErrorActionPreference = 'Stop'
$labRoot = Join-Path $env:TEMP 'office-helper-lab-20261009'
$bin = Join-Path $labRoot 'pgsql/bin'
$data = Join-Path $labRoot 'data'
$pgCtl = Join-Path $bin 'pg_ctl.exe'
$psql = Join-Path $bin 'psql.exe'
$database = 'office_decisions_test_' + [guid]::NewGuid().ToString('N').Substring(0,12)
$work = Join-Path $labRoot $database
if (-not (Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))) { throw 'Laboratório portátil ausente.' }
if (Test-Path -LiteralPath (Join-Path $data 'postmaster.pid')) { throw 'Não usar ou parar cluster já em execução.' }
$probe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$Port)
try { $probe.Start() } finally { $probe.Stop() }
New-Item -ItemType Directory -Path $work | Out-Null
$adminConnection = "host=127.0.0.1 port=$Port user=office_lab dbname=postgres connect_timeout=5"
$connection = "host=127.0.0.1 port=$Port user=office_lab dbname=$database connect_timeout=5"
$started = $false
$created = $false
$rolesOwned = $false
$children = @()
function Invoke-LabQuery([string]$Sql) {
  $result = & $psql -X --dbname=$connection -v ON_ERROR_STOP=1 -t -A -c $Sql
  if ($LASTEXITCODE -ne 0) { throw 'Consulta de laboratório falhou.' }
  return ($result -join "`n").Trim()
}
function Start-LabSession([string]$Name, [string]$Sql) {
  $path = Join-Path $work ($Name+'.sql')
  [IO.File]::WriteAllText($path,$Sql,[Text.UTF8Encoding]::new($false))
  $process = Start-Process -FilePath $psql -ArgumentList @('-X',('--dbname="'+$connection+' application_name='+$Name+'"'),'-v','ON_ERROR_STOP=1','-f',('"'+$path+'"')) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $work ($Name+'.out')) -RedirectStandardError (Join-Path $work ($Name+'.err'))
  $script:children += $process
  return $process
}
function Wait-LabSleep([string]$Name) {
  $deadline = [DateTime]::UtcNow.AddSeconds(10)
  while ([DateTime]::UtcNow -lt $deadline) {
    $ready = Invoke-LabQuery "SELECT count(*) FROM pg_stat_activity WHERE application_name='$Name' AND wait_event='PgSleep';"
    if ($ready -eq '1') { return }
    Start-Sleep -Milliseconds 50
  }
  throw "Sessão de concorrência não atingiu barreira: $Name"
}
function Wait-LabSuccess($Process,[string]$Name) {
  if (-not $Process.WaitForExit(15000)) { throw "Timeout de concorrência: $Name" }
  $Process.Refresh()
  if ($Process.ExitCode -ne 0) {
    Get-Content -LiteralPath (Join-Path $work ($Name+'.err'))
    throw "Sessão de concorrência falhou: $Name"
  }
}
function Wait-LabLock([string]$Name) {
  $deadline = [DateTime]::UtcNow.AddSeconds(5)
  while ([DateTime]::UtcNow -lt $deadline) {
    if ((Invoke-LabQuery "SELECT count(*) FROM pg_stat_activity WHERE application_name='$Name' AND wait_event_type='Lock';") -eq '1') { return }
    Start-Sleep -Milliseconds 30
  }
  throw "Não foi observado bloqueio concorrente: $Name"
}
function Assert-Lab([string]$Label,[string]$Sql) {
  if ((Invoke-LabQuery $Sql) -ne 't') { throw "FAIL: $Label" }
  Write-Output "PASS: $Label"
}
try {
  $start = Start-Process -FilePath $pgCtl -ArgumentList @('-D',('"'+$data+'"'),'-l',('"'+(Join-Path $work 'server.log')+'"'),'-o',('"-h 127.0.0.1 -p '+$Port+'"'),'-w','start') -WindowStyle Hidden -PassThru
  $start.WaitForExit(); $start.Refresh()
  if ($start.ExitCode -ne 0) { throw 'Falha ao iniciar PostgreSQL local.' }
  $started = $true
  $roles = & $psql -X --dbname=$adminConnection -t -A -c "SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role');"
  if ($LASTEXITCODE -ne 0 -or ($roles -join '').Trim() -ne '0') { throw 'Roles de teste já existem; não modificar roles preexistentes.' }
  & $psql -X --dbname=$adminConnection -v ON_ERROR_STOP=1 -c "CREATE DATABASE $database;"
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar banco descartável.' }
  $created = $true
  & $psql -X --dbname=$connection -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'presentation-decisions-fixture.sql')
  if ($LASTEXITCODE -ne 0) { throw 'Falha no fixture local.' }
  $rolesOwned = $true
  & $psql -X --dbname=$connection -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'presentation-decisions.sql')
  if ($LASTEXITCODE -ne 0) { throw 'Falha na suíte SQL.' }
  if ($IncludeWorkspaceScope) {
    & $psql -X --dbname=$connection -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'presentation-workspace-fixture.sql')
    if ($LASTEXITCODE -ne 0) { throw 'Falha no fixture de workspace.' }
    & $psql -X --dbname=$connection -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'presentation-workspace.sql')
    if ($LASTEXITCODE -ne 0) { throw 'Falha nos testes de workspace.' }
  }

  $anon = "SET ROLE anon; SET request.jwt.claim.role='anon'; SET request.jwt.claim.sub='';"
  # Same item: first decision commits, second observes the final state and is rejected.
  $a = Start-LabSession 'office_dupe_first' "BEGIN; $anon SELECT submit_public_presentation_decision(repeat('g',64),lab_uuid(71),'approved'); SELECT pg_sleep(1.5); COMMIT;"
  Wait-LabSleep 'office_dupe_first'
  $b = Start-LabSession 'office_dupe_second' "$anon SELECT submit_public_presentation_decision(repeat('g',64),lab_uuid(71),'rejected','concurrent feedback');"
  Wait-LabLock 'office_dupe_second'
  Wait-LabSuccess $a 'office_dupe_first'
  if (-not $b.WaitForExit(15000)) { throw 'Timeout segunda decisão.' }; $b.Refresh()
  if ($b.ExitCode -eq 0 -or -not ([IO.File]::ReadAllText((Join-Path $work 'office_dupe_second.err')).Contains('ITEM_ALREADY_REVIEWED'))) { throw 'FAIL: decisão pública concorrente não foi bloqueada.' }
  Assert-Lab 'duplicate decision serialized' "SELECT client_approval_status='approved' FROM presentation_items WHERE id=lab_uuid(71);"

  # Different items: parent lock serializes the aggregate count, preventing stale status.
  $a = Start-LabSession 'office_aggregate_first' "BEGIN; $anon SELECT submit_public_presentation_decision(repeat('h',64),lab_uuid(73),'approved'); SELECT pg_sleep(1.5); COMMIT;"
  Wait-LabSleep 'office_aggregate_first'
  $b = Start-LabSession 'office_aggregate_second' "$anon SELECT submit_public_presentation_decision(repeat('h',64),lab_uuid(74),'approved');"
  Wait-LabLock 'office_aggregate_second'
  Wait-LabSuccess $a 'office_aggregate_first'; Wait-LabSuccess $b 'office_aggregate_second'
  Assert-Lab 'concurrent aggregate includes both items' "SELECT status='approved' AND (SELECT count(*) FROM presentation_items WHERE presentation_id=lab_uuid(52) AND client_approval_status='approved')=2 FROM presentations WHERE id=lab_uuid(52);"

  # Revocation holds the same link row; a waiting public decision must see revocation.
  $a = Start-LabSession 'office_revoke_first' "BEGIN; UPDATE presentation_access_links SET revoked_at=clock_timestamp() WHERE id=lab_uuid(89); SELECT pg_sleep(1.5); COMMIT;"
  Wait-LabSleep 'office_revoke_first'
  $b = Start-LabSession 'office_revoke_second' "$anon SELECT submit_public_presentation_decision(repeat('i',64),lab_uuid(75),'approved');"
  Wait-LabLock 'office_revoke_second'
  Wait-LabSuccess $a 'office_revoke_first'
  if (-not $b.WaitForExit(15000)) { throw 'Timeout após revogação.' }; $b.Refresh()
  if ($b.ExitCode -eq 0 -or -not ([IO.File]::ReadAllText((Join-Path $work 'office_revoke_second.err')).Contains('ACCESS_TOKEN_REVOKED'))) { throw 'FAIL: revogação concorrente ignorada.' }
  Assert-Lab 'revocation race prevents write' "SELECT client_approval_status='pending' FROM presentation_items WHERE id=lab_uuid(75);"

  # Expiry occurs while waiting for the content lock; clock_timestamp is checked again.
  Invoke-LabQuery "UPDATE presentation_access_links SET revoked_at=NULL, expires_at=clock_timestamp()+interval '900 milliseconds' WHERE id=lab_uuid(89);" | Out-Null
  $a = Start-LabSession 'office_expire_first' "BEGIN; SELECT id FROM contents WHERE id=lab_uuid(39) FOR NO KEY UPDATE; SELECT pg_sleep(1.5); COMMIT;"
  Wait-LabSleep 'office_expire_first'
  $b = Start-LabSession 'office_expire_second' "$anon SELECT submit_public_presentation_decision(repeat('i',64),lab_uuid(75),'approved');"
  Wait-LabLock 'office_expire_second'
  Wait-LabSuccess $a 'office_expire_first'
  if (-not $b.WaitForExit(15000)) { throw 'Timeout de expiração.' }; $b.Refresh()
  if ($b.ExitCode -eq 0 -or -not ([IO.File]::ReadAllText((Join-Path $work 'office_expire_second.err')).Contains('ACCESS_TOKEN_EXPIRED'))) { throw 'FAIL: expiração durante espera ignorada.' }
  Assert-Lab 'expiry during lock wait prevents write' "SELECT client_approval_status='pending' FROM presentation_items WHERE id=lab_uuid(75);"
  if ($IncludeWorkspaceScope) {
    $operator = "SET ROLE authenticated; SET request.jwt.claim.role='authenticated'; SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000203';"
    $a = Start-LabSession 'office_round_first' "BEGIN; $operator SELECT create_next_presentation_round(lab_uuid(53),ARRAY[lab_uuid(39)]); SELECT pg_sleep(1.5); COMMIT;"
    Wait-LabSleep 'office_round_first'
    $b = Start-LabSession 'office_round_second' "$operator SELECT create_next_presentation_round(lab_uuid(53),ARRAY[lab_uuid(39)]);"
    Wait-LabLock 'office_round_second'
    Wait-LabSuccess $a 'office_round_first'
    if (-not $b.WaitForExit(15000)) { throw 'Timeout da rodada concorrente.' }; $b.Refresh()
    if ($b.ExitCode -eq 0 -or -not ([IO.File]::ReadAllText((Join-Path $work 'office_round_second.err')).Contains('ALREADY_HAS_NEXT_ROUND'))) { throw 'FAIL: duas rodadas diretas criadas concorrencialmente.' }
    Assert-Lab 'concurrent round creates one successor' "SELECT count(*)=1 FROM presentations WHERE previous_presentation_id=lab_uuid(53);"
    Assert-Lab 'source round remains in history' "SELECT round_number=1 AND previous_presentation_id IS NULL FROM presentations WHERE id=lab_uuid(53);"
  }
  Assert-Lab 'no deadlocks in isolated database' "SELECT deadlocks=0 FROM pg_stat_database WHERE datname=current_database();"
} finally {
  # Processes belong exclusively to this run; allow pending transactions to finish before cleanup.
  foreach ($child in $children) { if (-not $child.HasExited) { $child.WaitForExit(15000) | Out-Null } }
  if ($started) {
    if ($created) {
      & $psql -X --dbname=$adminConnection -v ON_ERROR_STOP=1 -c "DROP DATABASE $database;"
      if ($LASTEXITCODE -ne 0) { Write-Warning 'Banco descartável não removido; conferir laboratório.' }
    }
    if ($rolesOwned) {
      & $psql -X --dbname=$adminConnection -v ON_ERROR_STOP=1 -c 'DROP ROLE anon, authenticated, service_role;'
      if ($LASTEXITCODE -ne 0) { Write-Warning 'Roles locais não removidas; conferir laboratório.' }
    }
    $stop = Start-Process -FilePath $pgCtl -ArgumentList @('-D',('"'+$data+'"'),'-m','fast','-w','stop') -WindowStyle Hidden -PassThru
    $stop.WaitForExit(); $stop.Refresh()
    if ($stop.ExitCode -ne 0) { throw 'Não foi possível desligar laboratório.' }
  }
}
