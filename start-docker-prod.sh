#!/bin/bash
echo "🐳 Starting Vite with Docker (Production)..."
docker-compose -f docker-compose.prod.yml up --build
