# RaspberryPiDiggerRobot
Code for an articulated 4WD robot chassis with digger arm\bucket. Very low latency webcam streaming and web sockets for control


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
