/**
 * @file
 * JS Implementation of OpenLayers behavior.
 */
(function (context) {
"use strict";

// Defining some "global" objects.
var $ = context.jQuery,
    OpenLayers = context.OpenLayers,
    Drupal = context.Drupal;

/**
 * OpenLayers cycle behavior
 */
Drupal.openlayers.addBehavior('openlayers_cycle', function (data, options) {

  var map = data.openlayers,
      layers = [],
      features =  map.getLayersBy('drupalID', 'openlayers_cycle_story_data').pop().features,
      cycle = new Drupal.openlayers_cycle.Cycle(map, features.length)
                    .createControls($(map.div).parent().parent());

  // Setting map options.
  map.setOptions({
    panMethod: OpenLayers.Easing.Quad.easeInOut,
    panDuration: 100,
    panRatio: 50
  });

  // Pause cycle on some map events.
  // TODO: These are limited - won't capture dragging.
  map.events.register('click', cycle, cycle.pause);
  map.events.register('zoomend', cycle, cycle.pause);

  // Collect list of enabled vector layers and create popups for their features.
  for (var i in options.layers) {
    var layer = map.getLayersBy('drupalID', options.layers[i]).pop();
    if (typeof layer === 'undefined') {
      continue;
    }

    for (var j in layer.features) {
      var feature = layer.features[j],
          popup = new OpenLayers.Popup.FramedCloud(
            feature.drupalFID,
            feature.geometry.getBounds().getCenterLonLat(),
            null,
            feature.data.content
          );
      popup.hide();
      popup.closeOnMove = true;

      // Pausing cycle if click is detected within the popup.
      popup.events.register('click', cycle, cycle.pause);

      feature.popup = popup;
      map.addPopup(popup);
    }

    // Record list of enabled layers.
    layers.push(layer);
  }

  // Select feature layer will allow popups to be triggered based on user input.
  var select = new OpenLayers.Control.SelectFeature(layers, {
      onSelect: function(feature) {
        if (feature.hasOwnProperty('popup')) {
          feature.popup.show();
        }
      },
      onUnselect: function(feature) {
        if (feature.hasOwnProperty('popup')) {
          feature.popup.hide();
        }
      }
    }
  );
  map.addControl(select);
  select.activate();

  // Define map panning process.
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
        var feature = features[from];
        moving = true;

        feature.popup.closeOnMove = false;
        feature.popup.hide();

      }, this),

      finish: OpenLayers.Function.bind(function (map) {
        var feature = features[to];

        feature.popup.closeOnMove = true;
        feature.popup.panIntoView();
        feature.popup.show();

        moving = false;
      }, this)
    };

    if (!moving) {
      // Custom implementation of OpenLayers.panTo().
      Drupal.openlayers_cycle.asyncPanTo.call(map, lonlat, callbacks);
      return true;
    }

    return false;
  });

  // Start the cycle.
  cycle.play();
});


// Ensure namespace.
Drupal.openlayers_cycle = Drupal.openlayers_cycle || {};

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
Drupal.openlayers_cycle.asyncPanTo = function(lonlat, callbacks) {
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

}(window));
