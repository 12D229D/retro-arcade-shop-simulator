/**
 * Renderizador Isométrico 2.5D en HTML5 Canvas 2D
 * Proyección de diamante clásica con baldosas iluminadas por neón,
 * muros estilizados, máquinas arcade iluminadas y clientes animados.
 */

export class IsoRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Dimensiones de la baldosa isométrica
    this.tileWidth = 64;
    this.tileHeight = 32;

    // Origen de coordenadas de pantalla (desplazamiento central)
    this.originX = canvas.width / 2;
    this.originY = 110;

    this.cols = 10;
    this.rows = 10;
  }

  resize() {
    this.originX = this.canvas.width / 2;
    this.originY = Math.max(90, this.canvas.height * 0.16);
  }

  // Conversión de coordenadas de rejilla (gx, gy) a pantalla (sx, sy)
  gridToScreen(gx, gy) {
    const sx = this.originX + (gx - gy) * (this.tileWidth / 2);
    const sy = this.originY + (gx + gy) * (this.tileHeight / 2);
    return { x: sx, y: sy };
  }

  // Conversión de coordenadas de pantalla a cuadrícula (gx, gy)
  screenToGrid(sx, sy) {
    const relX = sx - this.originX;
    const relY = sy - this.originY;

    const gx = (relX / (this.tileWidth / 2) + relY / (this.tileHeight / 2)) / 2;
    const gy = (relY / (this.tileHeight / 2) - relX / (this.tileWidth / 2)) / 2;

    return {
      x: Math.floor(gx),
      y: Math.floor(gy)
    };
  }

  render(shopState, placedCabinets, customers, hoveredCell = null, selectedObject = null, ghostObject = null) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Limpiar pantalla
    ctx.clearRect(0, 0, w, h);

    // Fondo degradado Synthwave 90s
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0c0721');
    bgGrad.addColorStop(0.5, '#170c36');
    bgGrad.addColorStop(1, '#080315');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Dibujar Muros Traseros
    this.drawWalls();

    // Dibujar Suelo (Alfombra de rombos neón de los 90)
    this.drawFloor(hoveredCell);

    // Lista unificada de entidades para ordenamiento z-index (profundidad isométrica: gx + gy)
    const renderList = [];

    // Objetos colocados
    for (const cab of placedCabinets) {
      renderList.push({
        type: 'cabinet',
        depth: cab.grid_x + cab.grid_y + 0.1,
        data: cab
      });
    }

    // Clientes
    for (const cust of customers) {
      renderList.push({
        type: 'customer',
        depth: cust.x + cust.y + 0.2,
        data: cust
      });
    }

    // Ghost object (en modo colocación)
    if (ghostObject && ghostObject.grid_x >= 0 && ghostObject.grid_y >= 0) {
      renderList.push({
        type: 'ghost',
        depth: ghostObject.grid_x + ghostObject.grid_y + 0.15,
        data: ghostObject
      });
    }

    // Ordenar de atrás hacia adelante
    renderList.sort((a, b) => a.depth - b.depth);

    // Renderizar entidades
    for (const item of renderList) {
      if (item.type === 'cabinet') {
        const isSel = selectedObject && selectedObject.id === item.data.id;
        this.drawCabinet(item.data, isSel);
      } else if (item.type === 'customer') {
        this.drawCustomer(item.data);
      } else if (item.type === 'ghost') {
        this.drawGhostCabinet(item.data);
      }
    }
  }

  drawWalls() {
    const ctx = this.ctx;
    const wallHeight = 120;

    // Muro Oeste (x = 0, y de 0 a rows)
    const p0 = this.gridToScreen(0, 0);
    const p1 = this.gridToScreen(0, this.rows);

    ctx.save();
    const wallGradW = ctx.createLinearGradient(p0.x, p0.y - wallHeight, p1.x, p1.y);
    wallGradW.addColorStop(0, '#221147');
    wallGradW.addColorStop(1, '#110626');
    ctx.fillStyle = wallGradW;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p0.x, p0.y - wallHeight);
    ctx.lineTo(p1.x, p1.y - wallHeight);
    ctx.lineTo(p1.x, p1.y);
    ctx.closePath();
    ctx.fill();

    // Línea de remate superior neón
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Muro Norte (y = 0, x de 0 a cols)
    const p2 = this.gridToScreen(this.cols, 0);
    const wallGradN = ctx.createLinearGradient(p0.x, p0.y - wallHeight, p2.x, p2.y);
    wallGradN.addColorStop(0, '#190a38');
    wallGradN.addColorStop(1, '#0e0420');
    ctx.fillStyle = wallGradN;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p0.x, p0.y - wallHeight);
    ctx.lineTo(p2.x, p2.y - wallHeight);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#00f0ff';
    ctx.stroke();

    // Franja decorativa estilo arcade en el muro norte
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y - wallHeight + 25);
    ctx.lineTo(p2.x, p2.y - wallHeight + 25);
    ctx.lineTo(p2.x, p2.y - wallHeight + 28);
    ctx.lineTo(p0.x, p0.y - wallHeight + 28);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawFloor(hoveredCell) {
    const ctx = this.ctx;

    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const pt = this.gridToScreen(x, y);
        const isHovered = hoveredCell && hoveredCell.x === x && hoveredCell.y === y;
        const isEntrance = (x === 4 && y === 9);

        // Patrón alfombra retro: triángulos/cuadrícula neón
        const isEven = (x + y) % 2 === 0;

        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x + this.tileWidth / 2, pt.y + this.tileHeight / 2);
        ctx.lineTo(pt.x, pt.y + this.tileHeight);
        ctx.lineTo(pt.x - this.tileWidth / 2, pt.y + this.tileHeight / 2);
        ctx.closePath();

        if (isEntrance) {
          ctx.fillStyle = 'rgba(255, 230, 0, 0.35)'; // Alfombra de bienvenida
        } else if (isHovered) {
          ctx.fillStyle = 'rgba(0, 255, 200, 0.45)';
        } else {
          ctx.fillStyle = isEven ? '#150e2a' : '#1c1236';
        }
        ctx.fill();

        // Borde de baldosa
        ctx.strokeStyle = isHovered ? '#00ffff' : 'rgba(255, 0, 150, 0.15)';
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        // Motivo geométrico de alfombra de salón 90s
        if (!isEntrance && isEven) {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 0, 200, 0.2)';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y + this.tileHeight / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Puerta de entrada en (4, 9)
    const entPt = this.gridToScreen(4, 9);
    ctx.save();
    ctx.fillStyle = '#00ffcc';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼ ENTRADA ▼', entPt.x, entPt.y + this.tileHeight + 14);
    ctx.restore();
  }

  drawCabinet(cab, isSelected = false) {
    const ctx = this.ctx;
    const pt = this.gridToScreen(cab.grid_x, cab.grid_y);
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;
    const cabHeight = cab.category === 'decor' ? 40 : (cab.category === 'snack' ? 62 : 68);

    const baseColor = cab.is_broken ? '#33333e' : (cab.themeColor || '#00e5ff');
    const accentColor = cab.is_broken ? '#ff2200' : (cab.accentColor || '#ff007f');

    ctx.save();

    // Sombra proyectada en el suelo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y + hh, hw * 0.8, hh * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Resaltado de selección
    if (isSelected) {
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + hw, pt.y + hh);
      ctx.lineTo(pt.x, pt.y + this.tileHeight);
      ctx.lineTo(pt.x - hw, pt.y + hh);
      ctx.closePath();
      ctx.stroke();
    }

    // Cara lateral izquierda (sombreada)
    ctx.fillStyle = this.adjustColor(baseColor, -35);
    ctx.beginPath();
    ctx.moveTo(pt.x - hw + 6, pt.y + hh - 2);
    ctx.lineTo(pt.x, pt.y + this.tileHeight - 4);
    ctx.lineTo(pt.x, pt.y + this.tileHeight - cabHeight);
    ctx.lineTo(pt.x - hw + 6, pt.y + hh - cabHeight);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.stroke();

    // Cara frontal derecha
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y + this.tileHeight - 4);
    ctx.lineTo(pt.x + hw - 6, pt.y + hh - 2);
    ctx.lineTo(pt.x + hw - 6, pt.y + hh - cabHeight);
    ctx.lineTo(pt.x, pt.y + this.tileHeight - cabHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Techo
    ctx.fillStyle = this.adjustColor(baseColor, 20);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y + this.tileHeight - cabHeight);
    ctx.lineTo(pt.x + hw - 6, pt.y + hh - cabHeight);
    ctx.lineTo(pt.x, pt.y - 4 - (cabHeight - this.tileHeight));
    ctx.lineTo(pt.x - hw + 6, pt.y + hh - cabHeight);
    ctx.closePath();
    ctx.fill();

    // Pantalla CRT o Frontal según categoría
    if (cab.category === 'arcade') {
      // Pantalla CRT curva iluminada
      ctx.fillStyle = cab.is_broken ? '#111116' : '#031b26';
      ctx.fillRect(pt.x + 3, pt.y + hh - cabHeight + 14, 18, 16);

      if (!cab.is_broken) {
        // Resplandor de pantalla
        ctx.fillStyle = accentColor;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 8;
        ctx.fillRect(pt.x + 6, pt.y + hh - cabHeight + 18, 12, 8);
        ctx.shadowBlur = 0;
      }

      // Marquesina luminosa en la parte superior
      ctx.fillStyle = cab.is_broken ? '#444' : accentColor;
      ctx.fillRect(pt.x - 2, pt.y + hh - cabHeight + 4, 24, 6);
    } else if (cab.category === 'snack') {
      // Vitrina de bebidas/comida
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(pt.x + 2, pt.y + hh - cabHeight + 12, 19, 22);
    } else if (cab.category === 'utility') {
      // Monedero y ranura
      ctx.fillStyle = '#ffea00';
      ctx.fillRect(pt.x + 4, pt.y + hh - cabHeight + 16, 16, 12);
    } else if (cab.category === 'decor') {
      // Palma o Neón
      ctx.fillStyle = '#39ff14';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y + hh - cabHeight + 10, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Indicador visual de AVERÍA
    if (cab.is_broken) {
      ctx.fillStyle = '#ff0033';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ ¡ROTA!', pt.x, pt.y - (cabHeight - 15));
    }

    ctx.restore();
  }

  drawGhostCabinet(ghost) {
    const ctx = this.ctx;
    const pt = this.gridToScreen(ghost.grid_x, ghost.grid_y);
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;

    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = ghost.isValid ? 'rgba(0, 255, 128, 0.4)' : 'rgba(255, 0, 64, 0.4)';
    ctx.strokeStyle = ghost.isValid ? '#00ff88' : '#ff0044';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + hw, pt.y + hh);
    ctx.lineTo(pt.x, pt.y + this.tileHeight);
    ctx.lineTo(pt.x - hw, pt.y + hh);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawCustomer(cust) {
    const ctx = this.ctx;
    const pt = this.gridToScreen(cust.x, cust.y);

    ctx.save();

    // Sombra en pies
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y + this.tileHeight / 2, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const bobbing = Math.sin(Date.now() * 0.008 + cust.id) * 1.5;
    const baseY = pt.y + this.tileHeight / 2 - 2 + (cust.state === 'WALKING' ? bobbing : 0);

    // Pantalones
    ctx.fillStyle = cust.pantsColor;
    ctx.fillRect(pt.x - 3, baseY - 8, 3, 8);
    ctx.fillRect(pt.x + 1, baseY - 8, 3, 8);

    // Camiseta neón 90s
    ctx.fillStyle = cust.shirtColor;
    ctx.fillRect(pt.x - 5, baseY - 18, 10, 10);

    // Cabeza
    ctx.fillStyle = '#ffdfba';
    ctx.beginPath();
    ctx.arc(pt.x, baseY - 23, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Pelo noventero
    ctx.fillStyle = '#3a2312';
    ctx.fillRect(pt.x - 4, baseY - 28, 8, 4);

    // Bocadillo de diálogo si tiene mensaje
    if (cust.bubbleText) {
      ctx.font = '9px "Inter", sans-serif';
      ctx.textAlign = 'center';
      const textMetrics = ctx.measureText(cust.bubbleText);
      const bw = textMetrics.width + 12;
      const bh = 18;
      const bx = pt.x;
      const by = baseY - 36;

      ctx.fillStyle = 'rgba(15, 8, 30, 0.9)';
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(bx - bw / 2, by - bh, bw, bh, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(cust.bubbleText, bx, by - bh / 2 + 3);
    }

    ctx.restore();
  }

  adjustColor(col, amt) {
    if (col.startsWith('#')) {
      let num = parseInt(col.slice(1), 16);
      if (col.length === 4) {
        num = parseInt(col[1] + col[1] + col[2] + col[2] + col[3] + col[3], 16);
      }
      let r = (num >> 16) + amt;
      let g = ((num >> 8) & 0x00ff) + amt;
      let b = (num & 0x0000ff) + amt;
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));
      return `rgb(${r},${g},${b})`;
    }
    return col;
  }
}
