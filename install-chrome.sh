#!/bin/bash

# Update package list
sudo apt update

# Install dependencies
sudo apt install -y wget gnupg2 software-properties-common

# Tambahkan key dan repo Google Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list

# Update dan install Google Chrome Stable
sudo apt update
sudo apt install -y google-chrome-stable

# Cek versi Chrome untuk konfirmasi
google-chrome --version
