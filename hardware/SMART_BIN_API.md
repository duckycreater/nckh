# Smart Bin Vendor API Contract — BMO Robot

> **Audience:** Hardware vendors integrating smart waste bins with the BMO Robot platform.
> **Status:** Stable since v1.0 (Phase 4 prep). Backward-compatible additions welcome.

This document defines the contract that every smart bin integration must
satisfy to interoperate with BMO's `SmartBinAdapter` interface
(`server/services/smartBinAdapter.ts`).

The contract is intentionally minimal so vendors can implement it on
microcontrollers (ESP32, Arduino, Raspberry Pi Pico) as well as full
edge gateways. There is no requirement to run BMO software on the device
itself.

---

## 1. Transport

BMO supports three transport modes. Pick **one** per device.

| Mode         | When to use                                  | Adapter           |
|--------------|----------------------------------------------|-------------------|
| HTTP polling | Always-on internet, low update frequency     | `HTTPAdapter`     |
| MQTT push    | Many devices, cellular or Wi-Fi gateway      | `MQTTAdapter`     |
| CSV upload   | Offline-first deployments, manual sync       | manual + `HTTPAdapter` |

### 1.1 HTTP polling

- **Endpoint:** `GET /devices/{deviceId}/reading`
- **Auth header:** `X-API-Key: <key>` (issued by BMO on device registration)
- **Polling interval:** minimum 60s (default 5 min) — BMO enforces server-side.

### 1.2 MQTT push

- **Broker:** any MQTT 3.1.1+ broker reachable by BMO (HiveMQ, EMQX, AWS IoT Core).
- **Topic:** `bmo/smartbin/{deviceId}/reading` (JSON payload, see §2)
- **QoS:** 1
- **Retain:** false

### 1.3 CSV upload (offline)

- **Endpoint:** `POST /devices/{deviceId}/batch` (multipart/form-data)
- **Field:** `file` (CSV with header `timestamp,category,weight_kg`)
- **Use:** When a gateway has intermittent connectivity.

---

## 2. Reading payload

The reading is the canonical unit of data exchanged between a bin and BMO.

```json
{
  "device_id": "bin-hcmc-001",
  "location": "Trường THPT Nguyễn Du, Quận 1",
  "timestamp": 1717443600,
  "weights_by_category": {
    "plastic": 2.4,
    "paper":   1.1,
    "glass":   0.6,
    "metal":   0.3,
    "organic": 4.8,
    "hazard":  0.0
  },
  "total_kg": 9.2,
  "battery_percent": 87,
  "is_online": true,
  "firmware_version": "1.4.2",
  "sensor_health": {
    "load_cell_drift_pct": 0.4,
    "temperature_c": 28.1
  }
}
```

### 2.1 Field requirements

| Field                       | Type     | Required | Notes                                     |
|-----------------------------|----------|----------|-------------------------------------------|
| `device_id`                 | string   | yes      | Globally unique, ≤100 chars               |
| `location`                  | string   | yes      | Human-readable                            |
| `timestamp`                 | int      | yes      | Unix epoch seconds                        |
| `weights_by_category`       | object   | yes      | Keys: plastic, paper, glass, metal, organic, hazard |
| `total_kg`                  | float    | yes      | Sum of weights                            |
| `battery_percent`           | int 0–100| no       | If battery-powered                        |
| `is_online`                 | bool     | yes      | `false` for cached readings               |
| `firmware_version`          | semver   | no       | Helps debugging                           |
| `sensor_health`             | object   | no       | Drift %, temperature, calibration timestamp |

### 2.2 Category taxonomy

| Code       | Vietnamese     | English    | Notes                          |
|------------|----------------|------------|--------------------------------|
| `plastic`  | Nhựa           | Plastic    | PET, HDPE, PP, PS              |
| `paper`    | Giấy           | Paper      | Includes cardboard             |
| `glass`    | Thủy tinh      | Glass      | All colors                     |
| `metal`    | Kim loại       | Metal      | Aluminum, steel, copper        |
| `organic`  | Hữu cơ         | Organic    | Food, garden waste             |
| `hazard`   | Nguy hại       | Hazardous  | Batteries, bulbs, e-waste      |

---

## 3. Device registration

Before a bin can post readings, register it with BMO via the admin API
or directly via the Supabase UI:

```sql
INSERT INTO smart_bin_devices (device_id, location_name, adapter_type, endpoint_url, is_active)
VALUES ('bin-hcmc-001', 'Trường THPT Nguyễn Du, Quận 1', 'http_poll',
        'https://vendor.example.com/api', true);
```

The `adapter_type` column must match one of:
- `stub` (no real device, scan-count estimate)
- `http_poll` (HTTP polling)
- `mqtt` (MQTT broker)

---

## 4. Latency & reliability targets

| Metric                       | Target              | Notes                          |
|------------------------------|---------------------|--------------------------------|
| Reading freshness            | ≤ 5 minutes         | BMO marks bins offline after   |
| API availability             | ≥ 99%               |                                |
| Weight measurement error     | ± 5% (load cell)    | Calibrate on install           |
| Battery life                 | ≥ 6 months          | Solar-assisted recommended     |
| Data retention               | ≥ 30 days on device | Cache for offline scenarios    |

---

## 5. Privacy & security

- **No PII collected.** The reading payload must not include user IDs,
  faces, RFID tags tied to students, or audio.
- **TLS 1.2+ required** for all HTTP endpoints.
- **API keys rotated** annually. BMO issues per-device keys, not per-vendor.
- **MQTT:** use TLS (port 8883) + per-device certificate.

---

## 6. Reference implementation (ESP32, MicroPython)

```python
# boot.py — minimal example publishing via HTTP polling
import urequests, ujson, time, machine

API = "https://bmo.example.com/api/devices/bin-hcmc-001/reading"
KEY = "BMO-XXXX-XXXX"

def publish(category_weights, total_kg, battery):
    payload = {
        "device_id": "bin-hcmc-001",
        "location": "Trường THPT Nguyễn Du",
        "timestamp": time.time(),
        "weights_by_category": category_weights,
        "total_kg": total_kg,
        "battery_percent": battery,
        "is_online": True,
    }
    r = urequests.post(
        "https://bmo.example.com/api/devices/bin-hcmc-001/reading",
        json=payload,
        headers={"X-API-Key": KEY},
    )
    print("status:", r.status_code)

while True:
    weights = read_load_cells()  # vendor-specific
    publish(weights, sum(weights.values()), read_battery())
    time.sleep(300)  # 5 minutes
```

---

## 7. Versioning

| Version | Date       | Changes                                                  |
|---------|------------|----------------------------------------------------------|
| 1.0     | 2026-07-01 | Initial contract (Phase 4 prep)                           |
| 1.1     | (planned)  | Add `firmware_version`, `sensor_health` optional fields  |

Backward-compatible additions are welcome. Breaking changes require a
new major version + 6-month deprecation window.

---

## 8. Contact

- **Vendor onboarding:** open an issue at https://github.com/duckycreater/nckh/issues
- **Security disclosures:** security@duckycreater.dev (PGP available)
- **Reference vendor implementations:** see `hardware/reference-impls/` (Q3 2026)

---

*This contract is open-source (CC-BY-4.0). Vendors are encouraged to fork
and extend it for proprietary sensors — just publish the changes back so
the ecosystem grows together.*