"use strict";

var GPIO = require('onoff').Gpio;
var WebSocketServer = require('websocket').server;
var http = require('http');
var PiFastGpio = require('./pi-fast-gpio.js');
var exec = require('child_process').exec;

// Can't use const for constants cos netbeans JS syntax checker chokes on it

// These ports should NOT be internet accessible!
var WEBSOCKET_PORT = 1337;
var PIGPIOD_PORT = 8888;

// Easier configuring here than moving wires inside the bot
var STEERING_SERVO_PIN=8;
var STEERING_SERVO_MIN_PULSE=770;
var STEERING_SERVO_MAX_PULSE=2250;
var BUCKET_SERVO_PIN=7;
var BUCKET_SERVO_MIN_PULSE=1000;
var BUCKET_SERVO_MAX_PULSE=2000;
var CAMERA_SERVO_PIN=4;
var CAMERA_SERVO_MIN_PULSE=1000;
var CAMERA_SERVO_MAX_PULSE=2000;
//var ARM_MOTOR_PIN=4;  // No longer using PWM for arm motor
var ARM_MOTOR_A_GPIO = new GPIO(17, 'out');
var ARM_MOTOR_B_GPIO = new GPIO(21, 'out');
var TRACTION_MOTOR_PWM_PIN=18;
var TRACTION_MOTOR_A_GPIO = new GPIO(24, 'out');
var TRACTION_MOTOR_B_GPIO = new GPIO(23, 'out');
var ARM_LIMIT_SWITCH_PIN=-1;



var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(WEBSOCKET_PORT, function() {
    console.log((new Date()) + ' Server is listening on port ' + WEBSOCKET_PORT);
});

var wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

var pigpio = new PiFastGpio();
var webcamProcess;

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' connecting...');
    openConnection();
    
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);

	    // May receive multiple commands separated by ','. If so iterate through them
	    if (message.utf8Data.indexOf(',') > -1) {
		var cmds = message.utf8Data.split(',');
		for (var i=0; i < cmds.length; i++) {
		    executeCmd(cmds[i]);
		}
	    } else {
		executeCmd(message.utf8Data);
	    }
            connection.sendUTF(message.utf8Data);
        } else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    
    
    
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnecting...');
        closeConnection();
    });
    
    
    var the_interval = 1 * 60 * 1000;
    setInterval(function () {
        console.log("Once per minute timer fired.");
        var child;

        child = exec("vcgencmd measure_temp",
                function (error, stdout, stderr) {
                    console.log('stdout: ' + stdout);
                    console.log('stderr: ' + stderr);
                    connection.sendUTF(stdout);
                    if (error !== null) {
                        console.log('exec error: ' + error);
                    }
                });

    }, the_interval);
});

function openConnection() {
    console.log("Connecting to pigpiod daemon...");
    pigpio.connect('::1', PIGPIOD_PORT, function(err) {
        if (err) throw err;
    });

    console.log("Starting streaming webcam...");
    execProcess("./start_webcam.sh");
    console.log("Done.");
}

function closeConnection() {
    console.log("Turning off the motors before disconnecting...");
    executeCmd("t=0");
    executeCmd("a=0");
    
    console.log("Disconnecting from pigpiod daemon...");
    pigpio.close();
    
    console.log("Stopping streaming webcam to save power...");
    execProcess("./stop_webcam.sh");
    
    console.log("Done.");
}

function execProcess(proc) {
    var myProc = exec(proc,
            function (error, stdout, stderr) {
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
                if (error !== null) {
                    console.log('exec error: ' + error);
                }
            });
    return myProc;
}

function executeCmd(cmd) {
    if (cmd.indexOf('=') > -1) {
	// Split a single command into a name-value pair
	var param = cmd.split('=')[0].trim();
        // Note that value is an int in the range -100 <= n <= 100 for compatibility with the PHP front end
	var value = parseInt(cmd.split('=')[1]); 

	switch (param) {
	    case "s":
                var pw = STEERING_SERVO_MIN_PULSE + ((value / 100) * (STEERING_SERVO_MAX_PULSE - STEERING_SERVO_MIN_PULSE));
		pigpio.setServoPulsewidth(STEERING_SERVO_PIN, pw);		
		break;
	    case "t":
                switch (true) {
                    case value < 0:
                        TRACTION_MOTOR_A_GPIO.writeSync(1);
                        TRACTION_MOTOR_B_GPIO.writeSync(0);
                        break;
                    case value > 0:
                        TRACTION_MOTOR_A_GPIO.writeSync(0);
                        TRACTION_MOTOR_B_GPIO.writeSync(1);
                        break;
                    case value = 0:
                    default:
                        TRACTION_MOTOR_A_GPIO.writeSync(1);
                        TRACTION_MOTOR_B_GPIO.writeSync(1);
                        break;
                }
                var pwm = 255 * (Math.abs(value) / 100);
                pigpio.setPwmDutycycle(TRACTION_MOTOR_PWM_PIN, pwm);
                break;
            case "a":
                switch (true) {
                    case value < 0:
                        ARM_MOTOR_A_GPIO.writeSync(1);
                        ARM_MOTOR_B_GPIO.writeSync(0);
                        break;
                    case value > 0:
                        ARM_MOTOR_A_GPIO.writeSync(0);
                        ARM_MOTOR_B_GPIO.writeSync(1);
                        break;
                    case value = 0:
                    default:
                        ARM_MOTOR_A_GPIO.writeSync(1);
                        ARM_MOTOR_B_GPIO.writeSync(1);
                        break;
                }
                //var pwm = 255 * (Math.abs(value) / 100);
                //pigpio.setPwmDutycycle(ARM_MOTOR_PWM_PIN, pwm);
		break;
	    case "b":
                var pw = BUCKET_SERVO_MIN_PULSE + ((value / 100) * (BUCKET_SERVO_MAX_PULSE - BUCKET_SERVO_MIN_PULSE));
                pigpio.setServoPulsewidth(BUCKET_SERVO_PIN, pw);
		break;
            case "c":
                var pw = CAMERA_SERVO_MIN_PULSE + ((value / 100) * (CAMERA_SERVO_MAX_PULSE - CAMERA_SERVO_MIN_PULSE));
                pigpio.setServoPulsewidth(CAMERA_SERVO_PIN, pw);
		break;
	}
	    
    }
}
