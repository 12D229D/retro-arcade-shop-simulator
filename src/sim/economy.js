/**
 * Sistema de Economía del Salón Arcade:
 * - Control de caja registradora, fichas e inventario
 * - Ajuste de precio de ficha y elasticidad de la demanda
 * - Costos operativos continuos (electricidad según vatios de máquinas activas)
 * - Mantenimiento diario y balance de final de jornada
 */

export class EconomySystem {
  constructor(storage) {
    this.storage = storage;
    const shop = storage.getShopState();

    this.cash = shop.cash || 500.0;
    this.tokens = shop.tokens || 100;
    this.tokenPrice = shop.token_price || 1.0;
    this.reputation = shop.reputation || 3.5;

    // Métricas del día actual
    this.dayStats = {
      tokensSold: 0,
      grossIncome: 0.0,
      electricityCost: 0.0,
      maintenanceCost: 0.0,
      snackIncome: 0.0,
      customersServed: 0,
      reputationDelta: 0.0
    };

    // Tarifa eléctrica: $0.15 por kWh ficticio
    this.electricRatePerKwh = 0.15;
  }

  save() {
    this.storage.updateShopState({
      cash: Math.round(this.cash * 100) / 100,
      tokens: this.tokens,
      token_price: this.tokenPrice,
      reputation: Math.round(this.reputation * 10) / 10
    });
  }

  setTokenPrice(newPrice) {
    this.tokenPrice = Math.max(0.25, Math.min(5.0, Math.round(newPrice * 4) / 4));
    this.save();
    return this.tokenPrice;
  }

  registerTokenSale(amount, totalPrice) {
    this.cash += totalPrice;
    this.tokens -= amount;
    this.dayStats.tokensSold += amount;
    this.dayStats.grossIncome += totalPrice;
    this.save();
  }

  registerSnackSale(price) {
    this.cash += price;
    this.dayStats.snackIncome += price;
    this.dayStats.grossIncome += price;
    this.save();
  }

  registerCustomerDeparture(satisfaction) {
    this.dayStats.customersServed++;
    // Modificar reputación sutilmente (1.0 a 5.0)
    // Satisfacción media = 70. Por encima sube, por debajo baja
    const repDelta = (satisfaction - 65) * 0.005;
    this.reputation = Math.max(1.0, Math.min(5.0, this.reputation + repDelta));
    this.save();
  }

  calculateElectricityStep(dtSeconds, placedCabinets, catalog) {
    let totalWatts = 50; // Iluminación básica de la sala
    for (const item of placedCabinets) {
      const cat = catalog.find(c => c.id === item.catalog_id);
      if (cat && cat.powerDrawWatts) {
        totalWatts += cat.powerDrawWatts;
      }
    }
    // Convertir vatios * segundos a kWh
    const kwh = (totalWatts * (dtSeconds / 3600)) / 1000;
    const cost = kwh * this.electricRatePerKwh * 10; // Factor acelerado de juego
    this.cash = Math.max(0, this.cash - cost);
    this.dayStats.electricityCost += cost;
  }

  recordRepairCost(cost) {
    this.cash -= cost;
    this.dayStats.maintenanceCost += cost;
    this.save();
  }

  canAfford(amount) {
    return this.cash >= amount;
  }

  spendCash(amount) {
    if (this.canAfford(amount)) {
      this.cash -= amount;
      this.save();
      return true;
    }
    return false;
  }

  addCash(amount) {
    this.cash += amount;
    this.save();
  }

  endDay(currentDay) {
    const netProfit = (this.dayStats.grossIncome + this.dayStats.snackIncome) -
                      (this.dayStats.electricityCost + this.dayStats.maintenanceCost);

    const report = {
      day: currentDay,
      tokens_sold: this.dayStats.tokensSold,
      gross_income: Math.round(this.dayStats.grossIncome * 100) / 100,
      electricity_cost: Math.round(this.dayStats.electricityCost * 100) / 100,
      maintenance_cost: Math.round(this.dayStats.maintenanceCost * 100) / 100,
      snack_income: Math.round(this.dayStats.snackIncome * 100) / 100,
      net_profit: Math.round(netProfit * 100) / 100,
      customers_served: this.dayStats.customersServed,
      reputation_end: Math.round(this.reputation * 10) / 10
    };

    // Guardar en histórico de SQLite
    this.storage.addDailyFinance(report);

    // Reiniciar contadores del día
    this.dayStats = {
      tokensSold: 0,
      grossIncome: 0.0,
      electricityCost: 0.0,
      maintenanceCost: 0.0,
      snackIncome: 0.0,
      customersServed: 0,
      reputationDelta: 0.0
    };

    this.save();
    return report;
  }
}
