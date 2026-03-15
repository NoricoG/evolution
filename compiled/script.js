"use strict";
(() => {
  // src/simulation/iterationLoop.ts
  var IterationLoop = class {
    iterations;
    ui;
    jumpsPerSecond = 20;
    iterationsPerJump = 30;
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
    static plantSearchAttempts = 5 + Math.round(Math.random() * 5);
    static huntAttempts = 1 + Math.round(Math.random() * 2);
    static reproductiveAge = 2;
    static maxChildrenPerReproduction = 2;
  };
  var EnvironmentConstants = class {
    static preserveRemainingFood = 0.1 + Math.random() * 0.2;
    static minFoodRegeneration = 15 + Math.round(Math.random() * 15);
    static maxFoodRegeneration = 30 + Math.round(Math.random() * 30);
    static stepFoodRegeneration = 1e-3 + Math.random() * 0.1;
  };
  var GeneConstants = class {
    static shiftRange = 0.01 + Math.random() * 0.04;
    static geneInvertChance = 1e-3 + Math.random() * 0.06;
    static learnImprovement = 0.01;
  };
  var EnergyConstants = class {
    static whenBorn = 3;
    static max = 7;
    // cost per turn, added to any action
    static anyAction = -1;
    // gain when eating
    static plantSearchAction = 3;
    static huntAction = 3;
    // no extra cost for learning
    static learnAction = 0;
    // buffer needed to reproduce, not spent but must be exceeded
    static bufferForReproduction = 4;
    // energy spent per child when reproducing
    static reproductionPerChild = -1;
  };

  // src/simulation/activities/activity.ts
  var Activity = class {
    static isPossible(_individual, _state) {
      throw new Error("Not implemented");
    }
    static execute(_individual, _state) {
      throw new Error("Not implemented");
    }
  };

  // src/simulation/activities/action.ts
  var Action = class extends Activity {
  };
  var IdleAction = class extends Action {
    static isPossible(_individual, _state) {
      return true;
    }
    static execute(_individual, state) {
      console.warn("Individual idled, this should not happen");
      return EnergyConstants.anyAction;
    }
  };
  var GrowUpAction = class extends Action {
    static isPossible(_individual, _state) {
      return true;
    }
    static execute(_individual, state) {
      state.logGrowUp();
      return EnergyConstants.anyAction;
    }
  };
  var PlantSearchAction = class extends Action {
    static isPossible(_individual, _state) {
      return true;
    }
    static execute(individual, state) {
      if (state.environment.remainingFood > 0) {
        const plantSearchSkill = individual.skills.plantSearch.value;
        let attempts = Math.round(Constants.plantSearchAttempts * (1 - individual.traits.alertness.value));
        if (attempts > state.environment.remainingFood) {
          attempts = state.environment.remainingFood;
        }
        while (attempts > 0) {
          attempts--;
          const gatherSucces = Math.random() < plantSearchSkill;
          if (gatherSucces) {
            state.environment.remainingFood--;
            state.logPlantSearch(true);
            return EnergyConstants.anyAction + EnergyConstants.plantSearchAction;
          }
        }
      }
      state.logPlantSearch(false);
      return EnergyConstants.anyAction;
    }
  };
  var HuntAction = class _HuntAction extends Action {
    static isPossible(_individual, _state) {
      return true;
    }
    static isPossibleVictim(individual, victim) {
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
    static execute(individual, state) {
      const hunterAdvantage = individual.skills.hunt.value + individual.traits.size.value;
      let attempts = Math.round(Constants.huntAttempts * (1 - individual.traits.alertness.value));
      if (attempts > state.individuals.length) {
        attempts = state.individuals.length;
      }
      while (attempts > 0) {
        attempts--;
        const victim = state.individuals[Math.floor(Math.random() * state.individuals.length)];
        if (!_HuntAction.isPossibleVictim(individual, victim)) {
          continue;
        }
        const victimAdvantage = victim.traits.size.value + victim.traits.alertness.value + victim.extraAlertness;
        const outcome = Math.random() * (hunterAdvantage + victimAdvantage);
        const succes = outcome < hunterAdvantage;
        if (succes) {
          victim.dieEaten(state.day);
          state.logHunt(true);
          return EnergyConstants.anyAction + EnergyConstants.huntAction;
        } else {
          victim.extraAlertness++;
        }
      }
      state.logHunt(false);
      return EnergyConstants.anyAction;
    }
  };
  var LearnSkillAction = class extends Action {
    static isPossible(individual, _state) {
      return individual.energy > EnergyConstants.bufferForReproduction;
    }
    static execute(individual, state) {
      individual.skills.learnRandom();
      state.logLearn();
      return EnergyConstants.anyAction + EnergyConstants.learnAction;
    }
  };
  var ReproduceAction = class extends Action {
    static isPossible(individual, state) {
      const isAdult = individual.getAge(state.day) >= Constants.reproductiveAge;
      const hasEnergy = individual.energy > EnergyConstants.bufferForReproduction;
      return isAdult && hasEnergy;
    }
    static execute(individual, state) {
      const spendableEnergy = Math.floor(individual.energy - EnergyConstants.bufferForReproduction);
      const numberOfChildren = Math.min(Constants.maxChildrenPerReproduction, spendableEnergy);
      for (let i = 0; i < numberOfChildren; i++) {
        const baby = individual.createChild(state.day);
        state.saveIndividual(baby);
      }
      state.logReproduce(numberOfChildren);
      return EnergyConstants.anyAction + EnergyConstants.reproductionPerChild * numberOfChildren;
    }
  };

  // src/simulation/activities/decision.ts
  var Decision = class extends Activity {
    // aOrB meaning: low -> A more likely, high -> B more likely
    static decide(aOrB, possibleA, possibleB) {
      if (possibleA && possibleB) {
        return Math.random() < aOrB ? "b" : "a";
      } else if (possibleA) {
        return "a";
      } else if (possibleB) {
        return "b";
      } else {
        return null;
      }
    }
  };
  var MainDecision = class extends Decision {
    static isPossible(individual, _state) {
      return individual.deathDay == null;
    }
    static execute(individual, state) {
      if (individual.getAge(state.day) < 2) {
        return GrowUpAction.execute(individual, state);
      }
      const surviveOrLearn = individual.brain.surviveOrLearn.value;
      const possibleSurvive = EatOrReproduceDecision.isPossible(individual, state);
      const possibleLearn = LearnSkillAction.isPossible(individual, state);
      const choice = Decision.decide(surviveOrLearn, possibleSurvive, possibleLearn);
      if (choice === "a") return EatOrReproduceDecision.execute(individual, state);
      if (choice === "b") return LearnSkillAction.execute(individual, state);
      return IdleAction.execute(individual, state);
    }
  };
  var EatOrReproduceDecision = class extends Decision {
    static isPossible(individual, state) {
      return individual.hasHunger() || ReproduceAction.isPossible(individual, state);
    }
    static execute(individual, state) {
      const eatOrReproduce = individual.brain.eatOrReproduce.value;
      const possibleEat = PlantOrMeatDecision.isPossible(individual, state);
      const possibleReproduce = ReproduceAction.isPossible(individual, state);
      const choice = Decision.decide(eatOrReproduce, possibleEat, possibleReproduce);
      if (choice === "a") return PlantOrMeatDecision.execute(individual, state);
      if (choice === "b") return ReproduceAction.execute(individual, state);
      return IdleAction.execute(individual, state);
    }
  };
  var PlantOrMeatDecision = class extends Decision {
    static isPossible(individual, state) {
      return individual.hasHunger() && (PlantSearchAction.isPossible(individual, state) || HuntAction.isPossible(individual, state));
    }
    static execute(individual, state) {
      const plantOrMeat = individual.brain.plantOrMeat.value;
      const possiblePlant = PlantSearchAction.isPossible(individual, state);
      const possibleMeat = HuntAction.isPossible(individual, state);
      const choice = Decision.decide(plantOrMeat, possiblePlant, possibleMeat);
      if (choice === "a") return PlantSearchAction.execute(individual, state);
      if (choice === "b") return HuntAction.execute(individual, state);
      return IdleAction.execute(individual, state);
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
    logGrowUp() {
      this.latestDayMetrics.logGrowUp();
    }
    logLearn() {
      this.latestDayMetrics.logLearn();
    }
    logPlantSearch(succesful) {
      this.latestDayMetrics.logPlantSearch(succesful);
    }
    logHunt(succesful) {
      this.latestDayMetrics.logHunt(succesful);
    }
    logReproduce(count) {
      this.latestDayMetrics.logReproduce(count);
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
    logGrowUp() {
      this.actions.logGrowUp();
    }
    logLearn() {
      this.actions.logLearn();
    }
    logPlantSearch(succesful) {
      this.actions.logPlantSearch(succesful);
    }
    logHunt(succesful) {
      this.actions.logHunt(succesful);
    }
    logReproduce(count) {
      this.actions.logReproduce(count);
    }
    calculateRemainingMetrics(state) {
      const living = state.individuals.filter((i) => i.deathDay == null);
      const dead = state.individuals.filter((i) => i.deathDay != null);
      const starved = dead.filter((i) => i.starved);
      const eaten = dead.filter((i) => i.eaten);
      this.day = state.day;
      this.population.calculate(state.day, state.individuals, living, dead, eaten, starved);
      this.food.calculate(state.environment);
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
    uneaten = 0;
    grown = 0;
    remaining = 0;
    calculate(environment) {
      this.uneaten = environment.uneatenFood;
      this.grown = environment.grownFood;
      this.remaining = environment.remainingFood;
    }
  };
  var GeneticsMetrics = class {
    surviveOrLearn = new GeneMetrics();
    eatOrReproduce = new GeneMetrics();
    plantOrMeat = new GeneMetrics();
    plantSearchSkill = new GeneMetrics();
    huntSkill = new GeneMetrics();
    alertnessTrait = new GeneMetrics();
    sizeTrait = new GeneMetrics();
    calculate(state) {
      for (const individual of state.individuals) {
        if (individual.deathDay != null) {
          continue;
        }
        this.surviveOrLearn.counts[individual.brain.surviveOrLearn.bucket - 1]++;
        this.eatOrReproduce.counts[individual.brain.eatOrReproduce.bucket - 1]++;
        this.plantOrMeat.counts[individual.brain.plantOrMeat.bucket - 1]++;
        this.plantSearchSkill.counts[individual.skills.plantSearch.bucket - 1]++;
        this.huntSkill.counts[individual.skills.hunt.bucket - 1]++;
        this.alertnessTrait.counts[individual.traits.alertness.bucket - 1]++;
        this.sizeTrait.counts[individual.traits.size.bucket - 1]++;
      }
    }
  };
  var GeneMetrics = class {
    counts;
    constructor() {
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
        const bucket = individual.brain.plantOrMeat.bucket;
        this.bucketCounts[bucket - 1]++;
      }
    }
  };
  var ActionMetrics = class {
    growUp = 0;
    learn = 0;
    survive = 0;
    reproduce = 0;
    offspringCounts = [];
    eat = 0;
    plantSearch = 0;
    hunt = 0;
    plantSearchSuccess = 0;
    plantSearchFail = 0;
    huntSuccess = 0;
    huntFail = 0;
    logGrowUp() {
      this.growUp++;
    }
    logLearn() {
      this.learn++;
    }
    logPlantSearch(succesful) {
      this.survive++;
      this.eat++;
      this.plantSearch++;
      if (succesful) {
        this.plantSearchSuccess++;
      } else {
        this.plantSearchFail++;
      }
    }
    logHunt(succesful) {
      this.survive++;
      this.eat++;
      this.hunt++;
      if (succesful) {
        this.huntSuccess++;
      } else {
        this.huntFail++;
      }
    }
    logReproduce(count) {
      this.survive++;
      this.reproduce++;
      this.offspringCounts.push(count);
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
        for (const individual of this.state.individuals) {
          individual.extraAlertness = 0;
        }
        const actionMetrics = this.actAllIndividuals();
        this.starveIndividuals();
        this.state.metrics.calculateRemainingMetrics(this.state);
        const allDead = this.state.individuals.filter((individual) => individual.deathDay == null).length == 0;
        if (allDead) {
          return false;
        }
      }
      return true;
    }
    actAllIndividuals() {
      const actionMetrics = new ActionMetrics();
      const individuals = this.state.individuals;
      for (let i = individuals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [individuals[i], individuals[j]] = [individuals[j], individuals[i]];
      }
      for (const individual of individuals) {
        if (MainDecision.isPossible(individual, this.state)) {
          const gainedEnergy = MainDecision.execute(individual, this.state);
          individual.energy += gainedEnergy;
          if (individual.energy > EnergyConstants.max) {
            individual.energy = EnergyConstants.max;
          }
        }
      }
      return actionMetrics;
    }
    starveIndividuals() {
      let starvedIndividuals = 0;
      for (let individual of this.state.individuals) {
        if (individual.energy <= 0 && individual.deathDay == null && individual.getAge(this.state.day) > 0) {
          individual.dieStarved(this.state.day);
          starvedIndividuals++;
        }
      }
    }
  };

  // src/simulation/environment.ts
  var Environment = class {
    uneatenFood;
    grownFood;
    remainingFood;
    foodRegeneration;
    foodRegenerationIncreasing;
    maxFood;
    constructor(maxFood) {
      this.maxFood = maxFood;
      this.uneatenFood = -1;
      this.grownFood = -1;
      this.remainingFood = 0;
      this.foodRegeneration = Math.random() * (EnvironmentConstants.maxFoodRegeneration - EnvironmentConstants.minFoodRegeneration) + EnvironmentConstants.minFoodRegeneration;
      this.foodRegenerationIncreasing = Math.random() < 0.5;
      this.nextDay();
    }
    toFoodString() {
      return `${this.uneatenFood} -> ${this.grownFood} -> ${this.remainingFood}`;
    }
    updateSeason() {
      this.foodRegeneration += this.foodRegenerationIncreasing ? EnvironmentConstants.stepFoodRegeneration : -EnvironmentConstants.stepFoodRegeneration;
      if (this.foodRegeneration > EnvironmentConstants.maxFoodRegeneration) {
        this.foodRegeneration = EnvironmentConstants.maxFoodRegeneration;
        this.foodRegenerationIncreasing = false;
      } else if (this.foodRegeneration < EnvironmentConstants.minFoodRegeneration) {
        this.foodRegeneration = EnvironmentConstants.minFoodRegeneration;
        this.foodRegenerationIncreasing = true;
      }
    }
    nextDay() {
      this.uneatenFood = this.remainingFood;
      this.grownFood = Math.round(this.uneatenFood * EnvironmentConstants.preserveRemainingFood + this.foodRegeneration);
      this.updateSeason();
      this.remainingFood = this.grownFood;
    }
  };

  // src/ui/color.ts
  var Color = class _Color {
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
    static greenHue = 140 / 360;
    static blueHue = 220 / 360;
    static redHue = 0 / 360;
    static purpleHue = 270 / 360;
    static orangeHue = 30 / 360;
    static yellowHue = 55 / 360;
    static defaultSaturation = 1;
    static greenToRedRange = this.hueRange(this.greenHue, this.redHue, 9, 0.9, 0.4);
    static hueRange(fromHue, toHue, steps, saturation, luminance) {
      return Array.from({ length: steps }, (_, i) => {
        const huePerStep = steps > 1 ? i / (steps - 1) : 0;
        const hue = fromHue + huePerStep * (toHue - fromHue);
        const [r, g, b] = _Color.hslToRgb(hue, saturation, luminance);
        return `rgb(${r}, ${g}, ${b})`;
      });
    }
    static rgbToRgba(rgb, alpha) {
      return rgb.replace("rgb(", "rgba(").replace(")", `, ${alpha.toFixed(2)})`);
    }
    static hslToRgb(h, s, l) {
      const a = s * Math.min(l, 1 - l);
      const f = (n) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      };
      return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }
    static genomeToColor(brain) {
      const herbivoreValue = 1 - brain.plantOrMeat.value;
      const minValue = 0.1;
      const maxValue = 0.9;
      const clampedHerbivoreValue = Math.min(maxValue, Math.max(minValue, herbivoreValue));
      const hue = (clampedHerbivoreValue - minValue) / (maxValue - minValue) * 130;
      const eatValue = 1 - brain.surviveOrLearn.value;
      const saturation = 0.5 + eatValue / 2;
      const lightness = 0.6;
      const [r, g, b] = _Color.hslToRgb(hue / 360, saturation, lightness);
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

  // src/simulation/genetics/brain.ts
  var BrainGenes = /* @__PURE__ */ ((BrainGenes2) => {
    BrainGenes2["SurviveOrLearn"] = "SurviveOrLearn";
    BrainGenes2["EatOrReproduce"] = "EatOrReproduce";
    BrainGenes2["PlantOrMeat"] = "PlantOrMeat";
    return BrainGenes2;
  })(BrainGenes || {});
  var Brain = class _Brain extends Chromosome {
    static geneKeys = Object.values(BrainGenes);
    static neutral() {
      const neutralGenes = {};
      neutralGenes["SurviveOrLearn" /* SurviveOrLearn */] = new Gene(1 / 9);
      neutralGenes["PlantOrMeat" /* PlantOrMeat */] = new Gene(3 / 9);
      neutralGenes["EatOrReproduce" /* EatOrReproduce */] = new Gene(3 / 9);
      return new _Brain(neutralGenes);
    }
    get surviveOrLearn() {
      return this.genes["SurviveOrLearn" /* SurviveOrLearn */];
    }
    get plantOrMeat() {
      return this.genes["PlantOrMeat" /* PlantOrMeat */];
    }
    get eatOrReproduce() {
      return this.genes["EatOrReproduce" /* EatOrReproduce */];
    }
  };

  // src/simulation/genetics/skills.ts
  var SkillsGenes = /* @__PURE__ */ ((SkillsGenes2) => {
    SkillsGenes2["PlantSearch"] = "PlantSearch";
    SkillsGenes2["Hunt"] = "Hunt";
    return SkillsGenes2;
  })(SkillsGenes || {});
  var Skills = class _Skills extends Chromosome {
    static geneKeys = Object.values(SkillsGenes);
    static neutral() {
      const genes = {};
      genes["PlantSearch" /* PlantSearch */] = new Gene(2 / 9);
      genes["Hunt" /* Hunt */] = new Gene(1 / 9);
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
    TraitGenes2["Alertness"] = "Alertness";
    TraitGenes2["Size"] = "Size";
    return TraitGenes2;
  })(TraitGenes || {});
  var Traits = class _Traits extends Chromosome {
    static geneKeys = Object.values(TraitGenes);
    static neutral() {
      const genes = {};
      genes["Alertness" /* Alertness */] = new Gene(1 / 9);
      genes["Size" /* Size */] = new Gene(1 / 9);
      return new _Traits(genes);
    }
    get alertness() {
      return this.genes["Alertness" /* Alertness */];
    }
    get size() {
      return this.genes["Size" /* Size */];
    }
  };

  // src/simulation/individual.ts
  var Individual = class _Individual {
    id = "";
    // assigned by state
    birthday;
    parent;
    deathDay = null;
    eaten = false;
    starved = false;
    extraAlertness = 0;
    brain;
    traits;
    skills;
    energy;
    children = [];
    constructor(birthday, parent, brain, traits, skills) {
      this.birthday = birthday;
      this.parent = parent;
      this.brain = brain;
      this.traits = traits;
      this.skills = skills;
      this.energy = EnergyConstants.whenBorn;
    }
    toString() {
      return this.brain.toString();
    }
    toColor() {
      return Color.genomeToColor(this.brain);
    }
    getAge(today) {
      if (this.deathDay != null) {
        return this.deathDay - this.birthday;
      }
      return today - this.birthday;
    }
    static neutral(birthday) {
      return new _Individual(birthday, null, Brain.neutral(), Traits.neutral(), Skills.neutral());
    }
    createChild(today) {
      const evolvedBrain = this.brain.mutatedCopy(true);
      const evolvedTraits = this.traits.mutatedCopy(false);
      const evolvedSkills = this.skills.mutatedCopy(false);
      const baby = new _Individual(today, this, evolvedBrain, evolvedTraits, evolvedSkills);
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
      const offSpringCounts = offspring.map((generation2) => generation2.filter((individual) => includeDead || individual.deathDay == null).length);
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
    }
    // to clean up references to dead individuals
    pruneDeadParents(deadGenerations = 0) {
      let parent = this.parent;
      if (parent == null) {
        return;
      } else if (parent.deathDay == null) {
        parent.pruneDeadParents(0);
      } else if (deadGenerations >= 2) {
        this.parent = null;
        this.children = [];
      } else {
        parent.pruneDeadParents(deadGenerations + 1);
      }
    }
  };

  // src/simulation/name.ts
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

  // src/simulation/state.ts
  var State = class {
    day;
    individualsById = /* @__PURE__ */ new Map();
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
        Individual.neutral(this.day),
        Individual.neutral(this.day),
        Individual.neutral(this.day)
      ];
      for (const individual of firstIndividuals) {
        this.saveIndividual(individual);
      }
    }
    nextIndividualId() {
      this.individualIdCounter++;
      return intToName(this.individualIdCounter);
    }
    saveIndividual(individual) {
      individual.id = this.nextIndividualId();
      this.individualsById.set(individual.id, individual);
      this.individuals.push(individual);
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
          this.individualsById.delete(individualId);
        } else {
          individual.pruneDeadParents();
        }
      }
      this.individuals = Array.from(this.individualsById.values());
    }
    logGrowUp() {
      this.metrics.logGrowUp();
    }
    logLearn() {
      this.metrics.logLearn();
    }
    logPlantSearch(succesful) {
      this.metrics.logPlantSearch(succesful);
    }
    logHunt(succesful) {
      this.metrics.logHunt(succesful);
    }
    logReproduce(count) {
      this.metrics.logReproduce(count);
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
    right: 32,
    bottom: 48,
    left: 8
  };
  var VISIBLE_DAYS = 500;
  var MATRIX_CANVAS_HEIGHT = 200;
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
    ctx.fillText(text, canvasWidth / 2, 14);
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
      const lightness = 1 - value * 0.5;
      const [r, g, b] = Color.hslToRgb(this.hue, Color.defaultSaturation, lightness);
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
      this.sections = [
        {
          name: "Diet & actions",
          charts: [
            StackedBarChart.fromDistribution(
              "diet-chart",
              "Individuals per diet",
              9,
              (d) => d.dietDistribution.bucketCounts,
              Color.greenToRedRange,
              ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]
            ),
            new StackedBarChart("action-breakdown-chart", "Actions", [
              { label: "Grow up", getValue: (d) => d.actions.growUp, color: Color.redPink },
              { label: "Learn", getValue: (d) => d.actions.learn, color: Color.purple },
              { label: "Reproduce", getValue: (d) => d.actions.reproduce, color: Color.blueSky },
              { label: "Eat plant", getValue: (d) => d.actions.plantSearch, color: Color.green },
              { label: "Eat meat", getValue: (d) => d.actions.hunt, color: Color.red }
            ]),
            new StackedBarChart("eat-plant-breakdown-chart", "Plant search outcome", [
              { label: "Uneaten plants", getValue: (d) => d.food.remaining, color: Color.greenTeal },
              { label: "Plant found", getValue: (d) => d.actions.plantSearchSuccess, color: Color.green },
              { label: "Nothing found", getValue: (d) => d.actions.plantSearchFail, color: Color.redPink }
            ]),
            new StackedBarChart("eat-meat-breakdown-chart", "Hunting outcome", [
              { label: "Prey escaped", getValue: (d) => d.actions.huntFail, color: Color.redPink },
              { label: "Prey caught", getValue: (d) => d.actions.huntSuccess, color: Color.red }
            ]),
            StackedBarChart.fromDistribution(
              "starved-chart",
              "Starved per diet",
              9,
              (d) => d.starvedDietDistribution.bucketCounts,
              Color.greenToRedRange,
              ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]
            ),
            StackedBarChart.fromDistribution(
              "eaten-chart",
              "Eaten per diet",
              9,
              (d) => d.eatenDietDistribution.bucketCounts,
              Color.greenToRedRange,
              ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]
            )
          ]
        },
        {
          name: "Gene pool",
          charts: [
            new MatrixChart("gene-survive-or-learn-chart-relative", "Behaviour: Survive or Learn", "Survive", "Learn", Color.purpleHue, (m) => m.genetics.surviveOrLearn, true),
            new MatrixChart("gene-eat-or-reproduce-chart-relative", "Behaviour: Eat or Reproduce", "Eat", "Reproduce", Color.orangeHue, (m) => m.genetics.eatOrReproduce, true),
            new MatrixChart("gene-plant-or-meat-chart-relative", "Diet: Plant or Meat", "Plant", "Meat", Color.blueHue, (m) => m.genetics.plantOrMeat, true),
            new MatrixChart("gene-plant-search-skill-chart-relative", "Skill: Plant search", "Bad", "Good", Color.greenHue, (m) => m.genetics.plantSearchSkill, true),
            new MatrixChart("gene-hunt-skill-chart-relative", "Skill: Hunt", "Bad", "Good", Color.redHue, (m) => m.genetics.huntSkill, true),
            new MatrixChart("gene-alertness-trait-chart-relative", "Trait: Alertness", "Low", "High", Color.blueHue, (m) => m.genetics.alertnessTrait, true),
            new MatrixChart("gene-size-trait-chart-relative", "Trait: Size", "Small", "Large", Color.yellowHue, (m) => m.genetics.sizeTrait, true)
          ]
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

  // src/ui/ui.ts
  window.onload = () => new UI();
  var UI = class {
    state;
    iterations;
    loop;
    charts;
    showedSimulationEndAlert = false;
    constructor() {
      this.state = new State();
      this.iterations = new Iterations(this.state);
      this.loop = new IterationLoop(this.iterations, this);
      this.loop.onUpdate = () => this.updateUI();
      this.charts = new ChartSections();
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
      const max = 30;
      const step = 5;
      const defaultValue = 20;
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
      const options = [5, 10, 25, 50, 100, 200, 300];
      const defaultIndex = 2;
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
      console.log(`Jumped ${iterations} iterations. All dead: ${!continueLoop}`);
      if (!continueLoop) {
        this.handleSimulationEnd();
      }
      this.updateUI();
    }
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
      this.charts.update(this.state.metrics.flush());
    }
  };
})();
