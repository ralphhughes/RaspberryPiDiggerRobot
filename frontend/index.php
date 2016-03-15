<?php session_start(); ?><!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>Ajax test</title>
        <meta name="author" content="Ralph Hughes">
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
        <link rel="stylesheet" href="styles.css">
        <script>           
            // Global variables
            var steeringServo = 50; // [0%, 100%]   // Default straight ahead
            var tractionMotor = 0;  // [-100%,100%] // Default stopped
            var armMotor = 0;       // [-100%,100%] // Default stopped
            var bucketServo = 50;   // [0%, 100%]   // Default half way between bucket up and down
            
            // Could scale things up to 600x800 or even 720x960?
            var divWidth = 480;
            var divHeight = 640;
            
            var timeOfLastCommand = new Date().getTime();
            
            $(document).ready(function(){
                var objDiv = document.getElementById('container');
                objDiv.style.width = divWidth + "px";
                objDiv.style.height = divHeight + "px";
                
                //setInterval(sendValuesToBackend, 1000); // Probably don't need this anymore
                
                // Event handler for raising and lowering arm on left/right click
                $(".overlays").mousedown(function(event) {
                    switch (event.which) {
                        case 1:
                            armMotor = 100;
                            break;
                        case 3:
                            armMotor = -100;
                            break;
                    }
                    sendValuesToBackend();
                });
                
                // Event handler for stopping arm motor when mouse button no longer held down
                $(".overlays").mouseup(function() {
                    armMotor = 0;
                    sendValuesToBackend();
                });
                
                // Event handler for controlling steering and traction motors dependent upon mouse position
                $(".overlays").mousemove(function(e){
                    var parentOffset = $(this).parent().offset();
                    var x = (e.pageX - parentOffset.left); //offset -> method allows you to retrieve the current position of an element 'relative' to the document
                    var y = (e.pageY - parentOffset.top);
                    x = Math.round(((x / divWidth) * 120) - 10);
                    y = Math.round(((y / divHeight) * 250) - (250/2));
                    
                    // Dead band round center of div to prevent traction motor stall under low duty cycle PWM
                    if (y > -20 && y < 20) {
                        y = 0;
                    }
                    // Full power band round edge of div to make it easier to hold mouse on 100%
                    if (x > 100) { x=100; }
                    if (x < 0) { x=0; }
                    if (y > 100) { y=100; }
                    if (y < -100) { y=-100; }
                    
                    // Invert traction motor
                    y = -y;
                    
                    // Copy onto the global variables
                    tractionMotor = y;
                    steeringServo = 100-x;
                    
                    // Only fire sendValuesToBackend() if it has been more than 200ms since we last
                    // did it. Otherwise the number of Ajax requests fired as the mouse moved around
                    // would be insane.                    
                    if ((new Date().getTime() - timeOfLastCommand) > 200) {
                        sendValuesToBackend();
                    }
                });
                
                // Event handler for stopping traction and arm motors when mouse is not on the video stream
                $(".overlays").mouseleave(function(e){
                    tractionMotor=0;
                    armMotor=0;
                    // fire ajax call with motor stop signals 
                    sendValuesToBackend();
                });
                /* Doesn't work as this event fires when over the overlays as well?
                $('body,html').mousemove(function(e){
                    $(".overlays").css({opacity: 0.2});
                });
                */
            });
            
            // Event handler for changing bucket position when keys are pressed
            $(document).keydown(function(e){
                // 49-57 (Num keys 1-9) for bucket angle
                if (e.keyCode >= 49 && e.keyCode <= 57) {
                    var numberPressed = e.keyCode-48;
                    bucketServo = Math.round(((numberPressed-1)/8) * 100);
                }
                // 13 (Enter) for bucket shake?
                // Shake function would be active over multiple POST's, needs special handling
                sendValuesToBackend();
            });
            
            function sendValuesToBackend() {
                var debug = "Debug:<br/>Steering servo: " + steeringServo + "%<br/>"
                        + "Traction motor: " + tractionMotor + "%<br/>"
                        + "Arm Motor: " + armMotor + "%<br/>"
                        + "Bucket Servo: " + bucketServo + "%<br/>";
                
                document.getElementById("debug").innerHTML = debug;
                
                // Post the above values via AJAX here
                // Return value is 200 if everything is OK. 
                // Each Ajax request is timed and latest ping value is updated on front end.
                var start_time = new Date().getTime();
                
                // Update global variable
                timeOfLastCommand = start_time;
                jQuery.ajax({
                    // Python
                    //url: "localhost:9000?s=" + steeringServo + "&t=" + tractionMotor + "&a=" + armMotor + "&b=" + bucketServo, 
                    
                    // PHP
                    url: "motor_controller.php?s=" + steeringServo + "&t=" + tractionMotor + "&a=" + armMotor + "&b=" + bucketServo, 
                    type: "GET",
                    timeout: 500, // milliseconds
                    success: function(result) {
                        var request_time = new Date().getTime() - start_time;
                        if (result !== 'OK') {
                            // alert(result);
                        }
                        var pingObj = document.getElementById('ping');
                        pingObj.innerHTML = request_time;
                    },
                    error: function (request, status, error) {
                        //alert(request.responseText);
                        //alert(status);
                        //alert(error);
                    }
                });
                
            }
        </script>
    </head>
    <body>
        <h1>Overlay Mousemove Test</h1>
        <div id="container" oncontextmenu="return false;">
            <img src="http://rpi-robot.lan:8080/?action=stream" alt="Video Feed" id="mainImg"/>
            <div id="upperDiv" class="overlays"></div>
            <div id="lowerDiv" class="overlays"></div>
        </div>
        <span id="debug"></span>
        <input type="button" onclick="btnPress();" value="Click"/>
        <br/>
        Your IP: <?= $_SERVER['REMOTE_ADDR'] ?><br/>
        Your session ID: <?= session_id() ?><br/>
        Ping: <span id="ping">--</span> ms<br/>
        CPU Temp: -- C<br/>
        CPU Load: -- %<br/>
    </body>
</html>
