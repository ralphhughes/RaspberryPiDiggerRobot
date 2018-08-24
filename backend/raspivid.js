"use strict";

const util      = require('util');
const spawn     = require('child_process').spawn;
const merge     = require('mout/object/merge');

const Server    = require('./_server');


class RpiServer extends Server {

  
  get_feed() {
    var streamer = spawn('raspivid', ['-t', '0', '-o', '-', '-w', this.options.width, '-h', this.options.height, '-fps', this.options.fps, '-pf', 'baseline']);
    streamer.on("exit", function(code){
      console.log("raspivid process exited with code ", code);
    });

        streamer.stderr.on('data', (data) => {
      if (data && (!(data instanceof String) || data.indexOf('frame=') === 0)) {
        // ignoring messages like:
        // frame= 3540 fps= 30 q=22.0 size=   43192kB time=00:01:58.00 bitrate=2998.6kbits/s dup=24 drop=0
        return;
      }
      // console.log(`raspivid.js streamer.stderr data: ${data}`);
      // console.log('raspivid.js streamer.stderr data:');
      console.log(data);
    });
    streamer.stderr.on('error', (data) => {
      console.log(`raspivid.js streamer.stderr error data: ${data}`);
    });
    streamer.on("close", function () {
      console.log("raspivid.js close");
    });
    streamer.on("disconnect", function () {
      console.log("raspivid.js disconnect");
    });
    streamer.on("error", function (code) {
      console.log(`raspivid.js error code = ${code}`);
    });
    streamer.on("exit", function (code, signal) {
      console.log(`raspivid.js exit code = ${code}, signal = ${signal}`);
    });
    return streamer;
  }
  

};



module.exports = RpiServer;
