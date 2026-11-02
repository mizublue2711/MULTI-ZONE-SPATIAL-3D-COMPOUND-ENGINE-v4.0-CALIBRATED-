import * as THREE from 'three';

export enum PipelineTaskType {
  ROBOTICS_3D = 'ROBOTICS_3D',
  USER_WEBAPP_GEN = 'USER_WEBAPP_GEN',
}

export enum AllowedRegistryKey {
  RoboticsHandNode = 'RoboticsHandNode',
  BipedalRobotMesh = 'BipedalRobotMesh',
  BrutalistCardNode = 'BrutalistCardNode',
  TelemetryBox = 'TelemetryBox',
}

export enum PipelineZoneId {
  ZONE_01_DIFY = 'ZONE_01_DIFY',
  ZONE_02_HIGHWAY = 'ZONE_02_HIGHWAY',
  ZONE_03_N8N = 'ZONE_03_N8N',
  CORE_FIX_BADGE = 'CORE_FIX_BADGE',
}

export enum SimulationScenario {
  ROBOTICS_3D_VALID = 'ROBOTICS_3D_VALID',
  WEBAPP_GEN_VALID = 'WEBAPP_GEN_VALID',
  FAULT_SCHEMA_HALLUCINATION = 'FAULT_SCHEMA_HALLUCINATION',
  FAULT_MARKDOWN_PARSE = 'FAULT_MARKDOWN_PARSE',
}

export interface PipelineNodeSpec {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  zone: PipelineZoneId;
  position: THREE.Vector3;
  accentHex: number;
  statusText: string;
  contractSummary: string;
  jsonSchemaSample: Record<string, unknown>;
}

export interface CoreFixBadgeSpec {
  id: string;
  indexLabel: string;
  title: string;
  rule: string;
  detail: string;
  position: THREE.Vector3;
  accentHex: number;
  jsonProof: Record<string, unknown>;
}

export interface ActivePacketState {
  active: boolean;
  scenario: SimulationScenario;
  progress: number; // 0.0 to 1.0 along the active scenario route
  currentStageId: string;
  statusMessage: string;
  webhookPending: boolean;
  sanitizedOk: boolean | null;
  completedCount: number;
  interceptedErrors: number;
}
