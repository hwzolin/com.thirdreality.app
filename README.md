# ThirdReality ZigBee on Homey
ThirdReality Devices support without Bridge for Homey

## Release notes:

### v1.0.25
- OTA support: button v1.00.47
- OTA support: button_zb2 v1.00.09
- OTA support: color_bulb_zl1 (3RCB01057Z) v1.00.74
- OTA support: color_bulb_zl1 (3RCB02070Z) v1.00.80
- OTA support: contact v1.00.63
- OTA support: curtain v1.00.84
- OTA support: curtain_gen2 v1.00.55
- OTA support: dual_plug_ZP1 v1.00.42
- OTA support: garage_door_tilt v1.00.36
- OTA support: motion v1.00.79
- OTA support: motion_sensor_r1 v1.00.16
- OTA support: multi_fun_nl v1.00.86
- OTA support: plug_e2 v1.01.01
- OTA support: plug_gen3 (3RSPU01080Z) v1.00.47
- OTA support: plug_gen3 (3RSP02064Z) v1.00.47
- OTA support: plug_gen3 (3RSPE02065Z) v1.00.47
- OTA support: plug_v1 v1.01.01
- OTA support: plug_v2 v1.01.01
- OTA support: soil_moisture_sensor v1.00.51
- OTA support: soil_moisture_sensor_gen2 v1.00.21
- OTA support: switch v1.00.36
- OTA support: vibration v1.00.55
- OTA support: water_leak v1.00.73
- OTA support: water_leak_gen2 v1.00.17
- OTA support: watering_kit v1.00.45

### v1.0.24
- Modify the prompt information for the process of adding the door magnetic sensor
- Modify the error handling for exceptions in the air pressure sensor code
- Support air quality sensor
- In response to the issue raised by users regarding the excessively long trigger duration of the motion sensor and 5.8G radar (url: https://github.com/hwzolin/com.thirdreality.app/issues/39), the cooldown function setting has been added.

### v1.0.23
- LAS-14: The name displayed for the air pressure sensor in Homey should be changed to "Smart Filter Sensor".
- Add the unit "% " to the dirty level of Smart Filter Sensor in Homey.
- Determine the display of the "measure_pressure" capability based on whether the pressure value is reported by Smart Filter Sensor.
- Fix the issue where Homey Pro shows the prompt "Missing Capability Listener" when it is powered on after a power outage.

### v1.0.22
- Added support for Judge Height, Pre-Setting Bottom Height, and Blind Width in the Advanced Settings of the second-generation curtains.
- Optimized the issue where the low-version first-generation humidity and temperature sensor could not be added.
- Changed the switch type to light.
- Modified the alarm capability of the vibration sensor to alarm_vibration.
- Support for air pressure sensor.
- Replaced the custom TVOC capability of the 60G radar with the official capability.
- Support for 24G radar.
- Support for T&H Sensor Lite Gen2.

### v1.0.21
- Fix the issue where the humidity value of the Smart Soil Moisture Sensor does not change after the APP is updated.

### v1.0.20
- Fix the issue that Color Bulb ZL1 doesn't work after the version update.

### v1.0.19
- Fix the issue of the Motion Sensor and the Smart Motion Sensor R1 not being synchronized.
- Change "measure_humidity" in Smart Soil Moisture Sensor to "measure_moisture".
- By registering the capability during the device initialization process, an attempt is made to fix the issue where the Smart Color Bulb fails to function after an app update.

### v1.0.18
- Support for Smart WaterLeak KM1.
- Support for Smart Garage Door Opener.
- Support for Smart Button ZB2.
- Support for Smart Soil Moisture Sensor Gen2.
- Support for Smart Presence Sensor R3.
- Support for Smart Wall Outlet ZW1
- Modify the bindings of the Smart Dual Plug ZP1.
- Change "plug_702_uk" to "plug_gen3" and also support the model IDs of future series of PLUGs.

### v1.0.17
- Provide users with the option to set the config report of the soil sensor and temperature and humidity sensor lite in Advanced Settings.
- The motion sensor status of the Multi-Function Night Light is displayed in the activity card.
- Added support for Smart Plug UZ1.
- Added support for identification of Matter Bridges.
- Added support for identifying Matter Night Light.
- Added support for Matter Plug recognition.

### v1.0.16
- Added support for water shortage alarm in watering kit.

### v1.0.15
- Cancel the config report of the dual plug.

### v1.0.14
- Added support for Smart Dual Plug ZP1.
- Added support for Smart Mechanical Keyboard MK1.
- Added support for count down time for Smart Plug (Gen1, Gen2, E2)
- Added support for count down time for Smart Plug (Gen1, Gen2, E2)
- Added support for meter_power for Smart Plug (Gen2, E2)
- Added support for reset summation delivered for Smart Plug (Gen2, E2)

### v1.0.13
- Optimized the issue that the brightness control of the colored bulb did not have a synchronized state.

### v1.0.12
- Modify the manufacturerName of old T&H Sensor Lite and Contact Sensor

### v1.0.11
- Modify the manufacturerName of all devices.
- Added support for Smart Motion Sensor R1.
  
### v1.0.10
- Added manufacturerName of Smart Color Bulb ZL1.
- Modify the icon of some devices that do not meet the requirements.

### v1.0.9
- Remove the custom Fahrenheit capability.
  
### v1.0.8
- Added support for Smart Watering Kit, Smart Color Bulb ZL1, Smart Soil Moisture Sensor.
- Support temperature class equipment, add Fahrenheit display.

### v1.0.7
- Fix system abnormalities that may be caused by the operation of the device when it is offline.

### v1.0.6
- Added support for startup ON/OFF for Smart Plug (V1, v2, E2) and Multi-Function Night Light.

### v1.0.5
- Add support for Garage Door Tilt Sensor and Temperature and Humidity Sensor Lite

### v1.0.4
- Add support for Vibration Sensor and Button

### v1.0.3
- Add support for Homey Bridge

### v1.0.1
- Added support for Multi-function Night Light

### v1.0.0
- Added support for Smart Blind 
- Added support for Smart Switch Gen1	
- Added support for Smart Switch Gen2	
- Added support for Smart Switch Gen3	
- Added support for PIR Motion Sensor	
- Added support for Door Contact Sensor	
- Added support for Water Leak Sensor	
- Added support for T&H Sensor
- Added support for Smart Plug Gen1	
- Added support for Smart Plug Gen2	
- Added support for Smart Plug E2