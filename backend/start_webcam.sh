#!/bin/sh
export LD_LIBRARY_PATH=./mjpg-streamer/mjpg-streamer-experimental

# Medium quality
# ./mjpg-streamer/mjpg-streamer-experimental/mjpg_streamer -o "output_http.so -w ./www" -i "input_raspicam.so -x 480 -y 640 -rot 90 -fps 5 -quality 15"

# Poor quality
./mjpg-streamer/mjpg-streamer-experimental/mjpg_streamer -o "output_http.so -w ./www" -i "input_raspicam.so -x 384 -y 512 -rot 90 -vs -fps 5 -quality 10"
