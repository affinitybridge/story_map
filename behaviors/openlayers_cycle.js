/**
 * @file
 * JS Implementation of OpenLayers behavior.
 */
(function ($) {

/**
 * OpenLayers cycle behavior
 */
Drupal.openlayers.addBehavior('openlayers_cycle', function (data, options) {
  var features =  data.openlayers.getLayersByClass('OpenLayers.Layer.Vector').pop().features;
      cycle = new Cycle(data.openlayers, features);

  // Creating controls.
  // TODO: This is kind of ghetto, should probably figureout a better way/place
  //      to to this.
  var controls = $('<div>')
        .addClass('openlayers-cycle-controls')
        .append($('<a>').addClass('toggle').html('Pause'))
        .append($('<a>').addClass('next').html('Next'))
        .append($('<a>').addClass('previous').html('Previous'))
        .appendTo($(data.openlayers.div).parent().parent());

  // Binding events to buttons.
  $('.toggle', controls).click($.proxy(cycle, 'toggle'));
  $('.previous', controls).click($.proxy(cycle, 'previous'));
  $('.next', controls).click($.proxy(cycle, 'next'));

  $(cycle).bind('play', function () {
    $('.toggle', controls).html('Pause');
  });

  $(cycle).bind('pause', function () {
    $('.toggle', controls).html('Play');
  });

  $(cycle).bind('moveStart', function (evt) {
    var feature = evt.originalEvent.feature;

    if (typeof feature != 'undefined' && 
        Drupal.openlayers.popup.hasOwnProperty('popupSelect')) {
      Drupal.openlayers.popup.popupSelect.clickoutFeature(feature);
    }
  });

  $(cycle).bind('moveEnd', function (evt) {
    var feature = evt.originalEvent.feature;

    // TODO: openLayers_cycle gets loaded before the openlayers_popup
    //       behavior, We should defer this until popup has been loaded rather
    //       than skipping the 1st one.
    if (typeof feature != 'undefined' &&
        Drupal.openlayers.popup.hasOwnProperty('popupSelect')) {
      Drupal.openlayers.popup.popupSelect.select(feature);
      Drupal.openlayers.popup.popupSelect.events.register('click', cycle, cycle.pause);
    }
  });

  data.openlayers.events.register('click', cycle, cycle.pause); 

  cycle.play();
});

var Cycle = function (map, items, options) {
  var p = this,
      _cycle = {};

  p.items = items;
  p.map = map;
  p.options = options || {};
  p.timer = null;
  p.playing = false;
  p.moving = false;
  p.pos = p.items.length;

  // Overriding default options.
  p.options = $.extend({
    // Default cycle options.
    duration: 6000,

    // Default map options
    map: {
      panMethod: OpenLayers.Easing.Quad.easeInOut,
      panDuration: 100,
      panRatio: 50
    }
  }, options);

  // Setting map options.
  p.map.setOptions(p.options.map);

  /**
   * Start cycle.
   */
  _cycle.play = function () {
    p.playing = true;
    this.next();

    $(this).triggerHandler('play');
  };

  /**
   * Pause cycle.
   */
  _cycle.pause = function () {
    clearTimeout(p.timer);
    p.playing = false;

    $(this).triggerHandler('pause');
  };

  /**
   * Step cycle forwards.
   */
  _cycle.next = function () {
    var from = p.pos,
        to = (p.pos >= p.items.length - 1) ? 0 : p.pos + 1;

    p.go(from, to);

    if (p.playing) {
      clearTimeout(p.timer);
      p.timer = window.setTimeout($.proxy(this, 'next'), p.options.duration);
    }
  };

  /**
   * Step cycle backwards.
   */
  _cycle.previous = function () {
    var from = p.pos,
        to = (p.pos <= 0) ? p.items.length - 1 : p.pos - 1;

    p.go(from, to);

    if (p.playing) {
      clearTimeout(p.timer);
      p.timer = window.setTimeout($.proxy(this, 'next'), p.options.duration);
    }
  };

  /**
   * Convenience method to toggle play/pause based on internal state.
   */
  _cycle.toggle = function () {
    if (p.playing) {
      this.pause();
    }
    else {
      this.play();
    }
  };

  /**
   * Trigger map to pan to a new point (private function for internal use).
   *
   * @param from
   *    Index of the feature moving from.
   * @param to
   *    Index of the feature moving to.
   */
  p.go = function (from, to) {
    var point = p.items[to].geometry,
        lonlat = new OpenLayers.LonLat(point.x, point.y),
        fromFeature = p.items[from],
        toFeature = p.items[to];

    // TODO: Probably shouldn't be declaring new functions everytime go() is
    //       called.
    var callbacks = {
      start: OpenLayers.Function.bind(function (map) {
        p.moving = true;
        $(_cycle).triggerHandler({
          type: 'moveStart',
          feature: fromFeature
        });
      }, this),

      finish: OpenLayers.Function.bind(function (map) {
        $(_cycle).triggerHandler({
          type: 'moveEnd',
          feature: toFeature
        });
        p.moving = false;
      }, this)
    };

    if (!p.moving) {
      // Custom implementation of OpenLayers.panTo().
      asyncPanTo.call(p.map, lonlat, callbacks);
      p.pos = to;
    }
  };

  return _cycle;
};

/**
 * Custom implementation of OpenLayers.panTo().
 * Takes a second parameter which can contain start and finish callbacks which
 * will get called at the start and end of the pan action respectively.
 *
 * This can be called on any OpenLayers.Map() object. Eg: 
 *    asyncPanTo.call(new Openlayers.Map({ ... }), { start: ..., end: ... });
 *
 * @param lonlat
 *    OpenLayers.LonLat() : The co-ordinates to pan the map to.
 *
 * @param callbacks
 *    An object containing start and/or finish properties which are functions to
 *    be called when the pan action begins and ends.
 */
var asyncPanTo = function(lonlat, callbacks) {
  if (this.panMethod && this.getExtent().scale(this.panRatio).containsLonLat(lonlat)) {
    if (!this.panTween) {
      this.panTween = new OpenLayers.Tween(this.panMethod);
    }
    var center = this.getCachedCenter();

    // center will not change, don't do nothing
    if (lonlat.equals(center)) {
      // Ensure callbacks get called anyway.
      if (callbacks.hasOwnProperty('start')) {
        callbacks.start(this);
      }
      if (callbacks.hasOwnProperty('finish')) {
        callbacks.finish(this);
      }
      return;
    }

    var from = this.getPixelFromLonLat(center);
    var to = this.getPixelFromLonLat(lonlat);
    var vector = { x: to.x - from.x, y: to.y - from.y };
    var last = { x: 0, y: 0 };

    this.panTween.start( { x: 0, y: 0 }, vector, this.panDuration, {
      callbacks: {

        start: OpenLayers.Function.bind(function(px) {
          if (callbacks.hasOwnProperty('start')) {
            callbacks.start(this);
          }
        }, this),

        eachStep: OpenLayers.Function.bind(function(px) {
          var x = px.x - last.x,
              y = px.y - last.y;
          this.moveByPx(x, y);
          last.x = Math.round(px.x);
          last.y = Math.round(px.y);
        }, this),

        done: OpenLayers.Function.bind(function(px) {
          this.moveTo(lonlat);
          this.dragging = false;
          this.events.triggerEvent("moveend");

          if (callbacks.hasOwnProperty('finish')) {
            callbacks.finish(this);
          }
        }, this)

      }
    });
  } else {
    // Start callback.
    if (callbacks.hasOwnProperty('start')) {
      callbacks.start(this);
    }

    this.setCenter(lonlat);

    // End callback.
    if (callbacks.hasOwnProperty('finish')) {
      callbacks.finish(this);
    }
  }
};

}(jQuery));

