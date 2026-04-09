
#include <ESP8266WiFi.h>
#include <SoftwareSerial.h>
#include <TinyGPS++.h>
SoftwareSerial mySerial(D3, D4);
SoftwareSerial gpsSerial(D1, D2); // GPS Module RX, TX

#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27, 16, 2);
const int trigPin = D6;
const int echoPin = D5;
const int led = D7;
long duration;
int distance;
float level;

// GPS Variables
TinyGPSPlus gps;
double dustbinLatitude = 28.6139; // Default Delhi coordinates
double dustbinLongitude = 77.2090;
double vehicleLatitude = 28.7041; // Default vehicle coordinates
double vehicleLongitude = 77.1025;
bool gpsDataAvailable = false;
const char *ssid = "Prateek";
const char *password = "#12345";
void send_event(const char *event);
const char *host = "maker.ifttt.com";
const char *privateKey = "hUAAAz0AVvc6-NW1UmqWXXv6VQWmpiGFxx3sV5rnaM9";
WiFiServer server(80);

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(led, OUTPUT);
  Serial.begin(9600);
  mySerial.begin(9600);
  gpsSerial.begin(9600); // GPS module baud rate
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print(" Smart ");
  lcd.setCursor(0, 1);
  lcd.print("      Dustbin");
  delay(3000);
  lcd.clear();
  
  // Initialize GPS
  lcd.setCursor(0, 0);
  lcd.print("GPS Initializing");
  delay(2000);
  lcd.clear();
  Serial.print("Connecting to Wifi Network");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("Successfully connected to WiFi.");
  Serial.println("IP address is : ");
  Serial.println(WiFi.localIP());
  server.begin();
  Serial.println("Server started");
}

void loop() {
  // Read GPS data
  readGPSData();
  
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH);
  distance = duration * 0.0340 / 2;
  Serial.println("Distance");
  Serial.println(distance);
  level = ((25 - distance) / 25.0) * 100;  //25
  Serial.println("level");
  Serial.println(level);
  
  // Display on LCD with GPS status
  lcd.setCursor(0, 0);
  lcd.print(" Smart Dustbin");
  lcd.setCursor(0, 1);
  lcd.print(" Level:");
  lcd.setCursor(8, 1);
  lcd.print((int)level);
  lcd.print("% ");
  if (gpsDataAvailable) {
    lcd.print("GPS");
  }
  
  digitalWrite(led, LOW);
  delay(200);
  
  WiFiClient client = server.available();
  if (client) {
    handleClient(client);
  }
  
  if (level >= 80) {
    SendMessage();
    digitalWrite(led, HIGH);
    send_event("jar_event");
  }
}

void readGPSData() {
  while (gpsSerial.available() > 0) {
    if (gps.encode(gpsSerial.read())) {
      if (gps.location.isValid()) {
        dustbinLatitude = gps.location.lat();
        dustbinLongitude = gps.location.lng();
        gpsDataAvailable = true;
        
        Serial.print("GPS Location: ");
        Serial.print(dustbinLatitude, 6);
        Serial.print(", ");
        Serial.println(dustbinLongitude, 6);
      }
      
      if (gps.date.isValid() && gps.time.isValid()) {
        Serial.print("Date: ");
        Serial.print(gps.date.day());
        Serial.print("/");
        Serial.print(gps.date.month());
        Serial.print("/");
        Serial.println(gps.date.year());
        
        Serial.print("Time: ");
        Serial.print(gps.time.hour());
        Serial.print(":");
        Serial.print(gps.time.minute());
        Serial.print(":");
        Serial.println(gps.time.second());
      }
    }
  }
  
  // If no GPS data for 5 seconds, show warning
  if (millis() > 5000 && gps.charsProcessed() < 10) {
    Serial.println("No GPS data detected: check wiring.");
    gpsDataAvailable = false;
  }
}
void send_event(const char *event) {
  Serial.print("Connecting to ");
  Serial.println(host);
  // Use WiFiClient class to create TCP connections
  WiFiClient client;
  const int httpPort = 80;
  if (!client.connect(host, httpPort)) {
    Serial.println("Connection failed");
    return;
  }
  // We now create a URI for the request
  String url = "/trigger/";
  url += event;
  url += "/with/key/";
  url += privateKey;
  Serial.print("Requesting URL: ");
  Serial.println(url);
  // This will send the request to the server
  client.print(String("GET ") + url + " HTTP/1.1\r\n" + "Host: " + host + "\r\n" + "Connection: close\r\n\r\n");
  while (client.connected()) {
    if (client.available()) {
      String line = client.readStringUntil('\r');
      Serial.print(line);
    } else {
      // No data yet, wait a bit
      delay(50);
    };
  }
  Serial.println();
  Serial.println("closing connection");
  client.stop();
}
void handleClient(WiFiClient client) {
  String request = client.readStringUntil('\r');
  request.trim();
  
  // Add CORS headers for all responses
  client.println("HTTP/1.1 200 OK");
  client.println("Access-Control-Allow-Origin: *");
  client.println("Access-Control-Allow-Methods: GET, POST, OPTIONS");
  client.println("Access-Control-Allow-Headers: Content-Type");
  
  if (request.indexOf("GET /data") >= 0) {
    // Send JSON data with GPS coordinates
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.println();
    
    String jsonData = "{\"distance\":" + String(distance) + 
                     ",\"level\":" + String(level) + 
                     ",\"timestamp\":" + String(millis()) +
                     ",\"dustbinLat\":" + String(dustbinLatitude, 6) +
                     ",\"dustbinLng\":" + String(dustbinLongitude, 6) +
                     ",\"vehicleLat\":" + String(vehicleLatitude, 6) +
                     ",\"vehicleLng\":" + String(vehicleLongitude, 6) +
                     ",\"gpsAvailable\":" + String(gpsDataAvailable ? "true" : "false") +
                     ",\"status\":\"" + (level >= 80 ? "Full" : level >= 60 ? "Moderate" : "Low") + "\"" +
                     ",\"alert\":" + String(level >= 80 ? "true" : "false") + "}";
    client.print(jsonData);
    
  } else if (request.indexOf("GET /status") >= 0) {
    // Send status information
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.println();
    
    String statusJson = "{\"wifiConnected\":true,\"ip\":\"" + WiFi.localIP().toString() + "\"" +
                        ",\"ledStatus\":" + String(digitalRead(led) == HIGH ? "true" : "false") +
                        ",\"gpsAvailable\":" + String(gpsDataAvailable ? "true" : "false") +
                        ",\"uptime\":" + String(millis()) + "}";
    client.print(statusJson);
    
  } else if (request.indexOf("GET /location") >= 0) {
    // Send GPS location data
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.println();
    
    String locationJson = "{\"dustbin\":{\"lat\":" + String(dustbinLatitude, 6) + ",\"lng\":" + String(dustbinLongitude, 6) + "}" +
                          ",\"vehicle\":{\"lat\":" + String(vehicleLatitude, 6) + ",\"lng\":" + String(vehicleLongitude, 6) + "}" +
                          ",\"gpsAvailable\":" + String(gpsDataAvailable ? "true" : "false") + "}";
    client.print(locationJson);
    
  } else if (request.indexOf("GET /") >= 0) {
    // Serve HTML page with redirect to web UI
    client.println("Content-Type: text/html");
    client.println("Connection: close");
    client.println();
    
    client.println("<!DOCTYPE html>");
    client.println("<html lang='en'>");
    client.println("<head>");
    client.println("<meta charset='UTF-8'>");
    client.println("<meta name='viewport' content='width=device-width, initial-scale=1.0'>");
    client.println("<title>Smart Dustbin Monitor</title>");
    client.println("<style>");
    client.println("body { font-family: Arial, sans-serif; margin: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; }");
    client.println(".container { max-width: 600px; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); text-align: center; }");
    client.println("h1 { color: #333; margin-bottom: 20px; }");
    client.println(".info { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #007bff; text-align: left; }");
    client.println(".btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-size: 16px; text-decoration: none; display: inline-block; margin: 10px; }");
    client.println(".btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }");
    client.println(".dustbin-visual { width: 80px; height: 120px; border: 3px solid #333; border-radius: 10px; margin: 20px auto; position: relative; background: #f5f5f5; }");
    client.println(".dustbin-fill { position: absolute; bottom: 0; width: 100%; background: linear-gradient(180deg, #4caf50 0%, #8bc34a 100%); transition: height 0.5s; border-radius: 0 0 7px 7px; }");
    client.println("</style>");
    client.println("</head>");
    client.println("<body>");
    client.println("<div class='container'>");
    client.println("<h1>Smart Dustbin Monitor</h1>");
    client.println("<p>ESP8266 Web Server Running</p>");
    client.println("<div class='info'>");
    client.println("<strong>IP Address:</strong> " + WiFi.localIP().toString() + "<br>");
    client.println("<strong>Fill Level:</strong> " + String(level) + "%<br>");
    client.println("<strong>Distance:</strong> " + String(distance) + " cm<br>");
    client.println("<strong>GPS Status:</strong> " + String(gpsDataAvailable ? "Available" : "Not Available"));
    client.println("</div>");
    client.println("<div class='dustbin-visual'>");
    client.println("<div class='dustbin-fill' style='height: " + String(level) + "%;'></div>");
    client.println("</div>");
    client.println("<a href='/data' class='btn'>View JSON Data</a>");
    client.println("<a href='/status' class='btn'>System Status</a>");
    client.println("<p style='margin-top: 20px; color: #666;'>For full web interface, open the separate HTML file in your browser</p>");
    client.println("<script>");
    client.println("setInterval(() => location.reload(), 10000);");
    client.println("</script>");
    client.println("</div>");
    client.println("</body>");
    client.println("</html>");
    
  } else {
    // 404 Not Found
    client.println("HTTP/1.1 404 Not Found");
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.println();
    client.println("{\"error\":\"Endpoint not found\"}");
  }
  
  client.stop();
}

void SendMessage() {
  Serial.println("Dustbin Full");
  mySerial.println("AT+CMGF=1");
  delay(1000);
  mySerial.println("AT+CMGS=\"+9188305848xx\"\r");
  delay(1000);
  mySerial.println("Dustbin1 Is Full Plz Remove Dustbin  https://www.google.com/maps?q ");
  delay(100);
  mySerial.println((char)26);
  delay(1000);
}
