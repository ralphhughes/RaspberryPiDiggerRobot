"use strict";

// Global variables
var WEBSOCKET_URL="ws://ralphius.noip.me:88/websockets";
var WEBCAM_URL="http://ralphius.noip.me:8080/?action=stream";

// Aspect ratio is 3:4, width and height should be multiples of 16, so:
// 192x256, 288x384*,  336x448, 384x512, 432x576, 480x640, 540x720, 600x800 or even 720x960?
var VIEWPORT_WIDTH = 540;
var VIEWPORT_HEIGHT = 720;

// Defaults
var steeringServo = 50; // [0%, 100%]   // Default straight ahead
var tractionMotor = 0;  // [-100%,100%] // Default stopped
var armMotor = 0;       // [-100%,100%] // Default stopped
var bucketServo = 50;   // [0%, 100%]   // Default half way between bucket up and down
var controlType=0; // 0=Mouse, 1=Keyboard


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
    mainImg.style.width  = VIEWPORT_WIDTH + "px";
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
            mainImg.src=WEBCAM_URL;
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
            mainImg.src="test_pattern.png";
            status.textContent = "Not Connected";
        });
    });
    // Close the connection when the Disconnect button is clicked
    close.addEventListener("click", function (event) {
        socket.send("t=0,a=0"); //Stop the motors first!
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
    
    
    // Robot control event handlers below here:
     
    $(document).keyup(function (e) {
        
        // If escape is pressed, stop all motors
        if (e.keyCode === 27) {
            tractionMotor = 0;
            armMotor = 0;
            sendMessage("a=0, t=0");
        }
        
        if (e.keyCode === 18) { // D
            // Disconnect
            close.click();
        }
        
        if (e.keyCode === 67) { // C
            // Connect
            open.click();
        }
        
        if (e.keyCode === 32) { // [Spacebar]
            //TODO: Make this toggle between mouse control and arrow key control
            controlType = !controlType;
            alert(controlType);
            if (controlType === 0) {
                objDiv.style.border="2px solid #000000";
            } else {
                objDiv.style.border="0px solid #000000";
            }
            return false; //Stops the PgDown?
        }
        
        // 13 (Enter) for bucket shake?
        // TODO: Code this if needed

    }); 
    
    // Event handler for changing bucket position when keys are held down
    $(document).keydown(function (e) {
        // 49-57 (Num keys 1-9) for bucket angle
        if (e.keyCode >= 49 && e.keyCode <= 57) {
            var numberPressed = e.keyCode - 48;
            bucketServo = Math.round(((numberPressed - 1) / 8) * 100);
            sendMessage("b=" + bucketServo);
        }
        
        // plus\minus keys for fine adjustment
        if (e.keyCode === 173) {
            bucketServo--;
            if (bucketServo < 0) {
                bucketServo = 0;
            }
            sendMessage("b=" + bucketServo);
        }
        
        if (e.keyCode === 61) {
            bucketServo++;
            if (bucketServo > 100) {
                bucketServo = 100;
            }
            sendMessage("b=" + bucketServo);
        }
        
        // Don't propagate this event to other handlers
        // return false;
    });


    // Event handler for raising and lowering arm on left/right click
    $(".overlays").mousedown(function (event) {
        switch (event.which) {
            case 1:
                armMotor = 100;
                break;
            case 3:
                armMotor = -100;
                break;
        }
        sendMessage("a=" + armMotor);
    });

    // Event handler for stopping arm motor when mouse button no longer held down
    $(".overlays").mouseup(function () {
        armMotor = 0;
        sendMessage("a=" + armMotor);
    });

    // Event handler for controlling steering and traction motors dependent upon mouse position
    $(".overlays").mousemove(function (e) {
        if (controlType === 0) {
            var parentOffset = $(this).parent().offset();
            var x = (e.pageX - parentOffset.left); //offset -> method allows you to retrieve the current position of an element 'relative' to the document
            var y = (e.pageY - parentOffset.top);
            x = Math.round(((x / VIEWPORT_WIDTH) * 120) - 10);
            y = Math.round(((y / VIEWPORT_HEIGHT) * 250) - (250 / 2));

            // Dead band round center of div to prevent traction motor stall under low duty cycle PWM
            if (y > -15 && y < 15) {
                y = 0;
            }
            // Full power band round edge of div to make it easier to hold mouse on 100%
            if (x > 100) {
                x = 100;
            }
            if (x < 0) {
                x = 0;
            }
            if (y > 100) {
                y = 100;
            }
            if (y < -100) {
                y = -100;
            }

            // Invert traction motor
            y = -y;

            // Copy onto the global variables
            tractionMotor = y;
            steeringServo = 100 - x;

            sendMessage("t=" + tractionMotor + ",s=" + steeringServo);
        }
    });

    // Event handler for stopping traction and arm motors when mouse is not on the video stream
    $(".overlays").mouseleave(function (e) {
        if (controlType === 0) {
            tractionMotor = 0;
            armMotor = 0;
            // fire ajax call with motor stop signals 
            sendMessage("t=0,a=0");
        }
    });

    // Function to wrap socket.send()
    function sendMessage(msg) {
        if (typeof socket !== 'undefined') {
            if (socket.readyState === 1) { // Connection is running
                socket.send(msg);
            }
        }
    }

    function pingRobot() {
        sendMessage("ping=" + new Date().getTime());
    }
});





