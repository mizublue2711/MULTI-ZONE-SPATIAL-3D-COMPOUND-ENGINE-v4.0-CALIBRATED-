import {PIPELINE_NODES} from './constants';
import {
  ActivePacketState,
  CoreFixBadgeSpec,
  PipelineNodeSpec,
  SimulationScenario,
} from './types';

export interface HudCallbacks {
  onStartExperience: () => void;
  onCameraProgressChange: (progress01: number) => void;
  onDispatchScenario: (scenario: SimulationScenario) => void;
  onToggleMute: () => boolean;
}

/**
 * Low-occlusion Cybernetic Brutalist Game & Architectural HUD Controller.
 * Keeps >= 85% of the 3D viewport unobstructed while providing crisp Swiss-grid
 * telemetry inspection, Bezier camera path scrubbing, and live contract testing.
 */
export class HudController {
  private rootEl: HTMLElement;
  private titleOverlayEl!: HTMLElement;
  private dockWrapEl!: HTMLElement;
  private dockToggleBtn!: HTMLButtonElement;
  private sliderEl!: HTMLInputElement;
  private sliderValEl!: HTMLElement;
  private zoneButtons: HTMLButtonElement[] = [];
  private muteBtn!: HTMLButtonElement;

  private telemetryTitleEl!: HTMLElement;
  private telemetryMetricsEl!: HTMLElement;
  private telemetryJsonEl!: HTMLElement;
  private simStatsEl!: HTMLElement;

  private isStarted = false;
  private isCollapsed = false;

  constructor(callbacks: HudCallbacks) {
    this.rootEl = document.createElement('div');
    this.rootEl.className = 'ac-shell-root';
    document.body.appendChild(this.rootEl);

    this.buildTitleScreen(callbacks);
    this.buildActiveHud(callbacks);
    this.bindKeyboardShortcuts(callbacks);

    // Initialize with first node inspected
    this.inspectNode(PIPELINE_NODES[0]);
  }

  private buildTitleScreen(callbacks: HudCallbacks) {
    this.titleOverlayEl = document.createElement('div');
    this.titleOverlayEl.className = 'ac-title-overlay';
    this.titleOverlayEl.innerHTML = `
      <div class="ac-title-card">
        <div class="ac-title-kicker">ARTIFICIAL CRAFT · DUAL-ENGINE JSON-CONTRACT ARCHITECTURE</div>
        <div style="display:flex;align-items:center;gap:16px;">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="2" y="2" width="44" height="44" stroke="#00E5FF" stroke-width="1.5"/>
            <rect x="9" y="9" width="12" height="12" stroke="#5322FF" stroke-width="1.5"/>
            <rect x="27" y="9" width="12" height="12" stroke="#00E5FF" stroke-width="1.5"/>
            <rect x="18" y="27" width="12" height="12" stroke="#10B981" stroke-width="1.5"/>
            <path d="M15 21V24H24V27M33 21V24H24" stroke="#F4F4F6" stroke-width="1.5"/>
          </svg>
          <h1 class="ac-title-heading">3D Interactive Pipeline Core</h1>
        </div>
        <p class="ac-title-desc">
          Spatial CAD simulation of the Artificial Craft dual-engine pipeline: transitioning from fragile monolith code generation to the deterministic <strong>Dify Universal Reasoning Core</strong> and <strong>n8n Sanitize &amp; Orchestration Gateway</strong>.
        </p>
        <div class="ac-title-specs">
          <div class="ac-spec-item">
            <span class="ac-spec-label">ZONE 01 · DIFY CORE</span>
            <span class="ac-spec-val">Vertex AI · Temp 0.2</span>
          </div>
          <div class="ac-spec-item">
            <span class="ac-spec-label">ZONE 02 · HIGHWAY</span>
            <span class="ac-spec-val">JSON.stringify Bus</span>
          </div>
          <div class="ac-spec-item">
            <span class="ac-spec-label">ZONE 03 · N8N GATE</span>
            <span class="ac-spec-val">retryOnFail: false</span>
          </div>
          <div class="ac-spec-item">
            <span class="ac-spec-label">REGISTRY CONTRACT</span>
            <span class="ac-spec-val">4 Locked Enum Keys</span>
          </div>
        </div>
        <div class="ac-title-actions">
          <button type="button" class="ac-btn-primary" id="ac-enter-btn">
            Enter Pipeline Core
          </button>
          <span class="ac-control-hint">
            Scroll / 1–5 Glide Camera · Click 3D Nodes to Inspect · Space Dispatch · H Hide Dock
          </span>
        </div>
      </div>
    `;
    document.body.appendChild(this.titleOverlayEl);

    const enterBtn = this.titleOverlayEl.querySelector(
      '#ac-enter-btn',
    ) as HTMLButtonElement;
    enterBtn.addEventListener('click', () => {
      this.dismissTitleScreen();
      callbacks.onStartExperience();
    });
  }

  public dismissTitleScreen() {
    if (this.isStarted) return;
    this.isStarted = true;
    this.titleOverlayEl.classList.add('is-hidden');
  }

  private buildActiveHud(callbacks: HudCallbacks) {
    // Top-left minimal spec bar + active node JSON readout
    const topBar = document.createElement('div');
    topBar.className = 'ac-top-bar';
    topBar.innerHTML = `
      <div class="ac-brand-cluster">
        <div class="ac-brand-row">
          <div class="ac-brand-title-wrap">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="14" height="14" stroke="#00E5FF" stroke-width="1.5"/>
              <rect x="4" y="4" width="8" height="8" fill="#5322FF"/>
            </svg>
            <span>Artificial Craft · JSON-Contract Pipeline Engine</span>
          </div>
          <a
            href="https://artificialcraft.space"
            target="_blank"
            rel="noopener noreferrer"
            class="ac-deploy-btn"
          >
            DEPLOY
          </a>
        </div>
        <div class="ac-brand-meta" id="ac-sim-stats">
          VERIFIED RUNS: 0 · FAULTS INTERCEPTED: 0 · WEBHOOK: IDLE
        </div>
        <div class="ac-telemetry-readout">
          <div class="ac-telemetry-header">
            <span class="ac-telemetry-title" id="ac-tel-title">DIFY-01 · Start Node</span>
            <span class="ac-telemetry-metrics" id="ac-tel-metrics">GEMINI_API_KEY: INJECTED</span>
          </div>
          <pre class="ac-telemetry-json" id="ac-tel-json"></pre>
        </div>
      </div>
    `;
    this.rootEl.appendChild(topBar);

    this.telemetryTitleEl = topBar.querySelector('#ac-tel-title')!;
    this.telemetryMetricsEl = topBar.querySelector('#ac-tel-metrics')!;
    this.telemetryJsonEl = topBar.querySelector('#ac-tel-json')!;
    this.simStatsEl = topBar.querySelector('#ac-sim-stats')!;

    // Bottom Collapsible Dock
    this.dockWrapEl = document.createElement('div');
    this.dockWrapEl.className = 'ac-bottom-dock-wrap';

    this.dockToggleBtn = document.createElement('button');
    this.dockToggleBtn.type = 'button';
    this.dockToggleBtn.className = 'ac-dock-toggle';
    this.dockToggleBtn.textContent = '▾ Hide Controls (H)';
    this.dockToggleBtn.addEventListener('click', () => this.toggleDock());

    const dockPanel = document.createElement('div');
    dockPanel.className = 'ac-bottom-dock';
    dockPanel.innerHTML = `
      <div class="ac-dock-row">
        <div class="ac-control-group" id="ac-zone-group">
          <span class="ac-group-label">CAMERA ZONES:</span>
          <button type="button" class="ac-btn is-active" data-cam="0">1. Overview</button>
          <button type="button" class="ac-btn" data-cam="0.25">2. Zone 01: Dify</button>
          <button type="button" class="ac-btn" data-cam="0.5">3. Zone 02: Highway</button>
          <button type="button" class="ac-btn" data-cam="0.75">4. Zone 03: Sanitize</button>
          <button type="button" class="ac-btn" data-cam="1">5. Output Sync</button>
        </div>
        <div class="ac-slider-wrap">
          <span class="ac-group-label">BEZIER PATH:</span>
          <input
            type="range"
            min="0"
            max="100"
            value="0"
            class="ac-slider"
            id="ac-bezier-slider"
            aria-label="Bezier camera path scrubber"
          />
          <span class="ac-slider-val" id="ac-bezier-val">0%</span>
        </div>
      </div>
      <div class="ac-dock-row">
        <div class="ac-control-group">
          <span class="ac-group-label">CONTRACT SIMULATION:</span>
          <button type="button" class="ac-btn is-active" id="ac-run-robotics">
            Dispatch ROBOTICS_3D
          </button>
          <button type="button" class="ac-btn is-indigo" id="ac-run-webapp">
            Dispatch USER_WEBAPP_GEN
          </button>
          <button type="button" class="ac-btn is-fault" id="ac-run-fault-key">
            Test Unapproved Key
          </button>
          <button type="button" class="ac-btn is-fault" id="ac-run-fault-md">
            Test Markdown Noise
          </button>
        </div>
        <div class="ac-control-group">
          <button type="button" class="ac-btn" id="ac-mute-btn">Sound: On</button>
        </div>
      </div>
    `;

    this.dockWrapEl.appendChild(this.dockToggleBtn);
    this.dockWrapEl.appendChild(dockPanel);
    this.rootEl.appendChild(this.dockWrapEl);

    this.sliderEl = dockPanel.querySelector(
      '#ac-bezier-slider',
    ) as HTMLInputElement;
    this.sliderValEl = dockPanel.querySelector('#ac-bezier-val')!;
    this.muteBtn = dockPanel.querySelector('#ac-mute-btn') as HTMLButtonElement;

    this.zoneButtons = Array.from(
      dockPanel.querySelectorAll('#ac-zone-group .ac-btn'),
    );

    this.zoneButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.dataset.cam || '0');
        callbacks.onCameraProgressChange(val);
        this.updateCameraProgressUI(val);
      });
    });

    this.sliderEl.addEventListener('input', () => {
      const val = parseFloat(this.sliderEl.value) / 100;
      callbacks.onCameraProgressChange(val);
      this.updateCameraProgressUI(val);
    });

    dockPanel
      .querySelector('#ac-run-robotics')!
      .addEventListener('click', () =>
        callbacks.onDispatchScenario(SimulationScenario.ROBOTICS_3D_VALID),
      );
    dockPanel
      .querySelector('#ac-run-webapp')!
      .addEventListener('click', () =>
        callbacks.onDispatchScenario(SimulationScenario.WEBAPP_GEN_VALID),
      );
    dockPanel
      .querySelector('#ac-run-fault-key')!
      .addEventListener('click', () =>
        callbacks.onDispatchScenario(
          SimulationScenario.FAULT_SCHEMA_HALLUCINATION,
        ),
      );
    dockPanel
      .querySelector('#ac-run-fault-md')!
      .addEventListener('click', () =>
        callbacks.onDispatchScenario(SimulationScenario.FAULT_MARKDOWN_PARSE),
      );

    this.muteBtn.addEventListener('click', () => {
      const muted = callbacks.onToggleMute();
      this.muteBtn.textContent = muted ? 'Sound: Off' : 'Sound: On';
    });
  }

  private bindKeyboardShortcuts(callbacks: HudCallbacks) {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.isStarted) {
        this.dismissTitleScreen();
        callbacks.onStartExperience();
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!this.isStarted) {
          this.dismissTitleScreen();
          callbacks.onStartExperience();
        } else {
          callbacks.onDispatchScenario(SimulationScenario.ROBOTICS_3D_VALID);
        }
      } else if (e.key === 'h' || e.key === 'H') {
        this.toggleDock();
      } else if (e.key === 'm' || e.key === 'M') {
        const muted = callbacks.onToggleMute();
        this.muteBtn.textContent = muted ? 'Sound: Off' : 'Sound: On';
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const t = idx * 0.25;
        callbacks.onCameraProgressChange(t);
        this.updateCameraProgressUI(t);
      }
    });
  }

  public toggleDock() {
    this.isCollapsed = !this.isCollapsed;
    this.dockWrapEl.classList.toggle('is-collapsed', this.isCollapsed);
    this.dockToggleBtn.textContent = this.isCollapsed
      ? '▴ Show Controls (H)'
      : '▾ Hide Controls (H)';
  }

  public updateCameraProgressUI(progress01: number) {
    const pct = Math.round(progress01 * 100);
    this.sliderEl.value = String(pct);
    this.sliderValEl.textContent = `${pct}%`;

    this.zoneButtons.forEach((btn) => {
      const target = parseFloat(btn.dataset.cam || '0');
      btn.classList.toggle('is-active', Math.abs(target - progress01) < 0.11);
    });
  }

  public inspectNode(spec: PipelineNodeSpec) {
    this.telemetryTitleEl.textContent = `${spec.code} · ${spec.title}`;
    this.telemetryMetricsEl.textContent = spec.statusText;
    this.telemetryJsonEl.textContent = JSON.stringify(
      spec.jsonSchemaSample,
      null,
      2,
    );
  }

  public inspectBadge(badge: CoreFixBadgeSpec) {
    this.telemetryTitleEl.textContent = `${badge.indexLabel} · ${badge.title}`;
    this.telemetryMetricsEl.textContent = badge.rule;
    this.telemetryJsonEl.textContent = JSON.stringify(badge.jsonProof, null, 2);
  }

  public updatePacketTelemetry(state: ActivePacketState) {
    const whState = state.webhookPending ? 'HELD PENDING (AMBER)' : 'CLEARED';
    this.simStatsEl.textContent = `VERIFIED RUNS: ${state.completedCount} · FAULTS INTERCEPTED: ${state.interceptedErrors} · WEBHOOK: ${whState} · ${state.statusMessage}`;
  }
}
