@echo off
echo Starting Wolf HMS Self-Healing Diagnostics...
cd server
if not exist "tools" mkdir tools
node tools/diagnostic.js
