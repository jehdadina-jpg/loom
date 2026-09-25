import * as THREE from 'three';
import {
  farRidgeLayer,
  midRidgeLayer,
} from '../../../engine/sprites/backdrop';
import {
  pineSprite,
  bigTreeSprite,
} from '../../../engine/sprites/nature';
import { houseSprite, marketStallSprite, wellSprite } from '../../../engine/sprites/structures';
import { lanternPostSprite } from '../../../engine/sprites/props';
import { dogSprite } from '../../../engine/sprites/animals';
import { PAL } from '../../../engine/palette';

function applyTextureSettings(tex: THREE.CanvasTexture) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

// 1. Far Mountains
export function createFarMountainsTexture() {
  return applyTextureSettings(new THREE.CanvasTexture(farRidgeLayer('intro-far', 1024, 512)));
}

// 2. Mid Ridges
export function createMidRidgesTexture() {
  return applyTextureSettings(new THREE.CanvasTexture(midRidgeLayer('intro-mid', 1024, 512)));
}

// 3. Dense Forest Background (Perfectly scaled Pines)
export function createForestTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const pine1 = pineSprite(0);
  const pine2 = pineSprite(1);
  const pine3 = pineSprite(2);

  // Ground base
  ctx.fillStyle = '#0a1d13';
  ctx.fillRect(0, 400, 1024, 112);

  const drawPine = (p: HTMLCanvasElement, x: number, y: number) => {
    ctx.drawImage(p, x, y - p.height * 2.5, p.width * 2.5, p.height * 2.5);
  };

  // Carefully clumped forest to avoid a "random wall" look
  for (let x = -50; x < 1050; x += 80) {
    drawPine(pine1, x, 410);
    drawPine(pine2, x + 30, 420);
    drawPine(pine3, x + 60, 415);
  }

  return applyTextureSettings(new THREE.CanvasTexture(canvas));
}

// 4. Perfected Foreground Village Diorama
export function createVillageDioramaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048; // Wide for panning
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const groundY = 460;
  const SCALE = 2.5; // Uniform, consistent pixel scaling for ALL sprites

  // Perfectly flat, clean side-scrolling ground line
  ctx.fillStyle = PAL.grassShadow;
  ctx.fillRect(0, groundY, 2048, 512 - groundY);
  ctx.fillStyle = PAL.grassBase;
  ctx.fillRect(0, groundY + 12, 2048, 512 - groundY - 12);

  // Pre-generate sprites
  const bigPine = pineSprite(3);
  const bigOak = bigTreeSprite(0);
  const house1 = houseSprite({ variant: 0, accent: PAL.doorBase, withStilts: false });
  const house2 = houseSprite({ variant: 1, accent: PAL.waterMid, withStilts: false });
  const stall = marketStallSprite(0, PAL.clothRed);
  const lantern = lanternPostSprite();
  const well = wellSprite();
  const dog = dogSprite(0);

  // Helper to draw sprites perfectly anchored to the ground line
  const drawSprite = (sprite: HTMLCanvasElement, x: number, anchorY: number) => {
    ctx.drawImage(
      sprite, 
      x, 
      anchorY - sprite.height * SCALE, 
      sprite.width * SCALE, 
      sprite.height * SCALE
    );
  };

  // Carefully curated, intentional groupings. No clashing, no floating.
  
  // Group 1: The Outskirts
  drawSprite(bigOak, 100, groundY + 5);
  drawSprite(lantern, 280, groundY);
  drawSprite(dog, 320, groundY + 5);
  drawSprite(well, 380, groundY + 2);

  // Group 2: The First Homestead
  drawSprite(house1, 550, groundY);
  drawSprite(bigPine, 820, groundY + 5);
  drawSprite(lantern, 950, groundY);

  // Group 3: The Market Under the Oak
  drawSprite(bigOak, 1150, groundY + 10);
  drawSprite(stall, 1300, groundY);
  drawSprite(bigPine, 1480, groundY + 5);

  // Group 4: The Second Homestead
  drawSprite(house2, 1650, groundY);
  drawSprite(lantern, 1900, groundY);

  return applyTextureSettings(new THREE.CanvasTexture(canvas));
}

// Glowing sunrise flare
export function createSunFlareTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const cx = 128, cy = 128;
  const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 120);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.3, 'rgba(255, 220, 100, 0.8)');
  grad.addColorStop(0.6, 'rgba(240, 100, 20, 0.2)');
  grad.addColorStop(1, 'rgba(230, 50, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

// Magical glowing particle
export function createParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.3, 'rgba(255, 210, 100, 0.9)');
  grad.addColorStop(0.7, 'rgba(200, 100, 20, 0.4)');
  grad.addColorStop(1, 'rgba(150, 50, 10, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export { getLogoCells } from '../../../engine/sprites/logo';
