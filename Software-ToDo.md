## Bugs

- h264 streaming sometimes has horrendous latency, like multiple seconds, wtf?

- Right hand side thumbstick on mobile not working

- The bucket angle gauge is stretching the page, overflow: hidden on container?

- h264 video does not scale to a larger size on larger screens

- After a disconnect, video does not auto-start after connecting to video web socket. Need to click Start video for some reason


---

## New Features

- Add password to interface!

- Add way to pan camera servo on mobile interface. Swipe action?

- Increase polling frequency of robot volts\amps\temp etc

- The camera eats battery life. Needs a way of turning it off when no client is connected.

- Battery current reading is an instantaneous value, need something server side to poll
 at a much higher rate and then present the average over the websocket connection every second
 
- Add a live, updating sparkline chart for the battery current reading so that recent history can be seen at a glance

