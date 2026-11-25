/**
 * Layout Editor: Permite arrastrar, colocar, rotar, mover y vender máquinas y objetos decorativos
 * en la cuadrícula isométrica del salón arcade.
 */

export class LayoutEditor {
  constructor(storage, economy, catalog, pathfinder) {
    this.storage = storage;
    this.economy = economy;
    this.catalog = catalog;
    this.pathfinder = pathfinder;

    this.mode = 'SELECT'; // 'SELECT', 'PLACE', 'MOVE'
    this.selectedCatalogItem = null;
    this.selectedPlacedObject = null;
    this.hoverGrid = { x: -1, y: -1 };
    this.ghost = { grid_x: -1, grid_y: -1, isValid: false };
  }

  setPlacementMode(catalogId) {
    const item = this.catalog.find(c => c.id === catalogId);
    if (!item) return;

    if (!this.economy.canAfford(item.price)) {
      return { success: false, reason: 'No tienes suficiente efectivo para comprar este mueble.' };
    }

    this.mode = 'PLACE';
    this.selectedCatalogItem = item;
    this.selectedPlacedObject = null;
    return { success: true, item };
  }

  cancelPlacement() {
    this.mode = 'SELECT';
    this.selectedCatalogItem = null;
    this.ghost = { grid_x: -1, grid_y: -1, isValid: false };
  }

  updateHover(gridX, gridY, placedCabinets) {
    this.hoverGrid = { x: gridX, y: gridY };

    if (this.mode === 'PLACE' && this.selectedCatalogItem) {
      const isValid = this.isCellAvailable(gridX, gridY, placedCabinets);
      this.ghost = {
        grid_x: gridX,
        grid_y: gridY,
        isValid
      };
    } else {
      this.ghost = { grid_x: -1, grid_y: -1, isValid: false };
    }
  }

  isCellAvailable(x, y, placedCabinets, ignoreId = null) {
    // Fuera de límites de la tienda (10x10)
    if (x < 0 || x >= 10 || y < 0 || y >= 10) return false;

    // Reservar entrada (4, 9) y su acceso (4, 8)
    if (x === 4 && y === 9) return false;

    // Verificar si ya hay otro objeto en esa celda
    const collision = placedCabinets.some(c => c.id !== ignoreId && c.grid_x === x && c.grid_y === y);
    return !collision;
  }

  handleClick(gridX, gridY, placedCabinets) {
    if (this.mode === 'PLACE' && this.selectedCatalogItem) {
      if (this.isCellAvailable(gridX, gridY, placedCabinets)) {
        // Ejecutar compra y colocación
        const cost = this.selectedCatalogItem.price;
        if (this.economy.spendCash(cost)) {
          const newCabinet = {
            id: `cab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            catalog_id: this.selectedCatalogItem.id,
            title: this.selectedCatalogItem.title,
            category: this.selectedCatalogItem.category,
            grid_x: gridX,
            grid_y: gridY,
            rotation: 0,
            condition: 100.0,
            is_broken: 0,
            breakdown_type: null,
            tokens_earned: 0,
            themeColor: this.selectedCatalogItem.themeColor,
            accentColor: this.selectedCatalogItem.accentColor
          };

          this.storage.addCabinet(newCabinet);
          this.cancelPlacement();
          return { action: 'PLACED', cabinet: newCabinet };
        }
      }
      return { action: 'BLOCKED' };
    }

    // Modo Selección: click en objeto existente
    const clickedCab = placedCabinets.find(c => c.grid_x === gridX && c.grid_y === gridY);
    if (clickedCab) {
      this.selectedPlacedObject = clickedCab;
      return { action: 'SELECTED', cabinet: clickedCab };
    } else {
      this.selectedPlacedObject = null;
      return { action: 'DESELECTED' };
    }
  }

  sellSelectedObject() {
    if (!this.selectedPlacedObject) return null;
    const catItem = this.catalog.find(c => c.id === this.selectedPlacedObject.catalog_id);
    const originalPrice = catItem ? catItem.price : 150;
    // Reembolso del 60% por depreciación
    const refund = Math.floor(originalPrice * 0.6);

    this.economy.addCash(refund);
    this.storage.removeCabinet(this.selectedPlacedObject.id);
    const removedId = this.selectedPlacedObject.id;
    this.selectedPlacedObject = null;

    return { success: true, refund, removedId };
  }

  moveSelectedObject(newX, newY, placedCabinets) {
    if (!this.selectedPlacedObject) return false;
    if (this.isCellAvailable(newX, newY, placedCabinets, this.selectedPlacedObject.id)) {
      this.selectedPlacedObject.grid_x = newX;
      this.selectedPlacedObject.grid_y = newY;
      this.storage.updateCabinet(this.selectedPlacedObject.id, {
        grid_x: newX,
        grid_y: newY
      });
      return true;
    }
    return false;
  }
}
