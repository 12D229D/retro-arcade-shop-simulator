/**
 * Algoritmo Pathfinding A* en rejilla 2D (0..cols-1, 0..rows-1)
 * para navegación de clientes y personal en el salón arcade.
 */

class Node {
  constructor(x, y, walkable = true) {
    this.x = x;
    this.y = y;
    this.walkable = walkable;
    this.g = 0;
    this.h = 0;
    this.f = 0;
    this.parent = null;
  }
}

export class GridPathfinder {
  constructor(cols = 10, rows = 10) {
    this.cols = cols;
    this.rows = rows;
    this.grid = [];
    this.initGrid();
  }

  initGrid() {
    this.grid = [];
    for (let x = 0; x < this.cols; x++) {
      this.grid[x] = [];
      for (let y = 0; y < this.rows; y++) {
        this.grid[x][y] = new Node(x, y, true);
      }
    }
  }

  setWalkable(x, y, walkable) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[x][y].walkable = walkable;
    }
  }

  resetGridWalkability() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        this.grid[x][y].walkable = true;
      }
    }
  }

  // Marcar obstáculos a partir de objetos colocados
  updateObstacles(placedCabinets, entrance = { x: 4, y: 9 }) {
    this.resetGridWalkability();
    for (const item of placedCabinets) {
      // Las máquinas o muebles ocupan su celda (no caminables)
      this.setWalkable(item.grid_x, item.grid_y, false);
    }
    // La entrada siempre debe ser caminable
    this.setWalkable(entrance.x, entrance.y, true);
  }

  getNeighbors(node) {
    const neighbors = [];
    const dirs = [
      { x: 0, y: -1 }, // norte
      { x: 0, y: 1 },  // sur
      { x: -1, y: 0 }, // oeste
      { x: 1, y: 0 }   // este
    ];

    for (const d of dirs) {
      const nx = node.x + d.x;
      const ny = node.y + d.y;
      if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
        neighbors.push(this.grid[nx][ny]);
      }
    }
    return neighbors;
  }

  heuristic(nodeA, nodeB) {
    // Distancia Manhattan
    return Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.y - nodeB.y);
  }

  findPath(startX, startY, targetX, targetY) {
    // Si la celda de inicio o destino están fuera de rango
    if (
      startX < 0 || startX >= this.cols || startY < 0 || startY >= this.rows ||
      targetX < 0 || targetX >= this.cols || targetY < 0 || targetY >= this.rows
    ) {
      return [];
    }

    // Si el destino exacto no es caminable, buscar la celda adyacente más cercana
    let actualTarget = this.grid[targetX][targetY];
    if (!actualTarget.walkable) {
      const candidates = this.getNeighbors(actualTarget).filter(n => n.walkable);
      if (candidates.length === 0) return [];
      // Escoger el más cercano al inicio
      candidates.sort((a, b) => this.heuristic(a, this.grid[startX][startY]) - this.heuristic(b, this.grid[startX][startY]));
      actualTarget = candidates[0];
    }

    const startNode = this.grid[startX][startY];

    // Reiniciar valores de búsqueda
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const n = this.grid[x][y];
        n.g = 0;
        n.h = 0;
        n.f = 0;
        n.parent = null;
      }
    }

    const openSet = [startNode];
    const closedSet = new Set();

    while (openSet.length > 0) {
      // Tomar nodo con menor f
      let lowestIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIndex].f) {
          lowestIndex = i;
        }
      }
      const current = openSet.splice(lowestIndex, 1)[0];

      if (current.x === actualTarget.x && current.y === actualTarget.y) {
        // Reconstruir camino
        const path = [];
        let curr = current;
        while (curr) {
          path.push({ x: curr.x, y: curr.y });
          curr = curr.parent;
        }
        return path.reverse();
      }

      closedSet.add(`${current.x},${current.y}`);

      for (const neighbor of this.getNeighbors(current)) {
        if (!neighbor.walkable || closedSet.has(`${neighbor.x},${neighbor.y}`)) {
          continue;
        }

        const tentativeG = current.g + 1;
        const inOpenSet = openSet.includes(neighbor);

        if (!inOpenSet || tentativeG < neighbor.g) {
          neighbor.parent = current;
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, actualTarget);
          neighbor.f = neighbor.g + neighbor.h;

          if (!inOpenSet) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return []; // No hay camino
  }
}
