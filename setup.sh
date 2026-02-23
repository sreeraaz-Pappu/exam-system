#!/bin/bash
# ════════════════════════════════════════
#   EXAM SYSTEM — Quick Setup Script
# ════════════════════════════════════════

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   SECURE EXAM SYSTEM — SETUP         ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -v)
echo "✅ Node.js found: $NODE_VER"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
  echo "⚠  mongod not found locally. Make sure MongoDB is running or use MongoDB Atlas."
fi

# Install backend deps
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then echo "❌ npm install failed"; exit 1; fi
echo "✅ Dependencies installed"

# Create .env from example
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ⚠  IMPORTANT: Edit backend/.env and set:"
  echo "     - MONGO_URI (your MongoDB connection)"
  echo "     - JWT_SECRET (random string)"
  echo "     - JWT_ADMIN_SECRET (different random string)"
  echo "     - ADMIN_PASSWORD (strong password)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "✅ .env already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "  To start the server:"
echo "  cd backend && npm start"
echo ""
echo "  Then open:"
echo "  Student Login:  http://localhost:5000/student/login.html"
echo "  Admin Panel:    http://localhost:5000/admin/login.html"
echo ""
