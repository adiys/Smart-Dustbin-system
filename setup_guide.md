# Smart Dustbin Monitor - Setup Guide

## Overview
This project integrates an ESP8266-based smart dustbin with a web dashboard for real-time monitoring.

## Files Created
- `smart_dustbin.ino` - ESP8266 Arduino code with web server
- `index.html` - Web dashboard UI
- `styles.css` - Modern responsive styling
- `script.js` - JavaScript for real-time data fetching and visualization

## Setup Instructions

### 1. Hardware Requirements
- ESP8266 NodeMCU or similar
- HC-SR04 Ultrasonic Sensor
- 16x2 I2C LCD Display
- LED (for alerts)
- GPS Module (optional)
- GSM Module (for SMS alerts)
- Jumper wires and breadboard

### 2. Wiring Connections
```
ESP8266 -> Components:
D5 -> Echo Pin (Ultrasonic)
D6 -> Trig Pin (Ultrasonic)
D7 -> LED (+)
D3 -> GSM TX
D4 -> GSM RX
D1 -> GPS TX
D2 -> GPS RX
SDA -> LCD SDA
SCL -> LCD SCL
```

### 3. Software Setup

#### Arduino Code Setup:
1. Open `smart_dustbin.ino` in Arduino IDE
2. Install required libraries:
   - ESP8266WiFi
   - LiquidCrystal_I2C
   - SoftwareSerial
   - TinyGPS++
3. Update WiFi credentials:
   ```cpp
   const char *ssid = "YourWiFiName";
   const char *password = "YourPassword";
   ```
4. Update phone number for SMS:
   ```cpp
   mySerial.println("AT+CMGS=\"+91XXXXXXXXXX\"\r");
   ```
5. Upload code to ESP8266

#### Web Dashboard Setup:
1. Open `index.html` in a web browser
2. The dashboard will automatically try to connect to the ESP8266
3. If ESP8266 is not found, it will offer simulation mode

### 4. Web API Endpoints
The ESP8266 serves these endpoints:
- `GET /` - Basic status page
- `GET /data` - JSON sensor data
- `GET /status` - System status
- `GET /location` - GPS coordinates

### 5. Configuration
- In the web dashboard, click Settings to configure:
  - ESP8266 IP address
  - Alert threshold (default: 80%)
  - Refresh rate (default: 5 seconds)

### 6. Features
- **Real-time monitoring**: Distance and fill level
- **Visual dashboard**: Animated dustbin fill indicator
- **Alerts**: Visual and SMS notifications when full
- **GPS tracking**: Dustbin and vehicle location
- **Statistics**: Total readings, average level, uptime
- **Responsive design**: Works on desktop and mobile

### 7. Troubleshooting
- If ESP8266 doesn't connect, check WiFi credentials
- For GPS issues, verify wiring and satellite visibility
- SMS alerts require active GSM module and SIM card
- Web dashboard falls back to simulation mode if ESP is unreachable

### 8. Data Format
The ESP8266 returns JSON data in this format:
```json
{
  "distance": 15.2,
  "level": 39.2,
  "timestamp": 1234567890,
  "dustbinLat": 28.6139,
  "dustbinLng": 77.2090,
  "vehicleLat": 28.7041,
  "vehicleLng": 77.1025,
  "gpsAvailable": true,
  "status": "Low",
  "alert": false
}
```
