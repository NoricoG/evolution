"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndividualCategory = exports.Diet = void 0;
var Diet;
(function (Diet) {
    Diet["HERBIVORE"] = "herbivore";
    Diet["CARNIVORE"] = "carnivore";
    Diet["OMNIVORE"] = "omnivore";
    Diet["SCAVENGER"] = "scavenger";
})(Diet || (exports.Diet = Diet = {}));
var IndividualCategory;
(function (IndividualCategory) {
    IndividualCategory[IndividualCategory["Adult"] = 1] = "Adult";
    IndividualCategory[IndividualCategory["Eaten"] = 2] = "Eaten";
    IndividualCategory[IndividualCategory["Starved"] = 3] = "Starved";
    IndividualCategory[IndividualCategory["Young"] = 4] = "Young";
})(IndividualCategory || (exports.IndividualCategory = IndividualCategory = {}));
