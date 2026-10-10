param([int]$Port = 55439)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$labRoot = Join-Path $env:TEMP 'office-helper-lab-20261009'
$bin = Join-Path $labRoot 'pgsql/bin'
$data = Join-Path $labRoot 'data'
$pgCtl = Join-Path $bin 'pg_ctl.exe'
$psql = Join-Path $bin 'psql.exe'
if (-not (Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))) { throw 'Cluster local ausente. Instale/inicialize o laboratório portátil primeiro.' }
if (Test-Path -LiteralPath (Join-Path $data 'postmaster.pid')) { throw 'Cluster já está ativo; não conectar ou interromper uma instância existente.' }
$probe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$Port)
try { $probe.Start() } finally { $probe.Stop() }
$started = $false
try {
  $start = Start-Process -FilePath $pgCtl -ArgumentList @('-D',('"'+$data+'"'),'-l',('"'+(Join-Path $labRoot 'server.log')+'"'),'-o',('"-h 127.0.0.1 -p '+$Port+'"'),'-w','start') -WindowStyle Hidden -PassThru
  $start.WaitForExit()
  $start.Refresh()
  if ($start.ExitCode -ne 0) { throw 'PostgreSQL local não iniciou; consultar server.log do laboratório.' }
  $started = $true
  # Explicit loopback endpoint; never uses Supabase, .env, pg_service or application credentials.
  $connection = 'host=127.0.0.1 port='+$Port+' user=office_lab dbname=postgres connect_timeout=5'
  $exists = & $psql -X --dbname=$connection -v ON_ERROR_STOP=1 -t -A -c "SELECT count(*) FROM pg_database WHERE datname = 'office_helpers_test';"
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível verificar o banco de testes.' }
  if (($exists -join '').Trim() -eq '0') {
    & $psql -X --dbname=$connection -v ON_ERROR_STOP=1 -c 'CREATE DATABASE office_helpers_test;'
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível criar o banco de testes.' }
  }
  $connection = 'host=127.0.0.1 port='+$Port+' user=office_lab dbname=office_helpers_test connect_timeout=5'
  & $psql -X --dbname=$connection -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'workspace-helpers.sql')
  if ($LASTEXITCODE -ne 0) { throw 'Falha na suíte de helpers.' }
} finally {
  if ($started) {
    $stop = Start-Process -FilePath $pgCtl -ArgumentList @('-D',('"'+$data+'"'),'-m','fast','-w','stop') -WindowStyle Hidden -PassThru
    $stop.WaitForExit()
    $stop.Refresh()
    if ($stop.ExitCode -ne 0) { throw 'Não foi possível desligar PostgreSQL local; conferir laboratório.' }
  }
}