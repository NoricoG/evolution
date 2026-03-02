"use strict";
(() => {
  // src/genetics/gene.ts
  var Gene = class _Gene {
    static shiftRange = 0.3;
    static geneFlipChance = 0.05;
    // disabled for testing
    // between 0 and 1 (inclusive)
    value;
    constructor(value) {
      this.value = value;
    }
    static random() {
      const randomValue = Math.random();
      return new _Gene(randomValue);
    }
    toString() {
      const bucket = this.getBucket();
      if (bucket == 0) return "x";
      return bucket.toString();
    }
    getBucket() {
      if (this.value == 0) return 0;
      return Math.ceil(this.value * 9);
    }
    mutated() {
      if (Math.random() < _Gene.geneFlipChance) {
        return this.inverted();
      } else {
        return this.shifted();
      }
    }
    inverted() {
      return new _Gene(1 - this.value);
    }
    shifted() {
      const shift = Math.random() * _Gene.shiftRange - _Gene.shiftRange / 2;
      let shifted = this.value + shift;
      if (shifted < 0) {
        shifted = 0;
      }
      if (shifted > 1) {
        shifted = 1;
      }
      return new _Gene(shifted);
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
    static geneKeys = [];
    static geneLabels = "";
    genes;
    makeRelative = true;
    constructor(genes) {
      if (this.makeRelative) {
        genes = _Chromosome.makeRelative(genes);
      }
      this.genes = genes;
    }
    toString() {
      return Object.keys(this.genes).map((key) => this.genes[key].toString()).join("");
    }
    get(gene) {
      return this.genes[gene].value;
    }
    mutatedCopy() {
      const newGenes = {};
      for (const key of Object.keys(this.genes)) {
        newGenes[key] = this.genes[key].mutated();
      }
      return new this.constructor(newGenes);
    }
    static makeRelative(genes) {
      const total = Object.values(genes).reduce((sum, gene) => sum + gene.value, 0);
      if (total === 0) {
        return genes;
      }
      const relativeGenes = {};
      for (const key of Object.keys(genes)) {
        relativeGenes[key] = new Gene(genes[key].value / total);
      }
      return relativeGenes;
    }
    static similar(chromosomeA, chromosomeB, stepsMargin) {
      for (const key of Object.keys(chromosomeA.genes)) {
        const geneA = chromosomeA.genes[key];
        const geneB = chromosomeB.genes[key];
        if (Gene.difference(geneA, geneB) > stepsMargin) {
          return false;
        }
      }
      return true;
    }
  };

  // src/genetics/brain.ts
  var BrainGenes = /* @__PURE__ */ ((BrainGenes2) => {
    BrainGenes2["Eat"] = "Eat";
    BrainGenes2["Reproduce"] = "Reproduce";
    return BrainGenes2;
  })(BrainGenes || {});
  var Brain = class _Brain extends Chromosome {
    static geneKeys = Object.values(BrainGenes);
    static geneLabels = "\u{1F60B}\u{1F476}";
    makeRelative = true;
    static neutral() {
      const neutralGenes = {};
      for (const key of _Brain.geneKeys) {
        neutralGenes[key] = new Gene(0.5);
      }
      return new _Brain(neutralGenes);
    }
  };

  // src/genetics/diet.ts
  var DietGenes = /* @__PURE__ */ ((DietGenes2) => {
    DietGenes2["Herbivore"] = "Herbivore";
    DietGenes2["Carnivore"] = "Carnivore";
    return DietGenes2;
  })(DietGenes || {});
  var Diet = class _Diet extends Chromosome {
    static geneKeys = Object.values(DietGenes);
    static geneLabels = "\u{1F955}\u{1F969}";
    makeRelative = true;
    constructor(genes) {
      super(genes);
    }
    static neutral() {
      const neutralGenes = {};
      for (const key of _Diet.geneKeys) {
        neutralGenes[key] = new Gene(0.5);
      }
      return new _Diet(neutralGenes);
    }
  };

  // src/ui/individualsDetails.ts
  var IndividualsDetails = class {
    individuals;
    day;
    constructor(individuals, day) {
      this.individuals = individuals;
      this.day = day;
    }
    showIndividuals() {
      if (this.individuals.length === 0) return;
      const individualsDiv = document.getElementById("individuals");
      individualsDiv.innerHTML = "";
      const alive = this.individuals.filter((individual) => !individual.deathDay);
      const eaten = this.individuals.filter((individual) => individual.eaten);
      const starved = this.individuals.filter((individual) => individual.starved);
      const columnsWrapper = document.createElement("div");
      columnsWrapper.className = "individuals-columns";
      const leftColumn = document.createElement("div");
      leftColumn.className = "column";
      this.appendCategory(leftColumn, "Top 20 Alive", alive, 20);
      const rightColumn = document.createElement("div");
      rightColumn.className = "column";
      this.appendCategory(rightColumn, "Top 10 Eaten", eaten, 10);
      this.appendCategory(rightColumn, "Top 10 Starved", starved, 10);
      columnsWrapper.appendChild(leftColumn);
      columnsWrapper.appendChild(rightColumn);
      individualsDiv.appendChild(columnsWrapper);
    }
    appendCategory(container, category, individuals, limit) {
      const categoryTitle = document.createElement("h4");
      categoryTitle.innerText = `${category} (${individuals.length})`;
      container.appendChild(categoryTitle);
      if (individuals.length === 0) return;
      this.sortIndividualsWithinCategory(individuals);
      const individualsToShow = individuals.length > limit ? individuals.slice(0, limit) : individuals;
      const table = this.createTable(individualsToShow);
      container.appendChild(table);
    }
    valuesForIndividual(individual, includeDeath) {
      if (!individual) {
        console.error("Individual is undefined");
        return {};
      }
      const values = {
        "ID": individual.id,
        "Age": individual.getAge(this.day).toString(),
        [`Brain
${Brain.geneLabels}`]: individual.brain.toString(),
        [`Diet
${Diet.geneLabels}`]: individual.diet.toString(),
        "Action": individual.events[individual.events.length - 1] || "",
        "Energy": this.energyLabel(individual.energy),
        "Ancestors": this.ancestorLabel(individual),
        "Offspring\nAlive": individual.getOffspringCounts(false).toString(),
        "Offspring  \u25BC\nTotal": individual.getOffspringCounts(true).toString()
      };
      Object.entries(values).forEach(([key, value]) => {
        if (value === void 0) {
          console.error(`Value for ${key} is undefined for individual ${individual.id}`);
          console.error(individual);
        }
      });
      return values;
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
    ancestorLabel(individual) {
      const parents = individual.getParents();
      parents.reverse();
      if (parents.length === 0) {
        return "x";
      }
      let parentString = parents.map((parent) => parent.id).join(" > ");
      const oldestParent = parents[0];
      if (oldestParent.deathDay) {
        parentString = parentString.replace(oldestParent.id, `${oldestParent.id} \u2020 ${oldestParent.deathDay}`);
      }
      return parentString;
    }
    sortIndividualsWithinCategory(individuals) {
      return individuals.sort((a, b) => {
        if (a.deathDay && b.deathDay && a.deathDay != b.deathDay) {
          return b.deathDay - a.deathDay;
        }
        return b.getOffspringSum(true) - a.getOffspringSum(true) || // age descending
        b.getAge(this.day) - a.getAge(this.day) || // id ascending
        a.id.localeCompare(b.id);
      });
    }
    createTable(individuals) {
      const table = document.createElement("table");
      this.addHeader(table);
      for (let individual of individuals) {
        this.addIndividualRow(table, individual);
      }
      return table;
    }
    addHeader(table) {
      const headerRow = document.createElement("tr");
      const headers = Object.keys(this.valuesForIndividual(this.individuals[0], true));
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
      row.style.backgroundColor = individual.toColor();
      table.appendChild(row);
    }
  };

  // src/ui/log.ts
  function logMetrics(simulationMetrics, day) {
    const dayMetrics = simulationMetrics.dayMetrics[day];
    if (!dayMetrics) {
      console.warn(`No metrics found for day ${day}`);
      return;
    }
    console.log(`Day ${dayMetrics.day}; ${dayMetrics.bornIndividuals}\u{1F476}, ${dayMetrics.aliveIndividuals}\u{1FAC0}, ${dayMetrics.eatenIndividuals}\u{1F356}, ${dayMetrics.starvedIndividuals}\u{1F37D}\uFE0F; ${dayMetrics.uneatenFood} -> ${dayMetrics.grownFood} -> ${dayMetrics.remainingFood}`);
  }

  // src/actions/action.ts
  var Action = class {
    individual;
    constructor(individual) {
      this.individual = individual;
    }
  };

  // src/energy.ts
  var Energy = class {
    static whenBorn = 3;
    static max = 5;
    // cost per turn, added to any action
    static anyAction = -1;
    // gain when eating
    static herbivoreAction = 4;
    static carnivoreAction = 4;
    // buffer needed to reproduce, not spent but must be exceeded
    static bufferForReproduction = 4;
    // energy spent per child when reproducing
    static reproductionPerChild = -1;
  };

  // src/utils/color.ts
  function hslToRgb(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  function genomeToColor(diet, brain) {
    const herbivoreValue = diet.genes["Herbivore" /* Herbivore */].value;
    const minValue = 0.1;
    const maxValue = 0.9;
    const clampedHerbivoreValue = Math.min(maxValue, Math.max(minValue, herbivoreValue));
    const hue = (clampedHerbivoreValue - minValue) / (maxValue - minValue) * 120;
    const eatValue = brain.genes["Eat" /* Eat */].value;
    const saturation = 0.5 + eatValue / 2;
    const lightness = 0.6;
    const [r, g, b] = hslToRgb(hue / 360, saturation, lightness);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // src/individual.ts
  var Individual = class _Individual {
    static reproductiveAge = 2;
    id = "";
    // assigned by state
    birthday;
    parent;
    deathDay = null;
    eaten = false;
    starved = false;
    brain;
    diet;
    events = [];
    energy;
    children = [];
    constructor(birthday, parent, brain, diet) {
      this.birthday = birthday;
      this.parent = parent;
      this.brain = brain;
      this.diet = diet;
      this.energy = Energy.whenBorn;
    }
    toString() {
      return `${this.brain.toString()}-${this.diet.toString()}`;
    }
    toColor() {
      return genomeToColor(this.diet, this.brain);
    }
    getAge(today) {
      if (this.deathDay) {
        return this.deathDay - this.birthday;
      }
      return today - this.birthday;
    }
    createChild(today) {
      const evolvedBrain = this.brain.mutatedCopy();
      const evolvedDiet = this.diet.mutatedCopy();
      const baby = new _Individual(today, this, evolvedBrain, evolvedDiet);
      this.children.push(baby);
      return baby;
    }
    getOffspringCounts(includeDead) {
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
      const offSpringCounts = offspring.map((generation2) => generation2.filter((individual) => includeDead || !individual.deathDay).length);
      if (offSpringCounts[offSpringCounts.length - 1] == 0) {
        offSpringCounts.pop();
      }
      return offSpringCounts;
    }
    getOffspringSum(includeDead = false) {
      return this.getOffspringCounts(includeDead).reduce((sum, val) => sum + val, 0);
    }
    // returns any living parents and the first died parent, from young to old
    getParents() {
      const parents = [];
      if (this.parent) {
        parents.push(this.parent);
        let alive = true;
        while (alive) {
          const nextParent = parents[parents.length - 1].parent;
          if (nextParent == null) {
            break;
          }
          if (nextParent.deathDay) {
            parents.push(nextParent);
            break;
          }
          parents.push(nextParent);
        }
      }
      return parents;
    }
    hasHunger() {
      return this.energy <= Energy.max - 1;
    }
    dieEaten(today, eaterId) {
      this.eaten = true;
      this.events.push(`${eaterId} \u{1F969}`);
      this.die(today);
    }
    dieStarved(today) {
      this.starved = true;
      this.die(today);
    }
    die(today) {
      this.deathDay = today;
    }
    logEulogy(today) {
      let eulogy = `${this.id} died at age ${this.getAge(today)}`;
      if (this.eaten) {
        eulogy += " (eaten)";
      }
      if (this.starved) {
        eulogy += " (starved)";
      }
      const showLastEvents = 5;
      for (let i = Math.max(5, this.events.length) - showLastEvents; i < this.events.length; i++) {
        eulogy += `
${i + 1} ${this.events[i]}`;
      }
      console.log(eulogy);
    }
  };

  // src/actions/act.ts
  var WaitAction = class extends Action {
    name = "Wait";
    isPossible(state) {
      return true;
    }
    execute(state) {
      return Energy.anyAction;
    }
    toString() {
      return `\u{1F4A4}`;
    }
  };
  var HerbivoreAction = class extends Action {
    name = "Herbivore";
    succesful = false;
    isPossible(state) {
      return true;
    }
    execute(state) {
      if (state.environment.remainingFood > 0) {
        this.succesful = true;
        state.environment.remainingFood--;
        return Energy.anyAction + Energy.herbivoreAction;
      } else {
        this.succesful = false;
        return Energy.anyAction;
      }
    }
    toString() {
      return `\u{1F955} ${this.succesful ? "\u2714\uFE0F" : "\u274C"}`;
    }
  };
  var CarnivoreAction = class extends Action {
    name = "Carnivore";
    victim = null;
    isPossible(state) {
      return true;
    }
    isPossibleVictim(victim) {
      if (victim.deathDay) {
        return false;
      }
      if (victim.id === this.individual.id) {
        return false;
      }
      if (victim.id === this.individual.parent?.id) {
        return false;
      }
      if (victim.parent?.id === this.individual.id) {
        return false;
      }
      return true;
    }
    execute(state) {
      const possibleVictims = state.individuals.filter((v) => this.isPossibleVictim(v));
      if (possibleVictims.length === 0) {
        console.log(`${this.individual.id} hunts but there are no possible victims`);
        return Energy.anyAction;
      }
      const victimConcentration = possibleVictims.length / state.environment.maxFood;
      const victimConcentrationLuck = Math.random();
      if (victimConcentrationLuck < victimConcentration) {
      } else {
        return Energy.anyAction;
      }
      const victimRatio = possibleVictims.length / state.individuals.length;
      const victimRatioLuck = Math.random();
      if (victimRatioLuck < victimRatio) {
      } else {
        return Energy.anyAction;
      }
      this.victim = possibleVictims[Math.floor(Math.random() * possibleVictims.length)];
      this.victim.dieEaten(state.day, this.individual.id);
      return Energy.anyAction + Energy.carnivoreAction;
    }
    toString() {
      let victimId = this.victim ? this.victim.id : "\u274C";
      return `\u{1F969} ${victimId}`;
    }
  };
  var ReproduceAction = class extends Action {
    name = "Reproduce";
    cloneIds = [];
    isPossible(state) {
      const isAdult = this.individual.getAge(state.day) >= Individual.reproductiveAge;
      const hasEnergy = this.individual.energy > Energy.bufferForReproduction;
      return isAdult && hasEnergy;
    }
    execute(state) {
      const spendableEnergy = Math.floor(this.individual.energy - Energy.bufferForReproduction);
      const numberOfChildren = Math.min(2, spendableEnergy);
      for (let i = 0; i < numberOfChildren; i++) {
        const baby = this.individual.createChild(state.day);
        state.saveIndividual(baby);
        this.cloneIds.push(baby.id);
      }
      return Energy.anyAction + Energy.reproductionPerChild * numberOfChildren;
    }
    toString() {
      return `\u{1F476} ${this.cloneIds.join(" ")}`;
    }
  };

  // src/actions/decide.ts
  function decide(chromosome, actions) {
    if (actions.length === 0) {
      return null;
    }
    const weightedActions = actions.map((action) => {
      const weight = chromosome.genes[action.name];
      if (!weight) {
        console.warn(`No gene found for action ${action.name}, defaulting to 0 weight`);
        return { action, weight: new Gene(0) };
      }
      return { action, weight };
    });
    const totalWeight = weightedActions.reduce((sum, aw) => sum + aw.weight.value, 0);
    const randomWeight = Math.random() * totalWeight;
    if (totalWeight === 0) {
      const actionsString = actions.map((a) => a.name).join(" ");
      return null;
    }
    let cumulativeWeight = 0;
    for (const aw of weightedActions) {
      cumulativeWeight += aw.weight.value;
      if (cumulativeWeight > randomWeight) {
        return aw.action;
      }
    }
    console.warn("No action chosen, this should not happen");
    return null;
  }
  var MainAction = class extends Action {
    name = "Main";
    isPossible(state) {
      return !this.individual.deathDay && this.individual.getAge(state.day) > 1;
    }
    execute(state) {
      const voluntaryActions = [EatAction, ReproduceAction];
      const possibleActions = [];
      for (const ActionClass of voluntaryActions) {
        const action = new ActionClass(this.individual);
        if (action.isPossible(state)) {
          possibleActions.push(action);
        }
      }
      const chosenAction = decide(this.individual.brain, possibleActions) || new WaitAction(this.individual);
      const gainedEnergy = chosenAction.execute(state);
      this.individual.events.push(chosenAction.toString());
      return gainedEnergy;
    }
    toString() {
      return "";
    }
  };
  var EatAction = class extends Action {
    name = "Eat";
    chosenAction = null;
    isPossible(state) {
      const hungry = this.individual.hasHunger();
      return hungry;
    }
    execute(state) {
      const voluntaryActions = [HerbivoreAction, CarnivoreAction];
      const possibleActions = [];
      for (const ActionClass of voluntaryActions) {
        const action = new ActionClass(this.individual);
        if (action.isPossible(state)) {
          possibleActions.push(action);
        }
      }
      this.chosenAction = decide(this.individual.diet, possibleActions) || new WaitAction(this.individual);
      const gainedEnergy = this.chosenAction.execute(state);
      return gainedEnergy;
    }
    toString() {
      return this.chosenAction ? this.chosenAction.toString() : "";
    }
  };

  // src/iterations.ts
  var Iterations = class {
    state;
    constructor(state) {
      this.state = state;
    }
    execute(iterations) {
      for (let i = 0; i < iterations; i++) {
        this.state.archiveDeadIndividuals();
        this.state.day++;
        this.state.updateEnvironment();
        this.actAllIndividuals();
        this.starveIndividuals();
        this.state.metrics.addDayMetrics(this.state);
        if (this.state.individuals.filter((individual) => !individual.deathDay).length == 0) {
          alert("All individuals have died. Reload the page for a new simulation.");
        }
      }
    }
    actAllIndividuals() {
      const individuals = this.state.individuals;
      for (let i = individuals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [individuals[i], individuals[j]] = [individuals[j], individuals[i]];
      }
      for (const individual of individuals) {
        const mainAction = new MainAction(individual);
        if (mainAction.isPossible(this.state)) {
          const gainedEnergy = mainAction.execute(this.state);
          individual.energy += gainedEnergy;
          if (individual.energy > Energy.max) {
            individual.energy = Energy.max;
          }
        }
      }
    }
    starveIndividuals() {
      let starvedIndividuals = 0;
      for (let individual of this.state.individuals) {
        if (individual.energy <= 0 && !individual.deathDay && individual.getAge(this.state.day) > 0) {
          individual.dieStarved(this.state.day);
          starvedIndividuals++;
        }
      }
    }
  };

  // src/environment.ts
  var Environment = class {
    uneatenFood;
    grownFood;
    remainingFood;
    maxFood;
    constructor(maxFood) {
      this.maxFood = maxFood;
      this.uneatenFood = -1;
      this.grownFood = -1;
      this.remainingFood = 0;
      this.nextDay();
    }
    toFoodString() {
      return `${this.uneatenFood} -> ${this.grownFood} -> ${this.remainingFood}`;
    }
    nextDay() {
      this.uneatenFood = this.remainingFood;
      const possibleGrowth = this.maxFood - this.uneatenFood;
      this.grownFood = Math.round(this.uneatenFood + possibleGrowth / 2);
      this.remainingFood = this.grownFood;
    }
  };

  // src/utils/name.ts
  function intToName(num) {
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

  // src/metrics.ts
  var SimulationMetrics = class {
    dayMetrics = [];
    addDayMetrics(state) {
      this.dayMetrics.push(new DayMetrics(state));
    }
  };
  var DayMetrics = class {
    day;
    bornIndividuals;
    aliveIndividuals;
    deadIndividuals;
    eatenIndividuals;
    starvedIndividuals;
    brainMetrics;
    dietMetrics;
    uneatenFood;
    grownFood;
    remainingFood;
    constructor(state) {
      this.day = state.day;
      this.bornIndividuals = state.individuals.filter((individual) => individual.birthday === state.day).length;
      this.aliveIndividuals = state.individuals.filter((individual) => !individual.deathDay).length;
      this.deadIndividuals = state.individuals.filter((individual) => individual.deathDay).length;
      this.eatenIndividuals = state.individuals.filter((individual) => individual.eaten).length;
      this.starvedIndividuals = state.individuals.filter((individual) => individual.starved).length;
      this.brainMetrics = new ChromosomeMetrics(state.individuals.map((individual) => individual.brain));
      this.dietMetrics = new ChromosomeMetrics(state.individuals.map((individual) => individual.diet));
      this.uneatenFood = state.environment.uneatenFood;
      this.grownFood = state.environment.grownFood;
      this.remainingFood = state.environment.remainingFood;
    }
  };
  var ChromosomeMetrics = class {
    geneKeys;
    geneCounts = {};
    constructor(chromosomes) {
      this.geneKeys = Chromosome.geneLabels;
      if (chromosomes.length === 0) {
        return;
      }
      for (const key of Object.keys(chromosomes[0].genes)) {
        this.geneCounts[key] = {};
        for (let i = 0; i <= 9; i++) {
          this.geneCounts[key][i] = 0;
        }
      }
      for (const chromosome of chromosomes) {
        for (const geneKey of Object.keys(chromosome.genes)) {
          const bucket = chromosome.genes[geneKey].getBucket();
          this.geneCounts[geneKey][bucket]++;
        }
      }
    }
  };

  // src/state.ts
  var State = class {
    day;
    individualsById = {};
    individuals = [];
    individualIdCounter = -1;
    environment;
    metrics = new SimulationMetrics();
    constructor() {
      this.day = 0;
      this.environment = new Environment(50);
      this.createInitialIndividuals();
    }
    createInitialIndividuals() {
      const firstIndividuals = [
        new Individual(this.day, null, Brain.neutral(), Diet.neutral()),
        new Individual(this.day, null, Brain.neutral(), Diet.neutral())
      ];
      for (const individual of firstIndividuals) {
        this.saveIndividual(individual);
      }
      this.metrics.addDayMetrics(this);
    }
    nextIndividualId() {
      this.individualIdCounter++;
      return intToName(this.individualIdCounter);
    }
    saveIndividual(individual) {
      individual.id = this.nextIndividualId();
      this.individualsById[individual.id] = individual;
      this.individuals.push(individual);
    }
    updateEnvironment() {
      this.environment.nextDay();
    }
    livingIndividualCount() {
      return this.individuals.filter((individual) => !individual.deathDay).length;
    }
    archiveDeadIndividuals() {
      for (let individualId of Object.keys(this.individualsById)) {
        if (this.individualsById[individualId].deathDay) {
          delete this.individualsById[individualId];
        }
      }
      this.individuals = Object.values(this.individualsById);
      for (let individual of this.individuals) {
        var parent = individual.parent;
        var deadInARow = 0;
        while (parent && deadInARow < 2) {
          if (parent.deathDay) {
            deadInARow++;
          } else {
            deadInARow = 0;
          }
          parent = parent.parent;
        }
        var nextParent = parent;
        while (nextParent) {
          const nextNextParent = nextParent.parent;
          nextParent.parent = null;
          nextParent = nextNextParent;
        }
      }
    }
  };

  // src/ui/ui.ts
  window.onload = () => new UI();
  var UI = class {
    state;
    iterations;
    playInterval = void 0;
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
      document.getElementById("next-1000-btn").addEventListener("click", () => this.nextIteration(1e3));
      document.getElementById("play-pause-btn").addEventListener("click", () => this.togglePlay());
      document.getElementById("speed-btn").addEventListener("click", () => this.toggleSpeed());
    }
    togglePlay() {
      console.log("Toggling play");
      const btn = document.getElementById("play-pause-btn");
      if (this.playInterval !== void 0) {
        this.pause();
        btn.textContent = "\u25B6 Play";
        console.log("button should say play");
      } else {
        this.play(this.playFast);
        btn.textContent = "\u23F8 Pause";
        console.log("button should say pause");
      }
    }
    toggleSpeed() {
      const btn = document.getElementById("speed-btn");
      if (this.playInterval !== void 0) {
        this.pause();
      }
      this.playFast = !this.playFast;
      this.play(this.playFast);
      document.getElementById("play-pause-btn").textContent = "\u23F8 Pause";
      btn.textContent = this.playFast ? "Slower" : "Faster";
    }
    play(fast) {
      const wait = fast ? 500 : 1e3;
      this.playInterval = setInterval(() => this.nextIteration(1), wait);
    }
    pause() {
      clearInterval(this.playInterval);
      this.playInterval = void 0;
    }
    nextIteration(amount) {
      this.iterations.execute(amount);
      this.updateUI();
    }
    updateUI() {
      this.updateTitles();
      this.showEnvironment();
      new IndividualsDetails(this.state.individuals, this.state.day).showIndividuals();
      logMetrics(this.state.metrics, this.state.day);
    }
    updateTitles() {
      document.getElementById("iteration-title").innerText = `Iteration ${this.state.day}`;
      document.getElementById("individuals-title").innerText = `Individuals (${this.state.individuals.length})`;
    }
    showEnvironment() {
      const environmentDiv = document.getElementById("environment");
      environmentDiv.innerHTML = "";
      const food = document.createElement("p");
      food.innerText = this.state.environment.toFoodString();
      environmentDiv.appendChild(food);
    }
  };
})();
