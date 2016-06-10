'use strict';var GEOIP, GEOIP_CONTINENT_NAMES, GEOIP_COUNTRY, GEOIP_COUNTRY_BEGIN, GEOIP_RECORD_LEN, GEOIP_REGION, GEOIP_TIMEZONES, GEOIP_TYPE, buffer, getLocation, seekCountry, seekCountry3, seekCountry4;
GEOIP_CONTINENT_NAMES = {
  AF: "Africa",
  AN: "Antarctica",
  AS: "Asia",
  EU: "Europe",
  NA: "North America",
  OC: "Oceania",
  SA: "South America"
};
GEOIP = require("./country");
GEOIP_TIMEZONES = require("./timezone");
GEOIP_COUNTRY = {};
GEOIP.code.forEach(function(code, id) {
  var rec;
  rec = {
    id: code,
    iso2: code,
    iso3: GEOIP.code3[id],
    name: GEOIP.name[id],
    cont: GEOIP.continent[id],
    cont_name: GEOIP_CONTINENT_NAMES[GEOIP.continent[id]],
    tz: []
  };
  Object.keys(GEOIP_TIMEZONES).forEach(function(tag) {
    if (tag === code || tag.substr(0, 2) === code) {
      if (!(rec.tz.indexOf(GEOIP_TIMEZONES[tag]) >= 0)) {
        return rec.tz.push(GEOIP_TIMEZONES[tag]);
      }
    }
  });
  if (rec.iso3.length === 3) {
    return GEOIP_COUNTRY[code] = rec;
  }
});
GEOIP_REGION = {};
buffer = null;
GEOIP_TYPE = 1;
GEOIP_RECORD_LEN = 3;
GEOIP_COUNTRY_BEGIN = 16776960;
seekCountry = seekCountry3 = function(ip32) {
  var depth, offset, pos;
  offset = 0;
  for (depth = 31; depth >= 0; depth--) {
    pos = 6 * offset;
    if (ip32 & (1 << depth)) {
      pos += 3;
    }
    offset = buffer[pos] + (buffer[pos + 1] << 8) + (buffer[pos + 2] << 16);
    if (offset >= GEOIP_COUNTRY_BEGIN) {
      return offset - GEOIP_COUNTRY_BEGIN;
    }
  }
  return 0;
};
seekCountry4 = function(ip32) {
  var depth, offset, pos;
  offset = 0;
  for (depth = 31; depth >= 0; depth--) {
    pos = 8 * offset;
    if (ip32 & (1 << depth)) {
      pos += 4;
    }
    offset = buffer[pos] + (buffer[pos + 1] << 8) + (buffer[pos + 2] << 16) + (buffer[pos + 3] << 24);
    if (offset >= GEOIP_COUNTRY_BEGIN) {
      return offset - GEOIP_COUNTRY_BEGIN;
    }
  }
  return 0;
};
getLocation = function(ipaddr, full) {
  var b, code, e, id, ip32, n, offset, p, rc1, rc2, record, region_code;
  p = String(ipaddr).split('.');
  ip32 = +p[0] * 16777216 + +p[1] * 65536 + +p[2] * 256 + +p[3];
  id = seekCountry(ip32);
  if (id <= 0) {
    return;
  }
  if (GEOIP_TYPE > 1) {
    offset = id + (2 * GEOIP_RECORD_LEN) * GEOIP_COUNTRY_BEGIN;
    id = buffer[offset];
  }
  code = GEOIP.code[id];
  if (!full) {
    return code;
  }
  record = {
    country_code: code,
    country_code3: GEOIP.code3[id],
    country_name: GEOIP.name[id],
    continent_code: GEOIP.continent[id],
    continent_name: GEOIP_CONTINENT_NAMES[GEOIP.continent[id]]
  };
  if (GEOIP_TYPE > 1) {
    b = e = offset + 1;
    while (buffer[e]) {
      e++;
    }
    record.region_code = buffer.toString('utf8', b, e);
    if (full) {
      rc1 = buffer[b];
      rc2 = buffer[b + 1];
      if ((48 <= rc1 && rc1 < 58) && (48 <= rc2 && rc2 < 58)) {
        region_code = (rc1 - 48) * 10 + rc2 - 48;
      } else if ((65 <= rc1 && rc1 <= 90) || (48 <= rc1 && rc1 < 58) && (65 <= rc2 && rc2 <= 90) || (48 <= rc2 && rc2 < 58)) {
        region_code = (rc1 - 48) * (65 + 26 - 48) + rc2 - 48 + 100;
      }
      if (region_code) {
        record.region_name = region_code;
      }
    }
    if (full) {
      record.tz = GEOIP_TIMEZONES[code + record.region_code] || GEOIP_TIMEZONES[code];
    }
    b = e = e + 1;
    while (buffer[e]) {
      e++;
    }
    record.city_name = buffer.toString('utf8', b, e);
    b = e = e + 1;
    while (buffer[e]) {
      e++;
    }
    record.postal_code = buffer.toString('utf8', b, e);
    b = e + 1;
    n = buffer[b] + (buffer[b + 1] << 8) + (buffer[b + 2] << 16);
    b += 3;
    record.latitude = (n / 10000.0).toFixed(6) - 180;
    n = buffer[b] + (buffer[b + 1] << 8) + (buffer[b + 2] << 16);
    b += 3;
    record.longitude = (n / 10000.0).toFixed(6) - 180;
    if (GEOIP_TYPE === 2) {
      if (record.country_code === 'US') {
        n = buffer[b] + (buffer[b + 1] << 8) + (buffer[b + 2] << 16);
        b += 3;
        record.dma_code = record.metro_code = Math.floor(n / 1000);
        record.area_code = n % 1000;
        n = buffer[b] + (buffer[b + 1] << 8) + (buffer[b + 2] << 16);
      }
    }
  }
  return record;
};

buffer = require("../GeoLiteCity.dat");
var buflen = buffer.length;

for (var i = 0; i <= 19; i++) {
  var pos = buflen - i - 3;
  if (buffer[pos] === 255 && buffer[pos + 1] === 255 && buffer[pos + 2] === 255) {
    GEOIP_TYPE = buffer[pos + 3];
    if (GEOIP_TYPE >= 106) {
      GEOIP_TYPE -= 105;
    }
    if (GEOIP_TYPE === 7) {
      GEOIP_COUNTRY_BEGIN = 16700000;
    }
    if (GEOIP_TYPE === 3) {
      GEOIP_COUNTRY_BEGIN = 16000000;
    }
    if (GEOIP_TYPE === 2 || GEOIP_TYPE === 4 || GEOIP_TYPE === 5 || GEOIP_TYPE === 6 || GEOIP_TYPE === 9) {
      GEOIP_COUNTRY_BEGIN = buffer[pos + 4] + (buffer[pos + 5] << 8) + (buffer[pos + 6] << 16);
      if (GEOIP_TYPE === 4 || GEOIP_TYPE === 5) {
        GEOIP_RECORD_LEN = 4;
        seekCountry = seekCountry4;
      }
    }
  }
}

exports.lookupByIP = getLocation;

exports.countries = GEOIP_COUNTRY;
