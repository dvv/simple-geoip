#!/usr/local/bin/coffee
'use strict'

getLocation = require('./index')('./GeoLiteCity.dat').lookupByIP
#getLocation = require('./index')('./GeoIP.dat').lookupByIP

console.log getLocation '80.246.64.6', true
console.log getLocation '79.171.11.94', true
console.log getLocation '222.119.227.33', true
console.log getLocation '121.11.127.33', true
#process.exit 0

assert = require 'assert'
n255 = -> Math.floor Math.random()*256
for i in [0...100]
	ip = n255() + '.' + n255() + '.' + n255() + '.' + n255()
	#vanilla = geo.getCountry ip, 'id'
	mine = getLocation ip, true
	#assert.deepEqual vanilla, mine, "vanilla: #{vanilla}, mine: #{mine}, ip: #{ip}"
	console.log mine
