"use strict";

var DEBUG = true;

// Global variables
var WEBSOCKET_URL = "ws://" + location.hostname+(location.port ? ':'+location.port: '') + "/websockets";
var WEBCAM_URL = location.hostname+(location.port ? ':' + location.port: '') + "/webcam?action=stream";

// Aspect ratio is 3:4, width and height should be multiples of 16, so:
// 192x256, 288x384*,  336x448, 384x512, 432x576, 480x640, 540x720, 600x800 or even 720x960?
var VIEWPORT_WIDTH = 720;
var VIEWPORT_HEIGHT = 540;

// Defaults
var steeringServo = 0;  // [-100%,100%] // Default straight ahead
var tractionMotor = 0;  // [-100%,100%] // Default stopped
var armMotor = 0;       // -100,0,100   // Default stopped, no PWM
var bucketServo = 50;   // [0%, 100%]   // Default half way between bucket up and down
var cameraServo = 90;   // [0-360]      // Default straight ahead relative to bucket end


var socket;
var pingTaskID;

// Initialize everything when the window finishes loading
window.addEventListener("load", function (event) {
    var status = document.getElementById("status");
    var open = document.getElementById("open");
    var close = document.getElementById("close");
    var send = document.getElementById("send");
    var text = document.getElementById("text");
    var message = document.getElementById("message");
    var ping = document.getElementById("ping");
    var temp = document.getElementById("temp");
    var mainImg = document.getElementById("mainImg");
    var objDiv = document.getElementById('container');


    objDiv.style.width = VIEWPORT_WIDTH + "px";
    objDiv.style.height = VIEWPORT_HEIGHT + "px";
    mainImg.style.width = VIEWPORT_WIDTH + "px";
    mainImg.style.height = VIEWPORT_HEIGHT + "px";

    document.getElementById('upperDiv').style.width = VIEWPORT_WIDTH + "px";
    document.getElementById('upperDiv').style.height = VIEWPORT_HEIGHT / 2 + "px";
    document.getElementById('lowerDiv').style.width = VIEWPORT_WIDTH + "px";
    document.getElementById('lowerDiv').style.height = VIEWPORT_HEIGHT / 2 + "px";
    document.getElementById('lowerDiv').style.top = VIEWPORT_HEIGHT / 2 + "px";

    status.textContent = "Not Connected";
    close.disabled = true;
    send.disabled = true;




    // Create a new connection when the Connect button is clicked
    open.addEventListener("click", function (event) {
        open.disabled = true;
        socket = new WebSocket(WEBSOCKET_URL, "echo-protocol");
        pingTaskID = setInterval(pingRobot, 20000);

        socket.addEventListener("open", function (event) {
            close.disabled = false;
            send.disabled = false;
            mainImg.src = WEBCAM_URL;
            status.textContent = "Connected";

        });

        // Display messages received from the server
        socket.addEventListener("message", function (event) {
            if (event.data.indexOf("ping=") > -1) {
                var sentTime = event.data.split("=")[1];
                ping.textContent = new Date().getTime() - sentTime;
            }
            if (event.data.indexOf("temp=") > -1) {
                var temp = event.data.split("=")[1];
                temp.textContent = temp;
            }
            message.textContent = "DEBUG: " + event.data;
        });

        // Display any errors that occur
        socket.addEventListener("error", function (event) {
            message.textContent = "Error: " + event.error;
        });

        socket.addEventListener("close", function (event) {
            clearInterval(pingTaskID);
            open.disabled = false;
            mainImg.src = "test_pattern.png";
            status.textContent = "Not Connected";
        });
    });
    // Close the connection when the Disconnect button is clicked
    close.addEventListener("click", function (event) {
        close.disabled = true;
        send.disabled = true;
        message.textContent = "";
        socket.close();
    });

    // Send text to the server when the Send button is clicked
    send.addEventListener("click", function (event) {
        starttime = new Date();
        socket.send(text.value);
        text.value = "";
    });

    addMouseHandlers();
    addKeyboardHandlers();
    


});

// Helper
function cropToRange(value, min, max) {
    if (value > max) {
        value = max;
    }
    if (value < min) {
        value = min;
    }
    return value;
}

// Function to wrap socket.send()
function sendMessage(msg) {
    if (DEBUG) {
        console.log("sendMessage(" + msg + ")");
    }
    if (typeof socket !== 'undefined') {
        if (socket.readyState === 1) { // Connection is running
            socket.send(msg);
        }
    }
}

function pingRobot() {
    sendMessage("ping=" + new Date().getTime());
}




