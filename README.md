# RaspberryPiDiggerRobot
Code for an articulated 4WD robot chassis with digger arm\bucket. Very low latency webcam streaming and web sockets for control


# Install notes

* Install Raspbian Lite onto a Pi Zero W

* Headless setup so after burning image to SD, need valid wpa_supplicant.conf and ssh file.

* SSH onto the pi

* $ sudo raspi-config
  Change password, hostname, enable camera, expand filesystem, reboot

* SSH onto pi again

* Make sure up to date with repo
  $ sudo apt-get update && sudo apt-get upgrade

* Install dependencies 
  $ sudo apt-get install git nginx nodejs pigpio cmake libjpeg8-dev

* Startup the GPIO daemon 
  $ sudo systemctl enable pigpiod

* Download this repo:
  $ cd ~
  $ git clone https://github.com/ralphhughes/RaspberryPiDiggerRobot.git

* symlink the frontend folder
  $ cd /var/www
  $ sudo rm -rf html
  $ sudo ln -s ~/RaspberryPiDiggerRobot/frontend ./html

* Setup the webcam streaming server
  $ cd ~/RaspberryPiDiggerRobot/backend
  $ git clone https://github.com/jacksonliam/mjpg-streamer.git
  $ cd mjpg-streamer/mjpg-streamer-experimental
  $ make
  $ sudo make install

