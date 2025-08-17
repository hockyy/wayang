#!/bin/bash

echo "🚀 Starting Wayang with Image Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

# Install image server dependencies if needed
if [ ! -f "node_modules/express/package.json" ]; then
    echo "📦 Installing image server dependencies..."
    npm install express multer cors nodemon
fi

# Create uploads directory
mkdir -p uploads

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $IMAGE_SERVER_PID 2>/dev/null
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Start image server in background
echo "🖼️  Starting image server on port 3001..."
node image-server.js &
IMAGE_SERVER_PID=$!

# Wait for image server to start
sleep 2

# Check if image server is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Failed to start image server"
    exit 1
fi

echo "✅ Image server running at http://localhost:3001"

# Start Next.js app
echo "⚡ Starting Next.js app on port 3000..."
npm run dev

# Keep script running
wait
