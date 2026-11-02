import * as xb from 'xrblocks';
import {COLORS, PIPELINE_NODES} from './constants';
import {CoreFixBadgeSpec, PipelineNodeSpec, SimulationScenario} from './types';

export interface SpatialTelemetryCallbacks {
  onDispatchScenario: (scenario: SimulationScenario) => void;
  onCameraProgressInput: (progress: number) => void;
}

/**
 * Built-in XR Blocks Spatial UI Card (`xb.UICard`) mounted in world space
 * above the central optical highway for headset/hand/controller interaction.
 */
export class SpatialTelemetryDeck {
  public readonly card: xb.UICard;
  private titleText: xb.UIText;
  private subtitleText: xb.UIText;
  private statusText: xb.UIText;
  private schemaText: xb.UIText;
  private pathSlider: xb.UISlider;

  constructor(callbacks: SpatialTelemetryCallbacks) {
    this.titleText = new xb.UIText({
      text: 'ARTIFICIAL CRAFT · PIPELINE TELEMETRY',
      style: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#00E5FF',
      },
    });

    this.subtitleText = new xb.UIText({
      text: 'Select any 3D Node or Core Fix Badge to inspect JSON AST Contract',
      style: {
        fontSize: 14,
        color: '#A1A1B5',
      },
    });

    this.statusText = new xb.UIText({
      text: 'STATUS: PIPELINE ONLINE · RETRY_ON_FAIL: FALSE',
      style: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#10B981',
      },
    });

    this.schemaText = new xb.UIText({
      text: JSON.stringify(PIPELINE_NODES[0].jsonSchemaSample, null, 2),
      style: {
        width: '100%',
        padding: 12,
        backgroundColor: '#07070C',
        borderRadius: 8,
        fontSize: 13,
        lineHeight: 1.32,
        whiteSpace: 'pre-line',
        color: '#C4F5FF',
      },
    });

    this.pathSlider = new xb.UISlider({
      ariaLabel: 'Camera Bezier Path Progress',
      min: 0,
      max: 100,
      step: 1,
      value: 0,
      style: {width: '100%', height: 34},
      onInput: (val: number) => {
        callbacks.onCameraProgressInput(val / 100);
      },
    });

    const actionRowTop = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        gap: 10,
      },
      children: [
        new xb.UIButton({
          label: 'Run ROBOTICS_3D',
          icon: 'precision_manufacturing',
          style: {flexGrow: 1},
          onClick: () =>
            callbacks.onDispatchScenario(SimulationScenario.ROBOTICS_3D_VALID),
        }),
        new xb.UIButton({
          label: 'Run USER_WEBAPP_GEN',
          icon: 'widgets',
          style: {flexGrow: 1},
          onClick: () =>
            callbacks.onDispatchScenario(SimulationScenario.WEBAPP_GEN_VALID),
        }),
      ],
    });

    const actionRowFaults = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        gap: 10,
      },
      children: [
        new xb.UIButton({
          label: 'Inject Bad Registry Key',
          icon: 'gpp_bad',
          style: {flexGrow: 1},
          onClick: () =>
            callbacks.onDispatchScenario(
              SimulationScenario.FAULT_SCHEMA_HALLUCINATION,
            ),
        }),
        new xb.UIButton({
          label: 'Inject Markdown Noise',
          icon: 'code_off',
          style: {flexGrow: 1},
          onClick: () =>
            callbacks.onDispatchScenario(
              SimulationScenario.FAULT_MARKDOWN_PARSE,
            ),
        }),
      ],
    });

    this.card = new xb.UICard({
      size: {width: 0.92, height: 'auto'},
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        gap: 10,
        padding: 18,
        backgroundColor: '#101016',
        borderRadius: 12,
      },
      children: [
        this.titleText,
        this.subtitleText,
        this.statusText,
        this.schemaText,
        this.pathSlider,
        actionRowTop,
        actionRowFaults,
      ],
    });

    // Positioned in elevated rear command space so it never blocks the 3D pipeline nodes
    this.card.position.set(0.0, 2.52, -3.25);
    this.card.name = 'ArtificialCraftSpatialTelemetryCard';
  }

  public inspectNode(spec: PipelineNodeSpec) {
    this.titleText.text = `${spec.code} · ${spec.title}`;
    this.subtitleText.text = spec.subtitle;
    this.statusText.text = spec.statusText;
    this.statusText.style.color =
      spec.accentHex === COLORS.CRIMSON_FAULT ? '#F43F5E' : '#00E5FF';
    this.schemaText.text = JSON.stringify(spec.jsonSchemaSample, null, 2);
  }

  public inspectBadge(badge: CoreFixBadgeSpec) {
    this.titleText.text = `${badge.indexLabel} · ${badge.title}`;
    this.subtitleText.text = badge.rule;
    this.statusText.text = badge.detail;
    this.statusText.style.color = '#10B981';
    this.schemaText.text = JSON.stringify(badge.jsonProof, null, 2);
  }

  public updateSimulationStatus(statusLine: string, isFault: boolean) {
    this.statusText.text = statusLine;
    this.statusText.style.color = isFault ? '#F43F5E' : '#10B981';
  }

  public syncSliderProgress(progress01: number) {
    this.pathSlider.value = Math.round(progress01 * 100);
  }
}
