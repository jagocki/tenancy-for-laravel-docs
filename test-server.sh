#!/bin/bash
# Simple test script to verify the MCP server starts correctly

echo "Testing MCP server startup..."
timeout 5 node dist/index.js 2>&1 | head -n 1 &
pid=$!
sleep 2

if ps -p $pid > /dev/null 2>&1; then
    echo "✓ Server started successfully"
    kill $pid 2>/dev/null
    exit 0
else
    echo "✗ Server failed to start"
    exit 1
fi
