"use strict";

/**
* Run this on a raspberry pi 
* then browse (using google chrome/firefox) to http://[pi ip]:8080/
*/


const http    = require('http');
const WebStreamerServer = require('./raspivid');


const server  = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received HTTP request on 8080 for ' + request.url);
    response.writeHead(404);
    response.end();
});

const silence = new WebStreamerServer(server);

server.listen(8080);
