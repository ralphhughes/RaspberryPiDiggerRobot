"use strict";

function addTouchEvents() {
    window.addEventListener('touchstart', function onFirstTouch() {
        // If the screen is touched, show the touch controls
        $('#stick1').fadeIn('slow');
        $('#stick2').fadeIn('slow');

        // we only need to know once that a human touched the screen, so we can stop listening now
        window.removeEventListener('touchstart', onFirstTouch, false);
    }, false);

    $(function () {
        $('#stick1').joystick({
            moveEvent: function (pos) {
                console.log('Joystick 1:' + pos.x + ', ' + pos.y);
                tractionMotor = (pos.y - 0.5) * 2 * 255;
                tractionMotor = setDeadband(tractionMotor, 50);
                tractionMotor = cropToRange(tractionMotor, -255, 255);
                sendMessage("t=" + tractionMotor);

                steeringServo = pos.x * 1000;
                steeringServo = cropToRange(steeringServo, 0, 1000);
                sendMessage("s=" + steeringServo);
            },
            endEvent: function (pos) {
                sendMessage("t=0");

                steeringServo = pos.x * 1000;
                steeringServo = cropToRange(steeringServo, 0, 1000);
                sendMessage("s=" + steeringServo);
            }
        });
        $('#stick2').joystick({
            moveEvent: function (pos) {
                console.log('yaw:' + pos.x);
            },
            endEvent: function (pos) {
                console.log('yaw:' + pos.x);
            }
        });

        // Default position is centred for both joysticks
        $('#stick1').joystick('value', 0.5, 0.5);
        $('#stick2').joystick('value', 0.5, 0.5);

    });
}

function addTiltEvents() {
    function handleOrientation(event) {
        var beta = event.beta;  // In degree in the range [-180,180]
        var gamma = event.gamma; // In degree in the range [-90,90]

        console.log("beta : " + beta);
        console.log("gamma: " + gamma);

        // Because we don't want to have the device upside down
        // We constrain the x value to the range [-90,90]
        if (beta > 90) {
            beta = 90;
        }

        if (beta < -90) {
            beta = -90;
        }

    }

    window.addEventListener('deviceorientation', handleOrientation);
}