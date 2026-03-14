import { Iterations } from "@simulation/iterations.js";

export class IterationLoop {
    readonly iterations: Iterations;

    private playInterval: ReturnType<typeof setInterval> | undefined = undefined;

    public onUpdate: () => void = () => { };

    constructor(iterations: Iterations) {
        this.iterations = iterations;
    }

    playSlow() {
        this.pause();
        this.startInterval(false);
    }

    playFast() {
        this.pause();
        this.startInterval(true);
    }

    pause() {
        clearInterval(this.playInterval);
        this.playInterval = undefined;
    }

    private startInterval(fast: boolean) {
        const wait = fast ? 150 : 150;
        const iterationsAmount = fast ? 50 : 5;
        this.playInterval = setInterval(() => {
            const continueLoop = this.iterations.execute(iterationsAmount);
            this.onUpdate();
            if (!continueLoop) {
                this.pause();
            }
        }, wait);
    }
}
