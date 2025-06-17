#!/bin/bash
# Build script for Render

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies and build frontend
cd t3-chat-clone
npm install
npm run build
cd ..

