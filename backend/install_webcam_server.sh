#!/bin/sh
echo "Downloading mjpeg-streamer-experimental..."

# Setup the webcam streaming server
cd ~/RaspberryPiDiggerRobot/backend
git clone https://github.com/jacksonliam/mjpg-streamer.git

echo "Installing mjpeg-streamer-experimental..."
cd mjpg-streamer/mjpg-streamer-experimental
make
sudo make install
