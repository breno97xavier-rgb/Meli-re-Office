param([int]$Port=55441,[string]$Fixture='planning-authorization-lab.sql')
$ErrorActionPreference='Stop'
# Runtime já existente; não instala, não usa Supabase nem lê configurações de conexão.
$runtime='C:\Users\breno\AppData\Local\Temp\office-helper-lab-20261009\pgsql\bin'
$init=Join-Path $runtime 'initdb.exe'
$ctl=Join-Path $runtime 'pg_ctl.exe'
$psql=Join-Path $runtime 'psql.exe'
if (-not (Test-Path -LiteralPath $init)) { throw 'PostgreSQL portátil existente indisponível.' }
$data=Join-Path $env:TEMP ('office-planning-auth-'+[guid]::NewGuid().ToString('N'))
$probe=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$Port)
try { $probe.Start() } finally { $probe.Stop() }
$started=$false
try {
 & $init -D $data -U office_lab -A trust --encoding=UTF8 --no-locale
 if ($LASTEXITCODE -ne 0) { throw 'Falha ao inicializar cluster local descartável.' }
 # pg_ctl inicia um descendente persistente. Isolar seus streams evita que a
 # captura de saída do PowerShell aguarde o servidor em vez do processo pg_ctl.
 $startArgs=@('-D',('"'+$data+'"'),'-l',('"'+$data+'.log"'),'-o',('"-h 127.0.0.1 -p '+$Port+'"'),'-w','start')
 $startProcess=Start-Process -FilePath $ctl -ArgumentList $startArgs -PassThru -WindowStyle Hidden -RedirectStandardOutput ($data+'.start.out') -RedirectStandardError ($data+'.start.err')
 $startProcess.WaitForExit()
 if ($startProcess.ExitCode -ne 0) { throw 'Falha ao iniciar PostgreSQL local.' }; $started=$true
 & $psql -X --dbname="host=127.0.0.1 port=$Port user=office_lab dbname=postgres connect_timeout=5" -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot $Fixture)
 if ($LASTEXITCODE -ne 0) { throw 'Laboratório de autorização de Planejamento falhou.' }
 if ($Fixture -eq 'planning-foundation-lab.sql') {
  & (Join-Path $PSScriptRoot 'planning-foundation-concurrency.ps1') -Psql $psql -Connection "host=127.0.0.1 port=$Port user=office_lab dbname=postgres connect_timeout=5" -ArtifactPrefix ($data+'.concurrency')
 }
} finally {
 if ($started) { & $ctl -D $data -m fast -w stop }
 # Sem exclusão recursiva: cluster exclusivamente fictício permanece no TEMP.
}
