#!/bin/bash

# Script to start Jekyll for the Maailmantutkija website
# All interactive apps now use client-side JavaScript (no Flask backend needed)

set -e  # Exit on any error

echo "Starting Maailmantutkija website with client-side interactive apps..."

# Function to cleanup background processes on exit
cleanup() {
    echo "Shutting down Jekyll server..."
    if [ ! -z "$JEKYLL_PID" ]; then
        kill $JEKYLL_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if we're in the right directory
if [ ! -f "_config.yml" ]; then
    echo "Error: Please run this script from the website_project directory"
    exit 1
fi

# Check if Jekyll dependencies are installed
if [ ! -f "Gemfile.lock" ]; then
    echo "Installing Jekyll dependencies..."
    bundle install
fi

# Start Jekyll server
echo "Starting Jekyll server on port 4000..."
bundle exec jekyll serve --host 0.0.0.0 --port 4000 --livereload &
JEKYLL_PID=$!

echo "Jekyll server started successfully (PID: $JEKYLL_PID)"
echo ""
echo "🎉 Website is now running!"
echo "📖 Main website: http://localhost:4000"
echo "🎯 Interactive apps:"
echo "   • Määrien arvioiminen: http://localhost:4000/maarien-arvioiminen-sovellus.html"
echo "   • Kultaisen tähden etsintä: http://localhost:4000/kultainen-tahti.html"
echo "   • Ankkurointivinouma: http://localhost:4000/ankkurointivinouma-sovellus.html"
echo "   • Tarkka reagointi: http://localhost:4000/tarkka-reagointi.html"
echo "   • Määrien arviointi (aika): http://localhost:4000/maarien-arviointi-aika-sovellus.html"
echo ""
echo "All apps now use client-side JavaScript - no Flask backend required!"
echo ""
echo "Press Ctrl+C to stop the server"

# Wait for Jekyll process
wait $JEKYLL_PID
