# Smart Dustbin IoT System

## Overview
This project creates a complete IoT-based smart dustbin monitoring system with real-time web interface and SMS alerts.

## Components

### 1. ESP8266 Arduino Code (`smart_dustbin.ino`)
- **Hardware**: ESP8266, Ultrasonic Sensor (HC-SR04), LCD Display, LED, GSM Module
- **Features**:
  - Ultrasonic distance measurement
  - Fill level calculation
  - LCD display for local monitoring
  - WiFi connectivity and web server
  - SMS alerts via GSM module
  - IFTTT notifications
  - Built-in web interface

### 2. Web Interface
- **Advanced Dashboard** (`index.html`, `styles.css`, `script.js`):
  - Real-time dustbin level visualization
  - Responsive design for desktop and mobile
  - Statistics tracking
  - Notification system
  - Settings configuration
  - Auto-refresh functionality

- **ESP8266 Built-in Interface**:
  - Simple HTML page served directly from ESP8266
  - Real-time data updates
  - Basic visualization

## How It Works

### ESP8266 Web Server
The ESP8266 acts as both sensor and web server:
1. Measures distance using ultrasonic sensor
2. Calculates fill level percentage
3. Serves web interface at `http://[ESP_IP]`
4. Provides JSON API at `http://[ESP_IP]/data`
5. Sends SMS/IFTTT alerts when dustbin is full (80%+)

### Data Flow
```
Ultrasonic Sensor -> ESP8266 -> Web Interface
                -> LCD Display
                -> SMS Alerts
                -> IFTTT Notifications
```

## Setup Instructions

### 1. Hardware Connections
```
ESP8266 Connections:
- D6: Ultrasonic Trig Pin
- D5: Ultrasonic Echo Pin  
- D7: LED Indicator
- D3: GSM Module TX
- D4: GSM Module RX
- SDA/SCL: I2C LCD Display
```

### 2. Software Configuration
1. Update WiFi credentials in `smart_dustbin.ino`:
   ```cpp
   const char *ssid = "YourWiFiName";
   const char *password = "YourPassword";
   ```

2. Update phone number for SMS alerts:
   ```cpp
   mySerial.println("AT+CMGS=\"+91XXXXXXXXXX\"\r");
   ```

3. Update IFTTT key if needed:
   ```cpp
   const char *privateKey = "your_ifttt_key";
   ```

### 3. Web Interface Options

#### Option A: Advanced Dashboard
1. Open `index.html` in browser
2. Set ESP8266 IP address in settings
3. View real-time data with full features

#### Option B: ESP8266 Built-in
1. Upload code to ESP8266
2. Find ESP8266 IP from Serial Monitor
3. Open `http://[ESP_IP]` in browser

## API Endpoints

### GET `/data`
Returns JSON with current sensor data:
```json
{
  "distance": 15.2,
  "level": 39.2,
  "timestamp": "12345678"
}
```

### GET `/`
Serves built-in HTML interface

## Features

### ESP8266 Features
- Real-time ultrasonic sensing
- WiFi web server
- SMS alert system
- IFTTT integration
- LCD local display
- LED visual indicators

### Web Dashboard Features
- Real-time data visualization
- Dustbin fill animation
- Statistics tracking
- Notification system
- Mobile responsive design
- Settings configuration
- Auto-refresh capability

### Alert System
- SMS alerts when dustbin is 80%+ full
- IFTTT notifications
- Visual LED indicator
- Web dashboard notifications

## Troubleshooting

### Common Issues
1. **ESP8266 not connecting to WiFi**: Check credentials and signal strength
2. **Web interface not loading**: Verify ESP8266 IP address
3. **SMS not sending**: Check GSM module connections and balance
4. **Sensor readings inaccurate**: Calibrate ultrasonic sensor distance

### Debugging
- Use Serial Monitor for debugging
- Check network connectivity
- Verify hardware connections
- Monitor web console for JavaScript errors

## Future Enhancements
- Multiple dustbin support
- Historical data logging
- Mobile app integration
- Cloud data storage
- Advanced analytics
- Email notifications

## Author
Shreya Jaiswal
