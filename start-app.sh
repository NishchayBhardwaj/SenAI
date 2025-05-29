#!/bin/bash

echo ""
echo "======================================================"
echo "   RESUME PARSER APPLICATION - STARTUP SCRIPT         "
echo "======================================================"
echo ""

# Check required dependencies
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

echo "Checking required dependencies..."
echo ""

if ! command_exists python; then
  echo "Error: Python is not installed. Please install Python and try again."
  exit 1
fi

if ! command_exists node; then
  echo "Error: Node.js is not installed. Please install Node.js and try again."
  exit 1
fi

if ! command_exists npm; then
  echo "Error: npm is not installed. Please install npm and try again."
  exit 1
fi

echo "✅ All required dependencies found."
echo ""
echo "======================================================"
echo ""

# Start Auth Backend in the background
echo "Starting Auth Backend server on http://localhost:4000..."
cd auth-backend || { echo "Error: Auth Backend directory not found"; exit 1; }
npm run dev &
AUTH_PID=$!
cd ..
echo "✅ Auth Backend server started with PID: $AUTH_PID"
echo ""

# Start Backend in the background
echo "Starting Backend server on http://localhost:8000..."
cd backend/app || { echo "Error: Backend directory not found"; exit 1; }
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ../..
echo "✅ Backend server started with PID: $BACKEND_PID"
echo ""

# Start Frontend in the background
echo "Starting Frontend server on http://localhost:3000..."
cd frontend || { echo "Error: Frontend directory not found"; exit 1; }
npm run dev &
FRONTEND_PID=$!
cd ..
echo "✅ Frontend server started with PID: $FRONTEND_PID"
echo ""

echo "======================================================"
echo "  🚀 Resume Parser Application is running!            "
echo "======================================================"
echo "  📱 Frontend: http://localhost:3000                  "
echo "  ⚙️ Backend API: http://localhost:8000               "
echo "  🔐 Auth Backend: http://localhost:4000              "
echo ""
echo "  ⚠️  IMPORTANT: Please refresh the page after first  "
echo "      loading to ensure all services are connected    "
echo ""
echo "  Press Ctrl+C to stop all services                   "
echo "======================================================"
echo ""

# Function to clean up when script is terminated
cleanup() {
  echo ""
  echo "Stopping services..."
  kill $AUTH_PID 2>/dev/null
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  echo "Services stopped. Goodbye!"
  exit 0
}

# Set up trap to catch Ctrl+C
trap cleanup SIGINT

# Wait for all background processes to finish
wait 