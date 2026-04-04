"use strict";
(() => {
  // src/simulation/iterationLoop.ts
  var IterationLoop = class {
    iterations;
    ui;
    // defaults
    jumpsPerSecond = 30;
    iterationsPerJump = 2;
    playInterval = void 0;
    onUpdate = () => {
    };
    constructor(iterations, ui) {
      this.iterations = iterations;
      this.ui = ui;
    }
    get isPlaying() {
      return this.playInterval !== void 0;
    }
    toggle() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    }
    play() {
      this.pause();
      const wait = Math.round(1e3 / this.jumpsPerSecond);
      this.playInterval = setInterval(() => {
        const continueLoop = this.iterations.execute(this.iterationsPerJump);
        this.onUpdate();
        if (!continueLoop) {
          this.ui.handleSimulationEnd();
        }
      }, wait);
    }
    pause() {
      clearInterval(this.playInterval);
      this.playInterval = void 0;
    }
  };

  // src/simulation/constants.ts
  var Constants = class {
    static reproductiveAge = 2;
    static maxChildrenPerReproduction = 2;
    static huntingDistance = 5;
  };
  var EnvironmentConstants = class {
    static plantGrowthPerTile = 0.02;
    static initialPlantAmount = 1;
  };
  var GeneConstants = class {
    static shiftRange = 0.05 + Math.random() * 0.05;
    static geneInvertChance = 0.01 + Math.random() * 0.01;
    static learnImprovement = 5e-3;
  };
  var EnergyConstants = class {
    static whenBorn = 6;
    static max = 10;
    // cost per turn, added to any action
    static anyAction = -1;
    static energyPerPlant = 10;
    static maxEatPlantEnergy = 5;
    static maxHuntEnergy = 15;
    static moveAction = -1;
    // buffer needed to reproduce, not spent but must be exceeded
    static bufferForReproduction = 7;
    // energy spent per child when reproducing
    static reproductionPerChild = -1;
  };

  // src/simulation/action/action.ts
  var Action = class {
    static weight(_individual) {
      throw new Error("Not implemented");
    }
    static isPossible(_individual, _state) {
      throw new Error("Not implemented");
    }
    static execute(_individual, _state, _metrics) {
      throw new Error("Not implemented");
    }
  };
  var IdleAction = class extends Action {
    static weight(_individual) {
      return 0;
    }
    static isPossible(_individual, _state) {
      return true;
    }
    static execute(individual, state, metrics) {
      if (individual.getAge(state.day) >= 2) {
        metrics.logIdle();
        console.warn("Adult individual idled, this should not happen");
      } else {
        metrics.logGrowUp();
      }
      return EnergyConstants.anyAction;
    }
  };
  var PlantSearchAction = class extends Action {
    static weight(individual) {
      return individual.diet.plant.value;
    }
    static isPossible(individual, state) {
      const x = individual.location.x;
      const y = individual.location.y;
      return state.space.plants[x][y] > 0;
    }
    static execute(individual, state, metrics) {
      const plantAvailable = state.space.plants[individual.location.x][individual.location.y];
      if (plantAvailable <= 0) {
        metrics.logPlantSearch(false);
        return EnergyConstants.anyAction;
      }
      const plantSearchSkill = individual.skills.plantSearch.value;
      const plantEaten = plantAvailable * plantSearchSkill;
      const maxEnergyGained = plantEaten * EnergyConstants.energyPerPlant * individual.diet.plant.value;
      const energyGained = Math.min(maxEnergyGained, EnergyConstants.maxEatPlantEnergy);
      const plantRemaining = Math.max(0, plantAvailable - plantEaten);
      state.space.plants[individual.location.x][individual.location.y] = plantRemaining;
      metrics.logPlantSearch(true);
      return EnergyConstants.anyAction + energyGained;
    }
  };
  var HuntAction = class extends Action {
    static weight(individual) {
      return individual.diet.meat.value;
    }
    static isPossible(individual, state) {
      const huntingTiles = state.space.huntingRange[individual.location.x][individual.location.y];
      for (let t = 0; t < huntingTiles.length; t++) {
        const x = huntingTiles[t].x;
        const y = huntingTiles[t].y;
        if (state.space.animals[x][y].length > 0) return true;
      }
      return false;
    }
    static isPossibleVictim(individual, victim) {
      if (victim.energy <= -1 * EnergyConstants.anyAction) {
        return false;
      }
      if (1.5 * victim.diet.meat.value > individual.diet.meat.value) {
        return true;
      }
      if (victim.deathDay) {
        return false;
      }
      if (victim.id === individual.id) {
        return false;
      }
      if (victim.id === individual.parent?.id) {
        return false;
      }
      if (victim.parent?.id === individual.id) {
        return false;
      }
      return true;
    }
    static execute(individual, state, metrics) {
      const hunterAdvantage = individual.skills.hunt.value;
      const tiles = state.space.huntingRange[individual.location.x][individual.location.y];
      for (let t = 0; t < tiles.length; t++) {
        const animals = state.space.animals[tiles[t].x][tiles[t].y];
        for (let i = 0; i < animals.length; i++) {
          const victim = animals[i];
          if (!this.isPossibleVictim(individual, victim)) continue;
          const victimAdvantage = victim.traits.size.value;
          const outcome = Math.random() * (hunterAdvantage + victimAdvantage);
          if (outcome > victimAdvantage) {
            continue;
          }
          victim.dieEaten(state.day);
          state.space.removeAnimal(victim);
          metrics.logHunt(true);
          state.space.moveIndividual(individual, victim.location);
          const gainedEnergy = Math.min(EnergyConstants.maxHuntEnergy, victim.energy * individual.skills.hunt.value);
          return EnergyConstants.anyAction + gainedEnergy;
        }
      }
      metrics.logHunt(false);
      return EnergyConstants.anyAction;
    }
  };
  var MoveAction = class extends Action {
    static weight(individual) {
      return individual.brain.move.value;
    }
    static isPossible(individual, _state) {
      return individual.energy > -1 * EnergyConstants.moveAction;
    }
    static execute(individual, state, metrics) {
      const nextLocation = state.space.randomNeighbourLocation(individual.location, 1);
      state.space.moveIndividual(individual, nextLocation);
      metrics.logMove();
      return EnergyConstants.anyAction + EnergyConstants.moveAction;
    }
  };
  var ReproduceAction = class extends Action {
    static weight(individual) {
      return individual.brain.reproduce.value;
    }
    static isPossible(individual, state) {
      const isAdult = individual.getAge(state.day) >= Constants.reproductiveAge;
      const hasEnergy = individual.energy > EnergyConstants.bufferForReproduction;
      return isAdult && hasEnergy;
    }
    static execute(individual, state, metrics) {
      const spendableEnergy = Math.floor(individual.energy - EnergyConstants.bufferForReproduction);
      const numberOfChildren = Math.min(Constants.maxChildrenPerReproduction, spendableEnergy);
      for (let i = 0; i < numberOfChildren; i++) {
        const babyLocation = state.space.randomNeighbourLocation(individual.location, 3);
        const baby = individual.createChild(babyLocation, state.day);
        state.saveIndividual(baby);
      }
      metrics.logReproduce(numberOfChildren);
      return EnergyConstants.anyAction + EnergyConstants.reproductionPerChild * numberOfChildren;
    }
  };

  // src/simulation/action/decision.ts
  var Decision = class extends Action {
    static options;
    static onlyPossibleActions;
    static isPossible(_individual, _state) {
      return true;
    }
    static execute(individual, state, metrics) {
      let weightedActions = [];
      for (const actionClass of this.options) {
        const weight = actionClass.weight(individual);
        if (weight <= 0) {
          continue;
        }
        const isPossible = actionClass.isPossible(individual, state);
        if (this.onlyPossibleActions && !isPossible) {
          continue;
        }
        weightedActions.push({ weight, actionClass });
      }
      if (weightedActions.length === 0) {
        return IdleAction.execute(individual, state, metrics);
      }
      if (weightedActions.length === 1) {
        return weightedActions[0].actionClass.execute(individual, state, metrics);
      }
      const totalWeight = weightedActions.reduce((sum, { weight }) => sum + weight, 0);
      const randomWeight = Math.random() * totalWeight;
      let cumulativeWeight = 0;
      for (let i = 0; i < weightedActions.length; i++) {
        cumulativeWeight += weightedActions[i].weight;
        if (randomWeight < cumulativeWeight) {
          const chosenAction = weightedActions[i].actionClass;
          return chosenAction.execute(individual, state, metrics);
        }
      }
      return IdleAction.execute(individual, state, metrics);
    }
  };
  var DietDecision = class extends Decision {
    static options = [PlantSearchAction, HuntAction];
    static onlyPossibleActions = false;
    static weight(individual) {
      return individual.brain.eat.value;
    }
  };
  var BrainDecision = class extends Decision {
    static options = [MoveAction, DietDecision, ReproduceAction];
    static onlyPossibleActions = true;
    static weight(_individual) {
      return 1;
    }
    static isPossible(individual, state) {
      return individual.getAge(state.day) >= 2;
    }
  };

  // src/simulation/iterations.ts
  var Iterations = class {
    state;
    constructor(state) {
      this.state = state;
    }
    execute(iterations) {
      for (let i = 0; i < iterations; i++) {
        this.state.archiveDeadIndividuals();
        this.state.metrics.addnewDay();
        this.state.day++;
        this.state.updateEnvironment();
        this.actAllIndividuals(this.state.metrics.latestDayMetrics.actions);
        this.starveIndividuals();
        this.state.metrics.calculateRemainingMetrics(this.state);
        const allDead = this.state.individuals.filter((individual) => individual.deathDay == null).length == 0;
        if (allDead) {
          return false;
        }
      }
      return true;
    }
    actAllIndividuals(actionMetrics) {
      const individuals = this.state.individuals;
      for (let i = individuals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [individuals[i], individuals[j]] = [individuals[j], individuals[i]];
      }
      for (const individual of individuals) {
        if (BrainDecision.isPossible(individual, this.state)) {
          const gainedEnergy = BrainDecision.execute(individual, this.state, this.state.metrics.latestDayMetrics.actions);
          individual.energy += gainedEnergy;
          if (individual.energy > EnergyConstants.max) {
            individual.energy = EnergyConstants.max;
          }
        }
      }
    }
    starveIndividuals() {
      let starvedIndividuals = 0;
      for (let individual of this.state.individuals) {
        const lowEnergy = individual.energy <= 0;
        const alive = individual.deathDay == null;
        const notBornToday = individual.getAge(this.state.day) > 0;
        if (lowEnergy && alive && notBornToday) {
          individual.dieStarved(this.state.day);
          this.state.space.removeAnimal(individual);
          starvedIndividuals++;
        }
      }
    }
  };

  // src/simulation/environment.ts
  var Environment = class {
    // foodRegeneration: number;
    // foodRegenerationIncreasing: boolean;
    space;
    constructor(space) {
      this.space = space;
      this.nextDay();
    }
    // updateSeason() {
    //     this.foodRegeneration += this.foodRegenerationIncreasing ? EnvironmentConstants.stepFoodRegeneration : -EnvironmentConstants.stepFoodRegeneration;
    //     if (this.foodRegeneration > EnvironmentConstants.maxFoodRegeneration) {
    //         this.foodRegeneration = EnvironmentConstants.maxFoodRegeneration;
    //         this.foodRegenerationIncreasing = false;
    //     } else if (this.foodRegeneration < EnvironmentConstants.minFoodRegeneration) {
    //         this.foodRegeneration = EnvironmentConstants.minFoodRegeneration;
    //         this.foodRegenerationIncreasing = true;
    //     }
    // }
    nextDay() {
      for (let x = 0; x < this.space.width; x++) {
        for (let y = 0; y < this.space.height; y++) {
          this.space.plants[x][y] = Math.min(1, this.space.plants[x][y] + EnvironmentConstants.plantGrowthPerTile);
        }
      }
    }
  };

  // src/ui/color.ts
  var Color = class {
    static green = "rgb(22, 163, 74)";
    // green-600
    static blue = "rgb(37, 99, 235)";
    // blue-600
    static red = "rgb(220, 38, 38)";
    // red-600
    static greenTeal = "rgb(52, 211, 153)";
    // emerald-400 (teal-green)
    static blueSky = "rgb(56, 189, 248)";
    // sky-400 (sky-blue)
    static redPink = "rgb(251, 113, 133)";
    // rose-400 (pink-red)
    static purple = "rgb(167, 139, 250)";
    // violet-400
    static rgbToRgba(rgb, alpha) {
      return rgb.replace("rgb(", "rgba(").replace(")", `, ${alpha.toFixed(2)})`);
    }
  };
  var Hue = class _Hue {
    static greenHue = 140 / 360;
    static blueHue = 220 / 360;
    static redHue = 0 / 360;
    static purpleHue = 270 / 360;
    static orangeHue = 30 / 360;
    static yellowHue = 55 / 360;
    static defaultSaturation = 0.5;
    static greenToRedRange = this.hueRange(this.greenHue, this.redHue, 9, 0.9, 0.4);
    static hueRange(fromHue, toHue, steps, saturation, luminance) {
      return Array.from({ length: steps }, (_, i) => {
        const huePerStep = steps > 1 ? i / (steps - 1) : 0;
        const hue = fromHue + huePerStep * (toHue - fromHue);
        const [r, g, b] = _Hue.hslToRgb(hue, saturation, luminance);
        return `rgb(${r}, ${g}, ${b})`;
      });
    }
    static hslToRgb(h, s, l) {
      const a = s * Math.min(l, 1 - l);
      const f = (n) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      };
      return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }
    static genomeToColor(diet) {
      const herbivoreValue = diet.meat.value;
      const minValue = 0.1;
      const maxValue = 0.9;
      const clampedHerbivoreValue = Math.min(maxValue, Math.max(minValue, herbivoreValue));
      const hue = (clampedHerbivoreValue - minValue) / (maxValue - minValue) * 130;
      const eatValue = 0.8;
      const saturation = 0.5 + eatValue / 2;
      const lightness = 0.6;
      const [r, g, b] = _Hue.hslToRgb(hue / 360, saturation, lightness);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // src/simulation/genetics/gene.ts
  var Gene = class _Gene {
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
      return this.bucket.toString();
    }
    get bucket() {
      return Math.round(this.value * 8) + 1;
    }
    mutated(invert) {
      if (invert && Math.random() < GeneConstants.geneInvertChance) {
        return this.inverted();
      } else {
        return this.shifted();
      }
    }
    inverted() {
      return new _Gene(1 - this.value);
    }
    shifted() {
      const shift = Math.random() * GeneConstants.shiftRange - GeneConstants.shiftRange / 2;
      let shifted = this.value + shift;
      if (shifted < 0) {
        shifted = 0;
      }
      if (shifted > 1) {
        shifted = 1;
      }
      return new _Gene(shifted);
    }
    static bucketDifference(geneA, geneB) {
      const a = geneA.bucket;
      const b = geneB.bucket;
      return Math.abs(a - b);
    }
  };

  // src/simulation/genetics/chromosome.ts
  var Chromosome = class {
    static chromosomeName = "";
    static geneKeys = [];
    genes;
    constructor(genes) {
      this.genes = genes;
    }
    toString() {
      return Object.keys(this.genes).map((key) => this.genes[key].toString()).join("");
    }
    mutatedCopy(invert) {
      const newGenes = {};
      for (const key of Object.keys(this.genes)) {
        newGenes[key] = this.genes[key].mutated(invert);
      }
      return new this.constructor(newGenes);
    }
    static similar(chromosomeA, chromosomeB, maxTotalSteps) {
      let totalSteps = 0;
      for (const key of Object.keys(chromosomeA.genes)) {
        const geneA = chromosomeA.genes[key];
        const geneB = chromosomeB.genes[key];
        totalSteps += Gene.bucketDifference(geneA, geneB);
      }
      return totalSteps <= maxTotalSteps;
    }
  };
  var RelativeChromosome = class extends Chromosome {
    constructor(genes) {
      super(genes);
      this.scaleGenes();
    }
    scaleGenes() {
      const totalValue = Object.values(this.genes).reduce((sum, gene) => sum + gene.value, 0);
      if (totalValue === 0) {
        const equalValue = 1 / Object.keys(this.genes).length;
        for (const key of Object.keys(this.genes)) {
          this.genes[key] = new Gene(equalValue);
        }
      } else {
        for (const key of Object.keys(this.genes)) {
          const gene = this.genes[key];
          this.genes[key] = new Gene(gene.value / totalValue);
        }
      }
    }
  };

  // src/simulation/genetics/brain.ts
  var BrainGenes = /* @__PURE__ */ ((BrainGenes2) => {
    BrainGenes2["Move"] = "Move";
    BrainGenes2["Eat"] = "Eat";
    BrainGenes2["Reproduce"] = "Reproduce";
    return BrainGenes2;
  })(BrainGenes || {});
  var Brain = class _Brain extends RelativeChromosome {
    static chromosomeName = "Brain";
    static geneKeys = Object.values(BrainGenes);
    static neutral() {
      const neutralGenes = {};
      neutralGenes["Move" /* Move */] = new Gene(2 / 9);
      neutralGenes["Eat" /* Eat */] = new Gene(5 / 9);
      neutralGenes["Reproduce" /* Reproduce */] = new Gene(2 / 9);
      return new _Brain(neutralGenes);
    }
    get move() {
      return this.genes["Move" /* Move */];
    }
    get eat() {
      return this.genes["Eat" /* Eat */];
    }
    get reproduce() {
      return this.genes["Reproduce" /* Reproduce */];
    }
  };

  // src/simulation/genetics/diet.ts
  var DietGenes = /* @__PURE__ */ ((DietGenes2) => {
    DietGenes2["Plant"] = "Plant";
    DietGenes2["Meat"] = "Meat";
    return DietGenes2;
  })(DietGenes || {});
  var Diet = class _Diet extends RelativeChromosome {
    static chromosomeName = "Diet";
    static geneKeys = Object.values(DietGenes);
    static neutral() {
      const neutralGenes = {};
      neutralGenes["Plant" /* Plant */] = new Gene(1);
      neutralGenes["Meat" /* Meat */] = new Gene(0);
      return new _Diet(neutralGenes);
    }
    get plant() {
      return this.genes["Plant" /* Plant */];
    }
    get meat() {
      return this.genes["Meat" /* Meat */];
    }
  };

  // src/simulation/genetics/skills.ts
  var SkillsGenes = /* @__PURE__ */ ((SkillsGenes2) => {
    SkillsGenes2["PlantSearch"] = "PlantSearch";
    SkillsGenes2["Hunt"] = "Hunt";
    return SkillsGenes2;
  })(SkillsGenes || {});
  var Skills = class _Skills extends RelativeChromosome {
    static chromosomeName = "Skills";
    static geneKeys = Object.values(SkillsGenes);
    static neutral() {
      const genes = {};
      genes["PlantSearch" /* PlantSearch */] = new Gene(1 / 2);
      genes["Hunt" /* Hunt */] = new Gene(1 / 2);
      return new _Skills(genes);
    }
    learnRandom() {
      const randomKey = _Skills.geneKeys[Math.floor(Math.random() * _Skills.geneKeys.length)];
      let newValue = this.genes[randomKey].value + GeneConstants.learnImprovement;
      if (newValue > 1) {
        newValue = 1;
      }
      this.genes[randomKey] = new Gene(newValue);
    }
    get plantSearch() {
      return this.genes["PlantSearch" /* PlantSearch */];
    }
    get hunt() {
      return this.genes["Hunt" /* Hunt */];
    }
  };

  // src/simulation/genetics/traits.ts
  var TraitGenes = /* @__PURE__ */ ((TraitGenes2) => {
    TraitGenes2["Size"] = "Size";
    return TraitGenes2;
  })(TraitGenes || {});
  var Traits = class _Traits extends Chromosome {
    static chromosomeName = "Traits";
    static geneKeys = Object.values(TraitGenes);
    static neutral() {
      const genes = {};
      genes["Size" /* Size */] = new Gene(1 / 9);
      return new _Traits(genes);
    }
    get size() {
      return this.genes["Size" /* Size */];
    }
  };

  // src/simulation/individual.ts
  var Individual = class _Individual {
    // TODO: move to separate genome class
    static allChromosomes = [Brain, Diet, Traits, Skills];
    id = -1;
    // assigned by state
    birthday;
    parent;
    deathDay = null;
    eaten = false;
    starved = false;
    brain;
    diet;
    traits;
    skills;
    energy;
    children = [];
    location;
    constructor(location, birthday, parent, brain, diet, traits, skills) {
      this.location = location;
      this.birthday = birthday;
      this.parent = parent;
      this.brain = brain;
      this.diet = diet;
      this.traits = traits;
      this.skills = skills;
      this.energy = EnergyConstants.whenBorn;
    }
    toString() {
      return this.brain.toString();
    }
    toColor() {
      return Hue.genomeToColor(this.diet);
    }
    getAge(today) {
      if (this.deathDay != null) {
        return this.deathDay - this.birthday;
      }
      return today - this.birthday;
    }
    static neutral(location, birthday) {
      return new _Individual(location, birthday, null, Brain.neutral(), Diet.neutral(), Traits.neutral(), Skills.neutral());
    }
    createChild(location, today) {
      const evolvedBrain = this.brain.mutatedCopy(true);
      const evolvedDiet = this.diet.mutatedCopy(true);
      const evolvedTraits = this.traits.mutatedCopy(false);
      const evolvedSkills = this.skills.mutatedCopy(false);
      const baby = new _Individual(location, today, this, evolvedBrain, evolvedDiet, evolvedTraits, evolvedSkills);
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
      const offspringCounts = offspring.map((generation2) => generation2.filter((individual) => includeDead || individual.deathDay == null).length);
      if (offspringCounts[offspringCounts.length - 1] == 0) {
        offspringCounts.pop();
      }
      return offspringCounts;
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
          if (nextParent.deathDay != null) {
            parents.push(nextParent);
            break;
          }
          parents.push(nextParent);
        }
      }
      return parents;
    }
    hasHunger() {
      return this.energy <= EnergyConstants.max - 1;
    }
    dieEaten(today) {
      this.eaten = true;
      this.die(today);
    }
    dieStarved(today) {
      this.starved = true;
      this.die(today);
    }
    die(today) {
      this.deathDay = today;
      if (this.parent) {
        this.parent.children = this.parent.children.filter((c) => c.id !== this.id);
      }
      for (let child of this.children) {
        child.parent = null;
      }
    }
  };

  // src/simulation/metrics.ts
  var SimulationMetrics = class {
    latestDayMetrics = new DayMetrics();
    dayMetrics = [this.latestDayMetrics];
    addnewDay() {
      this.latestDayMetrics = new DayMetrics();
      this.dayMetrics.push(this.latestDayMetrics);
    }
    flush() {
      const flushed = this.dayMetrics;
      this.dayMetrics = [];
      return flushed;
    }
    calculateRemainingMetrics(state) {
      this.latestDayMetrics.calculateRemainingMetrics(state);
    }
  };
  var DayMetrics = class {
    day = 0;
    population = new PopulationMetrics();
    food = new FoodMetrics();
    genetics = new GeneticsMetrics();
    dietDistribution = new DietDistributionMetrics();
    starvedDietDistribution = new DietDistributionMetrics();
    eatenDietDistribution = new DietDistributionMetrics();
    actions = new ActionMetrics();
    calculateRemainingMetrics(state) {
      const living = state.individuals.filter((i) => i.deathDay == null);
      const dead = state.individuals.filter((i) => i.deathDay != null);
      const starved = dead.filter((i) => i.starved);
      const eaten = dead.filter((i) => i.eaten);
      this.day = state.day;
      this.population.calculate(state.day, state.individuals, living, dead, eaten, starved);
      this.food.calculate(state.space);
      this.genetics.calculate(state);
      this.dietDistribution.calculate(living);
      this.starvedDietDistribution.calculate(starved);
      this.eatenDietDistribution.calculate(eaten);
    }
  };
  var PopulationMetrics = class {
    alive = 0;
    born = 0;
    dead = 0;
    eaten = 0;
    starved = 0;
    calculate(day, all, living, dead, eaten = [], starved = []) {
      this.alive = living.length;
      this.born = all.filter((i) => i.birthday === day).length;
      this.dead = dead.length;
      this.eaten = eaten.length;
      this.starved = starved.length;
    }
  };
  var FoodMetrics = class {
    plantDensity = 0;
    calculate(space) {
      let totalPlants = 0;
      let count = 0;
      for (let x = 0; x < space.width; x++) {
        for (let y = 0; y < space.height; y++) {
          totalPlants += space.plants[x][y];
          count++;
        }
      }
      this.plantDensity = count > 0 ? totalPlants / count : 0;
    }
  };
  var GeneticsMetrics = class {
    chromosomes = [];
    constructor() {
      for (const chromosome of Individual.allChromosomes) {
        this.chromosomes.push(new ChromosomeMetrics(chromosome.toString(), chromosome.geneKeys));
      }
    }
    calculate(state) {
      for (const individual of state.individuals) {
        if (individual.deathDay != null) {
          continue;
        }
        const chromosomes = [individual.brain, individual.diet, individual.traits, individual.skills];
        for (let i = 0; i < chromosomes.length; i++) {
          this.chromosomes[i].calculate(chromosomes[i]);
        }
      }
    }
  };
  var ChromosomeMetrics = class {
    genes = [];
    name = "";
    constructor(name, geneNames) {
      this.name = name;
      for (const geneName of geneNames) {
        this.genes.push(new GeneMetrics(geneName));
      }
    }
    calculate(chromosome) {
      const geneKeys = Object.keys(chromosome.genes);
      for (let i = 0; i < geneKeys.length; i++) {
        const gene = chromosome.genes[geneKeys[i]];
        this.genes[i].counts[gene.bucket - 1]++;
      }
    }
  };
  var GeneMetrics = class {
    name = "";
    counts;
    constructor(name) {
      this.name = name;
      this.counts = [];
      for (let i = 1; i <= 9; i++) {
        this.counts.push(0);
      }
    }
  };
  var DietDistributionMetrics = class {
    bucketCounts;
    constructor() {
      this.bucketCounts = [];
      for (let i = 0; i < 9; i++) {
        this.bucketCounts[i] = 0;
      }
    }
    calculate(living) {
      for (const individual of living) {
        const bucket = individual.diet.meat.bucket;
        this.bucketCounts[bucket - 1]++;
      }
    }
  };
  var ActionMetrics = class {
    idle = 0;
    growUp = 0;
    move = 0;
    eat = 0;
    plantSearch = 0;
    hunt = 0;
    plantSearchSuccess = 0;
    plantSearchFail = 0;
    huntSuccess = 0;
    huntFail = 0;
    reproduce = 0;
    offspringCounts = [];
    logGrowUp() {
      this.growUp++;
    }
    logIdle() {
      this.idle++;
    }
    logMove() {
      this.move++;
    }
    logPlantSearch(succesful) {
      this.eat++;
      this.plantSearch++;
      if (succesful) {
        this.plantSearchSuccess++;
      } else {
        this.plantSearchFail++;
      }
    }
    logHunt(succesful) {
      this.eat++;
      this.hunt++;
      if (succesful) {
        this.huntSuccess++;
      } else {
        this.huntFail++;
      }
    }
    logReproduce(count) {
      this.reproduce++;
      this.offspringCounts.push(count);
    }
  };

  // src/simulation/space.ts
  var XY = class {
    x;
    y;
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  };
  var Space = class {
    width;
    height;
    plants = [];
    animals = [];
    huntingRange = [];
    constructor(width, height) {
      this.width = width;
      this.height = height;
      for (let x = 0; x < width; x++) {
        this.plants[x] = [];
        this.animals[x] = [];
        this.huntingRange[x] = [];
        for (let y = 0; y < height; y++) {
          const xy = new XY(x, y);
          this.plants[x][y] = EnvironmentConstants.initialPlantAmount;
          this.animals[x][y] = [];
          this.huntingRange[x][y] = this.getHuntingRange(xy);
        }
      }
    }
    randomEmptyLocation() {
      const maxAttempts = 10 * this.width * this.height * 10;
      let x, y;
      let attempts = 0;
      do {
        x = Math.floor(Math.random() * this.width);
        y = Math.floor(Math.random() * this.height);
        attempts++;
      } while (this.animals[x][y].length > 0 && attempts < maxAttempts);
      return new XY(x, y);
    }
    randomNeighbourLocation(xy, maxDistance) {
      const next = new XY(
        xy.x + Math.round(Math.random() * 2 * maxDistance - maxDistance),
        xy.y + Math.round(Math.random() * 2 * maxDistance - maxDistance)
      );
      return this.wrapAround(next);
    }
    wrapAround(xy) {
      const wrappedX = this.wrap(xy.x, this.width);
      const wrappedY = this.wrap(xy.y, this.height);
      return new XY(wrappedX, wrappedY);
    }
    wrap(value, max) {
      if (value < 0) return max - 1;
      if (value >= max) return 0;
      return value;
    }
    removeAnimal(individual) {
      const x = individual.location.x;
      const y = individual.location.y;
      if (this.animals[x] && this.animals[x][y]) {
        const index = this.animals[x][y].indexOf(individual);
        if (index !== -1) {
          this.animals[x][y].splice(index, 1);
        }
      }
    }
    addAnimal(individual) {
      const x = individual.location.x;
      const y = individual.location.y;
      if (this.animals[x] == void 0) {
        this.animals[x] = [];
      }
      if (this.animals[x][y] == void 0) {
        this.animals[x][y] = [];
      }
      this.animals[x][y].push(individual);
    }
    moveIndividual(individual, next) {
      const current = individual.location;
      const index = this.animals[current.x][current.y].indexOf(individual);
      if (index !== -1) {
        this.animals[current.x][current.y].splice(index, 1);
        if (this.animals[current.x][current.y] == void 0) {
          this.animals[current.x][current.y] = [];
        }
        const wrapped = this.wrapAround(next);
        if (this.animals[wrapped.x][wrapped.y] == void 0) {
          this.animals[wrapped.x][wrapped.y] = [];
        }
        this.animals[wrapped.x][wrapped.y].push(individual);
      }
      individual.location = this.wrapAround(next);
    }
    getHuntingRange(xy) {
      const distance = Constants.huntingDistance;
      const x = xy.x;
      const y = xy.y;
      const tiles = [];
      for (let dx = -distance; dx <= distance; dx++) {
        const nx = this.wrap(x + dx, this.width);
        for (let dy = -distance; dy <= distance; dy++) {
          const ny = this.wrap(y + dy, this.height);
          tiles.push(new XY(nx, ny));
        }
      }
      return tiles;
    }
  };

  // src/simulation/state.ts
  var State = class {
    day;
    individualsById = /* @__PURE__ */ new Map();
    individuals = [];
    individualIdCounter = -1;
    environment;
    space;
    metrics = new SimulationMetrics();
    constructor() {
      this.day = 0;
      this.space = new Space(160, 100);
      this.environment = new Environment(this.space);
      this.createInitialIndividuals();
    }
    createInitialIndividuals() {
      const amount = 20;
      for (let i = 0; i < amount; i++) {
        const location = this.space.randomEmptyLocation();
        const brain = Brain.neutral().mutatedCopy(false);
        const diet = Diet.neutral().mutatedCopy(false);
        const traits = Traits.neutral().mutatedCopy(false);
        const skills = Skills.neutral().mutatedCopy(false);
        const individual = new Individual(location, this.day, null, brain, diet, traits, skills);
        this.saveIndividual(individual);
      }
    }
    nextIndividualId() {
      this.individualIdCounter++;
      return this.individualIdCounter;
    }
    saveIndividual(individual) {
      individual.id = this.nextIndividualId();
      this.individualsById.set(individual.id, individual);
      this.individuals.push(individual);
      this.space.addAnimal(individual);
    }
    updateEnvironment() {
      this.environment.nextDay();
    }
    livingIndividualCount() {
      return this.individuals.filter((individual) => individual.deathDay == null).length;
    }
    archiveDeadIndividuals() {
      for (let [individualId, individual] of this.individualsById.entries()) {
        if (individual.deathDay != null) {
          this.space.removeAnimal(individual);
          this.individualsById.delete(individualId);
        }
      }
      this.individuals = Array.from(this.individualsById.values());
    }
  };

  // src/ui/charts/baseChart.ts
  var BaseChart = class _BaseChart {
    constructor(canvasId) {
      this.canvasId = canvasId;
    }
    static MAX_DAYS = 550;
    static TARGET_DAYS = 500;
    yAxisLimit = -1;
    getExcessDays(currentDays) {
      if (currentDays >= _BaseChart.MAX_DAYS) {
        return currentDays - _BaseChart.TARGET_DAYS - 1;
      }
      return 0;
    }
    getXRange(firstDay, lastDay) {
      const start = firstDay ?? 0;
      const end = lastDay ?? 0;
      const min = Math.floor(start / 50) * 50;
      const max = Math.ceil(end / 50) * 50;
      return { min, max: Math.max(min + 50, max) };
    }
    updateYAxisLimit(dataLimit) {
      const roundedLimit = this.roundUpYLimit(dataLimit);
      const dataExceedsGraph = roundedLimit > this.yAxisLimit;
      const graphExceedsData = dataLimit < this.yAxisLimit * 0.4;
      if (dataExceedsGraph || graphExceedsData) {
        this.yAxisLimit = roundedLimit;
      }
    }
    roundUpYLimit(value) {
      if (value <= 25) {
        return 25;
      }
      const roundTo = value > 1e3 ? 250 : value > 500 ? 100 : 50;
      return Math.ceil(value / roundTo) * roundTo;
    }
    getCanvas() {
      return document.getElementById(this.canvasId);
    }
  };

  // src/ui/charts/chartLayout.ts
  var MARGIN = {
    top: 32,
    right: 48,
    bottom: 48,
    left: 8
  };
  var VISIBLE_DAYS = 300;
  var MATRIX_CANVAS_HEIGHT = 150;
  var STACKED_BAR_CANVAS_HEIGHT = 300;
  var CANVAS_WIDTH = MARGIN.left + VISIBLE_DAYS + MARGIN.right;
  var TITLE_FONT = "bold 16px sans-serif";
  var AXIS_FONT = "12px sans-serif";
  var LEGEND_FONT = "12px sans-serif";
  function getContext(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("failed to get canvas rendering context");
    }
    return ctx;
  }
  function applyTextStyle(ctx) {
    ctx.fillStyle = "#111";
    ctx.strokeStyle = "#111";
    ctx.textBaseline = "middle";
    ctx.font = AXIS_FONT;
  }
  function resizeCanvas(canvas, width, height) {
    const ctx = getContext(canvas);
    const dpr = Math.round(window.devicePixelRatio) || 1;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    const resized = canvas.width !== pixelWidth || canvas.height !== pixelHeight;
    if (resized) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    return ctx;
  }
  function plotArea(canvasWidth, canvasHeight) {
    return {
      x: MARGIN.left,
      y: MARGIN.top,
      w: Math.max(1, canvasWidth - MARGIN.left - MARGIN.right),
      h: Math.max(1, canvasHeight - MARGIN.top - MARGIN.bottom)
    };
  }
  function yMapper(minValue, maxValue, plotH) {
    const range = Math.max(1e-9, maxValue - minValue);
    return (value) => (1 - (value - minValue) / range) * plotH;
  }
  function drawXAxis(ctx, area, startDay) {
    applyTextStyle(ctx);
    const axisY = area.y + area.h + 0.5;
    ctx.beginPath();
    ctx.moveTo(area.x, axisY);
    ctx.lineTo(area.x + area.w, axisY);
    ctx.stroke();
    const endDay = startDay + area.w - 1;
    const firstTick = Math.ceil(startDay / 100) * 100;
    ctx.textAlign = "center";
    for (let tickDay = firstTick; tickDay <= endDay; tickDay += 100) {
      const x = area.x + (tickDay - startDay) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 4);
      ctx.stroke();
      ctx.fillText(String(tickDay), x, axisY + 10);
    }
  }
  function drawYAxisFixed(ctx, area, ticks, label) {
    applyTextStyle(ctx);
    const axisX = area.x + area.w;
    ctx.beginPath();
    ctx.moveTo(axisX, area.y);
    ctx.lineTo(axisX, area.y + area.h);
    ctx.stroke();
    ctx.textAlign = "left";
    for (const tick of ticks) {
      const normalized = (tick - 1) / 8;
      const y = area.y + area.h - normalized * area.h + 0.5;
      ctx.beginPath();
      ctx.moveTo(axisX, y);
      ctx.lineTo(axisX + 4, y);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(area.x + area.w + 15, area.y + area.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
  function drawYAxisLinear(ctx, area, minValue, maxValue) {
    applyTextStyle(ctx);
    const axisX = area.x + area.w;
    ctx.beginPath();
    ctx.moveTo(axisX, area.y);
    ctx.lineTo(axisX, area.y + area.h);
    ctx.stroke();
    const tickCount = 5;
    ctx.textAlign = "left";
    for (let i = 0; i <= tickCount; i++) {
      const value = minValue + (maxValue - minValue) * (i / tickCount);
      const y = area.y + area.h - i / tickCount * area.h + 0.5;
      ctx.beginPath();
      ctx.moveTo(axisX, y);
      ctx.lineTo(axisX + 4, y);
      ctx.stroke();
      ctx.fillText(formatYAxisTick(value), axisX + 6, y);
    }
  }
  function drawTitle(ctx, canvasWidth, text) {
    applyTextStyle(ctx);
    ctx.font = TITLE_FONT;
    ctx.textAlign = "center";
    ctx.fillText(text, canvasWidth * 0.4, 14);
  }
  function clearAll(ctx, canvasWidth, canvasHeight) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  }
  function formatYAxisTick(value) {
    return value.toFixed(0);
  }

  // src/ui/charts/matrixChart.ts
  var MatrixChart = class extends BaseChart {
    constructor(canvasId, geneLabel, lowLabel, highLabel, hue, getGeneMetrics, relative) {
      super(canvasId);
      this.geneLabel = geneLabel;
      this.lowLabel = lowLabel;
      this.highLabel = highLabel;
      this.hue = hue;
      this.getGeneMetrics = getGeneMetrics;
      this.relative = relative;
    }
    cachedData = [];
    update(newMetrics) {
      const canvas = this.getCanvas();
      if (!canvas) return;
      for (const m of newMetrics) {
        const geneMetrics = this.getGeneMetrics(m);
        const total = m.population.alive || 1;
        for (let bucket = 1; bucket <= 9; bucket++) {
          let value = geneMetrics.counts[bucket - 1] ?? 0;
          if (this.relative) {
            value /= total;
          }
          this.cachedData.push({ x: m.day, y: bucket, color: this.cellColor(value) });
        }
      }
      const excessDays = this.getExcessDays(this.cachedData.length / 9);
      if (excessDays > 0) {
        this.cachedData.splice(0, excessDays * 9);
      }
      const ctx = resizeCanvas(canvas, CANVAS_WIDTH, MATRIX_CANVAS_HEIGHT);
      const area = plotArea(CANVAS_WIDTH, MATRIX_CANVAS_HEIGHT);
      const dayMap = this.buildDayMap();
      const lastDay = this.cachedData[this.cachedData.length - 1]?.x ?? 0;
      const startDay = Math.max(0, lastDay - (VISIBLE_DAYS - 1));
      clearAll(ctx, CANVAS_WIDTH, MATRIX_CANVAS_HEIGHT);
      drawTitle(ctx, CANVAS_WIDTH, this.geneLabel);
      drawYAxisFixed(ctx, area, [1, 2, 3, 4, 5, 6, 7, 8, 9], `${this.lowLabel} <-> ${this.highLabel}`);
      drawXAxis(ctx, area, startDay);
      this.drawAllData(ctx, area, dayMap, startDay);
    }
    buildDayMap() {
      const map = /* @__PURE__ */ new Map();
      for (const point of this.cachedData) {
        const existing = map.get(point.x);
        if (existing) {
          existing.push(point);
        } else {
          map.set(point.x, [point]);
        }
      }
      return map;
    }
    drawAllData(ctx, area, dayMap, startDay) {
      const sortedDays = [...dayMap.keys()].sort((a, b) => a - b);
      const columns = sortedDays.map((day) => ({
        x: area.x + (day - startDay),
        cells: (dayMap.get(day) ?? []).map((point) => ({
          y: point.y,
          color: point.color
        }))
      }));
      this.drawColumns(ctx, area, columns);
    }
    drawColumns(ctx, area, columns) {
      const cellHeight = area.h / 9;
      for (const column of columns) {
        if (column.x < area.x || column.x >= area.x + area.w) {
          continue;
        }
        for (const cell of column.cells) {
          if (cell.color == "") {
            continue;
          }
          const y = area.y + area.h - cell.y * cellHeight;
          ctx.fillStyle = cell.color;
          ctx.fillRect(column.x, y, 1, Math.ceil(cellHeight));
        }
      }
    }
    cellColor(value) {
      if (value === 0) {
        return "";
      }
      const lightness = 1 - value * 1;
      const [r, g, b] = Hue.hslToRgb(this.hue, Hue.defaultSaturation, lightness);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // src/ui/charts/stackedBarChart.ts
  var StackedBarChart = class _StackedBarChart extends BaseChart {
    constructor(canvasId, title, series) {
      super(canvasId);
      this.title = title;
      this.series = series;
      this.cachedDatasets = series.map(() => []);
    }
    cachedDays = [];
    cachedDatasets = [];
    lastRenderedDay = -1;
    lastStartDay = 0;
    static fromDistribution(canvasId, title, bucketCount, getBuckets, colors, labels) {
      if (colors.length != bucketCount) {
        console.warn(`Expected ${bucketCount} colors but received ${colors.length} colors.`);
      }
      return new _StackedBarChart(
        canvasId,
        title,
        Array.from({ length: bucketCount }, (_, i) => ({
          label: labels[i],
          getValue: (m) => getBuckets(m)[i] ?? 0,
          color: colors[i]
        }))
      );
    }
    update(newMetrics) {
      const timelineMismatched = newMetrics.length > 0 && this.cachedDays.length > 0 && newMetrics[0].day <= this.cachedDays[this.cachedDays.length - 1];
      if (timelineMismatched) {
        this.cachedDays = [];
        this.cachedDatasets = this.series.map(() => []);
        this.lastRenderedDay = -1;
        this.lastStartDay = 0;
      }
      for (const m of newMetrics) {
        this.cachedDays.push(m.day);
        for (let s = 0; s < this.series.length; s++) {
          this.cachedDatasets[s].push(this.series[s].getValue(m));
        }
      }
      const excess = this.getExcessDays(this.cachedDays.length);
      if (excess > 0) {
        this.cachedDays.splice(0, excess);
        for (let s = 0; s < this.series.length; s++) {
          this.cachedDatasets[s].splice(0, excess);
        }
      }
      const canvas = this.getCanvas();
      if (!canvas) {
        return;
      }
      const ctx = resizeCanvas(canvas, CANVAS_WIDTH, STACKED_BAR_CANVAS_HEIGHT);
      const area = plotArea(CANVAS_WIDTH, STACKED_BAR_CANVAS_HEIGHT);
      const lastDay = this.cachedDays[this.cachedDays.length - 1] ?? 0;
      const startDay = Math.max(0, lastDay - (VISIBLE_DAYS - 1));
      this.updateYAxisLimit(this.getDataMaxY());
      const maxY = this.yAxisLimit;
      clearAll(ctx, CANVAS_WIDTH, STACKED_BAR_CANVAS_HEIGHT);
      drawTitle(ctx, CANVAS_WIDTH, this.title);
      drawYAxisLinear(ctx, area, 0, maxY);
      drawXAxis(ctx, area, startDay);
      this.drawLegend(ctx, area);
      this.drawColumns(ctx, area, this.collectAllColumns(startDay, maxY));
    }
    collectAllColumns(startDay, maxY) {
      const columns = [];
      for (let i = 0; i < this.cachedDays.length; i++) {
        columns.push(this.buildColumn(this.cachedDays[i], i, startDay, maxY));
      }
      return columns;
    }
    collectNewColumns(startDay, maxY) {
      const columns = [];
      for (let i = 0; i < this.cachedDays.length; i++) {
        const day = this.cachedDays[i];
        if (day <= this.lastRenderedDay) {
          continue;
        }
        columns.push(this.buildColumn(day, i, startDay, maxY));
      }
      return columns;
    }
    buildColumn(day, dayIndex, startDay, maxY) {
      const area = plotArea(CANVAS_WIDTH, STACKED_BAR_CANVAS_HEIGHT);
      const mapY = yMapper(0, maxY, area.h);
      let cumulative = 0;
      const segments = [];
      for (let s = 0; s < this.series.length; s++) {
        const value = this.cachedDatasets[s][dayIndex] ?? 0;
        const next = cumulative + value;
        const top = area.y + mapY(next);
        const bottom = area.y + mapY(cumulative);
        segments.push({
          y: top,
          height: Math.max(0, bottom - top),
          color: this.series[s].color
        });
        cumulative = next;
      }
      return {
        x: area.x + (day - startDay),
        segments
      };
    }
    drawColumns(ctx, area, columns) {
      for (const column of columns) {
        if (column.x < area.x || column.x >= area.x + area.w) {
          continue;
        }
        for (const segment of column.segments) {
          if (segment.height <= 0) {
            continue;
          }
          ctx.fillStyle = segment.color;
          ctx.fillRect(column.x, segment.y, 1, Math.ceil(segment.height));
        }
      }
    }
    drawLegend(ctx, area) {
      const startY = area.y + area.h + 30;
      const lineHeight = 12;
      const boxSize = 8;
      const maxX = area.x + area.w;
      ctx.font = LEGEND_FONT;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      let x = area.x;
      let y = startY;
      for (const series of this.series) {
        const labelWidth = ctx.measureText(series.label).width;
        const itemWidth = boxSize + 4 + labelWidth + 10;
        if (x + itemWidth > maxX) {
          x = area.x;
          y += lineHeight;
        }
        ctx.fillStyle = series.color;
        ctx.fillRect(x, y - boxSize / 2, boxSize, boxSize);
        ctx.fillStyle = "#111";
        ctx.fillText(series.label, x + boxSize + 4, y);
        x += itemWidth;
      }
    }
    getDataMaxY() {
      let max = 1;
      for (let i = 0; i < this.cachedDays.length; i++) {
        let total = 0;
        for (let s = 0; s < this.series.length; s++) {
          total += this.cachedDatasets[s][i] ?? 0;
        }
        max = Math.max(max, total);
      }
      return max;
    }
  };

  // src/ui/chartSections.ts
  var ChartSections = class {
    sections;
    constructor() {
      let geneCharts = [];
      for (let i = 0; i < Individual.allChromosomes.length; i++) {
        const chromosome = Individual.allChromosomes[i];
        const chromosomeName = chromosome.chromosomeName;
        for (let j = 0; j < chromosome.geneKeys.length; j++) {
          const name = chromosome.geneKeys[j];
          geneCharts.push(new MatrixChart(`gene-${name}-chart`, `${chromosomeName}: ${name}`, "Low", "High", Hue.blueHue, (m) => m.genetics.chromosomes[i].genes[j], true));
        }
      }
      this.sections = [
        {
          name: "Diet & actions",
          charts: [
            StackedBarChart.fromDistribution(
              "diet-chart",
              "Individuals per diet",
              9,
              (d) => d.dietDistribution.bucketCounts,
              Hue.greenToRedRange,
              ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]
            ),
            new StackedBarChart("action-breakdown-chart", "Actions", [
              { label: "Grow up", getValue: (d) => d.actions.growUp, color: Color.redPink },
              { label: "Move", getValue: (d) => d.actions.move, color: Color.blue },
              { label: "Eat plant", getValue: (d) => d.actions.plantSearch, color: Color.green },
              { label: "Eat meat", getValue: (d) => d.actions.hunt, color: Color.red },
              { label: "Reproduce", getValue: (d) => d.actions.reproduce, color: Color.blueSky }
            ]),
            new StackedBarChart("eat-plant-breakdown-chart", "Plant search outcome", [
              { label: "Plant found", getValue: (d) => d.actions.plantSearchSuccess, color: Color.green },
              { label: "Nothing found", getValue: (d) => d.actions.plantSearchFail, color: Color.redPink }
            ]),
            new StackedBarChart("eat-meat-breakdown-chart", "Hunting outcome", [
              { label: "Prey escaped", getValue: (d) => d.actions.huntFail, color: Color.redPink },
              { label: "Prey caught", getValue: (d) => d.actions.huntSuccess, color: Color.red }
            ]),
            new StackedBarChart("eaten-starved-chart", "Eaten vs starved", [
              { label: "Eaten", getValue: (d) => d.population.eaten, color: Color.red },
              { label: "Starved", getValue: (d) => d.population.starved, color: Color.purple }
            ]),
            StackedBarChart.fromDistribution(
              "starved-chart",
              "Starved per diet",
              9,
              (d) => d.starvedDietDistribution.bucketCounts,
              Hue.greenToRedRange,
              ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]
            ),
            StackedBarChart.fromDistribution(
              "eaten-chart",
              "Eaten per diet",
              9,
              (d) => d.eatenDietDistribution.bucketCounts,
              Hue.greenToRedRange,
              ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]
            )
          ]
        },
        {
          name: "Gene pool",
          charts: geneCharts
        }
      ];
      this.buildDOM();
    }
    buildDOM() {
      const container = document.getElementById("charts");
      for (const section of this.sections) {
        const heading = document.createElement("h3");
        heading.textContent = section.name;
        container.appendChild(heading);
        const sectionElement = document.createElement("div");
        sectionElement.className = "chart-section";
        for (const chart of section.charts) {
          const chartContainer = document.createElement("div");
          chartContainer.className = "chart-container";
          if (chart instanceof MatrixChart) {
            chartContainer.classList.add("small-chart");
          } else {
            chartContainer.classList.add("normal-chart");
          }
          const canvas = document.createElement("canvas");
          canvas.id = chart.canvasId;
          chartContainer.appendChild(canvas);
          sectionElement.appendChild(chartContainer);
        }
        container.appendChild(sectionElement);
      }
    }
    update(dayMetrics) {
      for (const section of this.sections) {
        for (const chart of section.charts) {
          chart.update(dayMetrics);
        }
      }
    }
  };

  // src/ui/map.ts
  var PIXEL_SIZE = 3;
  var MapFrame = class {
    canvas;
    ctx;
    imageData = null;
    data = null;
    canvasWidth = 0;
    canvasHeight = 0;
    constructor(container) {
      this.canvas = document.createElement("canvas");
      container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");
    }
    beginFrame(width, height) {
      const dimensionsChanged = this.canvas.width !== width || this.canvas.height !== height;
      if (dimensionsChanged) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.imageData = this.ctx.createImageData(width, height);
        this.data = this.imageData.data;
      }
    }
    setPixel(x, y, r, g, b) {
      if (!this.data) return;
      for (let px = 0; px < PIXEL_SIZE; px++) {
        for (let py = 0; py < PIXEL_SIZE; py++) {
          const index = ((y * PIXEL_SIZE + py) * this.canvasWidth + (x * PIXEL_SIZE + px)) * 4;
          this.data[index] = r;
          this.data[index + 1] = g;
          this.data[index + 2] = b;
          this.data[index + 3] = 255;
        }
      }
    }
    endFrame() {
      if (this.imageData) {
        this.ctx.putImageData(this.imageData, 0, 0);
      }
    }
  };
  var SimulationMap = class {
    mapFrame;
    colorMapping;
    constructor(container, colorMapping2) {
      this.mapFrame = new MapFrame(container);
      this.colorMapping = colorMapping2;
    }
    update(space) {
      const canvasWidth = space.width * PIXEL_SIZE;
      const canvasHeight = space.height * PIXEL_SIZE;
      this.mapFrame.beginFrame(canvasWidth, canvasHeight);
      for (let x = 0; x < space.width; x++) {
        for (let y = 0; y < space.height; y++) {
          const { r, g, b } = this.colorMapping(space, x, y);
          this.mapFrame.setPixel(x, y, r, g, b);
        }
      }
      this.mapFrame.endFrame();
    }
  };

  // src/ui/mapSections.ts
  function densityColor(space, x, y, minMeat, maxMeat, highDenisty) {
    const animalCount = space.animals[x][y].filter((individual) => individual.diet.meat.value >= minMeat && individual.diet.meat.value <= maxMeat).length;
    if (animalCount === 0) return { r: 255, g: 255, b: 255 };
    const density = Math.min(animalCount / highDenisty, 1);
    const brightness = Math.floor(255 - density * 200);
    return { r: brightness, g: brightness, b: 255 };
  }
  function meatColor(space, x, y, max) {
    const animals = space.animals[x][y];
    if (animals.length === 0) return { r: 255, g: 255, b: 255 };
    let meat = max ? 0 : 1;
    for (const individual of animals) {
      if (max) {
        if (individual.diet.meat.value > meat) {
          meat = individual.diet.meat.value;
        }
      } else {
        if (individual.diet.meat.value < meat) {
          meat = individual.diet.meat.value;
        }
      }
    }
    const plant = 1 - meat;
    return { r: Math.floor(meat * 255), g: Math.floor(plant * 255), b: 0 };
  }
  function plantsColor(space, x, y) {
    const brightness = Math.floor(255 - space.plants[x][y] * 150);
    return { r: brightness, g: 255, b: brightness };
  }
  var MAP_CONFIGS = [
    { label: "Plants", colorMapping: plantsColor },
    { label: "Density", colorMapping: (space, x, y) => densityColor(space, x, y, 0, 1, 3) },
    { label: "Herbivore density", colorMapping: (space, x, y) => densityColor(space, x, y, 0, 1 / 3, 2) },
    { label: "Omnivore density", colorMapping: (space, x, y) => densityColor(space, x, y, 1 / 3, 2 / 3, 2) },
    { label: "Carnivore density", colorMapping: (space, x, y) => densityColor(space, x, y, 2 / 3, 1, 2) },
    { label: "Maximum carni omni herbi-vore (red brown green)", colorMapping: (space, x, y) => meatColor(space, x, y, true) }
  ];
  var MapSections = class {
    maps;
    constructor() {
      this.maps = [];
      this.buildDOM();
    }
    buildDOM() {
      const container = document.getElementById("maps");
      for (const config of MAP_CONFIGS) {
        const mapContainer = document.createElement("div");
        mapContainer.className = "map-container";
        const label = document.createElement("p");
        label.textContent = config.label;
        mapContainer.appendChild(label);
        container.appendChild(mapContainer);
        this.maps.push(new SimulationMap(mapContainer, config.colorMapping));
      }
    }
    update(space) {
      for (const map of this.maps) {
        map.update(space);
      }
    }
  };

  // src/ui/ui.ts
  window.onload = () => new UI();
  var UI = class {
    state;
    iterations;
    loop;
    charts;
    maps;
    constructor() {
      this.state = new State();
      this.iterations = new Iterations(this.state);
      this.loop = new IterationLoop(this.iterations, this);
      this.loop.onUpdate = () => this.updateUI();
      this.charts = new ChartSections();
      this.maps = new MapSections();
      this.initSliders();
      this.initButtons();
      this.updateUI();
    }
    initSliders() {
      this.initJumpsPerSecSlider();
      this.initIterationsPerJumpSlider();
    }
    initJumpsPerSecSlider() {
      const min = 5;
      const max = 40;
      const step = 5;
      const slider = document.getElementById("jumps-per-sec");
      slider.min = String(min);
      slider.max = String(max);
      slider.step = String(step);
      slider.value = String(this.loop.jumpsPerSecond);
      document.getElementById("jumps-per-sec-value").textContent = String(this.loop.jumpsPerSecond);
      slider.addEventListener("input", () => {
        this.loop.jumpsPerSecond = parseInt(slider.value);
        document.getElementById("jumps-per-sec-value").textContent = slider.value;
        if (this.loop.isPlaying) this.loop.play();
      });
    }
    initIterationsPerJumpSlider() {
      const options = [1, 2, 5, 10, 25, 50];
      const defaultIndex = options.indexOf(this.loop.iterationsPerJump);
      const min = 0;
      const max = options.length - 1;
      const slider = document.getElementById("iterations-per-jump");
      slider.min = String(min);
      slider.max = String(max);
      slider.step = "1";
      slider.value = String(defaultIndex);
      this.loop.iterationsPerJump = options[defaultIndex];
      document.getElementById("iterations-per-jump-value").textContent = String(this.loop.iterationsPerJump);
      slider.addEventListener("input", () => {
        this.loop.iterationsPerJump = options[parseInt(slider.value)];
        document.getElementById("iterations-per-jump-value").textContent = String(this.loop.iterationsPerJump);
      });
    }
    initButtons() {
      document.getElementById("jump-1-btn").addEventListener(
        "click",
        () => this.jump(this.loop.iterationsPerJump)
      );
      document.getElementById("jump-1s-btn").addEventListener(
        "click",
        () => this.jump(this.loop.jumpsPerSecond * this.loop.iterationsPerJump)
      );
      document.getElementById("jump-10s-btn").addEventListener(
        "click",
        () => this.jump(this.loop.jumpsPerSecond * this.loop.iterationsPerJump * 10)
      );
      document.getElementById("play-btn").addEventListener("click", () => this.togglePlay());
    }
    jump(iterations) {
      const continueLoop = this.iterations.execute(iterations);
      if (!continueLoop) {
        this.handleSimulationEnd();
      }
      this.updateUI();
    }
    showedSimulationEndAlert = false;
    handleSimulationEnd() {
      if (this.loop.isPlaying) {
        this.togglePlay();
      }
      if (!this.showedSimulationEndAlert) {
        alert("All individuals have died. Reload the page for a new simulation.");
        this.showedSimulationEndAlert = true;
      }
    }
    togglePlay() {
      this.loop.toggle();
      this.updateUI();
    }
    updateUI() {
      document.getElementById("iteration-title").innerText = `Iteration ${this.state.day}`;
      document.getElementById("play-btn").textContent = this.loop.isPlaying ? "\u23F8 Pause" : "\u25B6 Play";
      this.maps.update(this.state.space);
      this.charts.update(this.state.metrics.flush());
    }
  };
})();
