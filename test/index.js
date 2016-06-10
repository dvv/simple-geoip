var countries = require("../bundle").countries;
var lookupByIP = require("../bundle").lookupByIP;

console.log(countries);

console.log(lookupByIP("80.246.64.6"));
console.log(lookupByIP("79.171.11.94"));
console.log(lookupByIP("222.119.227.33"));
console.log(lookupByIP("121.11.127.33"));
