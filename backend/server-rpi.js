"use strict";



const http = require('http');
const WebStreamerServer = require('./raspivid');


const server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received HTTP request on 8080 for ' + request.url);
    response.writeHead(404);
    response.end();
});

var options = {
    width: 640,
    height: 480,
    fps: 10,
    rotation: 180
};

const silence = new WebStreamerServer(server, options);

server.listen(8080);
