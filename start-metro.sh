#!/bin/bash
# Metro bundler start script for BlockcertsWallet
# This ensures the correct Node.js version and environment setup

cd /Users/sreenumalae/Documents/HL_projects/claude_apps/BlockcertsWallet
source ~/.bash_profile
nvm use 23
npx react-native start --reset-cache
