"use strict";

var DEBUG = true;

// Global variables
var WEBSOCKET_URL = (location.protocol.match(/^https/) ? "wss" : "ws") + "://" + location.hostname+(location.port ? ':'+location.port: '') + "/websockets";

// Aspect ratio is 3:4, width and height should be multiples of 16, so:
// 192x256, 288x384*,  336x448, 384x512, 432x576, 480x640, 540x720, 600x800 or even 720x960?
var VIEWPORT_WIDTH = 720;
var VIEWPORT_HEIGHT = 540;

// Defaults
var tractionMotor = 0;      // [-255, 255]  // Default stopped, uses PWM
var armMotor = 0;           // [-255, 255]  // Default stopped, no PWM
var steeringServo = 500;    // [0, 1000]    // Default straight ahead
var bucketServo = 500;      // [0, 1000]    // Default half way between bucket up and down
var cameraServo = 500;      // [0, 1000]    // Default straight ahead relative to bucket end

var steeringDelta = 20;
var bucketDelta = 20;

var tractionMotorGauge;
var steeringServoGauge;
var bucketServoGauge;

var socket;
var pingTaskID;

// Initialize everything when the window finishes loading
window.addEventListener("load", function (event) {
    var connectBtn = document.getElementById("connect");
    var send = document.getElementById("send");
    var text = document.getElementById("text");
    var message = document.getElementById("message");
    var ping = document.getElementById("ping");
    var temp = document.getElementById("temp");
    
    send.disabled = true;

    // Create a new connection when the Connect button is clicked
    connectBtn.addEventListener("click", function (event) {
        if (socket) {
            socket.close(3001);
        } else {
            setupWSConnection();
        }
    });
    
    function setupWSConnection() {
        console.log("Attempting to connect to: " + WEBSOCKET_URL);
        socket = new WebSocket(WEBSOCKET_URL, "echo-protocol");        
        
        socket.addEventListener("open", function (event) {
            send.disabled = false;
            connectBtn.value = "Disconnect";

            
            pingTaskID = setInterval(pingRobot, 5000);
        });

        // Display messages received from the server
        socket.addEventListener("message", function (event) {
            if (event.data.indexOf("uptime=") > -1) {
                var uptime = event.data.split("=")[1];
                var sec_num = parseInt(uptime, 10);
                var hours   = Math.floor(sec_num / 3600);
                var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
                var seconds = sec_num - (hours * 3600) - (minutes * 60);

                if (hours   < 10) {hours   = "0"+hours;}
                if (minutes < 10) {minutes = "0"+minutes;}
                if (seconds < 10) {seconds = "0"+seconds;}
                $('#uptime').text(hours+' hours, '+minutes+' minutes');
            }
            if (event.data.indexOf("ping=") > -1) {
                var sentTime = event.data.split("=")[1];
                ping.textContent = new Date().getTime() - sentTime;
            }
            if (event.data.indexOf("temp=") > -1) {
                var temperature = event.data.split("=")[1];
                temp.textContent = temperature;
            }
            if (event.data.indexOf("load=") > -1) {
                var load = event.data.split("=")[1];
                $('#load').text(parseFloat(load).toFixed(2));
            }
            if (event.data.indexOf("batt_percent=") > -1) {
                var batt_percent = event.data.split("=")[1];
                $('#batt_percent').text(Math.round(batt_percent));
            }
            if (event.data.indexOf("voltage=") > -1) {
                var volts = event.data.split("=")[1];
                $('#voltage').text(volts);
            }
            if (event.data.indexOf("current=") > -1) {
                var milliAmps = event.data.split("=")[1];
                if (milliAmps < 0) {
                    $('#usb_status').text('Charging');
                } else {
                    $('#usb_status').text('Discharging');
                }
                $('#current').text(milliAmps);
            }
            message.textContent = "DEBUG: " + event.data;
        });

        // Display any errors that occur
        socket.addEventListener("error", function (event) {
            message.textContent = "Error: " + event.error;
        });

        socket.addEventListener("close", function (event) {
            if (event.code === 3001) {
                console.log("Connection closed by client");
            } else {
                alert("Web socket connection error");
            }
            socket = null;
            clearInterval(pingTaskID);
            send.disabled = true;
            message.textContent = "";
            connectBtn.value = "Connect";
        });
    }

    // Send text to the server when the Send button is clicked
    send.addEventListener("click", function (event) {
        starttime = new Date();
        socket.send(text.value);
        text.value = "";
    });

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

function setDeadband(value, deadbandMagnitude) {
    if (value >= -deadbandMagnitude && value <= deadbandMagnitude) {
        value = 0;
    }
    return value;
}

// Function to wrap socket.send()
function sendMessage(msg) {
    if (DEBUG) {
        // console.log("sendMessage(" + msg + ")");
    }
    if (typeof socket !== 'undefined' && socket !== null) {
        if (socket.readyState === 1) { // Connection is running
            socket.send(msg);
        }
    }
}

function pingRobot() {
    sendMessage("ping=" + new Date().getTime());
}

function updateUI() {
    // UI update loop

    var valueForGauge1 = Math.abs(Math.round(100 * (tractionMotor/255)));
    tractionMotorGauge.value = valueForGauge1;

    // Flip the steering gauge depending if we're going forwards or backwards
    if (tractionMotor > 0) {
        var valueForGauge2 = Math.round(-100 * ((steeringServo-500) / 500));
        steeringServoGauge.value = valueForGauge2;
    } else {
        var valueForGauge2 = Math.round(100 * ((steeringServo-500) / 500));
        steeringServoGauge.value = valueForGauge2;
    }
    
    var valueForGauge3 = Math.round(100 * (bucketServo-500)/500);
    bucketServoGauge.value = valueForGauge3;
    
    var upIcon = document.getElementById('upIcon');
    var downIcon = document.getElementById('downIcon');
    if (armMotor > 0) {
        upIcon.style.display="block";
        downIcon.style.display="none";
    }
    if (armMotor == 0) {
        upIcon.style.display="none";
        downIcon.style.display="none";
    }
    if (armMotor < 0) {
        upIcon.style.display="none";
        downIcon.style.display="block";
    }
}

function initUI() {
    // Configure the JS gauges
    tractionMotorGauge = new RadialGauge({
        renderTo: 'gauge1',
        width: 150,
        height: 150,
        colorPlate: 'rgba(0,0,0,0)',
        minValue: '0',
        maxValue: '100',
        value: '0',
        borders: false,
        valueBox: false,
        majorTicks: ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100'],
        animation: false
    });
    tractionMotorGauge.draw();

    steeringServoGauge = new RadialGauge({
        renderTo: 'gauge2',
        width: 150,
        height: 150,
        colorPlate: 'rgba(0,0,0,0)',
        minValue: '-100',
        maxValue: '100',
        value: '0',
        borders: false,
        valueBox: false,
        majorTicks: ['-100', '-80', '-60', '-40', '-20', '0', '20', '40', '60', '80', '100'],
        startAngle: 90,
        ticksAngle: 180,
        borderShadowWidth: 0,
        needleType: "arrow",
        needleWidth: 2,
        needleCircleSize: 7,
        needleCircleOuter: true,
        needleCircleInner: false,
        animation: false
    });
    steeringServoGauge.draw();

    bucketServoGauge = new RadialGauge({
        renderTo: 'gauge3',
        width: 150,
        height: 150,
        colorPlate: 'rgba(0,0,0,0)',
        minValue: '-100',
        maxValue: '100',
        value: '0',
        borders: false,
        valueBox: false,
        majorTicks: ['-100', '-80', '-60', '-40', '-20', '0', '20', '40', '60', '80', '100'],
        startAngle: 0,
        ticksAngle: 180,
        borderShadowWidth: 0,
        needleType: "arrow",
        needleWidth: 2,
        needleCircleSize: 7,
        needleCircleOuter: true,
        needleCircleInner: false,
        animation: false
    });
    bucketServoGauge.draw();

    var intervalId = setInterval(updateUI, 150);

    // Setup event handlers for help div
    var modal = document.getElementById('modalHelpDiv');
    var btn = document.getElementById("btnHelp");
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks the button, open the modal 
    btn.onclick = function() {
        modal.style.display = "block";
    };

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    };

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
}

