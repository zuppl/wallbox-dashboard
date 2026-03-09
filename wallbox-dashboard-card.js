/**
 * Wallbox Energy Flow Dashboard Card
 * HACS Custom Integration
 * Version: 1.0.0
 */

const CARD_VERSION = "1.0.0";

// Default entity configuration
const DEFAULT_ENTITIES = {
  solar: "sensor.pv_gesamtleistung_kw_rounded",
  house: "sensor.stromverbrauch",
  batt: "sensor.state_of_charge_fronius_storage_0_192_168_1_194",
  car: "sensor.keba_p30_charging_power_2",
  grid: "sensor.power_grid_fronius_power_flow_0_192_168_1_194",
  door: "lock.lock_ultra_48_cloud",
  temp: "sensor.gw1100a_outdoor_temperature",
  hum: "sensor.gw1100a_humidity",
  uv: "sensor.gw1100a_uv_index",
  battChargeSensor: "sensor.solarnet_ladeleistung",
  battDischargeSensor: "sensor.solarnet_entladeleistung",
  pvDaily: "sensor.pv_energie_tag",
  houseDaily: "sensor.solar_hausverbrauch_daily",
  importDaily: "sensor.solar_import_power_daily",
  carSession: "sensor.keba_p30_session_energy_2",
  wallboxEmergency: "input_boolean.wallbox_notaus",
  wallboxEco: "input_boolean.pv_uberschussladen_e_auto",
  wallboxBoost: "input_boolean.notfall_wallbox_laden",
  carPlugged: "binary_sensor.keba_p30_plugged_on_ev",
};

const COLORS = {
  solar: "#fcd34d",
  house: "#e2e8f0",
  car: "#2dd4bf",
  battCharge: "#60a5fa",
  battDischarge: "#fb923c",
  battIdle: "#475569",
  gridExport: "#4ade80",
  gridImport: "#f87171",
  autarky: "#2dd4bf",
  inactive: "#64748b",
  danger: "#f87171",
  secure: "#4ade80",
  eco: "#4ade80",
  boost: "#60a5fa",
  stop: "#ef4444",
  uv: { low: "#4ade80", mod: "#fcd34d", high: "#fb923c", extreme: "#ef4444" },
};

const THRESHOLDS = { grid: 100, batt: 50, solar: 100, car: 100 };

class WallboxDashboardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
  }

  static get properties() {
    return { hass: {}, config: {} };
  }

  setConfig(config) {
    this._config = { entities: {}, ...config };
    // Merge user entities with defaults
    this._entities = { ...DEFAULT_ENTITIES, ...(config.entities || {}) };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 5;
  }

  static getConfigElement() {
    return document.createElement("wallbox-dashboard-card-editor");
  }

  static getStubConfig() {
    return {
      entities: DEFAULT_ENTITIES,
    };
  }

  _getState(entityId) {
    if (!this._hass || !entityId) return null;
    return this._hass.states[entityId] || null;
  }

  _getNum(entityId, def = 0) {
    const s = this._getState(entityId);
    if (!s || s.state === "unavailable" || s.state === "unknown") return def;
    return parseFloat(s.state) || def;
  }

  _fireMoreInfo(entityId) {
    if (!entityId) return;
    const event = new Event("hass-more-info", { bubbles: true, composed: true });
    event.detail = { entityId };
    this.dispatchEvent(event);
  }

  _toggleEntity(entityId) {
    if (!this._hass || !entityId) return;
    this._hass.callService("input_boolean", "toggle", { entity_id: entityId });
  }

  _formatPower(watts) {
    if (Math.abs(watts) >= 1000) {
      return { value: (watts / 1000).toFixed(2), unit: "kW" };
    }
    return { value: Math.round(watts), unit: "W" };
  }

  render() {
    if (!this.shadowRoot) return;

    const e = this._entities;

    // Gather all values
    const temp = this._getNum(e.temp);
    const hum = this._getNum(e.hum);
    const uv = this._getNum(e.uv);
    let uvColor = COLORS.uv.low;
    if (uv >= 3) uvColor = COLORS.uv.mod;
    if (uv >= 6) uvColor = COLORS.uv.high;
    if (uv >= 8) uvColor = COLORS.uv.extreme;

    const pvW = this._getNum(e.solar) * 1000;
    const battCharge = this._getNum(e.battChargeSensor);
    const battDischarge = this._getNum(e.battDischargeSensor);
    const carW = this._getNum(e.car) * 1000;
    const gridRaw = this._getNum(e.grid, 0);
    const hausWRaw = this._getNum(e.house);
    const socPct = this._getNum(e.batt, 0);

    const pvDaily = this._getNum(e.pvDaily);
    const hausDaily = this._getNum(e.houseDaily);
    const importDaily = this._getNum(e.importDaily);
    const carSession = this._getNum(e.carSession);

    const carPlugged = this._getState(e.carPlugged)?.state === "on";
    const isEmergency = this._getState(e.wallboxEmergency)?.state === "on";
    const isEco = this._getState(e.wallboxEco)?.state === "on";
    const isBoost = this._getState(e.wallboxBoost)?.state === "on";
    const doorState = this._getState(e.door);
    const doorLocked = doorState?.state === "locked";

    const battW = battCharge - battDischarge;
    const isCharging = battW > THRESHOLDS.batt;
    const isDischarging = battW < -THRESHOLDS.batt;
    const isStandby = !isCharging && !isDischarging;

    const battColor = isCharging
      ? COLORS.battCharge
      : isDischarging
      ? COLORS.battDischarge
      : COLORS.battIdle;

    let hausW = hausWRaw;
    if (hausWRaw > carW + 10) hausW = hausWRaw - carW;

    let gridDisplayW = 0;
    let statusColor = COLORS.autarky;
    let statusText = "Autark";

    if (gridRaw > THRESHOLDS.grid) {
      gridDisplayW = gridRaw;
      statusColor = COLORS.gridImport;
      statusText = "Netzbezug";
    } else if (gridRaw < -THRESHOLDS.grid) {
      gridDisplayW = gridRaw;
      statusColor = COLORS.gridExport;
      statusText = "Einspeisung";
    }

    const pvFormatted = this._formatPower(pvW);
    const hausFormatted = this._formatPower(hausW);
    const carFormatted = this._formatPower(carW);
    const gridFormatted = this._formatPower(Math.abs(gridDisplayW));

    const wallboxMode = isEmergency ? "STOP" : isBoost ? "BOOST" : isEco ? "ECO" : null;
    const wallboxModeColor = isEmergency
      ? COLORS.stop
      : isBoost
      ? COLORS.boost
      : COLORS.eco;

    const carPowerColor = isEmergency
      ? COLORS.stop
      : isBoost
      ? COLORS.boost
      : isEco
      ? COLORS.eco
      : "#f8fafc";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        * { box-sizing: border-box; }

        .card {
          border-radius: 24px;
          overflow: hidden;
          background: #1a1c1e;
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
          padding: 24px;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          user-select: none;
        }

        @keyframes flow {
          from { left: -35%; }
          to { left: 100%; }
        }
        @keyframes flowReverse {
          from { left: 100%; }
          to { left: -35%; }
        }
        @keyframes pulseRed {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* --- HEADER --- */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          animation: fadeIn 0.4s ease both;
        }

        .weather-row {
          display: flex;
          gap: 18px;
          align-items: center;
        }

        .weather-item {
          display: flex;
          align-items: baseline;
          gap: 3px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .weather-item:hover { background: rgba(255,255,255,0.06); }

        .weather-icon { font-size: 17px; margin-right: 3px; }
        .weather-val { font-size: 17px; font-weight: 800; color: #f8fafc; }
        .weather-unit { font-size: 11px; color: #94a3b8; margin-left: 1px; font-weight: 500; }

        .status-badge {
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .status-badge:hover { opacity: 0.8; }

        /* --- MAIN FLOW ROW --- */
        .flow-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          animation: fadeIn 0.4s 0.1s ease both;
        }

        .node {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 90px;
          flex-shrink: 0;
          cursor: pointer;
          border-radius: 16px;
          padding: 8px 4px;
          transition: background 0.2s, transform 0.15s;
        }
        .node:hover {
          background: rgba(255,255,255,0.04);
          transform: translateY(-2px);
        }
        .node:active { transform: scale(0.97); }

        .node-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 28px;
          margin-bottom: 8px;
          border: 1px solid rgba(255,255,255,0.06);
          transition: box-shadow 0.3s;
        }

        .node-label {
          font-size: 12px;
          color: #cbd5e1;
          font-weight: 600;
          margin-bottom: 2px;
          white-space: nowrap;
        }

        .node-value {
          font-size: 21px;
          font-weight: 800;
          color: #f8fafc;
          white-space: nowrap;
        }

        .node-unit {
          font-size: 11px;
          color: #94a3b8;
          margin-left: 2px;
          font-weight: 500;
        }

        .node-extra {
          margin-top: 8px;
          min-height: 40px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .node-sub {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
          white-space: nowrap;
        }

        /* Battery bar */
        .batt-bar-track {
          width: 80%;
          height: 5px;
          background: rgba(255,255,255,0.07);
          border-radius: 3px;
          margin-top: 4px;
          overflow: hidden;
        }
        .batt-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.8s ease;
        }
        .batt-power {
          font-size: 12px;
          font-weight: 800;
          margin-top: 5px;
        }

        /* --- FLOW LINES --- */
        .flow-line-wrap {
          flex: 2;
          height: 2px;
          background: rgba(255,255,255,0.06);
          margin: 26px 6px 0;
          position: relative;
          overflow: hidden;
          border-radius: 1px;
        }
        .flow-line-bg {
          position: absolute;
          inset: 0;
          opacity: 0.2;
          border-radius: 1px;
        }
        .flow-line-anim {
          position: absolute;
          width: 35%;
          height: 100%;
          border-radius: 1px;
        }
        .flow-anim-fwd {
          animation: flow 1.8s infinite linear;
        }
        .flow-anim-rev {
          animation: flowReverse 1.8s infinite linear;
        }

        /* --- BOTTOM SECTION --- */
        .bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 20px;
          animation: fadeIn 0.4s 0.2s ease both;
        }

        /* Wallbox (Car) side */
        .car-section {
          display: flex;
          gap: 14px;
          align-items: center;
          flex: 1.2;
          cursor: pointer;
          padding: 8px;
          border-radius: 14px;
          transition: background 0.2s;
        }
        .car-section:hover { background: rgba(255,255,255,0.04); }

        .car-emoji-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .car-emoji { font-size: 40px; transition: filter 0.3s; }

        .mode-badge {
          position: absolute;
          top: -12px;
          right: -12px;
          color: white;
          font-size: 8px;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .mode-badge.stop { animation: pulseRed 1s infinite; }

        .car-info { display: flex; flex-direction: column; }

        .car-connected {
          display: flex;
          align-items: center;
          gap: 4px;
          min-height: 16px;
          margin-bottom: 2px;
        }
        .conn-dot {
          width: 6px;
          height: 6px;
          background: #4ade80;
          border-radius: 50%;
        }
        .conn-label { font-size: 10px; color: #94a3b8; font-weight: 600; }

        .car-power {
          font-size: 24px;
          font-weight: 800;
          line-height: 1;
        }
        .car-session { font-size: 12px; color: #94a3b8; margin-top: 2px; }
        .car-session span { color: #f8fafc; font-weight: 800; }

        /* Wallbox Controls */
        .wallbox-controls {
          display: flex;
          gap: 6px;
          margin-top: 6px;
        }
        .wb-btn {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          border: 1px solid;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.2s;
          background: transparent;
          color: inherit;
        }
        .wb-btn:hover { filter: brightness(1.2); transform: scale(1.05); }
        .wb-btn:active { transform: scale(0.97); }
        .wb-btn.active {
          color: #1a1c1e;
        }

        /* Grid side */
        .grid-section {
          display: flex;
          gap: 12px;
          align-items: center;
          text-align: right;
          flex: 1.8;
          justify-content: flex-end;
          cursor: pointer;
          padding: 8px;
          border-radius: 14px;
          transition: background 0.2s;
        }
        .grid-section:hover { background: rgba(255,255,255,0.04); }

        .grid-info { display: flex; flex-direction: column; align-items: flex-end; }
        .grid-label { font-size: 13px; color: #94a3b8; font-weight: 600; margin-bottom: 2px; }
        .grid-value { font-size: 24px; font-weight: 800; line-height: 1; }
        .grid-stats { font-size: 11px; color: #94a3b8; margin-top: 6px; line-height: 1.6; }
        .grid-stats span { font-weight: 700; }

        .grid-icon {
          font-size: 36px;
          display: flex;
          align-items: center;
          transition: color 0.5s;
        }

        /* --- DOOR --- */
        .door-row {
          display: flex;
          justify-content: center;
          animation: fadeIn 0.4s 0.3s ease both;
        }

        .door-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 24px;
          border-radius: 14px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .door-btn:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }
        .door-icon { font-size: 22px; }
        .door-label {
          font-size: 12px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .door-status { font-size: 11px; font-weight: 700; }
      </style>

      <div class="card">
        <!-- HEADER -->
        <div class="header">
          <div class="weather-row">
            <div class="weather-item" data-entity="${e.temp}">
              <span class="weather-icon">🌡️</span>
              <span class="weather-val">${temp.toFixed(1)}</span>
              <span class="weather-unit">°C</span>
            </div>
            <div class="weather-item" data-entity="${e.hum}">
              <span class="weather-icon">💧</span>
              <span class="weather-val">${hum}</span>
              <span class="weather-unit">%</span>
            </div>
            <div class="weather-item" data-entity="${e.uv}">
              <span class="weather-icon" style="color:${uvColor}">☀️</span>
              <span class="weather-val" style="color:${uvColor}">${uv}</span>
              <span class="weather-unit" style="color:${uvColor}">UV</span>
            </div>
          </div>

          <div class="status-badge" data-entity="${e.grid}"
            style="background:${statusColor}15; color:${statusColor}; border:1px solid ${statusColor}44;">
            ● ${statusText}
          </div>
        </div>

        <!-- MAIN FLOW ROW -->
        <div class="flow-row">
          <!-- Solar Node -->
          <div class="node" data-entity="${e.solar}">
            <div class="node-icon" style="box-shadow: ${pvW > THRESHOLDS.solar ? "0 0 16px " + COLORS.solar + "44" : "none"};">☀️</div>
            <div class="node-label">Solar</div>
            <div class="node-value" style="color:${COLORS.solar}">
              ${pvFormatted.value}<span class="node-unit">${pvFormatted.unit}</span>
            </div>
            <div class="node-extra">
              <div class="node-sub">Heute: <span style="color:${COLORS.solar}">${pvDaily.toFixed(1)}</span> kWh</div>
            </div>
          </div>

          <!-- Flow line: Solar → Haus -->
          <div class="flow-line-wrap">
            ${
              pvW > THRESHOLDS.solar
                ? `<div class="flow-line-bg" style="background:${COLORS.solar}"></div>
                   <div class="flow-line-anim flow-anim-fwd" style="background:linear-gradient(90deg,transparent,${COLORS.solar},transparent)"></div>`
                : ""
            }
          </div>

          <!-- Haus Node -->
          <div class="node" data-entity="${e.house}">
            <div class="node-icon">🏠</div>
            <div class="node-label">Haus</div>
            <div class="node-value">
              ${hausFormatted.value}<span class="node-unit">${hausFormatted.unit}</span>
            </div>
            <div class="node-extra">
              <div class="node-sub">Heute: <span style="color:#f8fafc">${hausDaily.toFixed(1)}</span> kWh</div>
            </div>
          </div>

          <!-- Flow line: Haus → Batterie -->
          <div class="flow-line-wrap">
            ${
              !isStandby
                ? `<div class="flow-line-bg" style="background:${battColor}"></div>
                   <div class="flow-line-anim ${isDischarging ? "flow-anim-rev" : "flow-anim-fwd"}" style="background:linear-gradient(90deg,transparent,${battColor},transparent)"></div>`
                : ""
            }
          </div>

          <!-- Battery Node -->
          <div class="node" data-entity="${e.batt}">
            <div class="node-icon" style="box-shadow: ${!isStandby ? "0 0 14px " + battColor + "55" : "none"};">
              ${isCharging ? "⚡" : isDischarging ? "🔋" : "🔋"}
            </div>
            <div class="node-label">${isCharging ? "Lädt" : isDischarging ? "Entlädt" : "Standby"}</div>
            <div class="node-value" style="color:${battColor}">
              ${Math.round(socPct)}<span class="node-unit">%</span>
            </div>
            <div class="node-extra">
              <div class="batt-bar-track">
                <div class="batt-bar-fill" style="width:${socPct}%; background:${battColor}; ${!isStandby ? "box-shadow: 0 0 6px " + battColor : ""}"></div>
              </div>
              <div class="batt-power" style="color:${battColor}">
                ${isCharging ? Math.round(battCharge) + " W" : isDischarging ? Math.round(battDischarge) + " W" : "0 W"}
              </div>
            </div>
          </div>
        </div>

        <!-- BOTTOM: Wallbox + Grid -->
        <div class="bottom-row">
          <!-- Car / Wallbox -->
          <div class="car-section" data-entity="${e.car}">
            <div class="car-emoji-wrap">
              <span class="car-emoji" style="filter:${carPlugged ? "none" : "grayscale(1) opacity(0.3)"}">🚗</span>
              ${
                wallboxMode
                  ? `<div class="mode-badge ${wallboxMode.toLowerCase()}" style="background:${wallboxModeColor}; color:${wallboxMode === "STOP" || wallboxMode === "BOOST" ? "#f8fafc" : "#1a1c1e"}">
                       ${wallboxMode}
                     </div>`
                  : ""
              }
            </div>
            <div class="car-info">
              <div class="car-connected">
                ${carPlugged ? `<div class="conn-dot"></div><span class="conn-label">Verbunden</span>` : ""}
              </div>
              <div class="car-power" style="color:${carPowerColor}">
                ${carFormatted.value}<span class="node-unit" style="font-size:13px">${carFormatted.unit}</span>
              </div>
              <div class="car-session">Session: <span>${carSession.toFixed(1)}</span> kWh</div>
              <div class="wallbox-controls">
                <button class="wb-btn ${isEmergency ? "active" : ""}"
                  data-action="toggle" data-target="${e.wallboxEmergency}"
                  style="border-color:${COLORS.stop}; color:${COLORS.stop}; ${isEmergency ? "background:" + COLORS.stop + "; color:#f8fafc;" : ""}">
                  STOP
                </button>
                <button class="wb-btn ${isEco ? "active" : ""}"
                  data-action="toggle" data-target="${e.wallboxEco}"
                  style="border-color:${COLORS.eco}; color:${COLORS.eco}; ${isEco ? "background:" + COLORS.eco + "; color:#1a1c1e;" : ""}">
                  ECO
                </button>
                <button class="wb-btn ${isBoost ? "active" : ""}"
                  data-action="toggle" data-target="${e.wallboxBoost}"
                  style="border-color:${COLORS.boost}; color:${COLORS.boost}; ${isBoost ? "background:" + COLORS.boost + "; color:#f8fafc;" : ""}">
                  BOOST
                </button>
              </div>
            </div>
          </div>

          <!-- Grid -->
          <div class="grid-section" data-entity="${e.grid}">
            <div class="grid-info">
              <div class="grid-label">Netz</div>
              <div class="grid-value" style="color:${gridDisplayW === 0 ? COLORS.inactive : statusColor}">
                ${gridDisplayW === 0 ? "0" : gridFormatted.value}
                <span class="node-unit" style="font-size:13px">${gridDisplayW === 0 ? "W" : gridFormatted.unit}</span>
              </div>
              <div class="grid-stats">
                <div>Haus: <span style="color:#f8fafc">${hausDaily.toFixed(1)}</span> kWh</div>
                <div>Kauf: <span style="color:${COLORS.gridImport}">${importDaily.toFixed(1)}</span> kWh</div>
              </div>
            </div>
            <div class="grid-icon" style="color:${gridDisplayW === 0 ? COLORS.inactive : statusColor}">
              🔌
            </div>
          </div>
        </div>

        <!-- DOOR -->
        <div class="door-row">
          <div class="door-btn" data-entity="${e.door}">
            <span class="door-icon">${doorLocked ? "🔒" : "🔓"}</span>
            <span class="door-label">Haustür</span>
            <span class="door-status" style="color:${doorLocked ? COLORS.secure : COLORS.danger}">
              ${doorLocked ? "Gesichert" : "Offen"}
            </span>
          </div>
        </div>
      </div>
    `;

    // Attach event listeners after render
    this._attachListeners();
  }

  _attachListeners() {
    if (!this.shadowRoot) return;

    // More-info clicks (nodes, weather, grid, door)
    this.shadowRoot.querySelectorAll("[data-entity]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const entityId = el.getAttribute("data-entity");
        if (entityId) {
          e.stopPropagation();
          this._fireMoreInfo(entityId);
        }
      });
    });

    // Toggle buttons (wallbox controls)
    this.shadowRoot.querySelectorAll("[data-action='toggle']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = btn.getAttribute("data-target");
        if (target) this._toggleEntity(target);
      });
    });
  }
}

// --- CARD EDITOR ---
class WallboxDashboardCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _render() {
    this.innerHTML = `
      <style>
        .editor { padding: 16px; }
        .editor h3 { font-size: 14px; color: #94a3b8; text-transform: uppercase; margin: 16px 0 8px; letter-spacing: 0.5px; }
        .editor label { display: block; font-size: 13px; margin-bottom: 10px; }
        .editor input {
          width: 100%; padding: 8px 10px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05);
          color: #f8fafc; font-size: 13px; margin-top: 3px;
        }
        .editor input:focus { outline: none; border-color: #60a5fa; }
      </style>
      <div class="editor">
        <h3>Energie Sensoren</h3>
        ${this._field("Solar", "solar", DEFAULT_ENTITIES.solar)}
        ${this._field("Hausverbrauch", "house", DEFAULT_ENTITIES.house)}
        ${this._field("Batterie SOC", "batt", DEFAULT_ENTITIES.batt)}
        ${this._field("Wallbox Leistung", "car", DEFAULT_ENTITIES.car)}
        ${this._field("Netz", "grid", DEFAULT_ENTITIES.grid)}
        <h3>Wetter</h3>
        ${this._field("Temperatur", "temp", DEFAULT_ENTITIES.temp)}
        ${this._field("Luftfeuchtigkeit", "hum", DEFAULT_ENTITIES.hum)}
        ${this._field("UV Index", "uv", DEFAULT_ENTITIES.uv)}
        <h3>Wallbox Steuerung</h3>
        ${this._field("Notaus", "wallboxEmergency", DEFAULT_ENTITIES.wallboxEmergency)}
        ${this._field("ECO Laden", "wallboxEco", DEFAULT_ENTITIES.wallboxEco)}
        ${this._field("Boost Laden", "wallboxBoost", DEFAULT_ENTITIES.wallboxBoost)}
        ${this._field("Auto verbunden", "carPlugged", DEFAULT_ENTITIES.carPlugged)}
        <h3>Sonstiges</h3>
        ${this._field("Haustür Lock", "door", DEFAULT_ENTITIES.door)}
      </div>
    `;

    this.querySelectorAll("input[data-key]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const key = e.target.getAttribute("data-key");
        const newConfig = {
          ...this._config,
          entities: { ...(this._config.entities || {}), [key]: e.target.value },
        };
        const event = new CustomEvent("config-changed", {
          detail: { config: newConfig },
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(event);
      });
    });
  }

  _field(label, key, placeholder) {
    const val = this._config?.entities?.[key] || "";
    return `<label>${label}
      <input type="text" data-key="${key}" value="${val}" placeholder="${placeholder}">
    </label>`;
  }
}

// Register both custom elements
customElements.define("wallbox-dashboard-card", WallboxDashboardCard);
customElements.define("wallbox-dashboard-card-editor", WallboxDashboardCardEditor);

// HACS card registration
window.customCards = window.customCards || [];
window.customCards.push({
  type: "wallbox-dashboard-card",
  name: "Wallbox Energy Flow Dashboard",
  description: "Visualisiert Solar, Haus, Batterie, Wallbox & Netz als Energie-Flow mit direkter Wallbox-Steuerung.",
  preview: true,
  documentationURL: "https://github.com/yourusername/wallbox-dashboard",
});

console.info(
  `%c WALLBOX-DASHBOARD-CARD %c v${CARD_VERSION} `,
  "color: #fcd34d; background: #1a1c1e; padding: 2px 6px; border-radius: 4px 0 0 4px; font-weight: bold;",
  "color: #f8fafc; background: #374151; padding: 2px 6px; border-radius: 0 4px 4px 0; font-weight: bold;"
);
