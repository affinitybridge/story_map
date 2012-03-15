/**
 * @file
 * JS Implementation of OpenLayers behavior.
 */
(function ($) {

/**
 * OpenLayers cycle behavior
 */
Drupal.openlayers.addBehavior('openlayers_cycle', function (data, options) {
  var features =  data.openlayers.getLayersByClass('OpenLayers.Layer.Vector').pop().features,
      cycle = new Drupal.openlayers_cycle.Cycle(data.openlayers, features.length)
                    .createControls($(data.openlayers.div).parent().parent());

  // Setting map options.
  data.openlayers.setOptions({
    panMethod: OpenLayers.Easing.Quad.easeInOut,
    panDuration: 100,
    panRatio: 50
  });

  data.openlayers.events.register('click', cycle, cycle.pause); 

  $(cycle).bind('go', function (evt) {
    var from = evt.originalEvent.from,
        to = evt.originalEvent.to,
        point = features[to].geometry,
        lonlat = new OpenLayers.LonLat(point.x, point.y),
        moving = false;

    // TODO: Probably shouldn't be declaring new functions everytime go() is
    //       called.
    var callbacks = {
      start: OpenLayers.Function.bind(function (map) {
        moving = true;
        var feature = features[from];

        if (typeof feature != 'undefined' && 
            Drupal.openlayers.popup.hasOwnProperty('popupSelect')) {
          //Drupal.openlayers.popup.popupSelect.clickoutFeature(feature);
        }
      }, this),

      finish: OpenLayers.Function.bind(function (map) {
        var feature = features[to];

        // TODO: openLayers_cycle gets loaded before the openlayers_popup
        //       behavior, We should defer this until popup has been loaded rather
        //       than skipping the 1st one.
        if (typeof feature != 'undefined' &&
            Drupal.openlayers.popup.hasOwnProperty('popupSelect')) {
          //Drupal.openlayers.popup.popupSelect.select(feature);
        }
        moving = false;
      }, this)
    };

    if (!moving) {
      // Custom implementation of OpenLayers.panTo().
      asyncPanTo.call(data.openlayers, lonlat, callbacks);
      cycle.setPos(to);
    }
  });

  cycle.play();
});

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

