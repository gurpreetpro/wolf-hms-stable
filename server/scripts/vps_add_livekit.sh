#!/bin/bash
# =============================================================================
# Wolf Voice - Add LiveKit to Existing VPS
# =============================================================================
# 
# Run this script on your VPS (socket.wolfsecurity.in)
# This adds LiveKit alongside your existing Socket.IO signaling server
#
# Prerequisites:
# - Ubuntu 22.04 (or similar)
# - Docker installed
# - Ports 7880, 7881, 50000-50100 available
#
# Usage:
#   ssh root@socket.wolfsecurity.in
#   curl -O https://raw.githubusercontent.com/YOUR_REPO/vps_add_livekit.sh
#   chmod +x vps_add_livekit.sh
#   ./vps_add_livekit.sh
#
# =============================================================================

set -e

echo "========================================="
echo "   WOLF VOICE - LiveKit Installation"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed!"
    echo "Install Docker first: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Generate secure API keys
API_KEY="WolfVoice$(openssl rand -hex 4 | tr '[:lower:]' '[:upper:]')"
API_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)

echo "[1/5] Creating Wolf Voice directory..."
mkdir -p /opt/wolf-voice
cd /opt/wolf-voice

echo "[2/5] Generating configuration..."

# Save credentials
cat > .env << EOF
# Wolf Voice LiveKit Credentials
# KEEP THESE SECRET!
LIVEKIT_API_KEY=$API_KEY
LIVEKIT_API_SECRET=$API_SECRET
LIVEKIT_URL=wss://socket.wolfsecurity.in:7880
EOF

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)

# Create LiveKit config
cat > livekit.yaml << EOF
# LiveKit Server Configuration for Wolf Guard PTT
# Domain: socket.wolfsecurity.in

port: 7880

rtc:
  port_range_start: 50000
  port_range_end: 50100
  use_external_ip: true
  tcp_port: 7881
  # Use your VPS public IP
  node_ip: $PUBLIC_IP

# TURN server for NAT traversal (embedded)
turn:
  enabled: true
  domain: socket.wolfsecurity.in
  tls_port: 5349
  udp_port: 3478

# API Keys
keys:
  $API_KEY: $API_SECRET

logging:
  level: info
  json: false

# Room settings for PTT
room:
  empty_timeout: 600         # 10 min idle before closing
  max_participants: 50       # Max guards per channel
EOF

echo "[3/5] Opening firewall ports..."
# UFW firewall (if using)
if command -v ufw &> /dev/null; then
    ufw allow 7880/tcp comment 'LiveKit HTTP'
    ufw allow 7881/tcp comment 'LiveKit WebRTC TCP'
    ufw allow 3478/udp comment 'TURN UDP'
    ufw allow 5349/tcp comment 'TURN TLS'
    ufw allow 50000:50100/udp comment 'LiveKit WebRTC UDP'
    echo "   UFW rules added"
fi

# iptables fallback
iptables -I INPUT -p tcp --dport 7880 -j ACCEPT 2>/dev/null || true
iptables -I INPUT -p tcp --dport 7881 -j ACCEPT 2>/dev/null || true
iptables -I INPUT -p udp --dport 50000:50100 -j ACCEPT 2>/dev/null || true

echo "[4/5] Starting LiveKit container..."

# Stop existing container if any
docker stop wolf-voice 2>/dev/null || true
docker rm wolf-voice 2>/dev/null || true

# Start LiveKit
docker run -d \
  --name wolf-voice \
  --restart unless-stopped \
  --network host \
  -v /opt/wolf-voice/livekit.yaml:/etc/livekit.yaml:ro \
  livekit/livekit-server:latest \
  --config /etc/livekit.yaml

echo "[5/5] Verifying installation..."
sleep 3

# Check if running
if docker ps | grep -q wolf-voice; then
    echo ""
    echo "========================================="
    echo "   ✅ LIVEKIT INSTALLED SUCCESSFULLY!"
    echo "========================================="
    echo ""
    echo "LiveKit Server: ws://$PUBLIC_IP:7880"
    echo "             or: wss://socket.wolfsecurity.in:7880 (after SSL setup)"
    echo ""
    echo "API Key:    $API_KEY"
    echo "API Secret: $API_SECRET"
    echo ""
    echo "SAVE THESE CREDENTIALS TO YOUR WOLF HMS .env FILE!"
    echo ""
    echo "Add to Cloud Run environment variables:"
    echo "  LIVEKIT_URL=wss://socket.wolfsecurity.in:7880"
    echo "  LIVEKIT_API_KEY=$API_KEY"
    echo "  LIVEKIT_API_SECRET=$API_SECRET"
    echo ""
    echo "Test connection:"
    echo "  curl http://localhost:7880"
    echo ""
    echo "View logs:"
    echo "  docker logs -f wolf-voice"
    echo ""
else
    echo "[ERROR] LiveKit failed to start!"
    echo "Check logs: docker logs wolf-voice"
    exit 1
fi
