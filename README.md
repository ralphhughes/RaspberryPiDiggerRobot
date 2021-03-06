# RaspberryPiDiggerRobot
Code for an articulated 4WD robot chassis with digger arm\bucket. Very low latency webcam streaming and web sockets for control


# Install notes

* Install Raspbian Lite onto a Pi Zero W

* Headless setup so after burning image to SD, need valid wpa_supplicant.conf and ssh file.

* SSH onto the pi

* `$ sudo raspi-config`

  Change password, hostname, enable camera, expand filesystem, reboot

* SSH onto pi again

* Make sure up to date with repo

  `$ sudo apt-get update && sudo apt-get upgrade`

* Install dependencies 

  `$ sudo apt-get install git nginx nodejs nodejs-legacy pigpio cmake libjpeg8-dev miniupnpc`

* Download this repo to the pi home directory
```
$ cd ~
$ git clone https://github.com/ralphhughes/RaspberryPiDiggerRobot.git
$ cd RaspberryPiDiggerRobot
```

* Setup the web camera server

  `$ ./install_webcam_server.sh`

* Setup the web socket server

  `$ ./install_websocket_server.sh`

* symlink the frontend folder
```
$ cd /var/www
$ sudo rm -rf html
$ sudo ln -s ~/RaspberryPiDiggerRobot/frontend ./html
```



* Setup nginx to proxy the webcam server and the websocket server through port 80
```
 $ cp ~/RaspberryPiDiggerRobot/backend/nginx_sites-enabled_default /etc/nginx/sites-enabled/default
 $ sudo systemctl restart nginx
```

* Make the UPNP config and the web sockets server autostart on boot
```
$ upnpc -a `hostname -I` 80 8080 TCP
$ sudo nodejs ~/RaspberryPiDiggerRobot/backend/backend.js
$ sudo reboot
```
