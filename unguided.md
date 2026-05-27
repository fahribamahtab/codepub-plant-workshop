# Unguided workshop path

Welcome to challenge mode. This is the same workshop as the guided version, but with less hand-holding.

The goal is still to get an ESP32 to read a soil moisture sensor and send those readings to https://codepub-nl.site/ 🌱

Treat each section like a mini challenge. Try to solve it from the prompt and the hints first. If you get stuck, open the answer section for the exact steps. If you want everything spelled out from the start, use [guided.md](./guided.md).

## 1. Workshop setup ⚙️

Your first goal is to get Arduino IDE talking to the ESP32.

Success looks like this ✅

- Arduino IDE 2 is installed.
- The ESP32 board package is installed.
- You can select both an ESP32 board and the connected USB device.

Hints 🧭

- Download Arduino IDE 2 from Arduino's official site.
- Use Boards Manager to install the `esp32` package from Espressif Systems.
- After connecting the board with USB-C, make sure you have selected both a board type and the correct port/device.

<details>
<summary>Show the exact setup steps 👀</summary>

Download Arduino IDE 2 from Arduino's official site:

https://www.arduino.cc/en/software/

Then install the ESP32 board package in Arduino IDE using Boards Manager:

![](./assets/boards-manager-install-esp32.png)

Once you've got the ESP32 library installed, select it as the active board type:

![](./assets/select-esp32-dev-board.png)

Then, after connecting the ESP32 with USB-C to your laptop, make sure you've selected the board in the dropdown:

![](./assets/select-the-right-usb-device.png)
</details>

## 2. First upload 💡

Before you start wiring anything, make sure that you can upload a simple program to the board.

Success looks like this ✅

- The sketch uploads without errors.
- The board's blue LED blinks on and off about once per second.

Hints 🧭

- Start with the smallest sketch possible.
- You'll need `setup()` to configure the LED pin and `loop()` to blink it.
- If the upload fails, double check the selected board, USB device, and cable.

<details>
<summary>Show the blink test 👀</summary>

Paste this into the Arduino editor:

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

Then click the upload button in the top left corner and confirm that the ESP32 blinks blue.
</details>

## 3. The wiring 🔌

Now connect the probe, sensor board, and ESP32 so the board can read the moisture signal.

Success looks like this ✅

- The probe is connected to the sensor board.
- The sensor board gets power.
- The signal wire goes to an analog-capable input on the ESP32.
- The green power light on the sensor board is lit.

Hints 🧭

- The sensor board exposes power, ground, a switching/digital output, and an analog output.
- For this workshop, you want the analog signal, not the switching/digital one.
- Look at the sample sketches to see which ESP32 input the workshop code expects: [direct-serial-implementation.ino](./direct-serial-implementation.ino) and [plant-platform-sensor.ino](./plant-platform-sensor.ino)
- If the green light on the moisture sensor board is off, fix power and ground first.

The ESP32 board pinout below is not a spoiler, but you will need it to crack the wiring puzzle:

<img src="./assets/data-sheet.png" alt="ESP32 board pinout" width="70%" />

<details>
<summary>Show the wiring answer 👀</summary>

Below is the full wiring diagram:

![](./assets/diagram.jpg)

Use this mapping:

- Probe -> the two-pin connector on the sensor board
- Sensor board `VCC` -> ESP32 `3.3V`
- Sensor board `GND` -> ESP32 `GND`
- Sensor board `AO` / analog signal output -> ESP32 `GPIO36` / `VP`
- Leave `DO` / switching output disconnected

If the sensor board does not light up green, it is almost always a power or ground issue.

If the light is on but your readings never change, re-check the analog wire and make sure the probe is actually connected to the sensor board.
</details>

## 4. Reading sensor data 📟

Once the wiring is in place, the next step is to read raw values from the sensor and print them to the Serial Monitor.

Success looks like this ✅

- You can upload a sketch that calls `analogRead(...)`.
- The Serial Monitor shows numbers continuously.
- The values change when the probe is dry versus wet.

Hints 🧭

- There is already a serial-only sample sketch in [direct-serial-implementation.ino](./direct-serial-implementation.ino).
- You'll need `Serial.begin(...)`, `analogRead(...)`, and `Serial.println(...)`.
- The Serial Monitor baud setting must match the baud configured in the sketch.

<details>
<summary>Show the serial-reading answer 👀</summary>

You can copy the code from [direct-serial-implementation.ino](./direct-serial-implementation.ino), or paste this directly:

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

After you've uploaded the code to the board, open the **Serial Monitor**, which is located in the top right corner:

![](./assets/serial-monitor.png)

If you see gibberish like `�����������`, the selected baud does not match the code. Change it so it matches `115200`:

![](./assets/baud-selection.png)

You should then start to see proper readings printed. `4095` means completely dry, and `0` would be soaking wet, though in practice wet soil will usually land somewhere above that.
</details>

## 5. Connecting to the hive-mind 🌐

Final step: send the readings from your board to the shared plant dashboard.

Success looks like this ✅

- You have created a plant on https://codepub-nl.site/.
- You have copied the plant UUID.
- The ESP32 is connected to WiFi.
- The dashboard updates when your board posts a new reading.

Hints 🧭

- There is already a network-enabled sample sketch in [plant-platform-sensor.ino](./plant-platform-sensor.ino).
- You'll need to fill in WiFi credentials, the plant UUID, and the workshop server URL.
- If those values are left blank, the sketch stays in serial-only mode.

<details>
<summary>Show the plant-platform answer 👀</summary>

Go to https://codepub-nl.site/ and create a new digital plant. Copy the UUID for that plant.

Then open [plant-platform-sensor.ino](./plant-platform-sensor.ino) and update these constants:

```ino
const char* wifiSsid = "";
const char* wifiPassword = "";
const char* serverBaseUrl = "https://codepub-nl.site/";
const char* plantId = "";
```

You should end up with:

- `wifiSsid`: your WiFi network name
- `wifiPassword`: your WiFi password
- `serverBaseUrl`: `https://codepub-nl.site/`
- `plantId`: the UUID from the dashboard

Upload the sketch again. If everything is set correctly, the board will keep printing raw values to serial and will also post them to the API in the background.

If the dashboard does not update:

- make sure the board actually joined WiFi
- make sure the UUID is copied exactly
- make sure `serverBaseUrl` does not point to some other environment
- re-open Serial Monitor and look for `[net]` messages

If you want the full code inline, it is the same sketch as [plant-platform-sensor.ino](./plant-platform-sensor.ino).
</details>

## 6. Done means 🎯

You are finished when:

- the ESP32 is powered and wired correctly
- the Serial Monitor shows changing moisture readings
- your plant on https://codepub-nl.site/ updates in real time

If you get blocked for too long, switch over to [guided.md](./guided.md) and keep moving.
