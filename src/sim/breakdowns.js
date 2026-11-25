/**
 * Sistema de Averías y Mantenimiento de Máquinas Arcade
 * Tipos de averías:
 * - 'buttons': Botones atascados por uso intenso (Reparación: $15)
 * - 'screen': Tubo CRT descalibrado / parpadeo (Reparación: $35)
 * - 'coin_jam': Ficha atascada en el monedero (Reparación: $10)
 * - 'power': Fuente de poder recalentada (Reparación: $45)
 */

export class BreakdownSystem {
  constructor(storage, economy) {
    this.storage = storage;
    this.economy = economy;
    this.breakdownTypes = [
      { type: 'buttons', label: 'Botones y palanca atascados', cost: 15, fixTime: 3 },
      { type: 'screen', label: 'Tubo CRT desincronizado', cost: 35, fixTime: 5 },
      { type: 'coin_jam', label: 'Moneda de 25¢ atascada', cost: 10, fixTime: 2 },
      { type: 'power', label: 'Fusible de alimentación quemado', cost: 45, fixTime: 6 }
    ];
  }

  // Aplicar desgaste por uso de una partida o consumo
  applyUsageWear(cabinet) {
    if (!cabinet) return;
    const wear = 0.8 + Math.random() * 1.5;
    cabinet.condition = Math.max(0, cabinet.condition - wear);
    cabinet.tokens_earned = (cabinet.tokens_earned || 0) + 1;

    // Si la condición baja de 40%, existe probabilidad creciente de avería
    if (cabinet.condition < 40 && !cabinet.is_broken) {
      const breakChance = (40 - cabinet.condition) * 0.02; // hasta 80% de chance
      if (Math.random() < breakChance) {
        this.triggerBreakdown(cabinet);
      }
    }

    this.storage.updateCabinet(cabinet.id, {
      condition: Math.round(cabinet.condition * 10) / 10,
      tokens_earned: cabinet.tokens_earned,
      is_broken: cabinet.is_broken,
      breakdown_type: cabinet.breakdown_type
    });
  }

  // Provocar avería aleatoria
  triggerBreakdown(cabinet, forcedType = null) {
    if (cabinet.is_broken) return;
    const item = forcedType
      ? this.breakdownTypes.find(t => t.type === forcedType)
      : this.breakdownTypes[Math.floor(Math.random() * this.breakdownTypes.length)];

    cabinet.is_broken = 1;
    cabinet.breakdown_type = item.type;

    this.storage.updateCabinet(cabinet.id, {
      is_broken: 1,
      breakdown_type: item.type
    });

    return item;
  }

  getRepairInfo(breakdownType) {
    return this.breakdownTypes.find(t => t.type === breakdownType) || {
      type: 'generic',
      label: 'Mantenimiento preventivo',
      cost: 20,
      fixTime: 3
    };
  }

  // Reparar máquina
  repairCabinet(cabinet) {
    const info = this.getRepairInfo(cabinet.breakdown_type);
    if (!this.economy.canAfford(info.cost)) {
      return { success: false, reason: 'Fondos insuficientes para comprar repuestos' };
    }

    this.economy.recordRepairCost(info.cost);
    cabinet.is_broken = 0;
    cabinet.breakdown_type = null;
    cabinet.condition = 100.0;

    this.storage.updateCabinet(cabinet.id, {
      is_broken: 0,
      breakdown_type: null,
      condition: 100.0
    });

    return { success: true, cost: info.cost, label: info.label };
  }
}
