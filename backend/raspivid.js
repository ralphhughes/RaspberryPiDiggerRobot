"use strict";

const util = require('util');
const spawn = require('child_process').spawn;
const merge = require('mout/object/merge');
const Splitter = require('stream-split');

const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
const NALseparator = new Buffer([0, 0, 0, 1]);//NAL break


class RpiServer {

    get_feed() {
        var streamer = spawn('raspivid', ['-t', '0', '-o', '-', '-g', '5', '-w', this.options.width, '-h', this.options.height, '-fps', this.options.fps, '-rot', this.options.rotation, '-pf', 'baseline']);
        streamer.on("exit", function (code) {
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
    constructor(server, options) {

        this.options = merge({
            width: 960,
            height: 540,
            fps: 12,
            rotation: 0
        }, options);

        this.counter = 0;

        this.wss = new WebSocketServer({server});

        this.new_client = this.new_client.bind(this);
        this.start_feed = this.start_feed.bind(this);
        this.broadcast = this.broadcast.bind(this);

        this.wss.on('connection', this.new_client);
    }

    start_feed() {
        this.streamer = this.get_feed();
        var readStream = this.streamer.stdout;
        this.readStream = readStream;

        readStream = readStream.pipe(new Splitter(NALseparator));
        readStream.on("data", this.broadcast);
        readStream.on("close", function () {
            console.log("_server.js close");
        });
        readStream.on("error", function (code) {
            console.log(`_server.js error code = ${code}`);
        });
    }

    broadcast(data) {
        this.wss.clients.forEach(function (socket) {
            if (socket.readyState !== WebSocket.OPEN) {
                console.log('socket.readyState =', socket.readyState);
                return;
            }
            if (socket.buzy)
                return;

            socket.buzy = true;
            socket.buzy = false;

            socket.send(Buffer.concat([NALseparator, data]), {binary: true}, function ack(error) {
                socket.buzy = false;
            });
        });
    }

    new_client(socket) {

        var self = this;
        console.log('New guy');

        if (!self.readStream) {
            self.start_feed();
        } else if (self.readStream.isPaused()) {
            self.readStream.resume();
        } else {
            console.log(`new_client, streamer: connected = ${self.streamer.connected}, killed = ${self.streamer.killed}, .pid = ${self.streamer.pid}`);
        }

        socket.send(JSON.stringify({
            action: "init",
            width: this.options.width,
            height: this.options.height,
            fps: this.options.fps
        }));

        socket.on("message", function (data) {
            var cmd = "" + data, action = data.toString().split(' ')[0];
            console.log("Incomming action '%s'", action);

            if (action == "STOPSTREAM" || (action == "REQUESTSTREAM" && !!self.streamer)) {
                // self.streamer.kill('SIGKILL');
                self.streamer.kill();
                self.readStream = undefined;
                console.log("previous streamer killed");
            }
            if (action == "REQUESTSTREAM") {
                self.start_feed();
            }
        });

        socket.on('close', function () {
            // self.readStream.end();
            console.log('web-socket closed');
        });
    }

}
;



module.exports = RpiServer;
