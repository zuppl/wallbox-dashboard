# 🔋 Wallbox Energy Flow Dashboard

[![HACS](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?logo=home-assistant-community-store)](https://github.com/hacs/integration)
[![Version](https://img.shields.io/github/v/release/zuppl/wallbox-dashboard?color=blue)](https://github.com/zuppl/wallbox-dashboard/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Ein modernes **Energie-Flow Dashboard** für Home Assistant mit integrierter Wallbox-Steuerung.  
Visualisiert Solar, Haus, Batterie, Wallbox und Netz in Echtzeit – mit animierten Fluss-Linien und direkter Steuerung per Klick.

---

## 📦 Installation via HACS

1. **HACS** → **Frontend** → ⋮ → **Benutzerdefinierte Repositories**
2. URL: `https://github.com/zuppl/wallbox-dashboard` → Kategorie: **Lovelace**
3. Suche nach **Wallbox Energy Flow Dashboard** → **Herunterladen**
4. Home Assistant **neu starten**

> Die JS-Datei wird automatisch als Lovelace-Ressource registriert. ✅

---

## ⚙️ Karte einrichten

Dashboard bearbeiten → **+ Karte hinzufügen** → **Manuell** → YAML einfügen:

```yaml
type: custom:wallbox-dashboard-card
entities:
  solar: sensor.pv_gesamtleistung_kw_rounded
  house: sensor.stromverbrauch
  batt: sensor.state_of_charge_fronius_storage_0_192_168_1_194
  car: sensor.keba_p30_charging_power_2
  grid: sensor.power_grid_fronius_power_flow_0_192_168_1_194
  battChargeSensor: sensor.solarnet_ladeleistung
  battDischargeSensor: sensor.solarnet_entladeleistung
  pvDaily: sensor.pv_energie_tag
  houseDaily: sensor.solar_hausverbrauch_daily
  importDaily: sensor.solar_import_power_daily
  carSession: sensor.keba_p30_session_energy_2
  wallboxEmergency: input_boolean.wallbox_notaus
  wallboxEco: input_boolean.pv_uberschussladen_e_auto
  wallboxBoost: input_boolean.notfall_wallbox_laden
  carPlugged: binary_sensor.keba_p30_plugged_on_ev
  door: lock.lock_ultra_48_cloud
  temp: sensor.gw1100a_outdoor_temperature
  hum: sensor.gw1100a_humidity
  uv: sensor.gw1100a_uv_index
```

> Alle Entitäten lassen sich im **visuellen Karten-Editor** anpassen.

---

## ✨ Features

| Feature | Beschreibung |
|---------|-------------|
| 📊 Energie-Flow | Animierte Linien zeigen Stromrichtung in Echtzeit |
| ☀️ Solar | Aktuelle Leistung + Tagesertrag |
| 🏠 Haus | Netto-Verbrauch (ohne Wallbox) |
| 🔋 Batterie | SOC-Balken, Lade-/Entladeleistung, Modus |
| 🚗 Wallbox | Ladeleistung, Session-Energie, Verbindungsstatus |
| 🎛️ Steuerung | **ECO / BOOST / STOP** direkt schaltbar |
| 🔌 Netz | Einspeisung vs. Netzbezug + Tageswerte |
| 🌡️ Wetter | Temperatur, Luftfeuchtigkeit, UV-Index |
| 🔒 Haustür | Lock-Sensor Status |
| 🖱️ Details | Klick auf jeden Sensor öffnet HA More-Info |

---

## 🎛️ Wallbox-Modi

| Modus | Farbe | input_boolean | Funktion |
|-------|-------|---------------|----------|
| **ECO** | 🟢 Grün | `pv_uberschussladen_e_auto` | Lädt nur mit PV-Überschuss |
| **BOOST** | 🔵 Blau | `notfall_wallbox_laden` | Lädt mit maximaler Leistung |
| **STOP** | 🔴 Rot (blinkt) | `wallbox_notaus` | Notaus – sofort stoppen |

---

## 📡 Entitäten-Referenz

| Key | Einheit | Beschreibung |
|-----|---------|-------------|
| `solar` | kW | PV-Gesamtleistung |
| `house` | W | Hausverbrauch gesamt |
| `batt` | % | Batterie State of Charge |
| `car` | kW | Wallbox Ladeleistung |
| `grid` | W | Netz (+Bezug / −Einspeisung) |
| `battChargeSensor` | W | Batterie Ladeleistung |
| `battDischargeSensor` | W | Batterie Entladeleistung |
| `pvDaily` | kWh | PV Tagesertrag |
| `houseDaily` | kWh | Haus Tagesverbrauch |
| `importDaily` | kWh | Netzkauf heute |
| `carSession` | kWh | Wallbox aktuelle Session |
| `wallboxEmergency` | boolean | Notaus-Schalter |
| `wallboxEco` | boolean | ECO-Laden |
| `wallboxBoost` | boolean | Boost-Laden |
| `carPlugged` | binary | Auto verbunden |
| `door` | lock | Haustür-Schloss |
| `temp` | °C | Außentemperatur |
| `hum` | % | Luftfeuchtigkeit |
| `uv` | Index | UV-Index |

---

## 🔧 Kompatibilität

- **Home Assistant** 2023.1+
- **Fronius** Symo GEN24 / Primo GEN24
- **KEBA** P30 Wallbox
- **GW1100A / Ecowitt** Wetterstation
- Alle Entitäten frei konfigurierbar

---

## 📄 Lizenz

[MIT License](LICENSE) © 2025
