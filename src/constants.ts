import * as THREE from 'three';
import {
  AllowedRegistryKey,
  CoreFixBadgeSpec,
  PipelineNodeSpec,
  PipelineTaskType,
  PipelineZoneId,
} from './types';

export const COLORS = {
  MIDNIGHT_BG: 0x050508,
  OBSIDIAN_FLOOR: 0x09090b,
  ANTHRACITE_PANEL: 0x18181e,
  DARK_ALLOY: 0x111116,
  SWISS_GRID_LINE: 0x22222d,
  ELECTRIC_CYAN: 0x00e5ff,
  ELECTRIC_INDIGO: 0x5322ff,
  AMBER_PENDING: 0xffb000,
  EMERALD_VALID: 0x10b981,
  CRIMSON_FAULT: 0xf43f5e,
  PURE_WHITE: 0xf4f4f6,
};

export const ALLOWED_REGISTRY_KEYS: string[] = [
  AllowedRegistryKey.RoboticsHandNode,
  AllowedRegistryKey.BipedalRobotMesh,
  AllowedRegistryKey.BrutalistCardNode,
  AllowedRegistryKey.TelemetryBox,
];

export const PIPELINE_NODES: PipelineNodeSpec[] = [
  // ZONE 01: THE DIFY UNIVERSAL REASONING CORE (Elevated Monolith on Left/West Wing)
  {
    id: 'dify_start',
    code: 'DIFY-01',
    title: '01. Start Node (Data Ingestion Vault)',
    subtitle: 'Zone 01 · Dify Universal Reasoning Core',
    zone: PipelineZoneId.ZONE_01_DIFY,
    position: new THREE.Vector3(-3.3, 1.32, -2.55),
    accentHex: COLORS.ELECTRIC_CYAN,
    statusText: 'GEMINI_API_KEY: INJECTED · APP_URL: BOUND',
    contractSummary:
      'Floating 1px glass ingestion dock accepting task_type enum and escaped string payload.',
    jsonSchemaSample: {
      node: 'START_INGESTION_VAULT',
      env: {
        GEMINI_API_KEY: 'INJECTED',
        APP_URL: 'https://artificialcraft.space/ bound',
      },
      inputs: {
        task_type: `${PipelineTaskType.ROBOTICS_3D} | ${PipelineTaskType.USER_WEBAPP_GEN}`,
        payload: '{{#start.payload#}}',
      },
    },
  },
  {
    id: 'dify_classifier',
    code: 'DIFY-02',
    title: '02. Question Classifier (Laser Beam Splitter)',
    subtitle: 'Zone 01 · Optical Task-Type Prism Router',
    zone: PipelineZoneId.ZONE_01_DIFY,
    position: new THREE.Vector3(-2.3, 1.32, -2.55),
    accentHex: COLORS.ELECTRIC_INDIGO,
    statusText: 'PRISM LOCK · DUAL TRACK SPLIT ACTIVE',
    contractSummary:
      'Optical 3D prism analyzing task_type and splitting laser streams into Track A (ROBOTICS_3D) or Track B (USER_WEBAPP_GEN).',
    jsonSchemaSample: {
      node: 'QUESTION_CLASSIFIER_PRISM',
      routing_rule: 'exact_match(start.task_type)',
      branches: {
        track_a: PipelineTaskType.ROBOTICS_3D,
        track_b: PipelineTaskType.USER_WEBAPP_GEN,
      },
    },
  },
  {
    id: 'dify_llm_robotics',
    code: 'DIFY-03A',
    title: '03A. LLM Node: ROBOTICS_3D (3D Foundry)',
    subtitle: 'Zone 01 · Google Vertex AI · Temp 0.2 · json_object',
    zone: PipelineZoneId.ZONE_01_DIFY,
    position: new THREE.Vector3(-1.25, 1.72, -2.35),
    accentHex: COLORS.ELECTRIC_CYAN,
    statusText: 'INPUT: {{#start.payload#}} · VERTEX SDK STABLE',
    contractSummary:
      'Single Component 3D Foundry powered by Vertex AI (temp 0.2). Emits 3D component JSON AST and deterministic githubPath.',
    jsonSchemaSample: {
      engine: 'google_vertex_ai',
      temperature: 0.2,
      response_format: {type: 'json_object'},
      prompt_binding: '{{#start.payload#}}',
      output_contract: {
        componentId: 'hand_actuator_v4',
        githubPath: 'src/assets/models/robotics/hand_actuator_v4.json',
        ast: {
          joints: 12,
          material: 'titanium_anisotropic',
          pivot: 'bottom_center',
        },
      },
    },
  },
  {
    id: 'dify_llm_webapp',
    code: 'DIFY-03B',
    title: '03B. LLM Node: USER_WEBAPP_GEN (UI Layout Assembler)',
    subtitle: 'Zone 01 · Restricted Registry Enum Engine',
    zone: PipelineZoneId.ZONE_01_DIFY,
    position: new THREE.Vector3(-1.25, 0.92, -2.75),
    accentHex: COLORS.ELECTRIC_INDIGO,
    statusText: 'LOCKED TO src/core/registry.ts · ZERO HALLUCINATION',
    contractSummary:
      'Restricted Native JSON Engine locked strictly to approved Registry Enum Keys. Zero key hallucination permitted.',
    jsonSchemaSample: {
      registry_source: 'src/core/registry.ts',
      allowed_enum_keys: ALLOWED_REGISTRY_KEYS,
      output_contract: {
        layout_version: '2.4.0',
        nodes: [
          {componentKey: 'RoboticsHandNode', slot: 'viewport_primary'},
          {componentKey: 'BipedalRobotMesh', slot: 'viewport_secondary'},
          {componentKey: 'BrutalistCardNode', slot: 'inspector_card'},
          {componentKey: 'TelemetryBox', slot: 'dock_bottom'},
        ],
      },
    },
  },

  // ZONE 02: THE HIGH-SPEED OPTICAL TRANSMISSION HIGHWAY (Center Bridge)
  {
    id: 'optical_highway',
    code: 'OPT-HWY',
    title: '04. High-Speed Optical Transmission Highway',
    subtitle: 'Zone 02 · Quartz Glass Escape-Safe Transport Bridge',
    zone: PipelineZoneId.ZONE_02_HIGHWAY,
    position: new THREE.Vector3(-0.05, 1.32, -2.55),
    accentHex: COLORS.ELECTRIC_CYAN,
    statusText: 'JSON.stringify(json.body.payload) · ZERO CORRUPTION',
    contractSummary:
      'Quartz glass optical conduits carrying escaped JSON.stringify(json.body.payload) pulses between Dify and n8n.',
    jsonSchemaSample: {
      conduit: 'QUARTZ_OPTICAL_BUS_64',
      serializer: 'JSON.stringify(json.body.payload)',
      escaping: {
        newlines_escaped: true,
        quotes_escaped: true,
        integrity_crc: '0x9F4A2C01',
      },
    },
  },

  // ZONE 03: THE N8N ORCHESTRATION & SANITIZE GATEWAY (Heavy Industrial East Wing)
  {
    id: 'n8n_webhook_trigger',
    code: 'N8N-01',
    title: '05. Node 1: Webhook Trigger (HTTP Pending Hold)',
    subtitle: 'Zone 03 · responseMode = responseNode',
    zone: PipelineZoneId.ZONE_03_N8N,
    position: new THREE.Vector3(0.95, 1.85, -2.35),
    accentHex: COLORS.AMBER_PENDING,
    statusText: 'HTTP PENDING BARRIER · AWAITING FINAL CLEARANCE',
    contractSummary:
      'Held in HTTP pending state by an amber energy field until Node 5A/5B emits final verified response.',
    jsonSchemaSample: {
      node: 'n8n-nodes-base.webhook',
      parameters: {
        httpMethod: 'POST',
        path: 'artificial-craft/pipeline',
        responseMode: 'responseNode',
      },
      state: 'HELD_PENDING_RESPONSE_NODE',
    },
  },
  {
    id: 'n8n_http_dify',
    code: 'N8N-02',
    title: '06. Node 2: HTTP Call Dify Workflow',
    subtitle: 'Zone 03 · Encapsulated Stringifier Stream',
    zone: PipelineZoneId.ZONE_03_N8N,
    position: new THREE.Vector3(0.95, 0.95, -2.75),
    accentHex: COLORS.ELECTRIC_INDIGO,
    statusText: 'retryOnFail: false · SAFE PAYLOAD INJECTION',
    contractSummary:
      'Encapsulated stringifier node streaming serialized payloads into Dify without recursive retry loops.',
    jsonSchemaSample: {
      node: 'n8n-nodes-base.httpRequest',
      settings: {
        retryOnFail: false,
        timeout: 30000,
      },
      body: {
        inputs: {
          task_type: '={{ $json.body.task_type }}',
          payload: '={{ JSON.stringify($json.body.payload) }}',
        },
      },
    },
  },
  {
    id: 'n8n_sanitize_gate',
    code: 'N8N-03',
    title: '07. Node 3: Sanitize & Validation Gate',
    subtitle: 'Zone 03 · 3D Laser Inspection & AST Contract Verifier',
    zone: PipelineZoneId.ZONE_03_N8N,
    position: new THREE.Vector3(1.95, 1.32, -2.55),
    accentHex: COLORS.EMERALD_VALID,
    statusText: 'STRIPS ```json · JSON.parse() · REGISTRY KEY AUDIT',
    contractSummary:
      'Strips markdown fences, verifies JSON.parse(), and audits componentKey against allowed Registry keys without crashing.',
    jsonSchemaSample: {
      node: 'n8n-nodes-base.code',
      retryOnFail: false,
      operations: [
        'raw.replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/i, "")',
        'JSON.parse(cleaned)',
        'validateEnum(node.componentKey, ALLOWED_REGISTRY_KEYS)',
      ],
      error_contracts: ['PARSE_ERROR', 'SCHEMA_VALIDATION_ERROR'],
    },
  },
  {
    id: 'n8n_switch_router',
    code: 'N8N-04',
    title: '08. Node 4: Switch Router (Hydraulic Diverter)',
    subtitle: 'Zone 03 · Evaluates $json.success === true',
    zone: PipelineZoneId.ZONE_03_N8N,
    position: new THREE.Vector3(2.85, 1.32, -2.55),
    accentHex: COLORS.ELECTRIC_CYAN,
    statusText: 'BRANCH A: WEBAPP · BRANCH B: ROBOTICS · FALLBACK: ERROR',
    contractSummary:
      'Hydraulic 3-way manifold routing verified AST payloads to Webhook Response, GitHub API Sync, or Error Recovery.',
    jsonSchemaSample: {
      node: 'n8n-nodes-base.switch',
      condition: '$json.success === true',
      routes: {
        branch_a: 'task_type === USER_WEBAPP_GEN -> Node 5A (layout_json)',
        branch_b: 'task_type === ROBOTICS_3D -> Node 5B (githubPath)',
        fallback: 'success === false -> Error Contract Terminal',
      },
    },
  },
  {
    id: 'n8n_output_terminals',
    code: 'N8N-05',
    title: '09. Nodes 5A & 5B: Response & GitHub Sync Stations',
    subtitle: 'Zone 03 Exterior Night Sky · layout_json & GitHub Repo Uplink',
    zone: PipelineZoneId.ZONE_03_N8N,
    position: new THREE.Vector3(3.75, 1.32, -2.45),
    accentHex: COLORS.EMERALD_VALID,
    statusText: '5A: layout_json EMITTED · 5B: GITHUB AST COMMITTED',
    contractSummary:
      'Exterior open-sky stations: 5A resolves the Webhook with layout_json; 5B commits the 3D AST directly to GitHub via githubPath under the starry night sky.',
    jsonSchemaSample: {
      station_5a_webhook_response: {
        status: 200,
        body: {
          success: true,
          layout_json: {
            components: [
              'RoboticsHandNode',
              'BipedalRobotMesh',
              'BrutalistCardNode',
              'TelemetryBox',
            ],
          },
        },
      },
      station_5b_github_sync: {
        method: 'PUT',
        githubPath: 'src/assets/models/robotics/hand_actuator_v4.json',
        endpoint:
          'https://api.github.com/repos/artificialcraft/core/contents/src/assets/models/robotics/hand_actuator_v4.json',
        branch: 'main',
      },
    },
  },
];

export const CORE_FIX_BADGES: CoreFixBadgeSpec[] = [
  {
    id: 'fix_zero_hallucination',
    indexLabel: 'FIX 01',
    title: 'ZERO HALLUCINATION',
    rule: 'Enforced Registry Enum Keys',
    detail:
      'UI Layout Assembler is hard-locked to src/core/registry.ts Enum Keys: ["RoboticsHandNode", "BipedalRobotMesh", "BrutalistCardNode", "TelemetryBox"].',
    position: new THREE.Vector3(-2.65, 2.38, -2.55),
    accentHex: COLORS.ELECTRIC_CYAN,
    jsonProof: {
      invariant: 'ZERO_HALLUCINATION',
      registryFile: 'src/core/registry.ts',
      allowedKeys: ALLOWED_REGISTRY_KEYS,
      unapprovedKeyAction: 'TRIGGER_SCHEMA_VALIDATION_ERROR',
    },
  },
  {
    id: 'fix_no_infinite_retry',
    indexLabel: 'FIX 02',
    title: 'NO INFINITE RETRY',
    rule: 'retryOnFail: false Locked',
    detail:
      'Both HTTP Dify Call and Sanitize Code Gate enforce retryOnFail: false and return deterministic error contracts instead of looping.',
    position: new THREE.Vector3(-0.85, 2.38, -2.55),
    accentHex: COLORS.AMBER_PENDING,
    jsonProof: {
      invariant: 'NO_INFINITE_RETRY',
      retryOnFail: false,
      fallbackContract: {
        success: false,
        errorCode: 'PARSE_ERROR | SCHEMA_VALIDATION_ERROR',
      },
    },
  },
  {
    id: 'fix_decoupled_pipeline',
    indexLabel: 'FIX 03',
    title: 'DECOUPLED PIPELINE',
    rule: '3D Mesh & UI Layout Isolated',
    detail:
      'Question Classifier isolates single-component 3D AST generation (ROBOTICS_3D) from UI layout assembly (USER_WEBAPP_GEN).',
    position: new THREE.Vector3(0.95, 2.38, -2.55),
    accentHex: COLORS.ELECTRIC_INDIGO,
    jsonProof: {
      invariant: 'DECOUPLED_PIPELINE',
      trackA: 'ROBOTICS_3D -> Vertex AI -> GitHub Sync (githubPath)',
      trackB: 'USER_WEBAPP_GEN -> Registry Layout -> Webhook Response (layout_json)',
    },
  },
  {
    id: 'fix_vertex_sdk_stable',
    indexLabel: 'FIX 04',
    title: 'VERTEX SDK STABLE',
    rule: '{{#start.payload#}} Always Present',
    detail:
      'Explicitly binds {{#start.payload#}} into the Google Vertex AI LLM node to eliminate "contents are required" SDK failures.',
    position: new THREE.Vector3(2.75, 2.38, -2.55),
    accentHex: COLORS.EMERALD_VALID,
    jsonProof: {
      invariant: 'VERTEX_SDK_STABLE',
      provider: 'google_vertex_ai',
      userPromptTemplate: '{{#start.payload#}}',
      sdkErrorPrevented: 'VertexAIError: contents are required',
    },
  },
];

// Camera Bezier curve points for scroll-driven inspection across all zones
export const CAMERA_BEZIER_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(0.0, 1.65, 0.45), // 1. Overview (0%): Panoramic Command Overview
  new THREE.Vector3(-2.65, 1.45, -1.12), // 2. Zone 01 (25%): Dify Reasoning Core (widened west & closer)
  new THREE.Vector3(-0.05, 1.42, -1.18), // 3. Zone 02 (50%): Optical Highway (closer inspection)
  new THREE.Vector3(1.95, 1.42, -1.18), // 4. Zone 03 (75%): n8n Sanitize & Switch Router
  new THREE.Vector3(3.82, 1.38, -1.32), // 5. Output Sync (100%): Zoomed directly in on Node 5A & 5B in Exterior Night Sky
];

export const CAMERA_LOOKAT_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(0.15, 1.38, -2.55), // 1. Overview center
  new THREE.Vector3(-2.35, 1.36, -2.55), // 2. Zone 01 Dify center
  new THREE.Vector3(-0.05, 1.34, -2.55), // 3. Zone 02 Highway center
  new THREE.Vector3(1.95, 1.34, -2.55), // 4. Zone 03 Sanitize Gate center
  new THREE.Vector3(3.75, 1.36, -2.45), // 5. Direct close-up lock on Node 5A & 5B
];

