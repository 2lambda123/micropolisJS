/* micropolisJS. Adapted from Micropolis by Graeme McCutcheon.
 *
 * This code is released under the GNU GPL v3, with some additional terms.
 * Please see the files LICENSE and COPYING for details. Alternatively,
 * consult http://micropolisjs.graememcc.co.uk/LICENSE and
 * http://micropolisjs.graememcc.co.uk/COPYING
 *
 */

define(['Direction', 'MiscUtils', 'PositionMaker', 'Tile'],
       function(Direction, MiscUtils, PositionMaker, Tile) {
  "use strict";

  function GameMap(width, height, defaultValue) {
    if (!(this instanceof GameMap))
      return new GameMap(width, height, defaultValue);

    var e = new Error('Invalid parameter');

    if (arguments.length > 1 && typeof(width) === 'number' &&
        (width < 1 || height < 1))
      throw e;

    // Argument shuffling
    if (arguments.length === 0) {
      width = 120;
      height = 100;
      defaultValue = new Tile().getValue();
    } else if (arguments.length === 1) {
      if (typeof(width) === 'number') {
        // Default value
        defaultValue = width;
      } else {
        // Tile
        defaultValue = width.getValue();
      }
      width = 120;
      height = 100;
    } else if (arguments.length === 2) {
      defaultValue = new Tile().getValue();
    } else if (arguments.length === 3) {
      if (typeof(defaultValue) === 'object')
        defaultValue = defaultValue.getValue();
    }


    this.Position = PositionMaker(width, height);
    Object.defineProperties(this,
      {width: MiscUtils.makeConstantDescriptor(width),
       height:MiscUtils.makeConstantDescriptor(height)});

    this.defaultValue = defaultValue;
    this._data = [];

    // Generally set externally
    this.cityCentreX = Math.floor(this.width / 2);
    this.cityCentreY = Math.floor(this.height / 2);
    this.pollutionMaxX = this.cityCentreX;
    this.pollutionMaxY = this.cityCentreY;
  }


  GameMap.prototype._calculateIndex = function(x, y) {
    return x + y * this.width;
  };


  GameMap.prototype.testBounds = function(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  };


  GameMap.prototype.getTile = function(x, y) {
    var e = new Error('Invalid parameter');

    if (arguments.length < 1)
      throw e;

    // Argument-shuffling
    if (typeof(x) === 'object') {
      y = x.y;
      x = x.x;
    }

    if (!this.testBounds(x, y))
      throw e;

    var tileIndex = this._calculateIndex(x, y);
    if (!(tileIndex in this._data))
      this._data[tileIndex] = new Tile(this.defaultValue);
    return this._data[tileIndex];
  };


  GameMap.prototype.getTileValue = function(x, y) {
    var e = new Error('Invalid parameter');

    if (arguments.length < 1)
      throw e;

    // Argument-shuffling
    if (typeof(x) === 'object') {
      y = x.y;
      x = x.x;
    }

    if (!this.testBounds(x, y))
      throw e;

    var tileIndex = this._calculateIndex(x, y);
    if (!(tileIndex in this._data))
      this._data[tileIndex] = new Tile(this.defaultValue);
    return this._data[tileIndex].getValue();
  };


  GameMap.prototype.getTileFlags = function(x, y) {
    var e = new Error('Invalid parameter');

    if (arguments.length < 1)
      throw e;

    // Argument-shuffling
    if (typeof(x) === 'object') {
      y = x.y;
      x = x.x;
    }

    if (!this.testBounds(x, y))
      throw e;

    var tileIndex = this._calculateIndex(x, y);
    if (!(tileIndex in this._data))
      this._data[tileIndex] = new Tile(this.defaultValue);
    return this._data[tileIndex].getFlags();
  };


  GameMap.prototype.getTiles = function(x, y, w, h) {
    var e = new Error('Invalid parameter');

    if (arguments.length < 3)
      throw e;

    // Argument-shuffling
    if (arguments.length === 3) {
      h = w;
      w = y;
      y = x.y;
      x = x.x;
    }

    if (!this.testBounds(x, y))
      throw e;

    var res = [];
    for (var a = y, ylim = y + h; a < ylim; a++) {
      res[a - y] = [];
      for (var b = x, xlim = x + w; b < xlim; b++) {
        var tileIndex = this._calculateIndex(b, a);
        if (!(tileIndex in this._data))
          this._data[tileIndex] = new Tile(this.defaultValue);
        res[a-y].push(this._data[tileIndex]);
      }
    }
    return res;
  };


  GameMap.prototype.getTileValues = function(x, y, w, h) {
    var e = new Error('Invalid parameter');

    if (arguments.length < 3)
      throw e;

    // Argument-shuffling
    if (arguments.length === 3) {
      h = w;
      w = y;
      y = x.y;
      x = x.x;
    }

    if (!this.testBounds(x, y))
      throw e;

    var res = [];
    for (var a = y, ylim = y + h; a < ylim; a++) {
      res[a - y] = [];
      for (var b = x, xlim = x + w; b < xlim; b++) {
        var tileIndex = this._calculateIndex(b, a);
        if (!(tileIndex in this._data))
          this._data[tileIndex] = new Tile(this.defaultValue);
        res[a-y].push(this._data[tileIndex].getValue());
      }
    }
    return res;
  };


  GameMap.prototype.getTileFromMapOrDefault = function(pos, dir, defaultTile) {
    switch (dir) {
      case Direction.NORTH:
        if (pos.y > 0)
          return this.getTileValue(pos.x, pos.y - 1);
        return defaultTile;

      case Direction.EAST:
        if (pos.x < this.width - 1)
          return this.getTileValue(pos.x + 1, pos.y);

        return defaultTile;

      case Direction.SOUTH:
        if (pos.y < this.height - 1)
          return this.getTileValue(pos.x, pos.y + 1);

        return defaultTile;

      case Direction.WEST:
        if (pos.x > 0)
          return this.getTileValue(pos.x - 1, pos.y);

        return defaultTile;

      default:
          return defaultTile;
    }
  };


  GameMap.prototype.setTile = function(x, y, value, flags) {
    var e = new Error('Invalid parameter');

    if (arguments.length < 3)
      throw e;

    // Argument-shuffling
    if (arguments.length === 3) {
      flags = value;
      value = y;
      y = x.y;
      x = x.x;
    }

    if (!this.testBounds(x, y))
      throw e;

    var tileIndex = this._calculateIndex(x, y);
    if (!(tileIndex in this._data))
      this._data[tileIndex] = new Tile(this.defaultValue);
    this._data[tileIndex].set(value, flags);
  };


  GameMap.prototype.setTo = function(x, y, tile) {
    var e = new Error('Invalid parameter');

    if (arguments.length < 2)
      throw e;

    // Argument-shuffling
    if (tile === undefined) {
      tile = y;
      y = x.y;
      x = x.x;
    }

    if (!this.testBounds(x, y))
      throw e;

    var tileIndex = this._calculateIndex(x, y);
    this._data[tileIndex] = tile;
  };


  GameMap.prototype.setTileValue = function(x, y, value) {
    var e = new Error('Invalid parameter');

    if (arguments.length < 2)
      throw e;

    // Argument-shuffling
    if (arguments.length === 2) {
      value = y;
      y = x.y;
      x = x.x;
    }

    if (!this.testBounds(x, y))
      throw e;

    var tileIndex = this._calculateIndex(x, y);
    if (!(tileIndex in this._data))
      this._data[tileIndex] = new Tile(this.defaultValue);
    this._data[tileIndex].setValue(value);
  };


  GameMap.prototype.setTileFlags = function(x, y, flags) {
    var e = new Error('Invalid parameter');

    if (arguments.length < 2)
      throw e;

    // Argument-shuffling
    if (arguments.length === 2) {
      flags = y;
      y = x.y;
      x = x.x;
    }

    if (!this.testBounds(x, y))
      throw e;

    var tileIndex = this._calculateIndex(x, y);
    if (!(tileIndex in this._data))
      this._data[tileIndex] = new Tile(this.defaultValue);
    this._data[tileIndex].setFlags(flags);
  };


  GameMap.prototype.addTileFlags = function(x, y, flags) {
    var e = new Error('Invalid parameter');

    if (arguments.length < 2)
      throw e;

    // Argument-shuffling
    if (arguments.length === 2) {
      flags = y;
      y = x.y;
      x = x.x;
    }

    if (!this.testBounds(x, y))
      throw e;

    var tileIndex = this._calculateIndex(x, y);
    if (!(tileIndex in this._data))
      this._data[tileIndex] = new Tile(this.defaultValue);
    this._data[tileIndex].addFlags(flags);
  };


  GameMap.prototype.removeTileFlags = function(x, y, flags) {
    var e = new Error('Invalid parameter');

    if (arguments.length < 2)
      throw e;

    // Argument-shuffling
    if (arguments.length === 2) {
      flags = y;
      y = x.y;
      x = x.x;
    }

    if (!this.testBounds(x, y))
      throw e;

    var tileIndex = this._calculateIndex(x, y);
    if (!(tileIndex in this._data))
      this._data[tileIndex] = new Tile(this.defaultValue);
    this._data[tileIndex].removeFlags(flags);
  };


  GameMap.prototype.putZone = function(centreX, centreY, centreTile, size) {
    var e = new Error('Invalid parameter');

    if (!this.testBounds(centreX, centreY) || !this.testBounds(centreX - 1 + size, centreY - 1 + size))
      throw e;

    var tile = centreTile - 1 - size;
    var startX = centreX - 1;
    var startY = centreY - 1;

    for (var y = startY; y < startY + size; y++) {
      for (var x = startX; x < startX + size; x++) {
        if (x === centreX && y === centreY)
          this.setTo(x, y, new Tile(tile, Tile.BNCNBIT | Tile.ZONEBIT));
        else
          this.setTo(x, y, new Tile(tile, Tile.BNCNBIT));
        tile += 1;
      }
    }
  };


  return GameMap;
});
