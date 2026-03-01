"use strict";
(() => {
  // src/genetics/gene.ts
  var Gene = class _Gene {
    static shiftRange = 0.1;
    static geneFlipChance = 0;
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
      if (this.value == 0) return "x";
      const bucket = Math.ceil(this.value * 10) - 1;
      return bucket.toString();
    }
    mutate() {
      if (Math.random() < _Gene.geneFlipChance) {
        return this.invert();
      } else {
        return this.shift();
      }
    }
    invert() {
      return new _Gene(1 - this.value);
    }
    shift() {
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
  var Chromosome = class {
    static geneKeys = [];
    static geneLabels = "";
    genes;
    constructor(genes) {
      this.genes = genes;
    }
    toString() {
      return Object.keys(this.genes).map((key) => this.genes[key].toString()).join("");
    }
    get(gene) {
      return this.genes[gene].value;
    }
    mutatedGenes() {
      const newGenes = {};
      for (const key of Object.keys(this.genes)) {
        newGenes[key] = this.genes[key].mutate();
      }
      return newGenes;
    }
    static randomGenes(keys) {
      const genes = {};
      for (const key of keys) {
        genes[key] = Gene.random();
      }
      return genes;
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
    BrainGenes2["GatherAction"] = "GatherAction";
    BrainGenes2["HuntAction"] = "HuntAction";
    BrainGenes2["ReproduceAction"] = "ReproduceAction";
    return BrainGenes2;
  })(BrainGenes || {});
  var Brain = class _Brain extends Chromosome {
    static geneKeys = Object.values(BrainGenes);
    // static geneLabels = "🥕🍖🥩👶";
    static geneLabels = "\u{1F955}\u{1F969}\u{1F476}";
    decide(actions) {
      if (actions.length === 0) {
        return null;
      }
      const weightedActions = actions.map((action) => {
        const weight = this.genes[action.constructor.name] || { value: 1 };
        return { action, weight };
      });
      const totalWeight = weightedActions.reduce((sum, aw) => sum + aw.weight.value, 0);
      const randomWeight = Math.random() * totalWeight;
      if (totalWeight === 0) {
        const actionsString = actions.map((a) => a.constructor.name).join(" ");
        console.info(`This individual can do ${actionsString} but brain is ${this.toString()} so it does nothing`);
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
    debugMutate() {
      var mutated = this.mutatedGenes();
      for (const key of _Brain.geneKeys) {
        if (this.genes[key].value === 0) {
          mutated[key] = new Gene(0);
        }
      }
      return new _Brain(mutated);
    }
    static random() {
      return new _Brain(Chromosome.randomGenes(_Brain.geneKeys));
    }
    static debugHerbivore() {
      return new _Brain({
        ["GatherAction" /* GatherAction */]: new Gene(0.5),
        ["HuntAction" /* HuntAction */]: new Gene(0),
        ["ReproduceAction" /* ReproduceAction */]: new Gene(0.5)
      });
    }
    static debugCarnivore() {
      return new _Brain({
        ["GatherAction" /* GatherAction */]: new Gene(0),
        ["HuntAction" /* HuntAction */]: new Gene(0.5),
        ["ReproduceAction" /* ReproduceAction */]: new Gene(0.5)
      });
    }
  };

  // src/genetics/diet.ts
  var DietGenes = /* @__PURE__ */ ((DietGenes2) => {
    DietGenes2["Herbivore"] = "Herbivore";
    DietGenes2["Scavenger"] = "Scavenger";
    DietGenes2["Carnivore"] = "Carnivore";
    return DietGenes2;
  })(DietGenes || {});
  var Diet = class _Diet extends Chromosome {
    static geneKeys = Object.values(DietGenes);
    static geneLabels = "\u{1F955}\u{1F356}\u{1F969}";
    constructor(genes) {
      super(genes);
      this.scaleDown();
    }
    scaleDown() {
      const dietTotal = Object.values(DietGenes).reduce((sum, action) => sum + (this.genes[action]?.value || 0), 0);
      if (dietTotal > 1) {
        for (const diet of Object.values(DietGenes)) {
          this.genes[diet].value = this.genes[diet].value / dietTotal;
        }
      }
    }
    mutatedCopy() {
      const newGenes = {};
      for (const key of Object.keys(this.genes)) {
        newGenes[key] = this.genes[key].mutate();
      }
      return new _Diet(newGenes);
    }
    mostlyHerbivore() {
      const herbivoreValue = this.genes["Herbivore" /* Herbivore */].value;
      const carnivoreValue = this.genes["Carnivore" /* Carnivore */].value;
      return herbivoreValue > carnivoreValue;
    }
    mostlyCarnivore() {
      const herbivoreValue = this.genes["Herbivore" /* Herbivore */].value;
      const carnivoreValue = this.genes["Carnivore" /* Carnivore */].value;
      return carnivoreValue > herbivoreValue;
    }
    static random() {
      return new _Diet(Chromosome.randomGenes(Object.values(DietGenes)));
    }
    static randomHerbivore() {
      const genes = {};
      genes["Herbivore" /* Herbivore */] = Gene.random();
      genes["Scavenger" /* Scavenger */] = new Gene(0);
      genes["Carnivore" /* Carnivore */] = new Gene(0);
      return new _Diet(genes);
    }
    static randomCarnivore() {
      const genes = {};
      genes["Herbivore" /* Herbivore */] = new Gene(0);
      genes["Scavenger" /* Scavenger */] = new Gene(0);
      genes["Carnivore" /* Carnivore */] = Gene.random();
      return new _Diet(genes);
    }
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
  function dietToColor(diet) {
    const herbivoreValue = diet.genes["Herbivore" /* Herbivore */].value;
    const carnivoreValue = diet.genes["Carnivore" /* Carnivore */].value;
    const mostlyHerbivore = herbivoreValue > carnivoreValue;
    const hue = mostlyHerbivore ? 120 : 0;
    const saturation = 0.75;
    const lightness = 0.5;
    const [r, g, b] = hslToRgb(hue / 360, saturation, lightness);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // src/individual.ts
  var Individual = class _Individual {
    static maxEnergy = 5;
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
    // TODO: calculate based on traits
    // don't forget to recalculate when traits change
    nutritionalValue = 2;
    energyNeed = 1;
    children = [];
    constructor(birthday, parent, brain, diet) {
      this.birthday = birthday;
      this.parent = parent;
      this.brain = brain;
      this.diet = diet;
      this.energy = 2;
    }
    toString() {
      return `${this.brain.toString()}-${this.diet.toString()}`;
    }
    toColor() {
      return dietToColor(this.diet);
    }
    static random(birthday) {
      const herbivore = Math.random() < 0.5;
      const randomDiet = herbivore ? Diet.randomHerbivore() : Diet.randomCarnivore();
      const newIndividual = new _Individual(birthday, null, Brain.random(), randomDiet);
      return newIndividual;
    }
    getAge(today) {
      if (this.deathDay) {
        return this.deathDay - this.birthday;
      }
      return today - this.birthday;
    }
    eat(nutritionalValue) {
      this.energy = Math.min(_Individual.maxEnergy, this.energy + nutritionalValue);
    }
    createChild(today) {
      const evolvedBrain = this.brain.debugMutate();
      const evolvedDiet = this.diet;
      const baby = new _Individual(today, this, evolvedBrain, evolvedDiet);
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
    // returns the first parent (dead or alive) and any living older parents, from old to new
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
    hasHunger() {
      return this.energy <= _Individual.maxEnergy - 1;
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

  // src/action.ts
  var Action = class {
    individual;
    constructor(individual) {
      this.individual = individual;
    }
  };
  var WaitAction = class extends Action {
    isPossible(state) {
      return true;
    }
    execute(state) {
      return -this.individual.energyNeed;
    }
    toString() {
      return `\u{1F4A4}`;
    }
  };
  var GatherAction = class extends Action {
    isPossible(state) {
      const hungry = this.individual.hasHunger();
      const foodAvailable = state.environment.remainingFood > 0;
      const mostlyHerbivore = this.individual.diet.mostlyHerbivore();
      return hungry && foodAvailable && mostlyHerbivore;
    }
    // +0.5 turn
    execute(state) {
      this.individual.eat(1.5);
      state.environment.remainingFood--;
      return 1.5 - this.individual.energyNeed;
    }
    toString() {
      return `\u{1F955}`;
    }
  };
  var HuntAction = class extends Action {
    victim = null;
    isPossible(state) {
      const hungry = this.individual.hasHunger();
      const mostlyCarnivore = this.individual.diet.mostlyCarnivore();
      return hungry && mostlyCarnivore;
    }
    isPossibleVictim(victim) {
      if (victim.deathDay) {
        return false;
      }
      if (victim.diet.mostlyCarnivore()) {
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
    // +1 turn if successful, -1 turn if not
    execute(state) {
      const possibleVictims = state.individuals.filter((v) => this.isPossibleVictim(v));
      if (possibleVictims.length === 0) {
        console.log(`${this.individual.id} hunts but there are no possible victims`);
        return -this.individual.energyNeed;
      }
      const victimConcentration = possibleVictims.length / state.environment.maxFood;
      const victimConcentrationLuck = Math.random();
      if (victimConcentrationLuck < victimConcentration) {
        this.victim = possibleVictims[Math.floor(Math.random() * possibleVictims.length)];
      } else {
        return -this.individual.energyNeed;
      }
      const victimRatio = possibleVictims.length / state.individuals.length;
      const victimRatioLuck = Math.random();
      if (victimRatioLuck < victimRatio) {
        this.victim = possibleVictims[Math.floor(Math.random() * possibleVictims.length)];
      } else {
        return -this.individual.energyNeed;
      }
      this.individual.eat(this.victim.nutritionalValue);
      this.victim.dieEaten(state.day, this.individual.id);
      return this.victim.nutritionalValue - this.individual.energyNeed;
    }
    toString() {
      let victimId = this.victim ? this.victim.id : "\u274C";
      return `\u{1F969} ${victimId}`;
    }
  };
  var ReproduceAction = class extends Action {
    cloneIds = [];
    isPossible(state) {
      const isAdult = this.individual.getAge(state.day) >= Individual.reproductiveAge;
      const hasEnergy = this.individual.energy > 2;
      return isAdult && hasEnergy;
    }
    // -2 for 1 child, -3 for 2 children
    execute(state) {
      const spendableEnergy = Math.floor(this.individual.energy);
      const numberOfChildren = Math.min(2, spendableEnergy);
      for (let i = 0; i < numberOfChildren; i++) {
        const baby = this.individual.createChild(state.day);
        state.saveIndividual(baby);
        this.cloneIds.push(baby.id);
      }
      return -numberOfChildren - this.individual.energyNeed;
    }
    toString() {
      return `\u{1F476} ${this.cloneIds.join(" ")}`;
    }
  };
  var voluntaryActions = [
    GatherAction,
    HuntAction,
    ReproduceAction
  ];

  // src/iterations.ts
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
        this.state.updateEnvironment();
        this.actAllIndividuals();
        this.starveIndividuals();
        if (this.state.individuals.filter((individual) => !individual.deathDay).length == 0) {
          alert("All individuals have died.");
        }
      }
    }
    addIndividuals() {
      const minimalIndividuals = 5;
      const maxMigratingIndividuals = Math.max(0, minimalIndividuals - this.state.individuals.length);
      const migratingIndividuals = Math.random() * maxMigratingIndividuals;
      for (let i = 0; i < migratingIndividuals; i++) {
        this.state.saveIndividual(Individual.random(this.state.day));
      }
    }
    actAllIndividuals() {
      const individuals = this.state.individuals;
      for (let i = individuals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [individuals[i], individuals[j]] = [individuals[j], individuals[i]];
      }
      for (const individual of individuals) {
        this.actIndividual(individual);
      }
    }
    actIndividual(individual) {
      if (individual.deathDay) {
        return;
      }
      if (individual.getAge(this.state.day) == 0) {
        individual.events.push("\u{1F4C8}");
        return;
      }
      const possibleActions = [];
      for (const ActionClass of voluntaryActions) {
        const action2 = new ActionClass(individual);
        if (action2.isPossible(this.state)) {
          possibleActions.push(action2);
        }
      }
      let action = individual.brain.decide(possibleActions) || new WaitAction(individual);
      individual.energy += action.execute(this.state);
      individual.events.push(action.toString());
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
      this.grownFood = Math.round((this.uneatenFood + this.maxFood) / 2);
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

  // src/state.ts
  var State = class {
    day;
    individualsById = {};
    individuals = [];
    individualIdCounter = -1;
    environment;
    constructor() {
      this.day = 0;
      this.createInitialIndividuals();
      this.environment = new Environment(50);
    }
    createInitialIndividuals() {
      const firstIndividuals = [
        new Individual(this.day, null, Brain.debugHerbivore(), Diet.randomHerbivore()),
        new Individual(this.day, null, Brain.debugHerbivore(), Diet.randomHerbivore()),
        new Individual(this.day, null, Brain.debugCarnivore(), Diet.randomCarnivore())
      ];
      for (const individual of firstIndividuals) {
        this.saveIndividual(individual);
      }
      const growingDays = 3;
      const newChildren = [];
      for (let i = 0; i < growingDays; i++) {
        this.day++;
        for (const individual of this.individuals) {
          const child = individual.createChild(this.day);
          newChildren.push(child);
        }
      }
      for (const child of newChildren) {
        this.saveIndividual(child);
      }
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

  // src/ui.ts
  window.onload = () => new UI();
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
      document.getElementById("next-1000-btn").addEventListener("click", () => this.nextIteration(1e3));
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
    nextIteration(amount) {
      this.iterations.execute(amount);
      this.updateUI();
    }
    updateUI() {
      this.updateTitles();
      this.showEnvironment();
      new IndividualsDetails(this.state.individuals, this.state.day).showIndividuals();
      this.logStuff();
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
    logStuff() {
      const herbivores = this.state.individuals.filter((individual) => individual.diet.mostlyHerbivore()).length;
      const carnivores = this.state.individuals.filter((individual) => individual.diet.mostlyCarnivore()).length;
      const eaten = this.state.individuals.filter((individual) => individual.eaten).length;
      const starved = this.state.individuals.filter((individual) => individual.starved).length;
      console.log(`Day ${this.state.day}: \u{1F955}${herbivores} \u{1F969}${carnivores}, \u{1F969}${eaten} \u{1F37D}\uFE0F${starved}`);
    }
  };
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
      this.appendCategory(leftColumn, "Alive", alive);
      const rightColumn = document.createElement("div");
      rightColumn.className = "column";
      this.appendCategory(rightColumn, "Eaten", eaten);
      this.appendCategory(rightColumn, "Starved", starved);
      columnsWrapper.appendChild(leftColumn);
      columnsWrapper.appendChild(rightColumn);
      individualsDiv.appendChild(columnsWrapper);
    }
    appendCategory(container, category, individuals) {
      const categoryTitle = document.createElement("h4");
      categoryTitle.innerText = `${category} (${individuals.length})`;
      container.appendChild(categoryTitle);
      if (individuals.length === 0) return;
      this.sortIndividualsWithinCategory(individuals);
      const table = this.createTable(individuals);
      container.appendChild(table);
    }
    valuesForIndividual(individual, includeDeath) {
      if (!individual) {
        console.error("Individual is undefined");
        return {};
      }
      const values = {
        "ID": individual.id,
        "Age \u25BC": individual.getAge(this.day).toString(),
        [`Diet
${Diet.geneLabels}`]: individual.diet.toString(),
        [`Brain
${Brain.geneLabels}`]: individual.brain.toString(),
        "Action": individual.events[individual.events.length - 1] || "",
        "Energy": this.energyLabel(individual.energy),
        "Ancestors": this.ancestorLabel(individual),
        "Offspring": individual.getOffspringCounts().toString()
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
      if (!individual.parent) {
        return "x";
      }
      if (individual.parent.deathDay) {
        return `${individual.parent.id} \u2020`;
      }
      return individual.getParentIds().join(", ");
    }
    sortIndividualsWithinCategory(individuals) {
      return individuals.sort((a, b) => {
        if (a.deathDay && b.deathDay && a.deathDay != b.deathDay) {
          return b.deathDay - a.deathDay;
        }
        return b.getAge(this.day) - a.getAge(this.day) || b.getOffspringSum() - a.getOffspringSum() || a.id.localeCompare(b.id);
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
})();
