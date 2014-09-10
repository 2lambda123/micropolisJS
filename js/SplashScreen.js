define(['Config', 'Game', 'MapGenerator', 'SplashCanvas', 'Storage'],
       function(Config, Game, MapGenerator, SplashCanvas, Storage) {
  "use strict";


  function SplashScreen(tileSet, spriteSheet) {
    this.tileSet = tileSet;
    this.spriteSheet = spriteSheet;
    this.map = MapGenerator();

    $('#splashGenerate').click(this.regenerateMap.bind(this));
    $('#splashPlay').click(this.acquireNameAndDifficulty.bind(this));

    this.splashCanvas = new SplashCanvas(SplashCanvas.DEFAULT_ID, 'splashContainer');

    // Conditionally enable load/save buttons
    $('.loadSave').prop('disabled', !Storage.canStore);

    this.splashCanvas.init(this.map, tileSet);
    $('.awaitGeneration').toggle();
    $('#splashPlay').focus();
  }


  SplashScreen.prototype.regenerateMap = function(e) {
    e.preventDefault();

    this.splashCanvas.clearMap();
    this.map = MapGenerator();
    this.splashCanvas.paint(this.map);
  };


  SplashScreen.prototype.acquireNameAndDifficulty = function(e) {
    e.preventDefault();

    $('#splashGenerate').off('click');
    $('#splashPlay').off('click');
    $('#splash').toggle();

    $('#playForm').submit(this.playMap.bind(this));
    $('#start').toggle();

    if (Config.debug)
      $('#nameForm').removeAttr('required');

    $('#nameForm').focus();
  };


  SplashScreen.prototype.playMap = function(e) {
    e.preventDefault();

    $('#playForm').off('submit');
    $('#start').toggle();
    var difficulty = $('.difficulty:checked').val() - 0;
    var name = $('#nameForm').val();
    var g = new Game(this.map, this.tileSet, this.spriteSheet, difficulty, name);
  };


  return SplashScreen;
});    
