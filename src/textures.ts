import * as THREE from 'three';

/**
 * Generates a tileable Dark Obsidian (#09090B) concrete floor texture
 * cut with 1px Swiss Grid alignment lines, sub-divisions, and crosshair ticks.
 */
export function createSwissGridFloorTexture(
  maxAnisotropy = 8,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base Dark Obsidian concrete (#09090B)
  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle industrial concrete micro-grain
  ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
  for (let i = 0; i < 1600; i++) {
    const x = (i * 73) % 1024;
    const y = (i * 139) % 1024;
    ctx.fillRect(x, y, 2, 2);
  }

  // Minor Swiss sub-grid (128px intervals)
  ctx.strokeStyle = 'rgba(42, 42, 58, 0.55)';
  ctx.lineWidth = 1;
  for (let p = 0; p <= 1024; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p + 0.5, 0);
    ctx.lineTo(p + 0.5, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p + 0.5);
    ctx.lineTo(1024, p + 0.5);
    ctx.stroke();
  }

  // Major Swiss primary grid (512px intervals) with subtle cyan/indigo CAD hairlines
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.24)';
  ctx.lineWidth = 2;
  for (let p = 0; p <= 1024; p += 512) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(1024, p);
    ctx.stroke();
  }

  // Precision CAD fiducial crosshairs at intersections
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
  ctx.lineWidth = 2;
  for (let x = 256; x < 1024; x += 256) {
    for (let y = 256; y < 1024; y += 256) {
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(14, 14);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates an Obsidian-black (#09090B) concrete wall texture intersected by
 * crisp 1px-thick Swiss-style grid lines and architectural coordinate hairlines.
 */
export function createObsidianWallGridTexture(
  repeatX = 8,
  repeatY = 4,
  maxAnisotropy = 8,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base Obsidian-black concrete (#09090B)
  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle architectural concrete micro-texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
  for (let i = 0; i < 900; i++) {
    const x = (i * 97) % 512;
    const y = (i * 151) % 512;
    ctx.fillRect(x, y, 2, 2);
  }

  // Secondary 1px Swiss sub-grid lines (128px intervals)
  ctx.strokeStyle = 'rgba(48, 48, 64, 0.65)';
  ctx.lineWidth = 1;
  for (let p = 0; p <= 512; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p + 0.5, 0);
    ctx.lineTo(p + 0.5, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p + 0.5);
    ctx.lineTo(512, p + 0.5);
    ctx.stroke();
  }

  // Primary 1px Swiss architectural grid lines (256px intervals)
  ctx.strokeStyle = 'rgba(92, 96, 122, 0.85)';
  ctx.lineWidth = 1;
  for (let p = 0; p <= 512; p += 256) {
    ctx.beginPath();
    ctx.moveTo(p + 0.5, 0);
    ctx.lineTo(p + 0.5, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p + 0.5);
    ctx.lineTo(512, p + 0.5);
    ctx.stroke();
  }

  // Crisp Swiss precision corner crosshair ticks at 256px intersections
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
  ctx.lineWidth = 1;
  for (const x of [0, 256, 512]) {
    for (const y of [0, 256, 512]) {
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a soft radial contact shadow texture so structures sit grounded
 * on the Dark Obsidian floor without floating.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a high-precision Swiss CAD label plaque texture for 3D pipeline nodes.
 */
export function createNodePlaqueTexture(
  code: string,
  title: string,
  statusLine: string,
  accentHex: number,
  maxAnisotropy = 8,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 220;
  const ctx = canvas.getContext('2d')!;

  const hexCss = '#' + accentHex.toString(16).padStart(6, '0');

  // Anthracite metallic background (#14141B)
  ctx.fillStyle = '#121218';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 1px Swiss border
  ctx.strokeStyle = hexCss;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  // Top specification bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(4, 4, canvas.width - 8, 52);

  // Node Code Label
  ctx.fillStyle = hexCss;
  ctx.font = '600 24px "IBM Plex Mono", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, 24, 30);

  // Latency / CAD coordinate tag on top right
  ctx.fillStyle = '#8E8EA0';
  ctx.font = '400 20px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('AST CONTRACT VERIFIED', canvas.width - 24, 30);

  // Main Node Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F4F4F6';
  ctx.font = '600 30px "Outfit", sans-serif';
  ctx.fillText(title, 24, 106, canvas.width - 48);

  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 146);
  ctx.lineTo(canvas.width - 24, 146);
  ctx.stroke();

  // Status invariant line
  ctx.fillStyle = hexCss;
  ctx.font = '500 21px "IBM Plex Mono", monospace';
  ctx.fillText(statusLine, 24, 182, canvas.width - 48);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a Holographic Core Fix Indicator badge texture.
 */
export function createCoreFixBadgeTexture(
  indexLabel: string,
  title: string,
  rule: string,
  accentHex: number,
  maxAnisotropy = 8,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  const hexCss = '#' + accentHex.toString(16).padStart(6, '0');

  ctx.fillStyle = '#0D0E14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = hexCss;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  // Corner CAD ticks
  ctx.fillStyle = hexCss;
  ctx.fillRect(0, 0, 18, 6);
  ctx.fillRect(0, 0, 6, 18);
  ctx.fillRect(canvas.width - 18, 0, 18, 6);
  ctx.fillRect(canvas.width - 6, 0, 6, 18);

  ctx.font = '600 22px "IBM Plex Mono", monospace';
  ctx.fillStyle = hexCss;
  ctx.fillText(`${indexLabel} · ARCHITECTURAL INVARIANT`, 24, 44);

  ctx.font = '700 34px "Outfit", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(title, 24, 102);

  ctx.font = '500 22px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#B8B8CC';
  ctx.fillText(rule, 24, 152);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}
