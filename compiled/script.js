"use strict";
(() => {
  // src/enums.ts
  var Diet = /* @__PURE__ */ ((Diet2) => {
    Diet2["HERBIVORE"] = "herbivore";
    Diet2["CARNIVORE"] = "carnivore";
    Diet2["OMNIVORE"] = "omnivore";
    Diet2["SCAVENGER"] = "scavenger";
    return Diet2;
  })(Diet || {});
  var IndividualCategory = /* @__PURE__ */ ((IndividualCategory2) => {
    IndividualCategory2[IndividualCategory2["Adult"] = 1] = "Adult";
    IndividualCategory2[IndividualCategory2["Eaten"] = 2] = "Eaten";
    IndividualCategory2[IndividualCategory2["Starved"] = 3] = "Starved";
    IndividualCategory2[IndividualCategory2["Young"] = 4] = "Young";
    return IndividualCategory2;
  })(IndividualCategory || {});

  // src/body.ts
  var Body = class {
    id;
    nutrionalValue;
    deathDay;
    constructor(id, nutrionalValue, deathDay) {
      this.id = id;
      this.nutrionalValue = nutrionalValue;
      this.deathDay = deathDay;
    }
  };

  // src/genetics/gene.ts
  var Gene = class _Gene {
    static minValue = 0.1;
    static maxValue = 2;
    static shiftRange = 0.5;
    static geneFlipChance = 0.05;
    value;
    constructor(value = null) {
      this.value = value;
    }
    static random() {
      const randomValue = _Gene.minValue + Math.random() * (_Gene.maxValue - _Gene.minValue);
      return new _Gene(randomValue);
    }
    toString() {
      if (this.value === null) return "x";
      const normalized = (this.value - _Gene.minValue) / (_Gene.maxValue - _Gene.minValue);
      const bucket = Math.floor(normalized * 10);
      const clamped = Math.min(9, bucket);
      return clamped.toString();
    }
    mutate() {
      if (Math.random() < _Gene.geneFlipChance) {
        return this.invert();
      } else {
        return this.shift();
      }
    }
    invert() {
      if (this.value === null) return new _Gene(null);
      const normalized = (this.value - _Gene.minValue) / (_Gene.maxValue - _Gene.minValue);
      const invertedNormalized = 1 - normalized;
      const inverted = _Gene.minValue + invertedNormalized * (_Gene.maxValue - _Gene.minValue);
      return new _Gene(inverted);
    }
    shift() {
      if (this.value === null) return new _Gene(null);
      const shift = Math.random() * _Gene.shiftRange - _Gene.shiftRange / 2;
      let shifted = this.value + shift;
      if (shifted < _Gene.minValue) {
        shifted = _Gene.minValue;
      }
      if (shifted > _Gene.maxValue) {
        shifted = _Gene.maxValue;
      }
      return new _Gene(shifted);
    }
    setToNull() {
      this.value = null;
    }
    static difference(geneA, geneB) {
      const a = geneA.toString();
      const b = geneB.toString();
      if (a == "x" && b == "x") return 0;
      if (a == "x" || b == "x") return 1;
      const numA = parseInt(a);
      const numB = parseInt(b);
      return Math.abs(numA - numB);
    }
  };

  // src/genetics/chromosome.ts
  var Chromosome = class _Chromosome {
    groups;
    genes;
    constructor(groups, genes) {
      this.groups = groups;
      this.genes = genes;
    }
    toString() {
      return this.groups.map((group) => group.map((key) => this.genes[key].toString()).join("")).join("-");
    }
    static random(groups) {
      const genes = {};
      for (const group of groups) {
        for (const key of group) {
          genes[key] = Gene.random();
        }
      }
      return new _Chromosome(groups, genes);
    }
    mutate() {
      const newGenes = Object.entries(this.genes).map(([key, gene]) => {
        return [key, gene.mutate()];
      });
      return new _Chromosome(this.groups, Object.fromEntries(newGenes));
    }
    static similar(chromosomeA, chromosomeB, margin) {
      for (const group of chromosomeA.groups) {
        for (const key of group) {
          const geneA = chromosomeA.genes[key];
          const geneB = chromosomeB.genes[key];
          if (Gene.difference(geneA, geneB) > margin) {
            return false;
          }
        }
      }
      return true;
    }
  };

  // src/genetics/strategy.ts
  function hslToRgb(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  var actionHues = {
    FeedChildAction: 0,
    GainTraitAction: 51,
    GatherAction: 103,
    HideAction: 154,
    HuntAction: 206,
    ReproduceAction: 257,
    ScavengeAction: 309
  };
  var dietHueCenters = {
    ["carnivore" /* CARNIVORE */]: 10,
    //red
    ["herbivore" /* HERBIVORE */]: 120,
    // green
    ["omnivore" /* OMNIVORE */]: 210,
    //blue
    ["scavenger" /* SCAVENGER */]: 300
    //purple
  };
  var Strategy = class _Strategy {
    static groups = [
      ["GatherAction", "HuntAction", "ScavengeAction"],
      ["HideAction", "ReproduceAction", "FeedChildAction"]
    ];
    static headerString = "\u{1F955}\u{1F357}\u{1F9B4}-\u{1F6E1}\uFE0F\u{1F476}\u{1F37C}";
    chromosome;
    diet;
    constructor(diet, genes) {
      this.chromosome = new Chromosome(_Strategy.groups, genes);
      if (diet != "herbivore" /* HERBIVORE */ && diet != "omnivore" /* OMNIVORE */) {
        this.chromosome.genes["GatherAction"].setToNull();
      }
      if (diet != "omnivore" /* OMNIVORE */ && diet != "carnivore" /* CARNIVORE */) {
        this.chromosome.genes["HuntAction"].setToNull();
      }
      if (diet != "scavenger" /* SCAVENGER */) {
        this.chromosome.genes["ScavengeAction"].setToNull();
      }
      this.diet = diet;
    }
    mutate() {
      const mutatedChromosome = this.chromosome.mutate();
      return new _Strategy(this.diet, mutatedChromosome.genes);
    }
    static random(diet) {
      const chromosome = Chromosome.random(_Strategy.groups);
      return new _Strategy(diet, chromosome.genes);
    }
    toString() {
      return this.chromosome.toString();
    }
    static similar(strategyA, strategyB) {
      return Chromosome.similar(strategyA.chromosome, strategyB.chromosome, 1);
    }
    toColorOld() {
      let r = 0, g = 0, b = 0, total = 0;
      for (const [action, weight] of Object.entries(this.chromosome.genes)) {
        const h = actionHues[action] / 360;
        const [rc, gc, bc] = hslToRgb(h, 0.8, 0.5);
        r += rc * weight.value;
        g += gc * weight.value;
        b += bc * weight.value;
        total += weight.value;
      }
      return `rgb(${Math.round(r / total)},${Math.round(g / total)},${Math.round(b / total)})`;
    }
    toColor() {
      const hueRange = 90 * 2;
      let weightedHueSum = 0, totalWeight = 0, weightSum = 0, weightCount = 0;
      let wMin = Gene.maxValue, wMax = Gene.minValue;
      for (const [action, weight] of Object.entries(this.chromosome.genes)) {
        if (weight === null) continue;
        weightedHueSum += actionHues[action] * weight.value;
        totalWeight += weight.value;
        weightSum += weight.value;
        weightCount++;
        if (weight.value < wMin) wMin = weight.value;
        if (weight.value > wMax) wMax = weight.value;
      }
      const avgActionHue = totalWeight > 0 ? weightedHueSum / totalWeight : 180;
      const hueOffset = (avgActionHue / 360 - 0.5) * hueRange;
      const finalHue = ((dietHueCenters[this.diet] + hueOffset) % 360 + 360) % 360;
      const avgWeight = weightCount > 0 ? weightSum / weightCount : 1;
      const lightness = 0.35 + 0.3 * ((avgWeight - Gene.minValue) / (Gene.maxValue - Gene.minValue));
      const weightSpread = weightCount > 1 ? (wMax - wMin) / (Gene.maxValue - Gene.minValue) : 0;
      const saturation = 0.55 + 0.4 * weightSpread;
      const [r, g, b] = hslToRgb(finalHue / 360, saturation, lightness);
      return `rgb(${r},${g},${b})`;
    }
    decide(actions, individual) {
      const weightedActions = actions.map((action) => {
        const weight = this.chromosome.genes[action.constructor.name] || { value: 1 };
        return { action, weight };
      });
      const totalWeight = weightedActions.reduce((sum, aw) => sum + aw.weight.value, 0);
      const randomWeight = Math.random() * totalWeight;
      let remainingWeight = randomWeight;
      for (const aw of weightedActions) {
        if (remainingWeight < aw.weight.value) {
          return aw.action;
        }
        remainingWeight -= aw.weight.value;
      }
      console.error("No action chosen, this should not happen");
      return weightedActions[0].action;
    }
  };

  // src/genetics/traits.ts
  var Traits = class _Traits {
    static groups = [
      [
        "strength",
        "speed",
        "agility"
      ]
    ];
    static headerString = "\u{1F4AA}\u{1F3C3}\u200D\u2642\uFE0F\u{1F938}\u{1F3FC}\u200D\u2642\uFE0F";
    chromosome;
    energyNeed;
    nutritionalValue;
    constructor(genes) {
      this.chromosome = new Chromosome(_Traits.groups, genes);
      this.energyNeed = 1 + this.get("strength") / 2;
      this.nutritionalValue = this.energyNeed * 2;
    }
    toString() {
      return this.chromosome.toString();
    }
    mutate() {
      const mutatedChromosome = this.chromosome.mutate();
      return new _Traits(mutatedChromosome.genes);
    }
    static random() {
      const chromosome = Chromosome.random(_Traits.groups);
      return new _Traits(chromosome.genes);
    }
    get(trait) {
      return this.chromosome.genes[trait].value;
    }
    canEscape(predator) {
      for (const group of _Traits.groups) {
        for (const trait of group) {
          const preyValue = this.get(trait);
          const predatorValue = predator.get(trait);
          if (preyValue > predatorValue) {
            return true;
          }
        }
      }
      return false;
    }
  };

  // src/individual.ts
  var Individual = class _Individual {
    static maxEnergy = 4;
    static adultAge = 2;
    id;
    birthday;
    parent;
    deathDay = null;
    eaten = false;
    starved = false;
    strategy;
    traits;
    lastEvent = "";
    diet;
    energy = 2;
    shelter = false;
    children = [];
    constructor(birthday, parent, traits, diet, strategy) {
      this.id = "";
      this.birthday = birthday;
      this.parent = parent;
      this.strategy = strategy;
      this.traits = traits;
      this.diet = diet;
      this.energy = 3;
    }
    static random(birthday) {
      const randomDiet = Object.values(Diet)[Math.floor(Math.random() * Object.values(Diet).length)];
      const newIndividual = new _Individual(birthday, null, Traits.random(), randomDiet, Strategy.random(randomDiet));
      return newIndividual;
    }
    getAge(today) {
      if (this.deathDay) {
        return this.deathDay - this.birthday;
      }
      return today - this.birthday;
    }
    getCategory(today) {
      if (this.starved) return 3 /* Starved */;
      if (this.eaten) return 2 /* Eaten */;
      if (this.getAge(today) < _Individual.adultAge) return 4 /* Young */;
      return 1 /* Adult */;
    }
    canBeHuntedBy(predator, today) {
      if (this.deathDay) {
        return false;
      }
      if (this.shelter) {
        return false;
      }
      if (this.getAge(today) == 0) {
        return false;
      }
      return this.traits.canEscape(predator.traits);
    }
    eat(nutritionalValue) {
      this.energy = Math.min(_Individual.maxEnergy, this.energy + nutritionalValue);
    }
    createChild(today) {
      const evolvedStrategy = this.strategy.mutate();
      const evolvedTraits = this.traits.mutate();
      const baby = new _Individual(today, this, evolvedTraits, this.diet, evolvedStrategy);
      this.children.push(baby);
      return baby;
    }
    getOffspringCounts() {
      let offspring = [];
      let generation = 1;
      offspring.push(this.children);
      while (offspring[generation - 1].length > 0) {
        offspring.push([]);
        for (let child of offspring[generation - 1]) {
          offspring[generation].push(...child.children);
        }
        generation++;
      }
      offspring.pop();
      const offSpringCounts = offspring.map((generation2) => generation2.filter((individual) => !individual.deathDay).length);
      if (offSpringCounts[offSpringCounts.length - 1] == 0) {
        offSpringCounts.pop();
      }
      return offSpringCounts;
    }
    getOffspringSum() {
      return this.getOffspringCounts().reduce((sum, val) => sum + val, 0);
    }
    // returns the first parent and any living older parents, from old to new
    getParentIds() {
      const parents = [];
      if (this.parent) {
        parents.push(this.parent);
        let alive = true;
        while (alive) {
          const nextParent = parents[parents.length - 1].parent;
          alive = nextParent != null && !nextParent.deathDay;
          if (alive) {
            parents.push(nextParent);
          }
        }
      }
      return parents.map((parent) => parent.id);
    }
    leaveShelter() {
      if (this.shelter) {
        this.shelter = false;
        return true;
      }
      return false;
    }
    hasHunger() {
      return this.energy <= _Individual.maxEnergy - 1;
    }
    die(today) {
      this.deathDay = today;
    }
  };

  // src/action.ts
  function leftShelterSymbol(leftShelter) {
    return leftShelter ? "\u{1F3C3}\u{1F3FB}\u200D\u2642\uFE0F\u200D\u27A1\uFE0F" : "";
  }
  var Action = class {
    static actionGroups = [
      ["GatherAction", "HuntAction", "ScavengeAction"],
      ["HideAction", "ReproduceAction", "FeedChildAction"]
    ];
    individual;
    constructor(individual) {
      this.individual = individual;
    }
  };
  var GatherAction = class extends Action {
    leftShelter = false;
    isPossible(state) {
      const hungry = this.individual.hasHunger();
      const foodAvailable = state.environment.food > 0;
      const canGather = this.individual.diet == "herbivore" /* HERBIVORE */ || this.individual.diet == "omnivore" /* OMNIVORE */;
      return hungry && foodAvailable && canGather;
    }
    execute(state) {
      this.leftShelter = this.individual.leaveShelter();
      if (this.leftShelter) {
        state.environment.shelter++;
      }
      this.individual.eat(1);
      state.environment.food--;
    }
    toString() {
      return `${leftShelterSymbol(this.leftShelter)}\u{1F955}`;
    }
  };
  var HuntAction = class extends Action {
    possibleVictims = [];
    victim = null;
    leftShelter = false;
    isPossible(state) {
      const eatsMeat = this.individual.diet === "carnivore" /* CARNIVORE */ || this.individual.diet === "omnivore" /* OMNIVORE */;
      const hungry = this.individual.hasHunger();
      const baby = this.individual.getAge(state.day) <= 1;
      if (!eatsMeat || !hungry || baby) {
        return false;
      }
      this.possibleVictims = state.getIndividualsArray().filter(
        (v) => !v.shelter && // can't hunt sheltered individuals
        // v.diet !== this.individual.diet && // can't hunt individuals with the same diet
        v.id !== this.individual.id && // don't hunt yourself
        v.id !== this.individual.parent?.id && // don't hunt your parent
        v.parent?.id !== this.individual.id && // don't hunt your children
        !Strategy.similar(v.strategy, this.individual.strategy) && // don't hunt similar strategy (family)
        v.canBeHuntedBy(this.individual, state.day)
      );
      return this.possibleVictims.length > 0;
    }
    execute(state) {
      if (this.individual.leaveShelter()) {
        state.environment.shelter++;
      }
      this.victim = this.possibleVictims[Math.floor(Math.random() * this.possibleVictims.length)];
      if (!this.victim.canBeHuntedBy(this.individual, state.day)) {
        console.error(`Victim ${this.victim.id} is no longer a valid victim for hunter ${this.individual.id}`);
        console.log(this.victim);
        console.log(this.individual);
        return;
      }
      this.individual.eat(this.victim.traits.nutritionalValue);
      this.victim.eaten = true;
      this.victim.deathDay = state.day;
      if (this.victim.shelter) {
        state.environment.shelter++;
      }
      state.environment.bodies.push(new Body(this.victim.id, this.victim.traits.nutritionalValue, state.day));
      console.log("Added body:", this.victim.id, state.environment.bodies);
    }
    toString() {
      let victimId = this.victim ? this.victim.id : "\u274C";
      return `${leftShelterSymbol(this.leftShelter)}\u{1F357} ${victimId}`;
    }
  };
  var ScavengeAction = class extends Action {
    bodyId = "";
    leftShelter = false;
    isPossible(state) {
      const isScavenger = this.individual.diet === "scavenger" /* SCAVENGER */;
      const hungry = this.individual.hasHunger();
      const bodiesAvailable = state.environment.bodies.length > 0;
      return isScavenger && hungry && bodiesAvailable;
    }
    execute(state) {
      const leftShelter = this.individual.leaveShelter();
      if (leftShelter) {
        state.environment.shelter++;
      }
      this.bodyId = state.environment.bodies[Math.floor(Math.random() * state.environment.bodies.length)].id;
      const nutritionalValue = state.individuals[this.bodyId].traits.nutritionalValue;
      this.individual.eat(nutritionalValue);
      state.environment.removeBody(this.bodyId);
    }
    toString() {
      return `${leftShelterSymbol(this.leftShelter)}\u{1F9B4} ${this.bodyId}`;
    }
  };
  var HideAction = class extends Action {
    isPossible(state) {
      const notSheltered = !this.individual.shelter;
      const shelterAvailable = state.environment.shelter > 0;
      return notSheltered && shelterAvailable;
    }
    execute(state) {
      this.individual.shelter = true;
      state.environment.shelter--;
    }
    toString() {
      return `\u{1F6E1}\uFE0F`;
    }
  };
  var ReproduceAction = class extends Action {
    cloneIds = [];
    isPossible(state) {
      const isAdult = this.individual.getAge(state.day) >= Individual.adultAge;
      const hasEnergy = this.individual.energy >= 1;
      return isAdult && hasEnergy;
    }
    execute(state) {
      for (let i = 0; i < Math.floor(this.individual.energy); i++) {
        const baby = this.individual.createChild(state.day);
        state.saveIndividual(baby);
        this.cloneIds.push(baby.id);
      }
    }
    toString() {
      return `\u{1F476} ${this.cloneIds.join(" ")}`;
    }
  };
  var FeedChildAction = class extends Action {
    child = null;
    isPossible(state) {
      const hasEnergy = this.individual.energy > 1;
      const hasChildren = this.individual.children.length > 0;
      this.child = this.individual.children[Math.floor(Math.random() * this.individual.children.length)];
      return hasEnergy && hasChildren;
    }
    execute(state) {
      this.child?.eat(1);
    }
    toString() {
      return `\u{1F37C}\u{1F476} ${this.child?.id}`;
    }
  };
  var allActions = [
    GatherAction,
    HuntAction,
    ScavengeAction,
    HideAction,
    ReproduceAction,
    FeedChildAction
  ];

  // src/iterations.ts
  var debugAction = null;
  var Iterations = class {
    state;
    constructor(state) {
      this.state = state;
    }
    playInterval = void 0;
    play(fast) {
      const wait = fast ? 500 : 1e3;
      this.playInterval = setInterval(() => this.execute(1), wait);
    }
    pause() {
      clearInterval(this.playInterval);
      this.playInterval = void 0;
    }
    execute(iterations) {
      for (let i = 0; i < iterations; i++) {
        this.state.archiveDeadIndividuals();
        this.state.day++;
        this.addIndividuals();
        this.state.updateEnvironment();
        this.actAllIndividuals();
        this.starveIndividuals();
        if (this.state.getIndividualsArray().filter((individual) => !individual.deathDay).length == 0) {
          alert("All individuals have died.");
        }
      }
    }
    addIndividuals() {
      const minimalIndividuals = 5;
      const maxMigratingIndividuals = Math.max(0, minimalIndividuals - this.state.getIndividualsArray().length);
      const migratingIndividuals = Math.random() * maxMigratingIndividuals;
      for (let i = 0; i < migratingIndividuals; i++) {
        this.state.saveIndividual(Individual.random(this.state.day));
      }
    }
    actAllIndividuals() {
      const individualsArray = this.state.getIndividualsArray();
      for (let i = individualsArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [individualsArray[i], individualsArray[j]] = [individualsArray[j], individualsArray[i]];
      }
      for (const individual of individualsArray) {
        this.actIndividual(individual);
      }
    }
    actIndividual(individual) {
      if (individual.deathDay) {
        return;
      }
      if (individual.getAge(this.state.day) == 0) {
        return;
      }
      const possibleActions = [];
      for (const ActionClass of allActions) {
        const action = new ActionClass(individual);
        if (action.isPossible(this.state)) {
          possibleActions.push(action);
        }
      }
      if (possibleActions.length > 0) {
        let action = individual.strategy.decide(possibleActions, individual);
        if (action && debugAction && possibleActions.some((a) => a instanceof debugAction) && !(action instanceof debugAction)) {
          const oldAction = action.toString();
          action = possibleActions.find((a) => a instanceof debugAction);
          const newAction = action.toString();
          console.log(`Debug: ${individual.id} will do ${newAction} instead of ${oldAction}`);
        }
        action?.execute(this.state);
        individual.lastEvent = action?.toString() ?? "x";
      } else {
        individual.lastEvent = "x";
      }
      individual.energy -= individual.traits.energyNeed;
    }
    starveIndividuals() {
      let starvedIndividuals = 0;
      for (let individual of this.state.getIndividualsArray()) {
        if (individual.energy <= 0 && !individual.deathDay && individual.getAge(this.state.day) > 0) {
          individual.starved = true;
          individual.deathDay = this.state.day;
          if (individual.shelter) {
            this.state.environment.shelter++;
          }
          starvedIndividuals++;
        }
      }
    }
  };

  // src/state.ts
  var State = class _State {
    static targetIndividuals = 30;
    day;
    individuals = {};
    individualIdCounter = -1;
    environment = new Environment(this, []);
    constructor() {
      const initialDays = 2;
      this.day = 0;
      const initialIndividuals = _State.targetIndividuals / 2 ** initialDays;
      for (let i = 0; i < initialIndividuals; i++) {
        this.saveIndividual(Individual.random(this.day));
      }
      for (let i = 0; i < initialDays; i++) {
        this.day += 1;
        for (const individual of this.getIndividualsArray()) {
          const child = individual.createChild(this.day);
          this.saveIndividual(child);
        }
      }
      this.individuals = Object.fromEntries(Object.entries(this.individuals).filter(([_, individual]) => individual.birthday > 0));
    }
    getIndividualsArray() {
      return Object.values(this.individuals);
    }
    nextIndividualId() {
      this.individualIdCounter++;
      function translate(num) {
        const consonants = "bcdfghjklmnpqrstvwxyz";
        const vowels = "aeiou";
        const c = consonants.length;
        const v = vowels.length;
        const firstIdx = num % c;
        const vowelIdx = Math.floor(num / c) % v;
        const lastIdx = Math.floor(num / (c * v)) % c;
        const name = consonants[firstIdx].toUpperCase() + vowels[vowelIdx] + consonants[lastIdx];
        return name;
      }
      return translate(this.individualIdCounter);
    }
    saveIndividual(individual) {
      individual.id = this.nextIndividualId();
      this.individuals[individual.id] = individual;
    }
    updateEnvironment() {
      console.log(this.environment.bodies);
      const freshBodies = this.environment.bodies.filter((individual) => individual.deathDay == this.day);
      console.log("->", freshBodies);
      this.environment = new Environment(this, freshBodies);
    }
    livingIndividualCount() {
      return Object.values(this.individuals).filter((individual) => !individual.deathDay).length;
    }
    archiveDeadIndividuals() {
      for (let individualId of Object.keys(this.individuals)) {
        if (this.individuals[individualId].deathDay) {
          delete this.individuals[individualId];
        }
      }
    }
  };
  var Environment = class {
    initialFood;
    food;
    initialShelter;
    shelter;
    bodies = [];
    minFoodFactor = 0.3;
    maxFoodFactor = 0.7;
    minShelterFactor = 0.1;
    maxShelterFactor = 0.2;
    constructor(state, bodies) {
      const foodFactor = this.minFoodFactor + Math.random() * (this.maxFoodFactor - this.minFoodFactor);
      const shelterFactor = this.minShelterFactor + Math.random() * (this.maxShelterFactor - this.minShelterFactor);
      this.initialFood = Math.round(foodFactor * State.targetIndividuals);
      this.initialShelter = Math.round(shelterFactor * State.targetIndividuals);
      const shelteredIndividuals = state.getIndividualsArray().filter((individual) => individual.shelter).length;
      this.initialShelter -= shelteredIndividuals;
      if (this.initialShelter < 0) {
        this.initialShelter = 0;
      }
      this.food = this.initialFood;
      this.shelter = this.initialShelter;
      this.bodies = bodies;
    }
    removeBody(bodyId) {
      this.bodies = this.bodies.filter((body) => body.id !== bodyId);
    }
  };

  // src/ui.ts
  var UI = class {
    state;
    iterations;
    playFast = false;
    constructor() {
      this.state = new State();
      this.iterations = new Iterations(this.state);
      this.updateUI();
      this.addButtonListeners();
    }
    addButtonListeners() {
      document.getElementById("next-1-btn").addEventListener("click", () => this.nextIteration(1));
      document.getElementById("next-10-btn").addEventListener("click", () => this.nextIteration(10));
      document.getElementById("next-100-btn").addEventListener("click", () => this.nextIteration(100));
      document.getElementById("play-pause-btn").addEventListener("click", () => this.togglePlay());
      document.getElementById("speed-btn").addEventListener("click", () => this.toggleSpeed());
    }
    togglePlay() {
      const btn = document.getElementById("play-pause-btn");
      if (this.iterations.playInterval !== null) {
        this.iterations.pause();
        btn.textContent = "\u25B6 Play";
      } else {
        this.iterations.play(this.playFast);
        btn.textContent = "\u23F8 Pause";
      }
    }
    toggleSpeed() {
      const btn = document.getElementById("speed-btn");
      if (this.iterations.playInterval !== null) {
        this.iterations.pause();
      }
      this.playFast = !this.playFast;
      this.iterations.play(this.playFast);
      document.getElementById("play-pause-btn").textContent = "\u23F8 Pause";
      btn.textContent = this.playFast ? "Slower" : "Faster";
    }
    energyLabel(energy) {
      const energyLabels = ["\u{1F534}", "\u{1F7E0}", "\u{1F7E1}", "\u{1F7E2}"];
      if (energy > energyLabels.length - 1) {
        return energyLabels[energyLabels.length - 1];
      }
      if (energy < 0) {
        return energyLabels[0];
      }
      return energyLabels[Math.round(energy)];
    }
    healthLabel(individual) {
      if (individual.deathDay) {
        return individual.starved ? "\u{1F480}\u{1F37D}\uFE0F" : "\u{1F480}\u{1F357}";
      }
      if (individual.getAge(this.state.day) == 0) {
        return "\u{1F476}";
      }
      return "\u{1FAC0}";
    }
    ancestorLabel(individual) {
      if (!individual.parent) {
        return "x";
      }
      if (individual.parent.deathDay) {
        return `${individual.parent.id} \u2020`;
      }
      return individual.getParentIds().join(", ");
    }
    nextIteration(amount) {
      this.iterations.execute(amount);
      this.updateUI();
    }
    updateUI() {
      this.updateTitles();
      this.showEnvironment();
      this.showIndividuals();
    }
    updateTitles() {
      document.getElementById("iteration-title").innerText = `Iteration ${this.state.day}`;
      document.getElementById("individuals-title").innerText = `Individuals (${this.state.getIndividualsArray().length})`;
    }
    sortIndividualsWithinCategory(individuals) {
      return individuals.sort((a, b) => {
        if (a.deathDay && b.deathDay && a.deathDay != b.deathDay) {
          return b.deathDay - a.deathDay;
        }
        return b.getAge(this.state.day) - a.getAge(this.state.day) || b.getOffspringSum() - a.getOffspringSum() || a.id.localeCompare(b.id);
      });
    }
    valuesForIndividual(individual, includeDeath) {
      if (!individual) {
        console.error("Individual is undefined");
        return {};
      }
      const values = {
        "ID": individual.id,
        "Age \u25BC": individual.getAge(this.state.day).toString(),
        [`Traits
${Traits.headerString}`]: individual.traits.toString(),
        [`Strategy
${Strategy.headerString}`]: individual.strategy.toString(),
        "Action": individual.lastEvent,
        "Energy": this.energyLabel(individual.energy),
        "Shelter": individual.shelter ? "\u{1F6E1}\uFE0F" : "\u{1F441}\uFE0F",
        "Ancestors": this.ancestorLabel(individual),
        "Offspring": individual.getOffspringCounts().toString()
      };
      if (includeDeath) {
        values["Death"] = individual.deathDay === null ? "" : (individual.deathDay - this.state.day).toString();
      }
      Object.entries(values).forEach(([key, value]) => {
        if (value === void 0) {
          console.error(`Value for ${key} is undefined for individual ${individual.id}`);
          console.log(individual);
        }
      });
      return values;
    }
    showIndividuals() {
      const individualsDiv = document.getElementById("individuals");
      individualsDiv.innerHTML = "";
      const individualsArray = this.state.getIndividualsArray().filter((individual) => !individual.deathDay || individual.deathDay == this.state.day);
      if (individualsArray.length === 0) return;
      const individualsByCategory = this.divideIndividualsByCategory(individualsArray);
      for (let [category, individuals] of individualsByCategory) {
        const categoryTitle = document.createElement("h4");
        categoryTitle.innerText = `${IndividualCategory[category]} (${individuals.length})`;
        individualsDiv.appendChild(categoryTitle);
        if (individuals.length === 0) {
          continue;
        }
        this.sortIndividualsWithinCategory(individuals);
        const table = this.createTable(individuals);
        individualsDiv.appendChild(table);
      }
    }
    divideIndividualsByCategory(individuals) {
      const individualsByCategory = /* @__PURE__ */ new Map();
      for (let category of Object.values(IndividualCategory).filter((v) => typeof v === "number")) {
        individualsByCategory.set(category, []);
      }
      for (let individual of individuals) {
        const category = individual.getCategory(this.state.day);
        individualsByCategory.get(category).push(individual);
      }
      return individualsByCategory;
    }
    addHeader(table) {
      const headerRow = document.createElement("tr");
      const headers = Object.keys(this.valuesForIndividual(this.state.getIndividualsArray()[0], true));
      headers.forEach((header) => {
        const th = document.createElement("th");
        th.innerText = header;
        headerRow.appendChild(th);
      });
      table.appendChild(headerRow);
    }
    addIndividualRow(table, individual) {
      const row = document.createElement("tr");
      const values = this.valuesForIndividual(individual, true);
      Object.values(values).forEach((value) => {
        const td = document.createElement("td");
        td.innerText = value.toString();
        row.appendChild(td);
      });
      row.style.backgroundColor = individual.strategy.toColor();
      table.appendChild(row);
    }
    createTable(individuals) {
      const table = document.createElement("table");
      this.addHeader(table);
      for (let individual of individuals) {
        this.addIndividualRow(table, individual);
      }
      return table;
    }
    showEnvironment() {
      const environmentDiv = document.getElementById("environment");
      environmentDiv.innerHTML = "";
      const food = document.createElement("p");
      food.innerText = `${this.state.environment.initialFood} -> ${this.state.environment.food} food`;
      environmentDiv.appendChild(food);
      const shelter = document.createElement("p");
      shelter.innerText = `${this.state.environment.initialShelter} -> ${this.state.environment.shelter} shelter`;
      environmentDiv.appendChild(shelter);
      const bodies = document.createElement("p");
      bodies.innerText = `${this.state.environment.bodies.length} bodies unscavenged`;
      environmentDiv.appendChild(bodies);
    }
  };
  window.onload = () => new UI();
})();
