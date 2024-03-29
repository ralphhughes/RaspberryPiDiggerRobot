# RaspberryPiDiggerRobot
Code for an articulated 4WD robot chassis with digger arm\bucket. Very low latency webcam streaming 
and web sockets for control.

# Architecture notes

- Frontend\UI is served on the root of http://\<pi-hostname\>:80/ by nginx
- Motor control commands from the UI and info from the robot, such as current power use 
are in a bidrectional websocket on ws://\<pi-hostname\>:1337/ws
- The low latency webcam streaming is on port 8080. There are multiple options for video streaming:
  - MJPEG stream from uv4l_raspicam service -> web browser <img> element
  - h264 video from Videocore via MMAL -> raspi_vid -> nodejs websocket server -> JS websocket client in web browser -> live-player.js -> html5 <canvas> element
  - h264 video from Videocore via MMAL -> Python picamera lib -> Python websocket server -> JS websocket client in web browser -> jmuxer.js -> html5 <video> element

# Install notes

* Install Raspbian Lite onto a Pi (Tested on Pi 1 rev 2 and Pi Zero W)

* Headless setup so after burning image to SD, need valid wpa_supplicant.conf and ssh file.

* SSH onto the pi

* `$ sudo raspi-config`

  Change password, hostname, enable camera, expand filesystem, reboot

* SSH onto pi again

* Make sure up to date with repo

  `$ sudo apt-get update && sudo apt-get upgrade`

* Install dependencies 

  `$ sudo apt-get install git nginx nodejs npm pigpio miniupnpc`

* Download this repo to the pi home directory
```
$ cd ~
$ git clone https://github.com/ralphhughes/RaspberryPiDiggerRobot.git
```
* Build the backend node dependencies
```
$ cd RaspberryPiDiggerRobot/backend
$ npm install
```

* Symlink the frontend folder in to the default nginx web root
```
$ sudo rm -rf /var/www/html
$ sudo ln -s ~/RaspberryPiDiggerRobot/frontend /var/www/html
```

* Setup nginx to reverse proxy the webcam server and the websocket server so everything is accessible via only port 80
```
 $ cp ~/RaspberryPiDiggerRobot/backend/nginx_sites-enabled_default /etc/nginx/sites-enabled/default
 $ sudo service nginx restart
```

* Run the UPNP config and run the node server
```
$ upnpc -a `hostname -I` 80 8080 TCP
$ sudo nodejs ~/RaspberryPiDiggerRobot/backend/backend.js
```

* Goto the hostname of your Pi in your web browser on a desktop or mobile device
