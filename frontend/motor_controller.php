<?php
// Handles motor control events
// Does NOT handle background tasks such as turning off motor due to limit switch triggering

/* params:
 * s=steering %
 * t=traction %
 * a=arm %
 * b=bucket %
 * These will need mapping to servo values
 */

// Current GPIO pin mapping (all pins using BCM numbers)
// 4	PWMA
// 17	AIN?
// 21	AIN?
// 22	ENABLE
//  7	Bucket servo
//  8	Steering servo
// 23	BIN1
// 24	BIN2
// 18	PWMB

$steering_servo_min_pulse = 750;
$steering_servo_max_pulse = 2400;
$bucket_servo_min_pulse = 1000;
$bucket_servo_max_pulse = 2000;

$output='';

if (isset($GET['status'])) {
    echo "status";
    $output = $output . shell_exec("vcgencmd measure_temp");
}

if (isset($_GET['s'])) {
    $s = (int) $_GET['s'];
    if ($s > 100 || $s < 0) {
	break;
    }
    $value = $steering_servo_min_pulse + (($s / 100) * ($steering_servo_max_pulse - $steering_servo_min_pulse));
    $output = $output . shell_exec ("pigs servo 8 " . $value);
}

if (isset($_GET['t'])) {
    $t = (int) $_GET['t'];
    if ($t < -100 || $t > 100) {
	break;
    }
    $output = $output . shell_exec("pigs w 22 1");
    switch (true) {
	case $t < 0:
	    $output = $output . shell_exec("pigs w 17 1");
	    $output = $output . shell_exec("pigs w 21 0");
	    break;
	case $t == 0:
	    $output = $output . shell_exec("pigs w 17 1");
	    $output = $output . shell_exec("pigs w 21 1");
	    break;
	case $t > 0:
	    $output = $output . shell_exec("pigs w 17 0");
	    $output = $output . shell_exec("pigs w 21 1");
	    break;
    }
    $pwm = 255 * (abs($t)/100);
    $output = $output . shell_exec("pigs pwm 4 " . $pwm);
}

if (isset($_GET['a'])) {
    $a = (int) $_GET['a'];
    if ($a <-100 || $a > 100) {
	break;
    }
    $output = $output . shell_exec("pigs w 22 1");
    switch (true) {
	case $a < 0:
	    $output = $output . shell_exec("pigs w 23 1");
	    $output = $output . shell_exec("pigs w 24 0");
	    break;
	case $a == 0:
	    $output = $output . shell_exec("pigs w 23 1");
	    $output = $output . shell_exec("pigs w 24 1");
	    break;
	case $a > 0:
	    $output = $output . shell_exec("pigs w 23 0");
	    $output = $output . shell_exec("pigs w 24 1");
	    break;
    }
    $pwm = 255 * (abs($a)/100);
    $output = $output . shell_exec("pigs pwm 18 " . $pwm);
}

if (isset($_GET['b'])) {
    $b = (int) $_GET['b'];
    if ($b < 0 || $b > 100) {
	break;
    }
    $value = $bucket_servo_min_pulse + (($b/ 100) * ($bucket_servo_max_pulse - $bucket_servo_min_pulse));
    $output = $output . shell_exec ("pigs servo 7 " . $value);
}

echo $output;
