/**
 * Agente Cliente con necesidades y comportamiento dinámico
 * Necesidades:
 * - fun (diversión): ganas de jugar a una máquina arcade.
 * - hunger (hambre/sed): ganas de consumir snacks o refrescos.
 * - patience (paciencia): tolerancia a colas y esperas.
 * - cash (dinero disponible para fichas y comida).
 */

export class CustomerAgent {
  constructor(id, spawnPos = { x: 4, y: 9 }) {
    this.id = id;
    this.name = this.generateRetroName();
    this.avatarHue = Math.floor(Math.random() * 360);
    this.shirtColor = `hsl(${this.avatarHue}, 85%, 60%)`;
    this.pantsColor = `hsl(${(this.avatarHue + 160) % 360}, 50%, 35%)`;

    // Posición en coordenadas continuas de cuadrícula
    this.x = spawnPos.x;
    this.y = spawnPos.y;
    this.targetX = spawnPos.x;
    this.targetY = spawnPos.y;
    this.path = [];
    this.speed = 1.6 + Math.random() * 0.6; // Celdas por segundo

    // Estado interno
    this.state = 'ENTERING'; // 'ENTERING', 'DECIDING', 'WALKING', 'BUYING_TOKENS', 'PLAYING', 'SNACKING', 'IDLE', 'LEAVING'
    this.stateTimer = 0;

    // Necesidades (0 a 100)
    this.fun = 20 + Math.random() * 30; // Bajo = quiere jugar
    this.hunger = 30 + Math.random() * 40;
    this.patience = 80 + Math.random() * 20;
    this.cash = 5 + Math.floor(Math.random() * 15); // $5 a $20
    this.tokens = 0;

    // Referencias de interacción
    this.targetObject = null;
    this.bubbleText = '¡Hola 90s!';
    this.bubbleTimer = 2.5;

    // Satisfacción final para reputación
    this.satisfaction = 70;
  }

  generateRetroName() {
    const firsts = ['Marty', 'Alex', 'Sarah', 'Kevin', 'Sam', 'Tommy', 'Dave', 'Lisa', 'Chris', 'Jenny', 'Leo', 'Maya'];
    const lasts = ['Flynn', 'Vance', 'Gibson', 'Miller', 'Cruz', 'Connor', 'Star', 'Blade', 'Rider', 'Fox'];
    return `${firsts[Math.floor(Math.random() * firsts.length)]} ${lasts[Math.floor(Math.random() * lasts.length)]}`;
  }

  say(text, duration = 2.5) {
    this.bubbleText = text;
    this.bubbleTimer = duration;
  }

  update(dt, simContext) {
    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) {
        this.bubbleText = null;
      }
    }

    // Degradación paulatina de paciencia si está atascado o esperando mucho
    if (this.state === 'IDLE' || this.state === 'DECIDING') {
      this.patience -= dt * 1.5;
    }

    if (this.patience <= 10 && this.state !== 'LEAVING') {
      this.say('¡Qué aburrimiento! Me voy.');
      this.satisfaction = Math.max(10, this.satisfaction - 40);
      this.startLeaving(simContext);
      return;
    }

    switch (this.state) {
      case 'ENTERING':
        this.say('¡Buen ambiente!');
        this.state = 'DECIDING';
        this.stateTimer = 1.0;
        break;

      case 'DECIDING':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.decideNextAction(simContext);
        }
        break;

      case 'WALKING':
        this.moveAlongPath(dt, simContext);
        break;

      case 'BUYING_TOKENS':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.finishBuyingTokens(simContext);
        }
        break;

      case 'PLAYING':
        this.stateTimer -= dt;
        this.fun = Math.min(100, this.fun + dt * 12);
        if (this.stateTimer <= 0) {
          this.finishPlaying(simContext);
        }
        break;

      case 'SNACKING':
        this.stateTimer -= dt;
        this.hunger = Math.max(0, this.hunger - dt * 25);
        if (this.stateTimer <= 0) {
          this.finishSnacking(simContext);
        }
        break;

      case 'IDLE':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'DECIDING';
          this.stateTimer = 0.5;
        }
        break;

      case 'LEAVING':
        this.moveAlongPath(dt, simContext);
        break;
    }
  }

  decideNextAction(simContext) {
    // Si no tiene fichas y quiere jugar, busca cambiador o va al mostrador
    if (this.tokens <= 0 && this.cash >= simContext.tokenPrice) {
      const changeMachine = simContext.findNearestAvailable(this.x, this.y, 'vending_change');
      if (changeMachine) {
        this.planRouteTo(changeMachine.grid_x, changeMachine.grid_y, simContext, 'BUYING_TOKENS', changeMachine);
        this.say('A por fichas...');
        return;
      } else {
        // Comprar en caja (cerca de la entrada o punto (3,8))
        this.planRouteTo(3, 8, simContext, 'BUYING_TOKENS', null);
        this.say('Compraré fichas en caja.');
        return;
      }
    }

    // Si tiene hambre alta y dinero para snack
    if (this.hunger > 60 && this.cash >= 2.0) {
      const snackMachine = simContext.findNearestAvailable(this.x, this.y, ['vending_soda', 'vending_popcorn']);
      if (snackMachine) {
        this.planRouteTo(snackMachine.grid_x, snackMachine.grid_y, simContext, 'SNACKING', snackMachine);
        this.say('¡Tengo sed/hambre!');
        return;
      }
    }

    // Si tiene fichas y ganas de jugar
    if (this.tokens > 0) {
      const arcade = simContext.findAvailableArcade(this.x, this.y);
      if (arcade) {
        if (arcade.is_broken) {
          this.say('¡Vaya, está rota!');
          this.satisfaction -= 5;
          this.state = 'DECIDING';
          this.stateTimer = 1.0;
          return;
        }
        this.planRouteTo(arcade.grid_x, arcade.grid_y, simContext, 'PLAYING', arcade);
        this.say(`¡A por ${arcade.title}!`);
        return;
      }
    }

    // Si ya se divirtió suficiente o se quedó sin dinero
    if (this.fun >= 85 || (this.cash < simContext.tokenPrice && this.tokens <= 0)) {
      this.say('¡Ha sido genial!');
      this.satisfaction = Math.min(100, this.satisfaction + 20);
      this.startLeaving(simContext);
      return;
    }

    // Vagabundear un rato
    this.state = 'IDLE';
    this.stateTimer = 2.0;
    this.say('Viendo qué jugar...');
  }

  planRouteTo(targetGridX, targetGridY, simContext, nextState, targetObj) {
    const currentGridX = Math.round(this.x);
    const currentGridY = Math.round(this.y);
    const path = simContext.pathfinder.findPath(currentGridX, currentGridY, targetGridX, targetGridY);

    if (path && path.length > 0) {
      this.path = path;
      this.targetObject = targetObj;
      this.pendingNextState = nextState;
      this.state = 'WALKING';
    } else {
      this.state = 'IDLE';
      this.stateTimer = 1.5;
    }
  }

  moveAlongPath(dt, simContext) {
    if (!this.path || this.path.length === 0) {
      if (this.state === 'LEAVING') {
        simContext.removeCustomer(this.id, this.satisfaction);
        return;
      }
      this.state = this.pendingNextState || 'DECIDING';
      this.stateTimer = this.getDurationForState(this.state);
      this.triggerStateArrival(simContext);
      return;
    }

    const nextNode = this.path[0];
    const dx = nextNode.x - this.x;
    const dy = nextNode.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;

    if (dist <= step) {
      this.x = nextNode.x;
      this.y = nextNode.y;
      this.path.shift();
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  getDurationForState(state) {
    switch (state) {
      case 'BUYING_TOKENS': return 1.5;
      case 'PLAYING': return 5.0 + Math.random() * 4.0;
      case 'SNACKING': return 2.5;
      default: return 1.0;
    }
  }

  triggerStateArrival(simContext) {
    if (this.state === 'PLAYING') {
      if (this.targetObject && this.targetObject.is_broken) {
        this.say('¡Argh, se ha roto la palanca!');
        this.satisfaction -= 15;
        this.state = 'DECIDING';
        this.stateTimer = 1.0;
        return;
      }
      if (this.tokens > 0) {
        this.tokens--;
        simContext.registerTokenUse(this.targetObject);
        this.say('¡COIN INSERTED! 👾');
      }
    } else if (this.state === 'BUYING_TOKENS') {
      const tokensToBuy = Math.min(5, Math.floor(this.cash / simContext.tokenPrice));
      if (tokensToBuy > 0) {
        const cost = tokensToBuy * simContext.tokenPrice;
        this.cash -= cost;
        this.tokens += tokensToBuy;
        simContext.registerTokenSale(tokensToBuy, cost);
        this.say(`¡Compré ${tokensToBuy} fichas! 🪙`);
      }
    } else if (this.state === 'SNACKING') {
      const snackCost = 2.0;
      if (this.cash >= snackCost) {
        this.cash -= snackCost;
        simContext.registerSnackSale(snackCost);
        this.say('¡Mmm, qué rico! 🥤');
      }
    }
  }

  finishPlaying(simContext) {
    // Posibilidad de desgaste en la máquina
    if (this.targetObject) {
      simContext.breakdowns.applyUsageWear(this.targetObject);
    }
    this.targetObject = null;
    this.state = 'DECIDING';
    this.stateTimer = 0.5;
  }

  finishBuyingTokens(simContext) {
    this.state = 'DECIDING';
    this.stateTimer = 0.5;
  }

  finishSnacking(simContext) {
    this.state = 'DECIDING';
    this.stateTimer = 0.5;
  }

  startLeaving(simContext) {
    const entrance = simContext.entrancePos || { x: 4, y: 9 };
    const currentGridX = Math.round(this.x);
    const currentGridY = Math.round(this.y);
    const path = simContext.pathfinder.findPath(currentGridX, currentGridY, entrance.x, entrance.y);
    this.path = path.length > 0 ? path : [{ x: entrance.x, y: entrance.y }];
    this.state = 'LEAVING';
  }
}
