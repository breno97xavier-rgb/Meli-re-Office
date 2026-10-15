param([int]$Port=55439,[string]$Fixture='finance-mvp-lab.sql')
$ErrorActionPreference='Stop'
$labRoot=Join-Path $env:TEMP 'office-helper-lab-20261009'
$pgCtl=Join-Path $labRoot 'pgsql/bin/pg_ctl.exe'
$psql=Join-Path $labRoot 'pgsql/bin/psql.exe'
$initDb=Join-Path $labRoot 'pgsql/bin/initdb.exe'
if (-not (Test-Path $initDb)) { throw 'PostgreSQL portátil ausente; não instalar automaticamente.' }
$data=Join-Path $labRoot ('finance-data-'+[guid]::NewGuid().ToString('N').Substring(0,12))
$probe=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$Port)
try { $probe.Start() } finally { $probe.Stop() }
$database='office_finance_test_'+[guid]::NewGuid().ToString('N').Substring(0,12)
$adminConnection="host=127.0.0.1 port=$Port user=office_lab dbname=postgres connect_timeout=5"
$connection="host=127.0.0.1 port=$Port user=office_lab dbname=$database connect_timeout=5"
$started=$false; $created=$false; $rolesOwned=$false
try {
 & $initDb -D $data -U office_lab -A trust --encoding=UTF8 --no-locale
 if ($LASTEXITCODE -ne 0) { throw 'Cluster descartável não inicializado.' }
 & $pgCtl -D $data -l (Join-Path $labRoot 'finance-test-server.log') -o "-h 127.0.0.1 -p $Port" -w start
 if ($LASTEXITCODE -ne 0) { throw 'Servidor local não iniciou.' }; $started=$true
 $roles=& $psql -X --dbname=$adminConnection -t -A -c "SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated');"
 if ($LASTEXITCODE -ne 0 -or ($roles -join '').Trim() -ne '0') { throw 'Roles preexistentes; interrompendo.' }
 & $psql -X --dbname=$adminConnection -v ON_ERROR_STOP=1 -c "CREATE DATABASE $database;"
 if ($LASTEXITCODE -ne 0) { throw 'Banco descartável não criado.' }; $created=$true; $rolesOwned=$true
 & $psql -X --dbname=$connection -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot $Fixture)
 if ($LASTEXITCODE -ne 0) { throw 'Teste de Financeiro falhou.' }
} finally {
 if ($created) { & $psql -X --dbname=$adminConnection -v ON_ERROR_STOP=1 -c "DROP DATABASE $database;" }
 if ($rolesOwned) { & $psql -X --dbname=$adminConnection -v ON_ERROR_STOP=1 -c 'DROP ROLE anon; DROP ROLE authenticated;' }
 if ($started) { & $pgCtl -D $data -m fast -w stop }
}
