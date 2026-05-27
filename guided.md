# Guided workshop path

This is the step-by-step version of the workshop. If you want more trial and error, head over to [unguided.md](./unguided.md).

The goal is to get an ESP32 to read a soil moisture sensor and send those readings to [https://plant-workshop.vercel.app/](https://codepub-nl.site/) 🌱

## 1. Workshop setup ⚙️

Download Arduino IDE 2 from Arduino's official site:

https://www.arduino.cc/en/software/

Then install the ESP32 board package in Arduino IDE using Boards Manager:

![](./assets/boards-manager-install-esp32.png)

Once the ESP32 package is installed, select it as the active board type:

![](./assets/select-esp32-dev-board.png)

Then connect the ESP32 with USB-C and make sure the correct device is selected in the dropdown:

![](./assets/select-the-right-usb-device.png)

## 2. First upload 💡

Before you start wiring, do a quick test to make sure you can connect to the board and upload a simple program.

1. Copy the following code into the Arduino editor:

```cpp
const int LED_PIN = 2; 

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
}
```

2. Click the upload button in the top left corner.
3. Confirm the ESP32 blinks blue.

## 3. The wiring 🔌

Use the diagram below to connect the wires. If the next steps do not work as expected, come back here and check the wiring again.

![](./assets/diagram.jpg)

When the wiring is correct, the green power light on the moisture sensor board should be on. If there is no light, the board is not getting power or ground.

Once the wiring is in place, upload the sketch below to read and print the sensor data.

## 4. Reading sensor data 📟

Upload the code below to read the sensor data:

```ino
const int analogPin = 36;
const unsigned long sampleDelayMs = 750;
const unsigned long baudRate = 115200; // Remember this number for later

void setup() {
  Serial.begin(baudRate);
  delay(1000);
  Serial.println("Plant moisture sensor ready");
}

void loop() {
  const int rawValue = analogRead(analogPin);

  Serial.println(rawValue);

  delay(sampleDelayMs);
}
```

After the upload, open the **Serial Monitor** in the top right corner to see the readings from the sensor:

![](./assets/serial-monitor.png)

If you see gibberish like `�����������`, the selected baud does not match the `baudRate` in the code. Change it to match:

![](./assets/baud-selection.png)

You should now see proper readings. `4095` means completely dry, and `0` would be soaking wet, though in practice wet soil will usually be somewhere above that.

## 5. Connecting to the hive-mind 🌐

The final step is to connect the device to https://codepub-nl.site/ so it can publish readings to the shared dashboard. Create a new digital plant there and copy its UUID. You'll use that UUID to send data through the API.

Paste the following code into the editor, then update the constants with the correct details:

```ino
#include <HTTPClient.h>
#include <WiFi.h>

const int analogPin = 36;
const unsigned long sampleDelayMs = 750;
const uint16_t httpTimeoutMs = 1000;

const char* wifiSsid = ""; // TODO
const char* wifiPassword = ""; // TODO
const char* plantId = ""; // TODO: Use the UUID from the Plant Platform dashboard
const char* serverBaseUrl = "https://codepub-nl.site/";

bool networkConfigured() {
  return wifiSsid[0] != '\0' &&
         wifiPassword[0] != '\0' &&
         serverBaseUrl[0] != '\0' &&
         plantId[0] != '\0';
}

String readingUrl() {
  String baseUrl = String(serverBaseUrl);

  if (baseUrl.endsWith("/")) {
    baseUrl.remove(baseUrl.length() - 1);
  }

  return baseUrl + "/api/plants/" + String(plantId) + "/readings";
}

void logNetworkMessage(const char* message) {
  Serial.print("[net] ");
  Serial.println(message);
}

void startWifiIfConfigured() {
  if (!networkConfigured()) {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSsid, wifiPassword);

  Serial.print("[net] Connecting to WiFi: ");
  Serial.println(wifiSsid);
}

void postReadingIfConnected(int rawValue) {
  if (!networkConfigured() || WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.setConnectTimeout(httpTimeoutMs);
  http.setTimeout(httpTimeoutMs);
  http.begin(readingUrl());
  http.addHeader("Content-Type", "application/json");

  const String payload =
      "{\"rawValue\":" + String(rawValue) + ",\"source\":\"esp32-wifi\"}";

  const int responseCode = http.POST(payload);

  if (responseCode <= 0 || responseCode >= 400) {
    Serial.print("[net] API post failed: ");
    Serial.println(responseCode);
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Plant platform sensor ready");

  if (networkConfigured()) {
    logNetworkMessage("WiFi/API mode enabled");
    startWifiIfConfigured();
  } else {
    logNetworkMessage("WiFi/API mode disabled; serial-only mode is active");
  }
}

void loop() {
  const int rawValue = analogRead(analogPin);

  Serial.println(rawValue);

  postReadingIfConnected(rawValue);

  delay(sampleDelayMs);
}
```

Once the code is uploaded, you should see readings update in real time on your digital plant. Well done!
