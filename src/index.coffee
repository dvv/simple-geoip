'use strict'

GEOIP_CONTINENT_NAMES =
	AF: "Africa"
	AN: "Antarctica"
	AS: "Asia"
	EU: "Europe"
	NA: "North America"
	OC: "Oceania"
	SA: "South America"

GEOIP = require "./country"
GEOIP_TIMEZONES = require "./timezone"

#
# combined records
#
GEOIP_COUNTRY = {}
GEOIP.code.forEach (code, id) ->
	# put country record
	rec =
		id: code
		iso2: code
		iso3: GEOIP.code3[id]
		name: GEOIP.name[id]
		cont: GEOIP.continent[id]
		cont_name: GEOIP_CONTINENT_NAMES[GEOIP.continent[id]]
		tz: []
	Object.keys(GEOIP_TIMEZONES).forEach (tag) ->
		if tag is code or tag.substr(0,2) is code
			rec.tz.push GEOIP_TIMEZONES[tag] unless rec.tz.indexOf(GEOIP_TIMEZONES[tag]) >= 0
	# N.B. we filter quirky records
	if rec.iso3.length is 3
		GEOIP_COUNTRY[code] = rec
#
# dump records as JSON
#
require('fs').writeFile 'geo.json', JSON.stringify GEOIP_COUNTRY

#
# TODO:
#
GEOIP_REGION = {}

#
# maxmind DB
#
buffer = null

GEOIP_TYPE = 1
GEOIP_RECORD_LEN = 3
GEOIP_COUNTRY_BEGIN = 16776960

#
# highly optimized lookup helpers
#
seekCountry = seekCountry3 = (ip32) ->

	offset = 0
	for depth in [31..0]
		pos = 6 * offset
		pos += 3 if ip32 & (1 << depth)
		offset = buffer[pos] + (buffer[pos + 1] << 8) + (buffer[pos + 2] << 16)
		return offset - GEOIP_COUNTRY_BEGIN if offset >= GEOIP_COUNTRY_BEGIN
	0

seekCountry4 = (ip32) ->

	offset = 0
	for depth in [31..0]
		pos = 8 * offset
		pos += 4 if ip32 & (1 << depth)
		offset = buffer[pos] + (buffer[pos + 1] << 8) + (buffer[pos + 2] << 16) + (buffer[pos + 3] << 24)
		return offset - GEOIP_COUNTRY_BEGIN if offset >= GEOIP_COUNTRY_BEGIN
	0

#
# given IPv4 address, return country id (if full is falsy) or full record
#
getLocation = (ipaddr, full) ->

	# convert IP to int32
	p = String(ipaddr).split('.')
	ip32 = +p[0] * 16777216 + +p[1] * 65536 + +p[2] * 256 + +p[3]

	# get country id
	id = seekCountry ip32
	#return 0 if id <= 0
	return undefined if id <= 0

	# if DB is not basic, seek to the location record
	if GEOIP_TYPE > 1
		offset = id + (2 * GEOIP_RECORD_LEN) * GEOIP_COUNTRY_BEGIN
		id = buffer[offset]
		#console.log id + GEOIP_COUNTRY_BEGIN, offset

	# compose country stuff
	code = GEOIP.code[id]

	# return just code unless `full` is truthy
	return code unless full

	record =
		country_code: code
		country_code3: GEOIP.code3[id]
		country_name: GEOIP.name[id]
		continent_code: GEOIP.continent[id]
		continent_name: GEOIP_CONTINENT_NAMES[GEOIP.continent[id]]

	# mixin additional info, if available
	if GEOIP_TYPE > 1
		# region name
		b = e = offset + 1
		e++ while buffer[e]
		record.region_code = buffer.toString 'utf8', b, e
		if full
			rc1 = buffer[b]
			rc2 = buffer[b+1]
			if 48 <= rc1 < 58 and 48 <= rc2 < 58
				region_code = (rc1 - 48 ) * 10 + rc2 - 48
			else if 65 <= rc1 <= 90 or 48 <= rc1 < 58 and 65 <= rc2 <= 90 or 48 <= rc2 < 58
				region_code = (rc1 - 48) * (65 + 26 - 48) + rc2 - 48 + 100
			#record.region_name = GEOIP_REGION[region_code] if region_code
			record.region_name = region_code if region_code
		# timezone
		if full
			record.tz = GEOIP_TIMEZONES[code + record.region_code] or GEOIP_TIMEZONES[code]
		# city name
		b = e = e + 1
		e++ while buffer[e]
		record.city_name = buffer.toString 'utf8', b, e
		# postal code
		b = e = e + 1
		e++ while buffer[e]
		record.postal_code = buffer.toString 'utf8', b, e
		# latitude and longitude
		b = e + 1
		n = buffer[b] + (buffer[b + 1] << 8) + (buffer[b + 2] << 16)
		b += 3
		record.latitude = (n/10000.0).toFixed(6) - 180
		n = buffer[b] + (buffer[b + 1] << 8) + (buffer[b + 2] << 16)
		b += 3
		record.longitude = (n/10000.0).toFixed(6) - 180
		# finer location, if available
		if GEOIP_TYPE is 2
			if record.country_code is 'US'
				n = buffer[b] + (buffer[b + 1] << 8) + (buffer[b + 2] << 16)
				b += 3
				record.dma_code = record.metro_code = Math.floor n / 1000
				record.area_code = n % 1000
				n = buffer[b] + (buffer[b + 1] << 8) + (buffer[b + 2] << 16)

	#
	record

module.exports = (filename = __dirname + "/../GeoLiteCity.dat") ->

	# load db
	buffer = require('fs').readFileSync filename
	buflen = buffer.length
	#
	console.error "DB #{filename} loaded (length = #{buflen})"

	# determine db type, offsets and record length
	for i in [0..19]
		pos = buflen - i - 3
		if buffer[pos] is 255 and buffer[pos + 1] is 255 and buffer[pos + 2] is 255
			GEOIP_TYPE = buffer[pos + 3]
			GEOIP_TYPE -= 105 if GEOIP_TYPE >= 106
			GEOIP_COUNTRY_BEGIN = 16700000 if GEOIP_TYPE is 7
			GEOIP_COUNTRY_BEGIN = 16000000 if GEOIP_TYPE is 3
			if GEOIP_TYPE in [2, 4, 5, 6, 9]
				# custom offset
				GEOIP_COUNTRY_BEGIN = buffer[pos + 4] + (buffer[pos + 5] << 8) + (buffer[pos + 6] << 16)
				# 4-byte record?
				if GEOIP_TYPE in [4, 5]
					GEOIP_RECORD_LEN = 4
					seekCountry = seekCountry4

	#console.log GEOIP_TYPE, GEOIP_COUNTRY_BEGIN, GEOIP_RECORD_LEN

	# export lookup function and collected country info
	return {
		lookupByIP: getLocation
		countries: GEOIP_COUNTRY
	}
