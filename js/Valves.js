/* micropolisJS. Adapted from Micropolis by Graeme McCutcheon.
 *
 * This code is released under the GNU GPL v3, with some additional terms.
 * Please see the files LICENSE and COPYING for details. Alternatively,
 * consult http://micropolisjs.graememcc.co.uk/LICENSE and
 * http://micropolisjs.graememcc.co.uk/COPYING
 *
 */

define(['EventEmitter', 'Messages', 'MiscUtils'],
       function(EventEmitter, Messages, MiscUtils) {
  "use strict";


  function Valves() {
    this.resValve = 0;
    this.comValve = 0;
    this.indValve = 0;
    this.resCap = false;
    this.comCap = false;
    this.indCap = false;

    EventEmitter(this);
  }


  var RES_VALVE_RANGE = 2000;
  var COM_VALVE_RANGE = 1500;
  var IND_VALVE_RANGE = 1500;


  var taxTable = [
    200, 150, 120, 100, 80, 50, 30, 0, -10, -40, -100,
    -150, -200, -250, -300, -350, -400, -450, -500, -550, -600];
  var extMarketParamTable = [1.2, 1.1, 0.98];

  Valves.prototype.setValves = function(gameLevel, census, budget) {
    var resPopDenom = 8;
    var birthRate = 0.02;
    var labourBaseMax = 1.3;
    var internalMarketDenom = 3.7;
    var projectedIndPopMin = 5.0;
    var resRatioDefault = 1.3;
    var resRatioMax = 2;
    var comRatioMax = 2;
    var indRatioMax = 2;
    var taxMax = 20;
    var taxTableScale = 600;
    var employment, labourBase;

    var normalizedResPop = census.resPop / resPopDenom;
    census.totalPop = Math.round(normalizedResPop + census.comPop + census.indPop);

    if (census.resPop > 0)
      employment = (census.comHist10[1] + census.indHist10[1]) / normalizedResPop;
    else
      employment = 1;

    var migration = normalizedResPop * (employment - 1);
    var births = normalizedResPop * birthRate;
    var projectedResPop = normalizedResPop + migration + births;

    // Compute labourBase
    var temp = census.comHist10[1] + census.indHist10[1];
    if (temp > 0.0)
      labourBase = (census.resHist10[1] / temp);
    else
      labourBase = 1;

    labourBase = MiscUtils.clamp(labourBase, 0.0, labourBaseMax);
    var internalMarket = (normalizedResPop + census.comPop + census.indPop) / internalMarketDenom;
    var projectedComPop = internalMarket * labourBase;
    var projectedIndPop = census.indPop * labourBase * extMarketParamTable[gameLevel];
    projectedIndPop = Math.max(projectedIndPop, projectedIndPopMin);

    var resRatio;
    if (normalizedResPop > 0)
      resRatio = projectedResPop / normalizedResPop;
    else
      resRatio = resRatioDefault;

    var comRatio;
    if (census.comPop > 0)
      comRatio = projectedComPop / census.comPop;
    else
      comRatio = projectedComPop;

    var indRatio;
    if (census.indPop > 0)
      indRatio = projectedIndPop / census.indPop;
    else
      indRatio = projectedIndPop;

    resRatio = Math.min(resRatio, resRatioMax);
    comRatio = Math.min(comRatio, comRatioMax);
    resRatio = Math.min(indRatio, indRatioMax);

    // Global tax and game level effects.
    var z = Math.min((budget.cityTax + gameLevel), taxMax);
    resRatio = (resRatio - 1) * taxTableScale + taxTable[z];
    comRatio = (comRatio - 1) * taxTableScale + taxTable[z];
    indRatio = (indRatio - 1) * taxTableScale + taxTable[z];

    // Ratios are velocity changes to valves.
    this.resValve = MiscUtils.clamp(this.resValve + Math.round(resRatio), -RES_VALVE_RANGE, RES_VALVE_RANGE);
    this.comValve = MiscUtils.clamp(this.comValve + Math.round(comRatio), -COM_VALVE_RANGE, COM_VALVE_RANGE);
    this.indValve = MiscUtils.clamp(this.indValve + Math.round(indRatio), -IND_VALVE_RANGE, IND_VALVE_RANGE);

    if (this.resCap && this.resValve > 0)
      this.resValve = 0;

    if (this.comCap && this.comValve > 0)
        this.comValve = 0;

    if (this.indCap && this.indValve > 0)
        this.indValve = 0;

    this._emitEvent(Messages.VALVES_UPDATED);
  };


  return Valves;
});
