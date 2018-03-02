#!/bin/sh
export LD_LIBRARY_PATH=./mjpg-streamer/mjpg-streamer-experimental

# Medium quality
# ./mjpg-streamer/mjpg-streamer-experimental/mjpg_streamer -o "output_http.so -w ./www" -i "input_raspicam.so -x 640 -y 480 -rot 180 -fps 5 -quality 15"

# Poor quality
./mjpg-streamer/mjpg-streamer-experimental/mjpg_streamer -o "output_http.so -w ./www" -i "input_raspicam.so -x 512 -y 384 -rot 180 -vs -fps 5 -quality 10"
