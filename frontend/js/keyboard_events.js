"use strict";

function addKeyboardHandlers() {
    // Robot control event handlers below here:
    $(document).keydown(function (e) {
        // console.log("keycode: " + e.keyCode);
        // If escape or space is pressed, stop all motors
        if (e.keyCode === 27 || e.keyCode === 32) {
            tractionMotor = 0;
            armMotor = 0;
            sendMessage("a=0, t=0");
            return false; //Stops the PgDown?
        }
        if (e.keyCode === 13) { // Enter: Switch direction or shake bucket?
            
            
        }
        if (e.keyCode === 87) { // W: Forward
            tractionMotor++;
            tractionMotor = cropToRange(tractionMotor, -255, 255);
            sendMessage("t=" + tractionMotor);
        }
        if (e.keyCode === 65) { // A: Left
            steeringServo = steeringServo - steeringDelta;
            steeringServo = cropToRange(steeringServo, 0, 1000);
            sendMessage("s=" + steeringServo);
        }
        if (e.keyCode === 83) { // S: Backwards
            tractionMotor--;
            tractionMotor = cropToRange(tractionMotor, -255, 255);
            sendMessage("t=" + tractionMotor);
        }
        if (e.keyCode === 68) { // D: Right
            steeringServo = steeringServo + steeringDelta;
            steeringServo = cropToRange(steeringServo, 0, 1000);
            sendMessage("s=" + steeringServo);
        }


    });

    // Event handler for changing bucket position when keys are held down
    $(document).keydown(function (e) {
        // 49-57 (Num keys 1-9) for bucket angle
        if (e.keyCode >= 49 && e.keyCode <= 57) {
            var numberPressed = e.keyCode - 48;
            bucketServo = Math.round(((numberPressed - 1) / 8) * 1000);
            bucketServo = cropToRange(bucketServo, 0, 1000);
            sendMessage("b=" + bucketServo);
        }

        // plus\minus keys for fine adjustment
        if (e.keyCode === 173) {
            bucketServo--;
            bucketServo = cropToRange(bucketServo, 0, 1000);
            sendMessage("b=" + bucketServo);
        }

        if (e.keyCode === 61) {
            bucketServo++;
            bucketServo = cropToRange(bucketServo, 0, 1000);
            sendMessage("b=" + bucketServo);
        }

        // Don't propagate this event to other handlers
        // return false;
    });

}