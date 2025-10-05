#!/bin/bash
# GuardianLink Backend Startup Script

echo "============================================================"
echo "GuardianLink Backend Server"
echo "============================================================"

# Check if we're in the right directory
if [ ! -f "webapp/server.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

cd webapp

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt

# Start the server
echo "🚀 Starting server..."
echo ""
python server.py
