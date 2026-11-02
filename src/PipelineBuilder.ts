import * as THREE from 'three';
import * as xb from 'xrblocks';
import {
  CAMERA_BEZIER_WAYPOINTS,
  COLORS,
  CORE_FIX_BADGES,
  PIPELINE_NODES,
} from './constants';
import {
  createContactShadowTexture,
  createCoreFixBadgeTexture,
  createNodePlaqueTexture,
  createObsidianWallGridTexture,
  createSwissGridFloorTexture,
} from './textures';
import {
  CoreFixBadgeSpec,
  PipelineNodeSpec,
  SimulationScenario,
} from './types';

// Pre-allocated scratch math objects to guarantee zero GC in update() loop
const _dummyObj = new THREE.Object3D();
const _scratchVec = new THREE.Vector3();
const _scratchColor = new THREE.Color();

export interface NodeSelectCallbacks {
  onNodeHover: (spec: PipelineNodeSpec) => void;
  onNodeSelect: (spec: PipelineNodeSpec) => void;
  onBadgeSelect: (badge: CoreFixBadgeSpec) => void;
}

/**
 * Interactive 3D Pipeline Node extending xb.MeshScript so it works seamlessly
 * with XR Blocks mouse, controller ray, hand pinch, and direct touch events.
 */
export class InteractivePipelineNode extends xb.MeshScript {
  readonly spec: PipelineNodeSpec;
  private callbacks: NodeSelectCallbacks;
  private visualRoot: THREE.Group;
  private edgeHighlightMat: THREE.LineBasicMaterial;
  private coreEmissiveMeshes: THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshStandardMaterial
  >[] = [];
  public animatedParts: THREE.Object3D[] = [];
  private isHovered = false;
  private isSelected = false;
  private targetScale = 1.0;

  constructor(
    spec: PipelineNodeSpec,
    callbacks: NodeSelectCallbacks,
    isSoftwareGl: boolean,
    maxAnisotropy: number,
  ) {
    // Invisible interaction proxy bounding volume for clean raycasting
    const proxyGeo = new THREE.BoxGeometry(0.68, 0.62, 0.56);
    const proxyMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    });
    super(proxyGeo, proxyMat);

    this.spec = spec;
    this.callbacks = callbacks;
    this.name = `PipelineNode_${spec.id}`;
    this.position.copy(spec.position);

    this.visualRoot = new THREE.Group();
    this.visualRoot.xb = {pointerEvents: 'none'};
    this.add(this.visualRoot);

    this.edgeHighlightMat = new THREE.LineBasicMaterial({
      color: spec.accentHex,
      transparent: true,
      opacity: 0.72,
    });

    this.buildCompositeNodeGeometry(isSoftwareGl, maxAnisotropy);
  }

  private buildCompositeNodeGeometry(
    isSoftwareGl: boolean,
    maxAnisotropy: number,
  ) {
    // 1. Primary Silhouette: Beveled Anthracite Chassis Pedestal
    const baseShape = new THREE.Shape();
    const w = 0.26;
    const d = 0.22;
    const ch = 0.04;
    baseShape.moveTo(-w + ch, -d);
    baseShape.lineTo(w - ch, -d);
    baseShape.lineTo(w, -d + ch);
    baseShape.lineTo(w, d - ch);
    baseShape.lineTo(w - ch, d);
    baseShape.lineTo(-w + ch, d);
    baseShape.lineTo(-w, d - ch);
    baseShape.lineTo(-w, -d + ch);
    baseShape.closePath();

    const chassisGeo = new THREE.ExtrudeGeometry(baseShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    chassisGeo.rotateX(Math.PI / 2);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: COLORS.ANTHRACITE_PANEL,
      roughness: 0.32,
      metalness: 0.82,
    });
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.position.y = -0.14;
    chassisMesh.castShadow = !isSoftwareGl;
    chassisMesh.receiveShadow = !isSoftwareGl;
    this.visualRoot.add(chassisMesh);

    // 1px Swiss CAD Edge Border around Chassis
    const chassisEdges = new THREE.EdgesGeometry(chassisGeo, 20);
    const chassisWire = new THREE.LineSegments(
      chassisEdges,
      this.edgeHighlightMat,
    );
    chassisMesh.add(chassisWire);

    // Secondary Detail: Brushed Titanium Sub-Plinth
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x262836,
      roughness: 0.6,
      metalness: 0.45,
    });
    const plinthMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.21, 0.05, 8),
      plinthMat,
    );
    plinthMesh.position.y = -0.11;
    this.visualRoot.add(plinthMesh);

    // Accent Emissive Status Ring
    const ringMat = new THREE.MeshStandardMaterial({
      color: this.spec.accentHex,
      emissive: this.spec.accentHex,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.5,
    });
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.008, 12, 36),
      ringMat,
    );
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -0.08;
    this.visualRoot.add(ringMesh);
    this.coreEmissiveMeshes.push(ringMesh);

    // Build bespoke multi-part upper mechanism per node ID
    this.buildSpecificMechanism(isSoftwareGl, ringMat);

    // Floating Swiss CAD Plaque above node
    const plaqueTex = createNodePlaqueTexture(
      this.spec.code,
      this.spec.title,
      this.spec.statusText,
      this.spec.accentHex,
      maxAnisotropy,
    );
    const plaqueMat = new THREE.MeshBasicMaterial({
      map: plaqueTex,
      side: THREE.DoubleSide,
    });
    const plaqueMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.178),
      plaqueMat,
    );
    plaqueMesh.position.set(0, 0.28, 0);
    this.visualRoot.add(plaqueMesh);
  }

  private buildSpecificMechanism(
    isSoftwareGl: boolean,
    emissiveMat: THREE.MeshStandardMaterial,
  ) {
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd8f8ff,
      metalness: 0.05,
      roughness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.88,
      transparent: true,
      opacity: isSoftwareGl ? 0.35 : 1.0,
      ior: 1.52,
      thickness: 0.4,
      depthWrite: false,
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x8e96aa,
      roughness: 0.22,
      metalness: 0.92,
    });

    switch (this.spec.id) {
      case 'dify_start': {
        // Floating 1px glass ingestion dock + dual env key pillars
        const vaultCore = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.09, 0),
          emissiveMat.clone(),
        );
        vaultCore.position.y = 0.03;
        this.visualRoot.add(vaultCore);
        this.animatedParts.push(vaultCore);

        const glassDock = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.22, 0.22),
          glassMat,
        );
        glassDock.position.y = 0.03;
        glassDock.renderOrder = 2;
        this.visualRoot.add(glassDock);

        // Dual Env Key Indicator Columns (GEMINI_API_KEY & APP_URL)
        for (const side of [-1, 1]) {
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.016, 0.016, 0.22, 12),
            titaniumMat,
          );
          pillar.position.set(side * 0.19, 0.02, 0);
          this.visualRoot.add(pillar);
        }
        break;
      }

      case 'dify_classifier': {
        // 3D Prism Laser Beam Splitter in Dual Gimbal Rings
        const prism = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.11, 0),
          glassMat,
        );
        prism.position.y = 0.04;
        prism.renderOrder = 2;
        this.visualRoot.add(prism);
        this.animatedParts.push(prism);

        const innerCore = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.055, 0),
          emissiveMat.clone(),
        );
        innerCore.position.y = 0.04;
        this.visualRoot.add(innerCore);
        this.animatedParts.push(innerCore);

        const gimbalOuter = new THREE.Mesh(
          new THREE.TorusGeometry(0.145, 0.01, 12, 32),
          titaniumMat,
        );
        gimbalOuter.position.y = 0.04;
        this.visualRoot.add(gimbalOuter);
        this.animatedParts.push(gimbalOuter);
        break;
      }

      case 'dify_llm_robotics': {
        // Single Component 3D Foundry: Composite articulated robotic hand hologram
        const handGroup = new THREE.Group();
        handGroup.position.y = 0.02;

        // Wrist lathe base
        const lathePts = [
          new THREE.Vector2(0.0, 0),
          new THREE.Vector2(0.06, 0),
          new THREE.Vector2(0.045, 0.05),
          new THREE.Vector2(0.055, 0.08),
          new THREE.Vector2(0.0, 0.08),
        ];
        const wristMesh = new THREE.Mesh(
          new THREE.LatheGeometry(lathePts, 16),
          titaniumMat,
        );
        wristMesh.position.y = -0.06;
        handGroup.add(wristMesh);

        // Palm block
        const palmMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.07, 0.03),
          emissiveMat.clone(),
        );
        palmMesh.position.y = 0.01;
        handGroup.add(palmMesh);

        // 3 Articulated Fingers (proximal + distal phalanges)
        for (let f = -1; f <= 1; f++) {
          const fingerBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.018, 0.055, 0.018),
            titaniumMat,
          );
          fingerBase.position.set(f * 0.032, 0.065, 0);
          fingerBase.rotation.x = 0.25;
          handGroup.add(fingerBase);

          const fingerTip = new THREE.Mesh(
            new THREE.ConeGeometry(0.011, 0.04, 8),
            emissiveMat.clone(),
          );
          fingerTip.position.set(0, 0.04, 0.008);
          fingerTip.rotation.x = 0.35;
          fingerBase.add(fingerTip);
        }

        this.visualRoot.add(handGroup);
        this.animatedParts.push(handGroup);

        // Foundry containment frame
        const cage = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 6)),
          this.edgeHighlightMat,
        );
        cage.position.y = 0.03;
        this.visualRoot.add(cage);
        break;
      }

      case 'dify_llm_webapp': {
        // UI Layout Assembler: 4 Interlocking Registry AST Lego Blocks
        const legoGroup = new THREE.Group();
        legoGroup.position.y = 0.03;
        const blockOffsets = [
          new THREE.Vector3(-0.055, -0.035, 0),
          new THREE.Vector3(0.055, -0.035, 0),
          new THREE.Vector3(-0.055, 0.045, 0),
          new THREE.Vector3(0.055, 0.045, 0),
        ];
        blockOffsets.forEach((offset, idx) => {
          const brickMat =
            idx % 2 === 0 ? emissiveMat.clone() : titaniumMat.clone();
          const brick = new THREE.Mesh(
            new THREE.BoxGeometry(0.095, 0.058, 0.065),
            brickMat,
          );
          brick.position.copy(offset);

          // Dual Lego connector studs on top of each AST block
          for (const sx of [-0.024, 0.024]) {
            const stud = new THREE.Mesh(
              new THREE.CylinderGeometry(0.014, 0.014, 0.018, 12),
              titaniumMat,
            );
            stud.position.set(sx, 0.036, 0);
            brick.add(stud);
          }
          legoGroup.add(brick);
        });
        this.visualRoot.add(legoGroup);
        this.animatedParts.push(legoGroup);
        break;
      }

      case 'optical_highway': {
        // Central Optical Repeater Hub on the Quartz Highway
        const hubToroid = new THREE.Mesh(
          new THREE.TorusGeometry(0.14, 0.022, 16, 36),
          titaniumMat,
        );
        hubToroid.rotation.y = Math.PI / 2;
        hubToroid.position.y = 0.04;
        this.visualRoot.add(hubToroid);

        const coreSphere = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.075, 1),
          emissiveMat.clone(),
        );
        coreSphere.position.y = 0.04;
        this.visualRoot.add(coreSphere);
        this.animatedParts.push(coreSphere);
        break;
      }

      case 'n8n_webhook_trigger': {
        // Heavy Industrial Portal with Amber HTTP Pending Energy Barrier
        const leftPillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.045, 0.25, 0.06),
          titaniumMat,
        );
        leftPillar.position.set(-0.13, 0.04, 0);
        const rightPillar = leftPillar.clone();
        rightPillar.position.set(0.13, 0.04, 0);
        const topHeader = new THREE.Mesh(
          new THREE.BoxGeometry(0.31, 0.04, 0.07),
          titaniumMat,
        );
        topHeader.position.set(0, 0.16, 0);
        this.visualRoot.add(leftPillar, rightPillar, topHeader);

        const barrierMat = new THREE.MeshStandardMaterial({
          color: COLORS.AMBER_PENDING,
          emissive: COLORS.AMBER_PENDING,
          emissiveIntensity: 1.5,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const barrierPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.22, 0.21),
          barrierMat,
        );
        barrierPlane.position.set(0, 0.04, 0);
        this.visualRoot.add(barrierPlane);
        this.coreEmissiveMeshes.push(barrierPlane);
        this.animatedParts.push(barrierPlane);
        break;
      }

      case 'n8n_http_dify': {
        // Encapsulated Stringifier Turbine Chamber
        const turbineGroup = new THREE.Group();
        turbineGroup.position.y = 0.04;
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.26, 16),
          titaniumMat,
        );
        barrel.rotation.z = Math.PI / 2;
        turbineGroup.add(barrel);

        for (const xOff of [-0.07, 0, 0.07]) {
          const fin = new THREE.Mesh(
            new THREE.TorusGeometry(0.11, 0.012, 10, 24),
            emissiveMat.clone(),
          );
          fin.rotation.y = Math.PI / 2;
          fin.position.x = xOff;
          turbineGroup.add(fin);
        }
        this.visualRoot.add(turbineGroup);
        this.animatedParts.push(turbineGroup);
        break;
      }

      case 'n8n_sanitize_gate': {
        // 3D Laser Inspection Gate stripping ```json and auditing Registry keys
        const archGeo = new THREE.TorusGeometry(0.16, 0.02, 8, 6, Math.PI);
        const archMesh = new THREE.Mesh(archGeo, titaniumMat);
        archMesh.position.y = 0.0;
        this.visualRoot.add(archMesh);

        // Sweeping Laser Curtain Bar
        const laserBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.014, 0.16),
          emissiveMat.clone(),
        );
        laserBar.position.y = 0.05;
        this.visualRoot.add(laserBar);
        this.animatedParts.push(laserBar);
        this.coreEmissiveMeshes.push(laserBar);
        break;
      }

      case 'n8n_switch_router': {
        // Hydraulic 3-Way Rotary Diverter Manifold
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.12, 0.12, 12),
          titaniumMat,
        );
        hub.position.y = 0.0;
        this.visualRoot.add(hub);

        const diverterArm = new THREE.Group();
        diverterArm.position.y = 0.07;
        const armBarrel = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.04, 0.045),
          emissiveMat.clone(),
        );
        armBarrel.position.x = 0.06;
        diverterArm.add(armBarrel);
        this.visualRoot.add(diverterArm);
        this.animatedParts.push(diverterArm);
        this.coreEmissiveMeshes.push(armBarrel);
        break;
      }

      case 'n8n_output_terminals': {
        // Exterior Open-Sky Dual Output Stations: 5A (layout_json) & 5B (GitHub Repo API Sync)
        const station5A = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.07, 0.22, 6),
          emissiveMat.clone(),
        );
        station5A.position.set(-0.085, 0.04, 0.05);

        // Skyward Uplink Dish on Station 5A
        const dish5A = new THREE.Mesh(
          new THREE.ConeGeometry(0.055, 0.04, 16, 1, true),
          titaniumMat,
        );
        dish5A.rotation.x = Math.PI;
        dish5A.position.set(0, 0.13, 0);
        station5A.add(dish5A);

        const station5B = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.085, 0),
          titaniumMat,
        );
        station5B.position.set(0.095, 0.06, -0.05);

        // Skyward Telemetry Laser Beam shooting into the starry night sky above 5A & 5B
        const skyBeamGeo = new THREE.CylinderGeometry(0.004, 0.004, 3.8, 8);
        const skyBeamMat = new THREE.MeshBasicMaterial({
          color: COLORS.ELECTRIC_CYAN,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        });
        const skyBeam = new THREE.Mesh(skyBeamGeo, skyBeamMat);
        skyBeam.position.set(0.0, 1.95, 0.0);
        this.visualRoot.add(skyBeam);

        this.visualRoot.add(station5A, station5B);
        this.animatedParts.push(station5B);
        this.coreEmissiveMeshes.push(station5A);
        break;
      }
    }
  }

  onHoverEnter() {
    this.isHovered = true;
    this.targetScale = 1.07;
    this.edgeHighlightMat.opacity = 1.0;
    this.edgeHighlightMat.color.setHex(0xffffff);
    this.callbacks.onNodeHover(this.spec);
  }

  onHoverExit() {
    this.isHovered = false;
    this.targetScale = this.isSelected ? 1.05 : 1.0;
    this.edgeHighlightMat.opacity = this.isSelected ? 1.0 : 0.72;
    this.edgeHighlightMat.color.setHex(this.spec.accentHex);
  }

  onObjectSelectStart(event: xb.SelectEvent) {
    this.callbacks.onNodeSelect(this.spec);
    event.stopPropagation();
  }

  onObjectTouchStart(event: xb.SelectEvent) {
    this.callbacks.onNodeSelect(this.spec);
    event.stopPropagation();
  }

  setSelected(selected: boolean) {
    this.isSelected = selected;
    this.targetScale = selected ? 1.05 : this.isHovered ? 1.07 : 1.0;
    this.edgeHighlightMat.opacity = selected || this.isHovered ? 1.0 : 0.72;
  }

  setStatusHighlight(colorHex: number, intensity = 2.0) {
    for (const mesh of this.coreEmissiveMeshes) {
      mesh.material.color.setHex(colorHex);
      mesh.material.emissive.setHex(colorHex);
      mesh.material.emissiveIntensity = intensity;
    }
  }

  resetHighlight() {
    for (const mesh of this.coreEmissiveMeshes) {
      mesh.material.color.setHex(this.spec.accentHex);
      mesh.material.emissive.setHex(this.spec.accentHex);
      mesh.material.emissiveIntensity = 1.4;
    }
  }

  stepAnimation(dt: number, elapsed: number, switchBranchAngle = 0) {
    const s = THREE.MathUtils.damp(
      this.visualRoot.scale.x,
      this.targetScale,
      10,
      dt,
    );
    this.visualRoot.scale.setScalar(s);

    switch (this.spec.id) {
      case 'dify_start':
      case 'dify_classifier':
      case 'optical_highway':
      case 'n8n_output_terminals': {
        for (const part of this.animatedParts) {
          part.rotation.y += dt * 0.85;
          part.rotation.x = Math.sin(elapsed * 1.6) * 0.18;
        }
        break;
      }
      case 'dify_llm_robotics': {
        if (this.animatedParts[0]) {
          this.animatedParts[0].rotation.y = Math.sin(elapsed * 1.2) * 0.55;
        }
        break;
      }
      case 'dify_llm_webapp': {
        if (this.animatedParts[0]) {
          this.animatedParts[0].position.y =
            0.03 + Math.sin(elapsed * 2.2) * 0.015;
        }
        break;
      }
      case 'n8n_http_dify': {
        if (this.animatedParts[0]) {
          this.animatedParts[0].rotation.x += dt * 1.8;
        }
        break;
      }
      case 'n8n_sanitize_gate': {
        if (this.animatedParts[0]) {
          // Vertical laser scan curtain motion
          this.animatedParts[0].position.y =
            0.05 + Math.sin(elapsed * 4.2) * 0.075;
        }
        break;
      }
      case 'n8n_switch_router': {
        if (this.animatedParts[0]) {
          this.animatedParts[0].rotation.y = THREE.MathUtils.damp(
            this.animatedParts[0].rotation.y,
            switchBranchAngle,
            8,
            dt,
          );
        }
        break;
      }
    }
  }
}

/**
 * Interactive 3D Holographic Core Fix Badge extending xb.MeshScript
 */
export class InteractiveFixBadge extends xb.MeshScript {
  readonly badge: CoreFixBadgeSpec;
  private callbacks: NodeSelectCallbacks;
  private basePosY: number;

  constructor(
    badge: CoreFixBadgeSpec,
    callbacks: NodeSelectCallbacks,
    maxAnisotropy: number,
  ) {
    const geo = new THREE.PlaneGeometry(0.76, 0.228);
    const tex = createCoreFixBadgeTexture(
      badge.indexLabel,
      badge.title,
      badge.rule,
      badge.accentHex,
      maxAnisotropy,
    );
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
    });
    super(geo, mat);
    this.badge = badge;
    this.callbacks = callbacks;
    this.position.copy(badge.position);
    this.basePosY = badge.position.y;
    this.name = `CoreFixBadge_${badge.id}`;
  }

  onObjectSelectStart(event: xb.SelectEvent) {
    this.callbacks.onBadgeSelect(this.badge);
    event.stopPropagation();
  }

  onObjectTouchStart(event: xb.SelectEvent) {
    this.callbacks.onBadgeSelect(this.badge);
    event.stopPropagation();
  }

  stepFloating(elapsed: number, index: number) {
    this.position.y =
      this.basePosY + Math.sin(elapsed * 1.5 + index * 1.1) * 0.022;
  }
}

/**
 * Builds the complete 3D Architectural Environment, Interior Obsidian Concrete
 * Walls with 1px Swiss Grid Lines & Charcoal-Gray (#18181E) Metal Panels,
 * Exterior Starry Night Sky for Node 5A & 5B, Quartz Optical Highway,
 * InstancedMesh Data Pulses, and Live Packet Carrier.
 */
export class PipelineArchitectureAssembly extends THREE.Group {
  public readonly nodeScripts = new Map<string, InteractivePipelineNode>();
  public readonly badgeScripts: InteractiveFixBadge[] = [];
  public readonly cameraCurve: THREE.CatmullRomCurve3;
  public readonly lookAtCurve: THREE.CatmullRomCurve3;

  private highwayPulseInstanced: THREE.InstancedMesh;
  private readonly pulseCount = 36;
  private livePacketGroup: THREE.Group;
  private livePacketCoreMat: THREE.MeshStandardMaterial;
  private starfieldShaderMat!: THREE.ShaderMaterial;
  private switchBranchAngle = 0;

  constructor(
    callbacks: NodeSelectCallbacks,
    isSoftwareGl: boolean,
    maxAnisotropy: number,
    lookAtWaypoints: THREE.Vector3[],
  ) {
    super();
    this.name = 'ArtificialCraftPipelineAssembly';

    this.cameraCurve = new THREE.CatmullRomCurve3(CAMERA_BEZIER_WAYPOINTS);
    this.lookAtCurve = new THREE.CatmullRomCurve3(lookAtWaypoints);

    // 1. Dark Obsidian Concrete Floor with 1px Swiss Grid Alignment Lines
    this.buildObsidianSwissFloor(isSoftwareGl, maxAnisotropy);

    // 2. Interior Space: Obsidian-Black (#09090B) Concrete Walls with 1px Swiss Grid
    //    & Charcoal-Gray (#18181E) Metal Panels with Razor-Thin 1px Edges
    this.buildInteriorObsidianWallsAndPanels(isSoftwareGl, maxAnisotropy);

    // 3. Exterior Space (Housing Node 5A & 5B): Black Night Sky with Hundreds of Twinkling Luminous Stars
    this.buildExteriorStarryNightSky();

    // 4. Zone 01 Dify Monolith Gantry & Zone 03 n8n Tactical Plinths
    this.buildZoneStructuralFoundations(isSoftwareGl);

    // 5. Zone 02 Quartz Glass Optical Transmission Highway & Laser Beams
    this.buildOpticalHighwayAndLaserBeams(isSoftwareGl);

    // 6. InstancedMesh (>20 items) of Liquid Data Pulses along the Highway
    const pulseGeo = new THREE.BoxGeometry(0.065, 0.022, 0.022);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: COLORS.ELECTRIC_CYAN,
    });
    this.highwayPulseInstanced = new THREE.InstancedMesh(
      pulseGeo,
      pulseMat,
      this.pulseCount,
    );
    this.highwayPulseInstanced.frustumCulled = false;
    this.highwayPulseInstanced.xb = {pointerEvents: 'none'};
    this.add(this.highwayPulseInstanced);

    // 7. All 10 Interactive Pipeline Nodes
    for (const spec of PIPELINE_NODES) {
      const nodeScript = new InteractivePipelineNode(
        spec,
        callbacks,
        isSoftwareGl,
        maxAnisotropy,
      );
      this.nodeScripts.set(spec.id, nodeScript);
      this.add(nodeScript);
    }

    // 8. All 4 Holographic Core Fix Badges
    for (const badgeSpec of CORE_FIX_BADGES) {
      const badge = new InteractiveFixBadge(
        badgeSpec,
        callbacks,
        maxAnisotropy,
      );
      this.badgeScripts.push(badge);
      this.add(badge);
    }

    // 9. Live Simulation Packet Carrier (Composite 4-part glowing AST capsule)
    this.livePacketGroup = new THREE.Group();
    this.livePacketGroup.visible = false;
    this.livePacketGroup.xb = {pointerEvents: 'none'};
    this.livePacketCoreMat = new THREE.MeshStandardMaterial({
      color: COLORS.ELECTRIC_CYAN,
      emissive: COLORS.ELECTRIC_CYAN,
      emissiveIntensity: 2.4,
      roughness: 0.15,
      metalness: 0.3,
    });
    const packetCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.065, 1),
      this.livePacketCoreMat,
    );
    const packetRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.095, 0.008, 10, 28),
      this.livePacketCoreMat,
    );
    const packetRing2 = packetRing1.clone();
    packetRing2.rotation.x = Math.PI / 2;
    this.livePacketGroup.add(packetCore, packetRing1, packetRing2);
    this.add(this.livePacketGroup);
  }

  private buildObsidianSwissFloor(
    isSoftwareGl: boolean,
    maxAnisotropy: number,
  ) {
    const floorTex = createSwissGridFloorTexture(maxAnisotropy);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.72,
      metalness: 0.25,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      floorMat,
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = !isSoftwareGl;
    floorMesh.xb = {pointerEvents: 'none'};
    this.add(floorMesh);
  }

  /**
   * Builds the Interior Space enclosing Zones 01, 02, and 03 (up to the X = +3.22m
   * threshold portal before Node 5A & 5B):
   * - Obsidian-black (#09090B) concrete walls intersected by 1px-thick Swiss-style grid lines
   * - Complemented by charcoal-gray (#18181E) metal panels featuring razor-thin, 1px-wide edges
   */
  private buildInteriorObsidianWallsAndPanels(
    isSoftwareGl: boolean,
    maxAnisotropy: number,
  ) {
    const interiorGroup = new THREE.Group();
    interiorGroup.name = 'InteriorObsidianSwissArchitecture';
    interiorGroup.xb = {pointerEvents: 'none'};

    // Obsidian-black (#09090B) concrete wall material with 1px Swiss grid lines
    const rearWallTex = createObsidianWallGridTexture(9, 4, maxAnisotropy);
    const obsidianWallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: rearWallTex,
      roughness: 0.78,
      metalness: 0.18,
    });

    const sideWallTex = createObsidianWallGridTexture(5, 4, maxAnisotropy);
    const obsidianSideWallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: sideWallTex,
      roughness: 0.78,
      metalness: 0.18,
    });

    // Charcoal-gray (#18181E) metal panel material
    const charcoalPanelMat = new THREE.MeshStandardMaterial({
      color: COLORS.ANTHRACITE_PANEL, // #18181E
      roughness: 0.34,
      metalness: 0.84,
    });

    // Razor-thin 1px-wide edges for the charcoal-gray (#18181E) metal panels
    const panelEdgeMat = new THREE.LineBasicMaterial({
      color: 0x52566e,
      transparent: true,
      opacity: 0.9,
    });
    const cyanHairlineMat = new THREE.LineBasicMaterial({
      color: COLORS.ELECTRIC_CYAN,
      transparent: true,
      opacity: 0.55,
    });

    // 1. North Rear Obsidian Concrete Wall (Spans X = -4.65m to X = +3.22m, terminating right before Node 5A & 5B)
    const rearWallWidth = 7.87;
    const wallHeight = 4.3;
    const rearWallCenterX = (-4.65 + 3.22) * 0.5; // -0.715
    const rearWallGeo = new THREE.BoxGeometry(rearWallWidth, wallHeight, 0.14);
    const rearWall = new THREE.Mesh(rearWallGeo, obsidianWallMat);
    rearWall.position.set(rearWallCenterX, wallHeight * 0.5, -4.15);
    rearWall.receiveShadow = !isSoftwareGl;
    rearWall.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(rearWallGeo),
        panelEdgeMat,
      ),
    );
    interiorGroup.add(rearWall);

    // 2. West Flank Obsidian Concrete Wall (Enclosing Zone 01 Dify Core at X = -4.65m)
    const westWallDepth = 5.1;
    const westWallGeo = new THREE.BoxGeometry(0.14, wallHeight, westWallDepth);
    const westWall = new THREE.Mesh(westWallGeo, obsidianSideWallMat);
    westWall.position.set(-4.65, wallHeight * 0.5, -1.6);
    westWall.receiveShadow = !isSoftwareGl;
    westWall.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(westWallGeo),
        panelEdgeMat,
      ),
    );
    interiorGroup.add(westWall);

    // 3. Cantilevered Interior Brutalist Ceiling Slab (Stops at X = +3.22m so Node 5A & 5B sit under the open starry sky)
    const ceilingGeo = new THREE.BoxGeometry(rearWallWidth, 0.14, 3.2);
    const ceilingSlab = new THREE.Mesh(ceilingGeo, obsidianWallMat);
    ceilingSlab.position.set(rearWallCenterX, wallHeight, -2.62);
    ceilingSlab.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(ceilingGeo),
        panelEdgeMat,
      ),
    );
    interiorGroup.add(ceilingSlab);

    // 4. Architectural Array of Charcoal-Gray (#18181E) Metal Panels with Razor-Thin 1px Edges
    // Mounted along the Rear Obsidian Concrete Wall in precision Swiss modular bays
    const bayPositionsX = [-3.95, -2.85, -1.75, -0.65, 0.45, 1.55, 2.58];
    const rowPositionsY = [1.05, 2.25, 3.45];

    const panelGeo = new THREE.BoxGeometry(0.92, 0.96, 0.036);
    const panelEdgesGeo = new THREE.EdgesGeometry(panelGeo);

    for (let b = 0; b < bayPositionsX.length; b++) {
      for (let r = 0; r < rowPositionsY.length; r++) {
        const panelMesh = new THREE.Mesh(panelGeo, charcoalPanelMat);
        panelMesh.position.set(bayPositionsX[b], rowPositionsY[r], -4.05);
        panelMesh.castShadow = !isSoftwareGl;
        panelMesh.receiveShadow = !isSoftwareGl;

        // 1px razor-thin edge border on every charcoal-gray (#18181E) metal panel
        const edgeMat =
          (b + r) % 3 === 0 ? cyanHairlineMat : panelEdgeMat;
        panelMesh.add(new THREE.LineSegments(panelEdgesGeo, edgeMat));
        interiorGroup.add(panelMesh);
      }
    }

    // Charcoal-Gray (#18181E) Metal Panels mounted along the West Wing Wall
    const westPanelGeo = new THREE.BoxGeometry(0.036, 0.96, 0.96);
    const westPanelEdges = new THREE.EdgesGeometry(westPanelGeo);
    for (const zPos of [-3.4, -2.2, -1.0]) {
      for (const yPos of [1.05, 2.25, 3.45]) {
        const wPanel = new THREE.Mesh(westPanelGeo, charcoalPanelMat);
        wPanel.position.set(-4.55, yPos, zPos);
        wPanel.add(new THREE.LineSegments(westPanelEdges, panelEdgeMat));
        interiorGroup.add(wPanel);
      }
    }

    // 5. East Transition Threshold Bulkhead (X = +3.22m) separating the Interior Bunker
    //    from the Exterior Starry Night Sky housing Node 5A & 5B
    const portalPillarGeo = new THREE.BoxGeometry(0.14, wallHeight, 0.24);
    const portalPillarEdges = new THREE.EdgesGeometry(portalPillarGeo);

    const northPortalPillar = new THREE.Mesh(
      portalPillarGeo,
      charcoalPanelMat,
    );
    northPortalPillar.position.set(3.22, wallHeight * 0.5, -3.95);
    northPortalPillar.add(
      new THREE.LineSegments(portalPillarEdges, cyanHairlineMat),
    );

    const southPortalPillar = new THREE.Mesh(
      portalPillarGeo,
      charcoalPanelMat,
    );
    southPortalPillar.position.set(3.22, wallHeight * 0.5, -0.35);
    southPortalPillar.add(
      new THREE.LineSegments(portalPillarEdges, cyanHairlineMat),
    );

    const portalHeaderGeo = new THREE.BoxGeometry(0.16, 0.22, 3.84);
    const portalHeader = new THREE.Mesh(portalHeaderGeo, charcoalPanelMat);
    portalHeader.position.set(3.22, wallHeight - 0.11, -2.15);
    portalHeader.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(portalHeaderGeo),
        cyanHairlineMat,
      ),
    );

    interiorGroup.add(northPortalPillar, southPortalPillar, portalHeader);
    this.add(interiorGroup);
  }

  /**
   * Builds the Exterior Space housing "Node 5A & 5B" (east of X = +3.22m and arching
   * across the night horizon), transitioning into a pitch-black night sky filled
   * with hundreds of twinkling, luminous stars.
   */
  private buildExteriorStarryNightSky() {
    const exteriorSkyGroup = new THREE.Group();
    exteriorSkyGroup.name = 'ExteriorStarryNightSky';
    exteriorSkyGroup.xb = {pointerEvents: 'none'};

    // Pitch-black night sky backdrop vault framing the exterior sector around Node 5A & 5B
    const nightVaultGeo = new THREE.SphereGeometry(
      18,
      36,
      24,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.52,
    );
    const nightVaultMat = new THREE.MeshBasicMaterial({
      color: 0x020205,
      side: THREE.BackSide,
      fog: false,
    });
    const nightVaultMesh = new THREE.Mesh(nightVaultGeo, nightVaultMat);
    nightVaultMesh.position.set(3.75, -0.2, -2.5);
    exteriorSkyGroup.add(nightVaultMesh);

    // Generate 900 Twinkling, Luminous Stars concentrated across the Exterior Night Sky
    // around and above Node 5A & 5B (and arching overhead)
    const starCount = 900;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);
    const speeds = new Float32Array(starCount);

    const palette = [
      new THREE.Color(0xffffff), // Pure brilliant white
      new THREE.Color(0xcff9ff), // Luminous ice cyan
      new THREE.Color(0xb8d0ff), // Celestial sapphire white
      new THREE.Color(0xfff1cc), // Warm stellar gold
      new THREE.Color(0xd7c9ff), // Subtle violet-white star
    ];

    for (let i = 0; i < starCount; i++) {
      // Concentrate 65% of stars directly in the exterior sky vista behind/above Node 5A & 5B (X > +2.8m)
      // and 35% arching across the high night sky canopy
      const inExteriorSector = i < starCount * 0.65;

      if (inExteriorSector) {
        const radius = 4.2 + Math.random() * 11.5;
        const azimuth = -Math.PI * 0.48 + Math.random() * Math.PI * 0.96; // Facing east/northeast/southeast around Node 5A & 5B
        const elevation = 0.04 + Math.random() * 1.15;

        positions[i * 3] =
          3.25 + Math.cos(elevation) * Math.cos(azimuth) * radius;
        positions[i * 3 + 1] =
          0.35 + Math.sin(elevation) * radius * 0.65;
        positions[i * 3 + 2] =
          -2.55 + Math.cos(elevation) * Math.sin(azimuth) * radius;
      } else {
        // High celestial dome stars above the roof line and eastern horizon
        const theta = Math.random() * Math.PI * 2;
        const phi = 0.12 + Math.random() * 1.15;
        const r = 9.0 + Math.random() * 7.5;
        const sx = 2.5 + r * Math.sin(phi) * Math.cos(theta);
        const sy = 4.45 + Math.abs(r * Math.cos(phi)) * 0.55;
        const sz = -2.55 + r * Math.sin(phi) * Math.sin(theta);

        positions[i * 3] = sx;
        positions[i * 3 + 1] = sy;
        positions[i * 3 + 2] = sz;
      }

      const starColor = palette[i % palette.length];
      colors[i * 3] = starColor.r;
      colors[i * 3 + 1] = starColor.g;
      colors[i * 3 + 2] = starColor.b;

      // Vary star sizes: mostly fine luminous stars + ~12% bright beacon stars
      sizes[i] = i % 8 === 0 ? 18.0 + Math.random() * 14.0 : 7.0 + Math.random() * 9.0;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 1.6 + Math.random() * 3.8;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    starGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

    this.starfieldShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {value: 0},
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        attribute float aSpeed;

        uniform float uTime;

        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          vColor = aColor;
          // Smooth multi-harmonic stellar scintillation (twinkling)
          float wave1 = 0.5 + 0.5 * sin(uTime * aSpeed + aPhase);
          float wave2 = 0.5 + 0.5 * cos(uTime * (aSpeed * 0.63) - aPhase * 1.7);
          vTwinkle = 0.32 + 0.68 * pow(wave1 * wave2, 0.75);

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (0.65 + 0.55 * vTwinkle) * (3.5 / max(-mvPosition.z, 1.2));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;

          // Intense luminous core + soft airy diffraction spikes & halo
          float core = smoothstep(0.22, 0.0, dist);
          float halo = smoothstep(0.5, 0.0, dist) * 0.65;
          float crossSpike = max(
            smoothstep(0.045, 0.0, abs(uv.x)) * smoothstep(0.48, 0.0, abs(uv.y)),
            smoothstep(0.045, 0.0, abs(uv.y)) * smoothstep(0.48, 0.0, abs(uv.x))
          ) * 0.55;

          float brightness = (core + halo + crossSpike) * vTwinkle;
          vec3 finalColor = mix(vColor, vec3(1.0), core * 0.7);
          gl_FragColor = vec4(finalColor * brightness, clamp(brightness, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    const starPoints = new THREE.Points(starGeo, this.starfieldShaderMat);
    starPoints.frustumCulled = false;
    starPoints.renderOrder = 1;
    exteriorSkyGroup.add(starPoints);

    this.add(exteriorSkyGroup);
  }

  private buildZoneStructuralFoundations(isSoftwareGl: boolean) {
    const shadowTex = createContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    const monolithMat = new THREE.MeshStandardMaterial({
      color: 0x101016,
      roughness: 0.42,
      metalness: 0.78,
    });

    const cyanLineMat = new THREE.LineBasicMaterial({
      color: COLORS.ELECTRIC_CYAN,
      transparent: true,
      opacity: 0.4,
    });

    const indigoLineMat = new THREE.LineBasicMaterial({
      color: COLORS.ELECTRIC_INDIGO,
      transparent: true,
      opacity: 0.45,
    });

    // Zone 01 Dify Elevated Monolith Platform & Support Columns (Grounded at Y=0)
    const difyPlatformGeo = new THREE.BoxGeometry(2.75, 0.08, 1.35);
    const difyPlatform = new THREE.Mesh(difyPlatformGeo, monolithMat);
    difyPlatform.position.set(-2.25, 0.62, -2.55);
    difyPlatform.castShadow = !isSoftwareGl;
    difyPlatform.receiveShadow = !isSoftwareGl;
    difyPlatform.xb = {pointerEvents: 'none'};
    difyPlatform.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(difyPlatformGeo),
        cyanLineMat,
      ),
    );
    this.add(difyPlatform);

    // 4 Grounded Support Columns for Dify Monolith
    for (const x of [-3.35, -1.15]) {
      for (const z of [-3.05, -2.05]) {
        const col = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.62, 0.09),
          monolithMat,
        );
        col.position.set(x, 0.31, z);
        col.xb = {pointerEvents: 'none'};
        this.add(col);
      }
    }

    // Contact shadow beneath Zone 01 Dify Monolith
    const difyShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 2.0),
      shadowMat,
    );
    difyShadow.rotation.x = -Math.PI / 2;
    difyShadow.position.set(-2.25, 0.01, -2.55);
    difyShadow.xb = {pointerEvents: 'none'};
    this.add(difyShadow);

    // Zone 03 n8n Heavy Industrial Tactical Deck (Grounded at Y=0)
    const n8nDeckGeo = new THREE.BoxGeometry(3.55, 0.08, 1.45);
    const n8nDeck = new THREE.Mesh(n8nDeckGeo, monolithMat);
    n8nDeck.position.set(2.35, 0.62, -2.55);
    n8nDeck.castShadow = !isSoftwareGl;
    n8nDeck.receiveShadow = !isSoftwareGl;
    n8nDeck.xb = {pointerEvents: 'none'};
    n8nDeck.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(n8nDeckGeo),
        indigoLineMat,
      ),
    );
    this.add(n8nDeck);

    for (const x of [0.8, 2.35, 3.85]) {
      for (const z of [-3.1, -2.0]) {
        const col = new THREE.Mesh(
          new THREE.BoxGeometry(0.11, 0.62, 0.11),
          monolithMat,
        );
        col.position.set(x, 0.31, z);
        col.xb = {pointerEvents: 'none'};
        this.add(col);
      }
    }

    const n8nShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.1),
      shadowMat,
    );
    n8nShadow.rotation.x = -Math.PI / 2;
    n8nShadow.position.set(2.35, 0.01, -2.55);
    n8nShadow.xb = {pointerEvents: 'none'};
    this.add(n8nShadow);
  }

  private buildOpticalHighwayAndLaserBeams(isSoftwareGl: boolean) {
    const quartzGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbff8ff,
      metalness: 0.05,
      roughness: 0.08,
      transmission: isSoftwareGl ? 0 : 0.9,
      transparent: true,
      opacity: isSoftwareGl ? 0.32 : 1.0,
      ior: 1.5,
      thickness: 0.25,
      depthWrite: false,
    });

    const cyanLaserMat = new THREE.MeshBasicMaterial({
      color: COLORS.ELECTRIC_CYAN,
    });
    const indigoLaserMat = new THREE.MeshBasicMaterial({
      color: COLORS.ELECTRIC_INDIGO,
    });

    // Helper to connect two 3D points with an optical quartz conduit + inner 1px laser core
    const addLaserConduit = (
      pA: THREE.Vector3,
      pB: THREE.Vector3,
      isIndigo = false,
      withQuartzOuter = false,
    ) => {
      const mid = pA.clone().lerp(pB, 0.5);
      const curve = new THREE.CatmullRomCurve3([pA, mid, pB]);

      const coreGeo = new THREE.TubeGeometry(curve, 20, 0.007, 6, false);
      const coreMesh = new THREE.Mesh(
        coreGeo,
        isIndigo ? indigoLaserMat : cyanLaserMat,
      );
      coreMesh.xb = {pointerEvents: 'none'};
      this.add(coreMesh);

      if (withQuartzOuter) {
        const outerGeo = new THREE.TubeGeometry(curve, 24, 0.032, 12, false);
        const outerMesh = new THREE.Mesh(outerGeo, quartzGlassMat);
        outerMesh.renderOrder = 3;
        outerMesh.xb = {pointerEvents: 'none'};
        this.add(outerMesh);
      }
    };

    // Zone 01 Internal Laser Links (Start -> Classifier -> Track A & Track B)
    addLaserConduit(
      new THREE.Vector3(-3.3, 1.32, -2.55),
      new THREE.Vector3(-2.3, 1.32, -2.55),
      false,
    );
    addLaserConduit(
      new THREE.Vector3(-2.3, 1.32, -2.55),
      new THREE.Vector3(-1.25, 1.72, -2.35),
      false,
    );
    addLaserConduit(
      new THREE.Vector3(-2.3, 1.32, -2.55),
      new THREE.Vector3(-1.25, 0.92, -2.75),
      true,
    );

    // Zone 02 High-Speed Quartz Optical Highway Pipes (Dify -> Optical Hub -> n8n)
    addLaserConduit(
      new THREE.Vector3(-1.25, 1.72, -2.35),
      new THREE.Vector3(-0.05, 1.36, -2.5),
      false,
      true,
    );
    addLaserConduit(
      new THREE.Vector3(-1.25, 0.92, -2.75),
      new THREE.Vector3(-0.05, 1.28, -2.6),
      true,
      true,
    );
    addLaserConduit(
      new THREE.Vector3(-0.05, 1.32, -2.55),
      new THREE.Vector3(0.95, 0.95, -2.75),
      true,
      true,
    );
    addLaserConduit(
      new THREE.Vector3(-0.05, 1.32, -2.55),
      new THREE.Vector3(1.95, 1.32, -2.55),
      false,
      true,
    );

    // Zone 03 Internal n8n Links (Webhook Trigger -> HTTP Call -> Sanitize Gate -> Switch Router -> 5A/5B)
    addLaserConduit(
      new THREE.Vector3(0.95, 1.85, -2.35),
      new THREE.Vector3(0.95, 0.95, -2.75),
      false,
    );
    addLaserConduit(
      new THREE.Vector3(0.95, 0.95, -2.75),
      new THREE.Vector3(1.95, 1.32, -2.55),
      true,
    );
    addLaserConduit(
      new THREE.Vector3(1.95, 1.32, -2.55),
      new THREE.Vector3(2.85, 1.32, -2.55),
      false,
    );
    addLaserConduit(
      new THREE.Vector3(2.85, 1.32, -2.55),
      new THREE.Vector3(3.75, 1.32, -2.45),
      false,
    );
  }

  public updateSimulationFrame(
    dt: number,
    elapsed: number,
    activeScenario: SimulationScenario | null,
    scenarioProgress: number,
  ) {
    // 0. Advance twinkling starfield shader time in the exterior night sky
    if (this.starfieldShaderMat) {
      this.starfieldShaderMat.uniforms.uTime.value = elapsed;
    }

    // 1. Update InstancedMesh liquid data pulses along the Optical Highway
    for (let i = 0; i < this.pulseCount; i++) {
      const lane = i % 3;
      const t = ((elapsed * 0.55 + i / this.pulseCount) % 1.0);
      const x = THREE.MathUtils.lerp(-3.3, 3.75, t);
      const yOffset =
        lane === 0
          ? Math.sin(t * Math.PI * 2) * 0.22
          : lane === 1
            ? -Math.sin(t * Math.PI * 2) * 0.22
            : 0;
      const zOffset = lane === 0 ? 0.12 : lane === 1 ? -0.12 : 0;

      _dummyObj.position.set(x, 1.32 + yOffset, -2.55 + zOffset);
      _dummyObj.rotation.set(0, 0, 0);
      _dummyObj.scale.setScalar(0.85 + (i % 3) * 0.12);
      _dummyObj.updateMatrix();
      this.highwayPulseInstanced.setMatrixAt(i, _dummyObj.matrix);

      _scratchColor.setHex(
        lane === 0
          ? COLORS.ELECTRIC_CYAN
          : lane === 1
            ? COLORS.ELECTRIC_INDIGO
            : COLORS.EMERALD_VALID,
      );
      this.highwayPulseInstanced.setColorAt(i, _scratchColor);
    }
    this.highwayPulseInstanced.instanceMatrix.needsUpdate = true;
    if (this.highwayPulseInstanced.instanceColor) {
      this.highwayPulseInstanced.instanceColor.needsUpdate = true;
    }

    // 2. Step each interactive node's mechanical animation
    for (const node of this.nodeScripts.values()) {
      node.stepAnimation(dt, elapsed, this.switchBranchAngle);
    }

    // 3. Step holographic badges
    this.badgeScripts.forEach((badge, idx) =>
      badge.stepFloating(elapsed, idx),
    );

    // 4. Update Live Packet Carrier if a simulation scenario is active
    if (!activeScenario) {
      this.livePacketGroup.visible = false;
      return;
    }

    this.livePacketGroup.visible = true;
    this.livePacketGroup.rotation.y += dt * 4.5;
    this.livePacketGroup.rotation.z += dt * 2.5;

    const waypoints = this.getWaypointsForScenario(activeScenario);
    const pathCurve = new THREE.CatmullRomCurve3(waypoints);
    pathCurve.getPointAt(Math.min(Math.max(scenarioProgress, 0), 1), _scratchVec);
    this.livePacketGroup.position.copy(_scratchVec);

    const isFault =
      activeScenario === SimulationScenario.FAULT_MARKDOWN_PARSE ||
      activeScenario === SimulationScenario.FAULT_SCHEMA_HALLUCINATION;

    if (isFault && scenarioProgress > 0.68) {
      this.livePacketCoreMat.color.setHex(COLORS.CRIMSON_FAULT);
      this.livePacketCoreMat.emissive.setHex(COLORS.CRIMSON_FAULT);
      this.switchBranchAngle = -0.65;
    } else if (activeScenario === SimulationScenario.WEBAPP_GEN_VALID) {
      this.livePacketCoreMat.color.setHex(COLORS.ELECTRIC_INDIGO);
      this.livePacketCoreMat.emissive.setHex(COLORS.ELECTRIC_INDIGO);
      this.switchBranchAngle = 0.45;
    } else {
      this.livePacketCoreMat.color.setHex(COLORS.ELECTRIC_CYAN);
      this.livePacketCoreMat.emissive.setHex(COLORS.ELECTRIC_CYAN);
      this.switchBranchAngle = -0.25;
    }
  }

  private getWaypointsForScenario(
    scenario: SimulationScenario,
  ): THREE.Vector3[] {
    const start = new THREE.Vector3(-3.3, 1.32, -2.55);
    const classifier = new THREE.Vector3(-2.3, 1.32, -2.55);
    const llmRobotics = new THREE.Vector3(-1.25, 1.72, -2.35);
    const llmWebapp = new THREE.Vector3(-1.25, 0.92, -2.75);
    const highway = new THREE.Vector3(-0.05, 1.32, -2.55);
    const httpCall = new THREE.Vector3(0.95, 0.95, -2.75);
    const sanitizeGate = new THREE.Vector3(1.95, 1.32, -2.55);
    const switchRouter = new THREE.Vector3(2.85, 1.32, -2.55);
    const outputStation = new THREE.Vector3(3.75, 1.32, -2.45);
    const errorTerminal = new THREE.Vector3(2.85, 0.78, -2.25);

    switch (scenario) {
      case SimulationScenario.ROBOTICS_3D_VALID:
        return [
          start,
          classifier,
          llmRobotics,
          highway,
          httpCall,
          sanitizeGate,
          switchRouter,
          outputStation,
        ];
      case SimulationScenario.WEBAPP_GEN_VALID:
        return [
          start,
          classifier,
          llmWebapp,
          highway,
          httpCall,
          sanitizeGate,
          switchRouter,
          outputStation,
        ];
      case SimulationScenario.FAULT_SCHEMA_HALLUCINATION:
      case SimulationScenario.FAULT_MARKDOWN_PARSE:
        return [
          start,
          classifier,
          llmWebapp,
          highway,
          httpCall,
          sanitizeGate,
          errorTerminal,
        ];
    }
  }
}
