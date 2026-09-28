#!/usr/bin/env bash
# ==============================================================================
# Automated EC2 Bootstrap & Deployment Script for Limo Executive Platform
# Compatible with Ubuntu 22.04 LTS / Ubuntu 24.04 LTS & Debian
# ==============================================================================
set -e

echo "=========================================================="
echo "🚀 Initializing Limo Executive Platform on AWS EC2..."
echo "=========================================================="

# 1. Update OS packages & install prerequisites
echo "📦 Updating OS packages and installing prerequisites..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw fail2ban

# 2. Install Docker & Docker Compose v2 (Official Docker Repository)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable non-root docker execution
    sudo usermod -aG docker $USER || true
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "✅ Docker Engine & Docker Compose installed successfully."
else
    echo "✅ Docker is already installed."
fi

# 3. Configure EC2 Firewall (UFW)
echo "🔒 Configuring firewall ports (22, 80, 443, 8000-8006)..."
sudo ufw allow 22/tcp comment "SSH"
sudo ufw allow 80/tcp comment "HTTP / SSL Challenge"
sudo ufw allow 443/tcp comment "HTTPS"
sudo ufw allow 8000/tcp comment "Global Hub"
sudo ufw allow 8001/tcp comment "ANB Philly Cell"
sudo ufw allow 8002/tcp comment "NY Executive Cell"
sudo ufw allow 8003/tcp comment "Boston VIP Cell"
sudo ufw allow 8004/tcp comment "Miami Prestige Cell"
sudo ufw allow 8005/tcp comment "London Royal Cell"
sudo ufw allow 8006/tcp comment "Tokyo Sovereign Cell"
sudo ufw --force enable || true

# 4. Clone or pull repository
APP_DIR="/opt/limo-platform"
if [ ! -d "$APP_DIR" ]; then
    echo "📥 Creating application directory at $APP_DIR..."
    sudo mkdir -p "$APP_DIR"
    sudo chown -R $USER:$USER "$APP_DIR"
    echo "⚠️ Please clone the repository into $APP_DIR or copy your project files."
else
    echo "📂 Application directory exists at $APP_DIR"
fi

cd "$APP_DIR"

# 5. Verify .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating default .env from template..."
    cat << 'EOF' > .env
ENVIRONMENT=staging
DEBUG=false
MYSQL_ROOT_PASSWORD=LimoExecutiveStaging2026!
MYSQL_DATABASE=limo_db
MYSQL_USER=limo_app
MYSQL_PASSWORD=LimoAppSecretPass2026!
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
TWILIO_ACCOUNT_SID=AC_placeholder
TWILIO_AUTH_TOKEN=auth_placeholder
GOOGLE_MAPS_API_KEY=AIza_placeholder
EOF
    echo "✅ Created .env with secure staging defaults."
fi

# 6. Build and start containers
echo "🏗️ Building and launching Docker Compose multi-vendor stack..."
docker compose -f deployment/ec2/docker-compose.staging.yml up -d --build

echo ""
echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=========================================================="
echo "Live Services running on EC2:"
echo " • Global Hub Marketplace:      http://<YOUR_EC2_PUBLIC_IP>:8000"
echo " • ANB Philly Chauffeur App:    http://<YOUR_EC2_PUBLIC_IP>:8001/?view=driver"
echo " • ANB Philly Owner Dashboard:  http://<YOUR_EC2_PUBLIC_IP>:8001/?view=vendor"
echo " • ANB Philly Public Booking:   http://<YOUR_EC2_PUBLIC_IP>:8001/"
echo " • Reverse Proxy (HTTPS / SSL): http://<YOUR_EC2_PUBLIC_IP>:80"
echo "=========================================================="
