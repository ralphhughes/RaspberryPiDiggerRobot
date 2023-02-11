#!/usr/bin/env python

import time
import pigpio

pi = pigpio.pi() # Connect to local Pi.
if not pi.connected:
   exit()

