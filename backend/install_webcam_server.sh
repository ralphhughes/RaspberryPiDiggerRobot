# Setup the webcam streaming server
cd ~/RaspberryPiDiggerRobot/backend

git clone https://github.com/jacksonliam/mjpg-streamer.git

cd mjpg-streamer/mjpg-streamer-experimental

make

sudo make install
