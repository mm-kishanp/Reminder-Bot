param(
  [string]$Port = "3978"
)

Write-Host "Starting bot in dev mode..."
Start-Process -FilePath "npm" -ArgumentList "run", "dev"

Write-Host "Starting ngrok tunnel..."
ngrok http $Port
