"use strict";



const http    = require('http');
const WebStreamerServer = require('./raspivid');


const server  = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received HTTP request on 8080 for ' + request.url);
    response.writeHead(404);
    response.end();
});

const silence = new WebStreamerServer(server);

server.listen(8080);
