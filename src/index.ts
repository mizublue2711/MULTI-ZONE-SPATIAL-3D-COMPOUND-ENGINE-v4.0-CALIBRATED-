import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import * as xb from 'xrblocks';
import {PipelineAudioSynth} from './audio';
import {
  CAMERA_LOOKAT_WAYPOINTS,
  COLORS,
  PIPELINE_NODES,
} from './constants';
import {HudController} from './HudController';
import {PipelineArchitectureAssembly} from './PipelineBuilder';
import {SpatialTelemetryDeck} from './SpatialTelemetryUI';
import {
  ActivePacketState,
  CoreFixBadgeSpec,
  PipelineNodeSpec,
  SimulationScenario,
} from './types';

// Pre-allocated scratch vectors for zero-GC update loop
const _camPosTarget = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0.15, 1.38, -2.55);

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

/**
 * Main XR Blocks Script for the Artificial Craft 3D JSON-Contract Pipeline Core.
 * Renders the Dify Universal Reasoning Core, Optical Transmission Highway,
 * and n8n Orchestration & Sanitize Gateway.
 */
class PipelineCoreScene extends xb.Script {
  private readonly isSoftwareGl = detectSoftwareWebGL();
  private readonly audio = new PipelineAudioSynth();
  private assembly!: PipelineArchitectureAssembly;
  private spatialDeck!: SpatialTelemetryDeck;
  private hud!: HudController;

  private targetBezierProgress = 0.0;
  private currentBezierProgress = 0.0;
  private elapsed = 0;
  private uiValidated = false;

  private packetState: ActivePacketState = {
    active: false,
    scenario: SimulationScenario.ROBOTICS_3D_VALID,
    progress: 0,
    currentStageId: 'dify_start',
    statusMessage: 'PIPELINE READY · AWAITING PAYLOAD',
    webhookPending: false,
    sanitizedOk: null,
    completedCount: 0,
    interceptedErrors: 0,
  };

  init() {
    const rawRenderer = xb.core.renderer;
    const renderer =
      rawRenderer instanceof THREE.WebGLRenderer ? rawRenderer : null;
    const scene = xb.core.scene;

    // 1. Configure Studio PBR Renderer, Color Pipeline & Midnight Fog
    if (renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setPixelRatio(
        this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
      );
      renderer.shadowMap.enabled = !this.isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    if (scene) {
      scene.background = new THREE.Color(COLORS.MIDNIGHT_BG);
      scene.fog = new THREE.FogExp2(COLORS.MIDNIGHT_BG, 0.012);

      if (renderer) {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(
          new RoomEnvironment(),
          0.04,
        ).texture;
        pmremGenerator.dispose();
      }
    }

    // 2. Build 6500K Industrial Overhead Key Light + Dual Electric Indigo Rim Lights
    this.setupLightingRig();

    // 3. Build Composite 3D Pipeline Architecture (Zones 01, 02, 03 + 4 Core Fix Badges)
    const maxAnisotropy = renderer
      ? renderer.capabilities.getMaxAnisotropy()
      : 4;

    this.assembly = new PipelineArchitectureAssembly(
      {
        onNodeHover: (spec) => this.handleNodeHover(spec),
        onNodeSelect: (spec) => this.handleNodeSelect(spec),
        onBadgeSelect: (badge) => this.handleBadgeSelect(badge),
      },
      this.isSoftwareGl,
      maxAnisotropy,
      CAMERA_LOOKAT_WAYPOINTS,
    );
    this.add(this.assembly);

    // 4. Mount Built-In XR Blocks World-Space Spatial Telemetry Card (xb.UICard)
    this.spatialDeck = new SpatialTelemetryDeck({
      onDispatchScenario: (scenario) => this.dispatchScenario(scenario),
      onCameraProgressInput: (progress01) => {
        this.targetBezierProgress = progress01;
        this.hud?.updateCameraProgressUI(progress01);
      },
    });
    this.add(this.spatialDeck.card);

    // 5. Mount World-Matched Low-Occlusion HUD & Title Shell
    this.hud = new HudController({
      onStartExperience: () => {
        this.audio.playSelectLock();
        this.dispatchScenario(SimulationScenario.ROBOTICS_3D_VALID);
      },
      onCameraProgressChange: (progress01) => {
        this.targetBezierProgress = progress01;
        this.spatialDeck.syncSliderProgress(progress01);
      },
      onDispatchScenario: (scenario) => {
        this.hud.dismissTitleScreen();
        this.dispatchScenario(scenario);
      },
      onToggleMute: () => this.audio.toggleMute(),
    });

    // 6. Scroll-Driven Bezier Camera Gliding
    window.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        // Ignore scroll inside JSON pre block if scrollable
        const targetEl = e.target as HTMLElement | null;
        if (targetEl && targetEl.closest('.ac-telemetry-json')) return;

        const delta = Math.sign(e.deltaY) * 0.045;
        this.targetBezierProgress = THREE.MathUtils.clamp(
          this.targetBezierProgress + delta,
          0,
          1,
        );
        this.hud.updateCameraProgressUI(this.targetBezierProgress);
        this.spatialDeck.syncSliderProgress(this.targetBezierProgress);
      },
      {passive: true},
    );
  }

  private setupLightingRig() {
    // Cool sky / obsidian ground HemisphereLight fill
    const hemiLight = new THREE.HemisphereLight(0x88b4ff, 0x09090b, 1.45);
    this.add(hemiLight);

    // High-contrast 6500K industrial overhead key light
    const keyLight = new THREE.DirectionalLight(0xf6f9ff, 2.8);
    keyLight.position.set(2.5, 6.5, 2.0);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      const d = 5.5;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 16;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.add(keyLight);

    // Dual Electric Indigo (#5322FF) Rim Lights flanking Zone 01 and Zone 03
    const leftIndigoRim = new THREE.PointLight(
      COLORS.ELECTRIC_INDIGO,
      6.5,
      8.0,
      1.8,
    );
    leftIndigoRim.position.set(-3.6, 2.6, -3.5);
    this.add(leftIndigoRim);

    const rightIndigoRim = new THREE.PointLight(
      COLORS.ELECTRIC_INDIGO,
      6.5,
      8.0,
      1.8,
    );
    rightIndigoRim.position.set(3.8, 2.6, -3.5);
    this.add(rightIndigoRim);

    // Central Electric Cyan (#00E5FF) Optical Highway Fill
    const centerCyanLight = new THREE.PointLight(
      COLORS.ELECTRIC_CYAN,
      4.5,
      6.5,
      1.8,
    );
    centerCyanLight.position.set(0.0, 2.1, -1.9);
    this.add(centerCyanLight);
  }

  private handleNodeHover(spec: PipelineNodeSpec) {
    this.audio.playHoverPing();
    this.hud.inspectNode(spec);
    this.spatialDeck.inspectNode(spec);
  }

  private handleNodeSelect(spec: PipelineNodeSpec) {
    this.audio.playSelectLock();
    for (const [id, nodeScript] of this.assembly.nodeScripts.entries()) {
      nodeScript.setSelected(id === spec.id);
    }
    this.hud.inspectNode(spec);
    this.spatialDeck.inspectNode(spec);
  }

  private handleBadgeSelect(badge: CoreFixBadgeSpec) {
    this.audio.playSelectLock();
    this.hud.inspectBadge(badge);
    this.spatialDeck.inspectBadge(badge);
  }

  public dispatchScenario(scenario: SimulationScenario) {
    this.audio.playDispatchPulse();
    for (const node of this.assembly.nodeScripts.values()) {
      node.resetHighlight();
    }

    this.packetState.active = true;
    this.packetState.scenario = scenario;
    this.packetState.progress = 0;
    this.packetState.webhookPending = true;
    this.packetState.sanitizedOk = null;
    this.packetState.statusMessage = `DISPATCHED: ${scenario}`;

    // Highlight Webhook Trigger as Amber Pending
    this.assembly.nodeScripts
      .get('n8n_webhook_trigger')
      ?.setStatusHighlight(COLORS.AMBER_PENDING, 2.4);

    this.hud.updatePacketTelemetry(this.packetState);
    this.spatialDeck.updateSimulationStatus(
      `RUNNING CONTRACT: ${scenario} · WEBHOOK HELD PENDING`,
      false,
    );
  }

  update() {
    const rawDt = xb.getDeltaTime ? xb.getDeltaTime() : 0.016;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    this.elapsed += dt;

    // Validate XR Blocks Spatial UI once after initial layout frame completes
    if (!this.uiValidated && this.elapsed > 0.5 && xb.ui?.validate) {
      const report = xb.ui.validate(this.spatialDeck.card);
      if (report.ready) {
        this.uiValidated = true;
        if (!report.ok) {
          console.table(report.issues);
        }
      }
    }

    // 1. Smoothly damp Bezier Camera Path when not in an active WebXR headset session
    const isXrPresenting = Boolean(xb.core.renderer?.xr?.isPresenting);
    if (!isXrPresenting && xb.core.camera) {
      this.currentBezierProgress = THREE.MathUtils.damp(
        this.currentBezierProgress,
        this.targetBezierProgress,
        4.5,
        dt,
      );
      this.assembly.cameraCurve.getPoint(
        this.currentBezierProgress,
        _camPosTarget,
      );
      this.assembly.lookAtCurve.getPoint(
        this.currentBezierProgress,
        _camLookTarget,
      );

      xb.core.camera.position.lerp(_camPosTarget, 1 - Math.exp(-6 * dt));
      _currentLookAt.lerp(_camLookTarget, 1 - Math.exp(-6 * dt));
      xb.core.camera.lookAt(_currentLookAt);
    }

    // 2. Advance Live Contract Packet Simulation
    if (this.packetState.active) {
      const prevProgress = this.packetState.progress;
      this.packetState.progress += dt * 0.28;

      // Trigger Sanitize Gate check at 70% progress
      if (prevProgress < 0.7 && this.packetState.progress >= 0.7) {
        const isFault =
          this.packetState.scenario ===
            SimulationScenario.FAULT_MARKDOWN_PARSE ||
          this.packetState.scenario ===
            SimulationScenario.FAULT_SCHEMA_HALLUCINATION;

        const sanitizeNode =
          this.assembly.nodeScripts.get('n8n_sanitize_gate');

        if (isFault) {
          this.audio.playContractFault();
          sanitizeNode?.setStatusHighlight(COLORS.CRIMSON_FAULT, 2.8);
          const errCode =
            this.packetState.scenario ===
            SimulationScenario.FAULT_MARKDOWN_PARSE
              ? 'PARSE_ERROR (retryOnFail: false)'
              : 'SCHEMA_VALIDATION_ERROR (Unapproved Registry Key)';
          this.packetState.statusMessage = `INTERCEPTED AT NODE 3: ${errCode}`;
          this.spatialDeck.updateSimulationStatus(
            `FAULT INTERCEPTED: ${errCode} · ROUTING TO FALLBACK`,
            true,
          );
        } else {
          this.audio.playSanitizeSuccess();
          sanitizeNode?.setStatusHighlight(COLORS.EMERALD_VALID, 2.6);
          this.packetState.statusMessage =
            'NODE 3 SANITIZE PASSED · JSON.parse() & REGISTRY VERIFIED';
          this.spatialDeck.updateSimulationStatus(
            'NODE 3 SANITIZE PASSED · ROUTING VIA SWITCH NODE 4',
            false,
          );
        }
        this.hud.updatePacketTelemetry(this.packetState);
      }

      // Complete run at 100% progress
      if (this.packetState.progress >= 1.0) {
        this.packetState.active = false;
        this.packetState.progress = 1.0;
        this.packetState.webhookPending = false;

        const isFault =
          this.packetState.scenario ===
            SimulationScenario.FAULT_MARKDOWN_PARSE ||
          this.packetState.scenario ===
            SimulationScenario.FAULT_SCHEMA_HALLUCINATION;

        if (isFault) {
          this.packetState.interceptedErrors += 1;
          this.assembly.nodeScripts
            .get('n8n_webhook_trigger')
            ?.setStatusHighlight(COLORS.CRIMSON_FAULT, 2.0);
        } else {
          this.packetState.completedCount += 1;
          this.assembly.nodeScripts
            .get('n8n_webhook_trigger')
            ?.setStatusHighlight(COLORS.EMERALD_VALID, 2.2);
          this.assembly.nodeScripts
            .get('n8n_output_terminals')
            ?.setStatusHighlight(COLORS.EMERALD_VALID, 2.5);
          const outMsg =
            this.packetState.scenario === SimulationScenario.ROBOTICS_3D_VALID
              ? '5B SYNCED: src/assets/models/robotics/hand_actuator_v4.json'
              : '5A EMITTED: layout_json DELIVERED TO WEBHOOK';
          this.packetState.statusMessage = outMsg;
          this.spatialDeck.updateSimulationStatus(outMsg, false);

          // Automatically inspect Output Terminals on completion
          const terminalSpec = PIPELINE_NODES[PIPELINE_NODES.length - 1];
          this.hud.inspectNode(terminalSpec);
        }
        this.hud.updatePacketTelemetry(this.packetState);
      }
    }

    // 3. Step 3D Assembly Animations & InstancedMesh Pulses
    this.assembly.updateSimulationFrame(
      dt,
      this.elapsed,
      this.packetState.active ? this.packetState.scenario : null,
      this.packetState.progress,
    );
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const options = new xb.Options();
  options.enableReticles();
  options.setAppTitle('Artificial Craft — 3D Pipeline Core');
  options.setAppDescription(
    'Interactive 3D Dify + n8n JSON-Contract Pipeline Architecture.',
  );
  xb.add(new PipelineCoreScene());
  await xb.init(options);
});
