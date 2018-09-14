"use strict";
function addMouseHandlers() {
    $('#mainImg').on('mousewheel', function(event) {
        // console.log(event.deltaX, event.deltaY, event.deltaFactor);
        bucketServo = bucketServo + (-event.deltaY * bucketDelta);
        bucketServo = cropToRange(bucketServo, 0, 1000);
        sendMessage("b=" + bucketServo);
        return false; // Stop page scrolling up and down
    });


    // Event handler for controlling camera servo dependent on mouse position
    $("#mainImg").mousemove(function (e) {
        var parentOffset = $(this).parent().offset();
        var x = (e.pageX - parentOffset.left); //offset -> method allows you to retrieve the current position of an element 'relative' to the document
        x = Math.round(((x / $('#mainImg')[0].width) * 120) - 10);

        // Full power band round edge of div to make it easier to hold mouse on 100%
        if (x > 100) {
            x = 100;
        }
        if (x < 0) {
            x = 0;
        }
        x = 100-x; 
        
        cameraServo = x * 10; // TODO: Need better mapping
        sendMessage("c=" + cameraServo);
    });

    // Event handler for stopping arm motor when mouse is not on the video stream
    $("#mainImg").mouseleave(function (e) {
        armMotor = 0;
        // fire ajax call with motor stop signals 
        sendMessage("a=0");
    });

    // Event handler for raising and lowering arm on left/right click
    $("#mainImg").mousedown(function (event) {
        switch (event.which) {
            case 1:
                armMotor = 255;
                break;
            case 3:
                armMotor = -255;
                break;
        }
        sendMessage("a=" + armMotor);
    });

    // Event handler for stopping arm motor when mouse button no longer held down
    $("#mainImg").mouseup(function () {
        armMotor = 0;
        sendMessage("a=" + armMotor);
    });
}
