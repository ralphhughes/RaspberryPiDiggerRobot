"use strict";

// <DEPENDENCIES>
var os = require('os');
var WebSocketServer = require('websocket').server;
var http = require('http');
var exec = require('child_process').exec;

// Pi specific libraries
var Gpio = require('pigpio').Gpio;      // https://github.com/fivdi/pigpio
// var Gpio = require('pigpio-mock').Gpio;
var vcgencmd = require('vcgencmd');     // https://github.com/loyd/node-vcgencmd
var ina219 = require('ina219');         // https://github.com/brettmarl/node-ina219

// </DEPENDENCIES>


// <CONFIG>
const WEBSOCKET_PORT = 1337;


// Easier configuring here than moving wires inside the bot
// Do NOT use GPIO 2 and 3, they're in use for I2C comms!
const STEERING_SERVO = new Gpio(21, {mode: Gpio.OUTPUT});
const STEERING_SERVO_MIN_PULSE=770; // Steering servo has been tested and these are the max physical servo limits
const STEERING_SERVO_MAX_PULSE=2250;

const BUCKET_SERVO = new Gpio(20, {mode: Gpio.OUTPUT});
const BUCKET_SERVO_MIN_PULSE=1000;
const BUCKET_SERVO_MAX_PULSE=2000;

const CAMERA_SERVO = new Gpio(25, {mode: Gpio.OUTPUT});
const CAMERA_SERVO_MIN_PULSE=1000;
const CAMERA_SERVO_MAX_PULSE=2000;

const ARM_MOTOR_PWM = new Gpio(17, {mode: Gpio.OUTPUT});
const ARM_MOTOR_A   = new Gpio(4, {mode: Gpio.OUTPUT});
const ARM_MOTOR_B   = new Gpio(27, {mode: Gpio.OUTPUT});

const TRACTION_MOTOR_PWM =  new Gpio(26, {mode: Gpio.OUTPUT});
const TRACTION_MOTOR_A =    new Gpio(5, {mode: Gpio.OUTPUT});
const TRACTION_MOTOR_B =    new Gpio(6, {mode: Gpio.OUTPUT});

const ARM_LIMIT_SWITCH = new Gpio(19, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_UP,
  alert: true
});

// Level must be stable for 10 ms before an alert event is emitted.
// ARM_LIMIT_SWITCH.glitchFilter(10000);

// </CONFIG>

/*
ARM_LIMIT_SWITCH.on('alert', (level, tick) => {
  if (level === 0) {
    console.log('Switch: 0');
  }
  if (level === 1) {
    console.log('Switch: 1');
  }
});
*/

var INA219_DETECTED;
try {
    ina219.init();
    ina219.enableLogging(false);
    ina219.calibrate32V1A(function () {
        INA219_DETECTED = true;
        console.log("INA219 Sensor detected.");
    });
} catch (err) {
    INA219_DETECTED = false;
    console.log(err.message);
}

var piCamera = vcgencmd.getCamera();
console.log("Camera supported: " + piCamera.supported);
console.log("Camera detected: " + piCamera.detected);

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
    
    
    var the_interval = 3000; // Every 3 seconds, send status info to the client
    setInterval(() => {
        
        connection.sendUTF("temp=" + vcgencmd.measureTemp());
        
        connection.sendUTF("load=" + os.loadavg()[0]);
        
        connection.sendUTF("uptime=" + os.uptime());
        
        if (INA219_DETECTED) {
            ina219.getBusVoltage_V(function (volts) {
                connection.sendUTF("voltage=" + volts);
                connection.sendUTF("batt_percent=" + getBattPercent(volts));
            });

            ina219.getCurrent_mA(function (current) {
                connection.sendUTF("current=" + current);
            });
        }

    }, the_interval);
});

function openConnection() {
    console.log("Starting streaming webcam...");
    // execProcess("./start_webcam.sh");
    console.log("Done.");
}

function closeConnection() {
    console.log("Turning off the motors before disconnecting...");
    executeCmd("t=0");
    executeCmd("a=0");
    
    
    console.log("Stopping streaming webcam to save power...");
    // execProcess("./stop_webcam.sh");
    
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
function getBattPercent(voltage) {
    var batt_percentages = [0, 0.4, 0.5, 0.7, 1, 1.3, 1.6, 2, 2.4, 3, 4.1, 6.2, 7.8, 9.6, 11.5, 13.3, 15.1, 17, 18.8, 20.7, 22.5, 24.4, 26.2, 28, 29.9, 31.7, 33.6, 35.4, 37.3, 39.1, 40.9, 42.8, 44.6, 46.5, 48.3, 50.2, 52, 53.8, 55.7, 57.5, 59.4, 61.2, 63.1, 64.9, 66.7, 68.6, 70.4, 72.3, 74.1, 76, 77.8, 79.6, 81.5, 83.3, 85.2, 87, 88.9, 90.7, 92.6, 94.4, 96.2, 98.1, 100];
    var batt_voltages = [2.78, 2.86, 2.94, 3.01, 3.08, 3.17, 3.24, 3.31, 3.38, 3.45, 3.51, 3.57, 3.59, 3.61, 3.62, 3.63, 3.64, 3.66, 3.67, 3.68, 3.68, 3.69, 3.69, 3.7, 3.7, 3.71, 3.71, 3.71, 3.72, 3.72, 3.73, 3.73, 3.74, 3.75, 3.76, 3.77, 3.78, 3.79, 3.8, 3.81, 3.82, 3.84, 3.85, 3.87, 3.88, 3.9, 3.92, 3.94, 3.96, 3.98, 4, 4.02, 4.04, 4.06, 4.09, 4.11, 4.13, 4.15, 4.18, 4.2, 4.22, 4.25, 4.28];

    if (batt_voltages.length !== batt_percentages.length) {
        return null;
    }
    if (voltage < batt_voltages[0]) {
        return 0;
    }
    if (voltage > batt_voltages[batt_voltages.length - 1]) {
        return 100;
    }
    
    // loop through batt_voltages and find if there's a match
    // if there is, return value from batt_percentages with same value
    for (var i = 0; i < batt_voltages.length; i++) {
        if (batt_voltages[i] === voltage) {
            return batt_percentages[i];
        }
    }
    
    // If we get to here, no exact match so need to find the voltages either side
    var currentVolts, lastVolts;
    for (var i = 0; i < batt_voltages.length; i++) {
        currentVolts = batt_voltages[i];
        if (voltage > lastVolts && voltage < currentVolts) {
            // Interpolate
            var fractionAcrossInterval = (voltage - lastVolts) / (currentVolts - lastVolts);
            
            var lowerPercent = batt_percentages[i - 1];
            var upperPercent = batt_percentages[i];
            
            return lowerPercent + (fractionAcrossInterval * (upperPercent - lowerPercent));
        }
        lastVolts = currentVolts;
    }
}

