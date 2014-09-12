/* micropolisJS. Adapted by Graeme McCutcheon from Micropolis.
 *
 * This code is released under the GNU GPL v3, with some additional terms.
 * Please see the files LICENSE and COPYING for details. Alternatively,
 * consult http://micropolisjs.graememcc.co.uk/LICENSE and
 * http://micropolisjs.graememcc.co.uk/COPYING
 *
 */

require(['Config', 'SplashScreen', 'SpriteLoader', 'TileSet', 'TileSetURI'],
        function(Config, SplashScreen, SpriteLoader, TileSet, TileSetURI) {
  "use strict";


  var i, tileSet;

  // If we got here, then we have script
  $('[data-hasscript]').each(function() {
    $(this).attr('data-hasscript', 'true');
  });

  var spritesLoaded = function(spriteImages) {
    $('#loadingBanner').css('display', 'none');
    var s = new SplashScreen(tileSet, spriteImages);
  };


  var spriteError = function() {
    alert('Failed to load sprites');
  };


  var loadSprites = function() {
    var sl = new SpriteLoader();
    sl.load(spritesLoaded, spriteError);
  };


  var tileSetError = function() {
    alert('Failed to load tileset!');
  };


  var loadTileSet = function() {
    tileSet = new TileSet(i, loadSprites, tileSetError);
  };


  var imgError = function() {
    alert('Failed to load tile images!');
  };


  // Check for debug parameter in URL
  Config.debug = window.location.search.slice(1).split('&').some(function(param) {
    return param.trim().toLowerCase() === 'debug=1';
  });

  var i = new Image();
  i.onload = loadTileSet;
  i.onerror = imgError;
  i.src = 'images/tiles.png';
});
