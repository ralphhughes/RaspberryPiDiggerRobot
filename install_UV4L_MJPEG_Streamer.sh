#!/bin/bash

curl https://www.linux-projects.org/listing/uv4l_repo/lpkey.asc | sudo apt-key add -

echo "deb https://www.linux-projects.org/listing/uv4l_repo/raspbian/stretch stretch main" | sudo tee /etc/apt/sources.list.d/uv4l.list

sudo apt-get update

sudo apt-get install uv4l uv4l-raspicam uv4l-server uv4l-raspicam-extras -y

sudo service uv4l_raspicam stop

sudo rm /etc/uv4l/uv4l-raspicam.conf

sudo ln -s ~/RaspberryPiDiggerRobot/uv4l-raspicam.conf /etc/uv4l/uv4l-raspicam.conf

sudo service uv4l_raspicam start

sudo service uv4l_raspicam status | cat

