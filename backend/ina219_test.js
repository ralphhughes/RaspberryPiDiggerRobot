var ina219 = require('ina219');

ina219.init();
// ina219.enableLogging(true);

ina219.calibrate32V1A(function () {
    setInterval(readStuff,1000);
});

function readStuff() {
    ina219.getBusVoltage_V(function (volts) {
        console.log((new Date().getTime() % 60000) + "Voltage: " + volts + "V");
    });

    ina219.getCurrent_mA(function (current) {
        console.log((new Date().getTime() % 60000) + "Current: " + current + "mA");
    });

    ina219.getPower_mW(function (milliWatts) {
	console.log((new Date().getTime() % 60000) + "Power: " + milliWatts + "mW");
    });
}

