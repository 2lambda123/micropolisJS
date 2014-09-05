/* micropolisJS. Adapted from Micropolis by Graeme McCutcheon.
 *
 * This code is released under the GNU GPL v3, with some additional terms.
 * Please see the files LICENSE and COPYING for details. Alternatively,
 * consult http://micropolisjs.graememcc.co.uk/LICENSE and
 * http://micropolisjs.graememcc.co.uk/COPYING
 *
 */

define(['BudgetWindow', 'Config', 'CongratsWindow', 'DebugWindow', 'DisasterWindow', 'GameCanvas', 'EvaluationWindow', 'InfoBar', 'InputStatus', 'Messages', 'Notification', 'QueryWindow', 'RCI', 'ScreenshotLinkWindow', 'ScreenshotWindow', 'Simulation', 'Text'],
       function(BudgetWindow, Config, CongratsWindow, DebugWindow, DisasterWindow, GameCanvas, EvaluationWindow, InfoBar, InputStatus, Messages, Notification, QueryWindow, RCI, ScreenshotLinkWindow, ScreenshotWindow, Simulation, Text) {
  "use strict";


  function Game(gameMap, tileSet, spriteSheet, difficulty, name) {
    difficulty = difficulty || 0;

    this.gameMap = gameMap;
    this.tileSet = tileSet;
    this.simulation = new Simulation(this.gameMap, difficulty, Simulation.SPEED_SLOW);
    this.rci = new RCI('RCIContainer', this.simulation);

    this.name = name;
    $('#name').text(name || 'MyTown');

    // Note: must init canvas before inputStatus
    this.gameCanvas = new GameCanvas('canvasContainer');
    this.gameCanvas.init(this.gameMap, this.tileSet, spriteSheet);
    this.inputStatus = new InputStatus(this.gameMap, tileSet.tileWidth);

    var opacityLayerID = 'opaque';

    this.genericDialogClosure = genericDialogClosure.bind(this);

    // Hook up listeners to open/close evaluation window
    this.handleEvalRequest = makeWindowOpenHandler('eval', function() {
      return [this.simulation.evaluation];
    }.bind(this));

    this.evalWindow = new EvaluationWindow(opacityLayerID, 'evalWindow');
    this.evalWindow.addEventListener(Messages.EVAL_WINDOW_CLOSED, this.genericDialogClosure);
    this.inputStatus.addEventListener(Messages.EVAL_REQUESTED, this.handleEvalRequest.bind(this));

    // ... and similarly for the budget window
    this.handleBudgetRequest = makeWindowOpenHandler('budget', function() {
      var budgetData = {
        roadMaintenanceBudget: this.simulation.budget.roadMaintenanceBudget,
        roadRate: Math.floor(this.simulation.budget.roadPercent * 100),
        fireMaintenanceBudget: this.simulation.budget.fireMaintenanceBudget,
        fireRate: Math.floor(this.simulation.budget.firePercent * 100),
        policeMaintenanceBudget: this.simulation.budget.policeMaintenanceBudget,
        policeRate: Math.floor(this.simulation.budget.policePercent * 100),
        taxRate: this.simulation.budget.cityTax,
        totalFunds: this.simulation.budget.totalFunds,
        taxesCollected: this.simulation.budget.taxFund
      };

      return [budgetData];
    }.bind(this));

    this.budgetWindow = new BudgetWindow(opacityLayerID, 'budget');
    this.budgetWindow.addEventListener(Messages.BUDGET_WINDOW_CLOSED, this.handleBudgetWindowClosure.bind(this));
    this.inputStatus.addEventListener(Messages.BUDGET_REQUESTED, this.handleBudgetRequest.bind(this));

    // ... and also the disaster window
    this.disasterWindow = new DisasterWindow(opacityLayerID, 'disasterWindow');
    this.disasterWindow.addEventListener(Messages.DISASTER_WINDOW_CLOSED, this.handleDisasterWindowClosure.bind(this));
    this.inputStatus.addEventListener(Messages.DISASTER_REQUESTED, this.handleDisasterRequest.bind(this));

    // ... the debug window
    this.debugWindow = new DebugWindow(opacityLayerID, 'debugWindow');
    this.debugWindow.addEventListener(Messages.DEBUG_WINDOW_CLOSED, this.handleDebugWindowClosure.bind(this));
    this.inputStatus.addEventListener(Messages.DEBUG_WINDOW_REQUESTED, this.handleDebugRequest.bind(this));

    // ... the screenshot window
    this.screenshotWindow = new ScreenshotWindow(opacityLayerID, 'screenshotWindow');
    this.screenshotWindow.addEventListener(Messages.SCREENSHOT_WINDOW_CLOSED, this.handleScreenshotWindowClosure.bind(this));
    this.inputStatus.addEventListener(Messages.SCREENSHOT_WINDOW_REQUESTED, this.handleScreenshotRequest.bind(this));

    // ... the screenshot link window
    this.screenshotLinkWindow = new ScreenshotLinkWindow(opacityLayerID, 'screenshotLinkWindow');
    this.screenshotLinkWindow.addEventListener(Messages.SCREENSHOT_LINK_CLOSED, this.genericDialogClosure);

    // ... and finally the query window
    this.queryWindow = new QueryWindow(opacityLayerID, 'queryWindow');
    this.queryWindow.addEventListener(Messages.QUERY_WINDOW_CLOSED, this.genericDialogClosure);
    this.inputStatus.addEventListener(Messages.QUERY_WINDOW_NEEDED, this.handleQueryRequest.bind(this));

    // Listen for front end messages
    this.simulation.addEventListener(Messages.FRONT_END_MESSAGE, this.processFrontEndMessage.bind(this));

    // Listen for budget messages
    this.simulation.addEventListener(Messages.BUDGET_NEEDED, this.handleMandatoryBudget.bind(this));

    // Listen for tool clicks
    this.inputStatus.addEventListener(Messages.TOOL_CLICKED, this.handleTool.bind(this));

    // And pauses
    this.inputStatus.addEventListener(Messages.SPEED_CHANGE, this.handleSpeedChange.bind(this));

    this.infoBar = InfoBar('cclass', 'population', 'score', 'funds', 'date');
    this.infoBar(this.simulation);

    this.dialogOpen = false;
    this._openWindow = null;
    this.mouse = null;
    this.sprites = null;
    this.lastCoord = null;
    this.simNeededBudget = false;

    this._notificationBar = new Notification('#notifications', this.gameCanvas, Text.messageText[Messages.WELCOME]);

    // Track when various milestones are first reached
    this._reachedTown = this._reachedCity = this._reachedCapital = this._reachedMetropolis = this._reacedMegalopolis = false;
    this.congratsShowing = false;
    this.congratsWindow = new CongratsWindow(opacityLayerID, 'congratsWindow');
    this.congratsWindow.addEventListener(Messages.CONGRATS_WINDOW_CLOSED, this.genericDialogClosure);

    // Unhide controls
    this.revealControls();

    this.simNeedsBudget = false;
    this.isPaused = false;

    // Run the sim
    this.tick = tick.bind(this);
    this.tick();

    // Paint the map
    var debug = Config.debug || Config.gameDebug;
    if (debug) {
      $('#debug').toggle();
      this.frameCount = 0;
      this.animStart = new Date();
      this.lastElapsed = -1;
    }

    this.animate = (debug ? debugAnimate : animate).bind(this);
    this.animate();
  }


  var nextFrame =
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame;


  Game.prototype.revealControls = function() {
   $('.initialHidden').each(function(e) {
     $(this).removeClass('initialHidden');
   });

   this._notificationBar.news({subject: Messages.WELCOME});
   this.rci.update({residential: 0, commerical: 0, industrial: 0});
  };


  var genericDialogClosure = function() {
    this.dialogOpen = false;
  };


  Game.prototype.handleDisasterWindowClosure = function(request) {
    this.dialogOpen = false;

    if (request === DisasterWindow.DISASTER_NONE)
      return;

    switch (request) {
      case DisasterWindow.DISASTER_MONSTER:
        this.simulation.spriteManager.makeMonster();
        break;

      case DisasterWindow.DISASTER_FIRE:
        this.simulation.disasterManager.makeFire();
        break;

      case DisasterWindow.DISASTER_FLOOD:
        this.simulation.disasterManager.makeFlood();
        break;

      case DisasterWindow.DISASTER_CRASH:
        this.simulation.disasterManager.makeCrash();
        break;

      case DisasterWindow.DISASTER_MELTDOWN:
        this.simulation.disasterManager.makeMeltdown();
        break;

      case DisasterWindow.DISASTER_TORNADO:
        this.simulation.spriteManager.makeTornado();
    }
  };


  Game.prototype.handleDebugWindowClosure = function(actions) {
    this.dialogOpen = false;

    for (var i = 0, l = actions.length; i < l; i++) {
      var a = actions[i];

      switch (a.action) {
        case DebugWindow.ADD_FUNDS:
          this.simulation.budget.spend(-20000);
          break;

        default:
          console.warn('Unexpected action', a);
      }
    }
  };


  Game.prototype.handleScreenshotWindowClosure = function(action) {
    this.dialogOpen = false;

    if (action === null)
      return;

    var dataURI;
    if (action === ScreenshotWindow.SCREENSHOT_VISIBLE)
      dataURI = this.gameCanvas.screenshotVisible();
    else if (action === ScreenshotWindow.SCREENSHOT_ALL)
      dataURI = this.gameCanvas.screenshotMap();

    this.dialogOpen = true;
    this._openWindow = 'screenshotLinkWindow';
    this.screenshotLinkWindow.open(dataURI);
  };


  Game.prototype.handleBudgetWindowClosure = function(data) {
    this.dialogOpen = false;

    if (!data.cancelled) {
      this.simulation.budget.roadPercent = data.roadPercent / 100;
      this.simulation.budget.firePercent = data.firePercent / 100;
      this.simulation.budget.policePercent = data.policePercent / 100;
      this.simulation.budget.setTax(data.taxPercent);
      if (this.simNeededBudget) {
        this.simulation.budget.doBudgetWindow();
        this.simNeededBudget = false;
      } else {
        this.simulation.budget.updateFundEffects();
      }
    }
  };


  var makeWindowOpenHandler = function(winName, customFn) {
    customFn = customFn || null;

    return function() {
      if (this.dialogOpen) {
        console.warn('Request made to open ' + winName + ' window. There is a dialog open!');
        return;
      }

      this.dialogOpen = true;
      this._openWindow = winName + 'Window';
      var win = winName + 'Window';
      var data = [];

      if (customFn)
        data = customFn();

      this[win].open.apply(this[win], data);
      window.setTimeout(this.tick, 0);
    };
  };


  Game.prototype.handleDebugRequest = makeWindowOpenHandler('debug');
  Game.prototype.handleDisasterRequest = makeWindowOpenHandler('disaster');
  Game.prototype.handleQueryRequest = makeWindowOpenHandler('query');
  Game.prototype.handleScreenshotRequest = makeWindowOpenHandler('screenshot');


  Game.prototype.handleMandatoryBudget = function() {
    this.simNeededBudget = true;
    this.handleBudgetRequest();
  };


  Game.prototype.handleTool = function(data) {
    var x = data.x;
    var y = data.y;

    // Were was the tool clicked?
    var tileCoords = this.gameCanvas.canvasCoordinateToTileCoordinate(x, y);

    if (tileCoords === null)
      return;

    var tool = this.inputStatus.currentTool;

    var budget = this.simulation.budget;
    var evaluation = this.simulation.evaluation;

    // do it!
    tool.doTool(tileCoords.x, tileCoords.y, this.simulation.blockMaps);

    tool.modifyIfEnoughFunding(budget);
    switch (tool.result) {
      case tool.TOOLRESULT_NEEDS_BULLDOZE:
        $('#toolOutput').text(Text.toolMessages.needsDoze);
        break;

      case tool.TOOLRESULT_NO_MONEY:
        $('#toolOutput').text(Text.toolMessages.noMoney);
        break;

      default:
        $('#toolOutput').html('Tools');
    }
  };


  Game.prototype.handleSpeedChange = function() {
    // XXX Currently only offer pause and run to the user
    // No real difference among the speeds until we optimise
    // the sim
    this.isPaused = !this.isPaused;

    if (this.isPaused)
      this.simulation.setSpeed(Simulation.SPEED_PAUSED);
    else
      this.simulation.setSpeed(Simulation.SPEED_SLOW);
  };


  Game.prototype.toolEscapeHandler = function() {
    if (this.dialogOpen)
      this[this._openWindow].close();
    else
      this.inputStatus.clearTool();
  };


  Game.prototype.handleInput = function() {
    if (!this.dialogOpen) {
      // Handle keyboard movement

      if (this.inputStatus.left)
        this.gameCanvas.moveWest();
      else if (this.inputStatus.up)
        this.gameCanvas.moveNorth();
      else if (this.inputStatus.right)
        this.gameCanvas.moveEast();
      else if (this.inputStatus.down)
        this.gameCanvas.moveSouth();
    }

    if (this.inputStatus.escape) {
      // We need to handle escape, as InputStatus won't know what dialogs are showing
      if (this.dialogOpen)
        this[this._openWindow].close();
      else
        this.inputStatus.clearTool();
    }
  };


  Game.prototype.processFrontEndMessage = function(message) {
    var subject = message.subject;

    if (Text.goodMessages[subject] !== undefined) {
      var cMessage = this.name + ' is now a ';

      switch (subject) {
        case Messages.REACHED_CAPITAL:
          if (!this._reachedCapital) {
            this._reachedCapital = true;
            cMessage += 'capital!';
          }
          break;

        case Messages.REACHED_CITY:
          if (!this._reachedCity) {
            this._reachedCity = true;
            cMessage += 'city!';
          }
          break;

        case Messages.REACHED_MEGALOPOLIS:
          if (!this._reachedMegalopolis) {
            this._reachedMegalopolis = true;
            cMessage += 'megalopolis!';
          }
          break;

        case Messages.REACHED_METROPOLIS:
          if (!this._reachedMetropolis) {
            this._reachedMetropolis = true;
            cMessage += 'metropolis!';
          }
          break;

        case Messages.REACHED_TOWN:
          if (!this._reachedTown) {
            this._reachedTown = true;
            cMessage += 'town!';
          }
          break;
      }

      this._notificationBar.goodNews(message);

      if (cMessage !== (this.name + ' is now a ')) {
        this.congratsShowing = true;
        this.congratsWindow.open(cMessage);
      }

      return;
    }

    if (Text.badMessages[subject] !== undefined) {
      this._notificationBar.badNews(message);
      return;
    }

    if (Text.neutralMessages[subject] !== undefined) {
      this._notificationBar.news(message);
      return;
    }

    console.warn('Unexpected message: ', subject);
  };


  Game.prototype.calculateMouseForPaint = function() {
    // Determine whether we need to draw a tool outline in the
    // canvas
    var mouse = null;

    if (this.inputStatus.mouseX !== -1 && this.inputStatus.toolWidth > 0) {
      var tileCoords = this.gameCanvas.canvasCoordinateToTileOffset(this.inputStatus.mouseX, this.inputStatus.mouseY);
      if (tileCoords !== null) {
        mouse = {};

        mouse.x = tileCoords.x;
        mouse.y = tileCoords.y;

        // The inputStatus fields came from DOM attributes, so will be strings.
        // Coerce back to numbers.
        mouse.width = this.inputStatus.toolWidth - 0;
        mouse.height = this.inputStatus.toolWidth - 0;
        mouse.colour = this.inputStatus.toolColour || 'yellow';
      }
    }

    return mouse;
  };


  Game.prototype.calculateSpritesForPaint = function() {
    var origin = this.gameCanvas.getTileOrigin();
    var end = this.gameCanvas.getMaxTile();
    var spriteList = this.simulation.spriteManager.getSpritesInView(origin.x, origin.y, end.x + 1, end.y + 1);

    if (spriteList.length === 0)
      return null;

    return spriteList;
  };


  var tick = function() {
    this.handleInput();

    if (this.dialogOpen) {
      window.setTimeout(this.tick, 0);
      return;
    }

    if (!this.simulation.isPaused() && !$('#tooSmall').is(':visible')) {
      // Run the sim
      this.simulation.simTick();
    }

    // Run this even when paused: you can still build when paused
    this.mouse = this.calculateMouseForPaint();

    window.setTimeout(this.tick, 0);
  };


  var animate = function() {
    if (this.dialogShowing)
      nextFrame(this.animate);
      return;
    }

    if (!this.isPaused)
      this.simulation.spriteManager.moveObjects(this.simulation._constructSimData());

    this.sprite = this.calculateSpritesForPaint();
    this.gameCanvas.paint(this.mouse, this.sprite, this.isPaused);

    nextFrame(this.animate);
  };


  var debugAnimate = function() {
    var date = new Date();
    var elapsed = Math.floor((date - this.animStart) / 1000);

    if (elapsed > this.lastElapsed && this.frameCount > 0) {
      $('#fpsValue').text(Math.floor(this.frameCount/elapsed));
      this.lastElapsed = elapsed;
    }

    this.frameCount++;

    if (this.dialogShowing) {
      nextFrame(this.animate);
      return;
    }

    if (!this.isPaused)
      this.simulation.spriteManager.moveObjects(this.simulation._constructSimData());

    this.sprite = this.calculateSpritesForPaint();
    this.gameCanvas.paint(this.mouse, this.sprite, this.isPaused);

    nextFrame(this.animate);
  };


  return Game;
});
