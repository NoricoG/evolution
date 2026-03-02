import { SimulationMetrics } from "../metrics.js";

export function logMetrics(simulationMetrics: SimulationMetrics, day: number) {
    const dayMetrics = simulationMetrics.dayMetrics[day];
    if (!dayMetrics) {
        console.warn(`No metrics found for day ${day}`);
        return;
    }
    console.log(`Day ${dayMetrics.day}; ${dayMetrics.bornIndividuals}👶, ${dayMetrics.aliveIndividuals}🫀, ${dayMetrics.eatenIndividuals}🍖, ${dayMetrics.starvedIndividuals}🍽️; ${dayMetrics.uneatenFood} -> ${dayMetrics.grownFood} -> ${dayMetrics.remainingFood}`);
}
