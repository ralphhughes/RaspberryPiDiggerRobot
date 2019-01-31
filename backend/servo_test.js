var Gpio = require('pigpio').Gpio;      // https://github.com/fivdi/pigpio

const servo1 = new Gpio(21, {mode: Gpio.OUTPUT});
const servo2 = new Gpio(20, {mode: Gpio.OUTPUT});
const servo3 = new Gpio(25, {mode: Gpio.OUTPUT});

pulse1 = 1500;
pulse2 = 1500;
pulse3 = 1500;

console.log("Servo pulses are being generated on the following channels:");
console.log("1: GPIO21: Steering");
console.log("2: GPIO20: Bucket");
console.log("3: GPIO25: Camera");


const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
        process.exit();
    } else {
        switch (key.name) {
            case 'q':
                pulse1 -= 10;
                break;
            case 'a':
                pulse1 += 10;
                break;
            case 'w':
                pulse2 -= 10;
                break;
            case 's':
                pulse2 += 10;
                break;
            case 'e':
                pulse3 -= 10;
                break;
            case 'd':
                pulse3 += 10;
                break;    
        }
        servo1.servoWrite(pulse1);
        servo2.servoWrite(pulse2);
        servo3.servoWrite(pulse3);
        console.log("1: GPIO21: Steering " + pulse1);
        console.log("2: GPIO20: Bucket   " + pulse2);
        console.log("3: GPIO25: Camera   " + pulse3);

    }
});
console.log('Keys: qa, ws, ed');

