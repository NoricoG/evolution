import { IterationLoop } from "@simulation/iterationLoop.js";
import { Iterations } from "@simulation/iterations.js";
import { State } from "@simulation/state.js";
import { ChartSections } from "@ui/chartSections.js";

window.onload = () => new UI();

class UI {
    private readonly state: State;
    private readonly iterations: Iterations;
    private readonly loop: IterationLoop;
    private readonly charts: ChartSections;

    private playMode: 'slow' | 'fast' | null = null;

    constructor() {
        this.state = new State();
        this.iterations = new Iterations(this.state);
        this.loop = new IterationLoop(this.iterations);
        this.loop.onUpdate = () => this.updateUI();

        this.charts = new ChartSections();

        this.updateUI();
        this.addButtonListeners();
    }

    private addButtonListeners() {
        document.getElementById("next-1-btn")!.addEventListener("click", () => this.nextIteration(1));
        document.getElementById("next-10-btn")!.addEventListener("click", () => this.nextIteration(10));
        document.getElementById("next-100-btn")!.addEventListener("click", () => this.nextIteration(100));
        document.getElementById("next-500-btn")!.addEventListener("click", () => this.nextIteration(500));
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
        document.getElementById("iteration-title")!.innerText = `Iteration ${this.state.day}`;
        this.charts.update(this.state.metrics.flush());
    }
}
