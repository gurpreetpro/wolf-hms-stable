#!/bin/bash
# Wolf Node Setup Script
# Run this on your InterServer VPS (163.245.208.73)
#
# Usage: 
#   1. SSH into your VPS: ssh root@163.245.208.73
#   2. Run: curl -sSL https://raw.githubusercontent.com/your-repo/setup.sh | bash
#   Or copy-paste the commands below

echo "=========================================="
echo "  Wolf Node TURN Server Setup"
echo "  VPS: 163.245.208.73"
echo "=========================================="

# Update system
echo "[1/5] Updating system..."
apt-get update && apt-get upgrade -y

# Install Docker
echo "[2/5] Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Create wolf-node directory
echo "[3/5] Creating wolf-node directory..."
mkdir -p /opt/wolf-node
cd /opt/wolf-node

# Create docker-compose.yml
echo "[4/5] Creating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.9'

services:
  coturn:
    image: coturn/coturn:latest
    container_name: wolf-turn
    restart: always
    network_mode: host
    volumes:
      - ./turnserver.conf:/etc/coturn/turnserver.conf:ro
    command: -c /etc/coturn/turnserver.conf
EOF

# Create turnserver.conf
cat > turnserver.conf << 'EOF'
# Wolf TURN Server Configuration
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0

# Your VPS IP
external-ip=163.245.208.73

# Relay ports
min-port=49152
max-port=65535

# Authentication
realm=wolfhms.com
server-name=wolf-turn

# Credentials (CHANGE THIS PASSWORD!)
user=wolf:WolfTurn2026SecurePass!
lt-cred-mech

# Logging
log-file=/var/log/coturn.log
verbose

# Security
fingerprint
no-multicast-peers

# Performance
proc=-1
EOF

# Start Coturn
echo "[5/5] Starting Coturn TURN server..."
docker-compose up -d

# Check status
echo ""
echo "=========================================="
echo "  ✅ Wolf Node Setup Complete!"
echo "=========================================="
echo ""
echo "TURN Server: turn:163.245.208.73:3478"
echo "Username: wolf"
echo "Password: WolfTurn2026SecurePass!"
echo ""
echo "Test with: docker logs wolf-turn"
echo ""

# Verify it's running
docker ps | grep wolf-turn
