"use strict";

function addTouchEvents() {
    $(function () {
        $('#stick1').joystick({
            moveEvent: function (pos) {
                console.log('Joystick 1:' + pos.x + ', ' + pos.y);
            },
            endEvent: function (pos) {
                console.log('Joystick 1:' + pos.x + ', ' + pos.y);
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

        // Default positions                                                                                                                      
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