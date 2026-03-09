import { IndividualsDetails } from "./individualsDetails.js";

import { State } from "../../simulation/state.js";
import { Charts } from "../charts/charts.js";
import { Iterations } from "../iterations.js";
import { IterationLoop } from "../iterationLoop.js";

window.onload = () => new UI();

class UI {
    private readonly state: State;
    private readonly iterations: Iterations;
    private readonly loop: IterationLoop;
    private readonly charts: Charts;

    private playMode: 'slow' | 'fast' | null = null;

    constructor() {
        this.state = new State();
        this.iterations = new Iterations(this.state);
        this.loop = new IterationLoop(this.iterations);
        this.loop.onUpdate = () => this.updateUI();

        this.charts = new Charts();

        this.updateUI();
        this.addButtonListeners();
    }

    private addButtonListeners() {
        document.getElementById("next-1-btn")!.addEventListener("click", () => this.nextIteration(1));
        document.getElementById("next-10-btn")!.addEventListener("click", () => this.nextIteration(10));
        document.getElementById("next-100-btn")!.addEventListener("click", () => this.nextIteration(100));
        document.getElementById("play-slow-btn")!.addEventListener("click", () => this.togglePlaySlow());
        document.getElementById("play-fast-btn")!.addEventListener("click", () => this.togglePlayFast());
    }

    private togglePlaySlow() {
        const slowBtn = document.getElementById("play-slow-btn") as HTMLButtonElement;
        const fastBtn = document.getElementById("play-fast-btn") as HTMLButtonElement;
        if (this.playMode === 'slow') {
            this.loop.pause();
            this.playMode = null;
            slowBtn.textContent = "▶ Play Slow";
        } else {
            this.loop.playSlow();
            this.playMode = 'slow';
            slowBtn.textContent = "⏸ Pause";
            fastBtn.textContent = "▶ Play Fast";
        }
    }

    private togglePlayFast() {
        const slowBtn = document.getElementById("play-slow-btn") as HTMLButtonElement;
        const fastBtn = document.getElementById("play-fast-btn") as HTMLButtonElement;
        if (this.playMode === 'fast') {
            this.loop.pause();
            this.playMode = null;
            fastBtn.textContent = "▶ Play Fast";
        } else {
            this.loop.playFast();
            this.playMode = 'fast';
            fastBtn.textContent = "⏸ Pause";
            slowBtn.textContent = "▶ Play Slow";
        }
    }

    private nextIteration(amount: number) {
        this.iterations.execute(amount);
        this.updateUI();
    }

    private updateUI() {
        this.updateTitles();
        new IndividualsDetails(this.state.individuals, this.state.day).showIndividuals();

        this.charts.update(this.state.metrics.dayMetrics);
    }

    private updateTitles() {
        document.getElementById("iteration-title")!.innerText = `Iteration ${this.state.day}`;
        document.getElementById("individuals-title")!.innerText = `Individuals (${this.state.individuals.length})`;
    }
}
