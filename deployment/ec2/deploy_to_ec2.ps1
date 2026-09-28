# PowerShell 1-Click Deployer to AWS EC2
# Usage: .\deployment\ec2\deploy_to_ec2.ps1 -Ec2Host "ec2-user@YOUR_EC2_PUBLIC_IP" -KeyPath "path\to\your-key.pem"
param (
    [Parameter(Mandatory=$true)]
    [string]$Ec2Host,

    [Parameter(Mandatory=$true)]
    [string]$KeyPath,

    [string]$RemoteDir = "/opt/limo-platform"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Deploying Limo Platform to AWS EC2 ($Ec2Host)..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Build React frontend locally first to catch any type errors
Write-Host "📦 1. Building React / TypeScript production bundle locally..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\..\frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed! Aborting deployment." -ForegroundColor Red
    exit 1
}
Set-Location "$PSScriptRoot\..\.."

# 2. Sync files to EC2
Write-Host "📤 2. Uploading code to EC2 ($RemoteDir)..." -ForegroundColor Yellow
ssh -i $KeyPath $Ec2Host "mkdir -p $RemoteDir/app $RemoteDir/config $RemoteDir/scripts $RemoteDir/tests $RemoteDir/deployment $RemoteDir/frontend/dist"

scp -i $KeyPath -r app/* "$($Ec2Host):$RemoteDir/app/"
scp -i $KeyPath -r config/* "$($Ec2Host):$RemoteDir/config/"
scp -i $KeyPath -r scripts/* "$($Ec2Host):$RemoteDir/scripts/"
scp -i $KeyPath -r tests/* "$($Ec2Host):$RemoteDir/tests/"
scp -i $KeyPath -r deployment/* "$($Ec2Host):$RemoteDir/deployment/"
scp -i $KeyPath -r frontend/dist/* "$($Ec2Host):$RemoteDir/frontend/dist/"
scp -i $KeyPath Dockerfile requirements.txt "$($Ec2Host):$RemoteDir/"

# 3. Trigger Docker Compose rebuild & restart on EC2
Write-Host "🔄 3. Rebuilding containers & restarting services on EC2..." -ForegroundColor Yellow
ssh -i $KeyPath $Ec2Host "cd $RemoteDir && docker compose -f deployment/ec2/docker-compose.staging.yml up -d --build"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✅ DEPLOYMENT SUCCEEDED ON AWS EC2!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
