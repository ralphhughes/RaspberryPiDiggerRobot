"use strict";

// <DEPENDENCIES>
var WebSocketServer = require('websocket').server;
var http = require('http');
var exec = require('child_process').exec;

// Standardising on this gpio library instead of the other two.
const Gpio = require('pigpio').Gpio;        // https://github.com/fivdi/pigpio

var ina219 = require('ina219');

// </DEPENDENCIES>


// <CONFIG>
// These ports should NOT be internet accessible!
const WEBSOCKET_PORT = 1337;


// Easier configuring here than moving wires inside the bot
const STEERING_SERVO = new Gpio(24, {mode: Gpio.OUTPUT});
const STEERING_SERVO_MIN_PULSE=770; // Steering servo has been tested and these are the max physical servo limits
const STEERING_SERVO_MAX_PULSE=2250;

const BUCKET_SERVO = new Gpio(25, {mode: Gpio.OUTPUT});
const BUCKET_SERVO_MIN_PULSE=1000;
const BUCKET_SERVO_MAX_PULSE=2000;

const CAMERA_SERVO = new Gpio(1, {mode: Gpio.OUTPUT});
const CAMERA_SERVO_MIN_PULSE=1000;
const CAMERA_SERVO_MAX_PULSE=2000;

const ARM_MOTOR_PWM = new Gpio(26, {mode: Gpio.OUTPUT});
const ARM_MOTOR_A   = new Gpio(5, {mode: Gpio.OUTPUT});
const ARM_MOTOR_B   = new Gpio(6, {mode: Gpio.OUTPUT});

const TRACTION_MOTOR_PWM =  new Gpio(17, {mode: Gpio.OUTPUT});
const TRACTION_MOTOR_A =    new Gpio(27, {mode: Gpio.OUTPUT});
const TRACTION_MOTOR_B =    new Gpio(4, {mode: Gpio.OUTPUT});

const ARM_LIMIT_SWITCH = new Gpio(2, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_UP,
  alert: true
});

// Level must be stable for 10 ms before an alert event is emitted.
ARM_LIMIT_SWITCH.glitchFilter(10000);

// </CONFIG>


ARM_LIMIT_SWITCH.on('alert', (level, tick) => {
  if (level === 0) {
    console.log('Switch: 0');
  }
  if (level === 1) {
    console.log('Switch: 1');
  }
});

try {
    ina219.init();
    ina219.enableLogging(true);

    ina219.calibrate32V1A(function () {
        console.log("INA219 Sensor detected.");
    });
} catch (err) {
    console.log(err.message);
}

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received HTTP request on ' + WEBSOCKET_PORT + ' for ' + request.url);
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
    
    
    var the_interval = 3000; // Every 3 seconds
    setInterval(() => {
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

        ina219.getBusVoltage_V(function (volts) {
            connection.sendUTF("volts=" + volts);
            console.log((new Date().getTime() % 60000) + " Voltage: " + volts + "V");
        });

        ina219.getCurrent_mA(function (current) {
            connection.sendUTF("current=" + current);
            console.log((new Date().getTime() % 60000) + " Current: " + current + "mA\n");
        });


    }, the_interval);
});

function openConnection() {
    console.log("Starting streaming webcam...");
    execProcess("./start_webcam.sh");
    console.log("Done.");
}

function closeConnection() {
    console.log("Turning off the motors before disconnecting...");
    executeCmd("t=0");
    executeCmd("a=0");
    
    
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
        // Note that value is an integer. Range is [0,1000] for servo's, [-255, 255] for reversible motors 
	var value = parseInt(cmd.split('=')[1]); 
        value = parseInt(value, 10); // force radix to 10 cos don't want it trying to parse hex
	switch (param) {
	    case "t":
                value = cropToRange(value,-255,255);
                value = pwmDeadband(value);
                switch (true) {
                    case value < 0:
                        TRACTION_MOTOR_A.digitalWrite(1);
                        TRACTION_MOTOR_B.digitalWrite(0);
                        break;
                    case value > 0:
                        TRACTION_MOTOR_A.digitalWrite(0);
                        TRACTION_MOTOR_B.digitalWrite(1);
                        break;
                    case value = 0:
                    default:
                        TRACTION_MOTOR_A.digitalWrite(1);
                        TRACTION_MOTOR_B.digitalWrite(1);
                        break;
                }
                var pwm = Math.round(Math.abs(value));
                TRACTION_MOTOR_PWM.pwmWrite(pwm);
                break;
            case "a":
                value = cropToRange(value,-255,255);
                value = pwmDeadband(value);
                switch (true) {
                    case value < 0:
                        ARM_MOTOR_A.digitalWrite(1);
                        ARM_MOTOR_B.digitalWrite(0);
                        break;
                    case value > 0:
                        ARM_MOTOR_A.digitalWrite(0);
                        ARM_MOTOR_B.digitalWrite(1);
                        break;
                    case value = 0:
                    default:
                        ARM_MOTOR_A.digitalWrite(1);
                        ARM_MOTOR_B.digitalWrite(1);
                        break;
                }
                ARM_MOTOR_PWM.digitalWrite(1);      // Always run at full speed
		break;
	    case "s":
                value = cropToRange(value,0,1000);
                var pw = Math.round(STEERING_SERVO_MIN_PULSE + ((value / 1000) * (STEERING_SERVO_MAX_PULSE - STEERING_SERVO_MIN_PULSE)));
		STEERING_SERVO.servoWrite(pw);
		break;
            case "b":
                value = cropToRange(value,0,1000);
                var pw = Math.round(BUCKET_SERVO_MIN_PULSE + ((value / 1000) * (BUCKET_SERVO_MAX_PULSE - BUCKET_SERVO_MIN_PULSE)));
                BUCKET_SERVO.servoWrite(pw);
		break;
            case "c":
                value = cropToRange(value,0,1000);
                var pw = Math.round(CAMERA_SERVO_MIN_PULSE + ((value / 1000) * (CAMERA_SERVO_MAX_PULSE - CAMERA_SERVO_MIN_PULSE)));
                CAMERA_SERVO.servoWrite(pw);
		break;
	}
	    
    }
}

function pwmDeadband(value) {
    if (Math.abs(value) < (255*0.2)) {     // 20% deadband to protect motors from stalling
        value = 0;
    }
    return value;
}
function cropToRange(value, min, max) {
    if (value > max) {
        value = max;
    }
    if (value < min) {
        value = min;
    }
    return value;
}
