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
Drupal.openlayers.addBehavior('openlayers_behavior_story_map', function (data, options) {

  var map = data.openlayers,
      layers = [],
      features =  map.getLayersBy('drupalID', 'openlayers_behavior_story_map_story_data').pop().features,
      moving = false,
      cycle = new Drupal.openlayers_cycle.Cycle(map, features.length)
                    .createControls($(map.div).parent().parent());

  // Setting map options.
  map.setOptions({
    panMethod: OpenLayers.Easing.Quad.easeInOut,
    panDuration: 200,
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

    // Record list of enabled layers.
    layers.push(layer);

    for (var j in layer.features) {
      var feature = features[j];

      // Track feature's lonlat.
      if (!feature.hasOwnProperty('lonlat') || feature.lonlat === null) {
        feature.lonlat = new OpenLayers.LonLat(feature.geometry.x, feature.geometry.y);
      }

      // Create popups for features.
      var popup = new OpenLayers.Popup.FramedCloud(
        feature.drupalFID,
        feature.geometry.getBounds().getCenterLonLat(),
        null,
        feature.data.content
      );

      // Pausing cycle if click is detected within the popup.
      popup.events.register('click', cycle, cycle.pause);
      popup.panMapIfOutOfView = false;

      feature.popup = popup;
    }
  }

  var feature_select = function(feature) {
    // Ensure map has panned by offset to give maximum space for popup.
    var lonlat = Drupal.openlayers_cycle.offsetCenter.call(map, { x: 100, y: -50 }, feature.lonlat);

    if (feature.hasOwnProperty('popup')) {
      Drupal.openlayers_cycle.asyncPanTo.call(map, lonlat, {
        finish: function (map) {
          moving = false;
          map.addPopup(feature.popup);
          // TODO: This is potentially slow.
          Drupal.attachBehaviors();
        }
      });
    }
  };

  var feature_unselect = function(feature) {
    if (feature.hasOwnProperty('popup')) {
      map.removePopup(feature.popup);
    }
  };

  // Select feature layer will allow popups to be triggered based on user input.
  var selector = new OpenLayers.Control.SelectFeature(layers, {
    onSelect: feature_select,
    onUnselect: feature_unselect
  });
  map.addControl(selector);
  selector.activate();

  var scroller = new Drupal.openlayers_cycle.MouseWheelHandler(selector, {
    overScrollableDiv: OpenLayers.Function.bind(cycle.pause, cycle)
  });
  scroller.activate();

  $(cycle).bind('go', function (evt) {
    var from = evt.originalEvent.from,
        to = evt.originalEvent.to;

    if (!moving) {
      moving = true;

      selector.unselect(features[from]);
      selector.select(features[to]);
      return true;
    }

    return false;
  });

  // Start the cycle.
  cycle.play();
});


// Ensure namespace.
Drupal.openlayers_cycle = Drupal.openlayers_cycle || {};

Drupal.openlayers_cycle.offsetCenter = function(offset, lonlat) {
  lonlat = lonlat || this.getCachedCenter();

  // Perform offset adjustment.
  var dest = this.getPixelFromLonLat(lonlat);
  var viewport = this.getSize();

  if (offset.y > 0) {
    dest.y = dest.y + (viewport.h / 2) - offset.y;
  }
  else if (offset.y < 0) {
    dest.y = dest.y - (viewport.h / 2) - offset.y;
  }

  if (offset.x > 0) {
    dest.x = dest.x + (viewport.w / 2) - offset.x;
  }
  else if (offset.x < 0) {
    dest.x = dest.x - (viewport.w / 2) - offset.x;
  }

  return this.getLonLatFromPixel(dest);
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

/**
 * Subclass of OpenLayers.Handler.MouseWheel.
 * Exposes three wheel event callbacks that get fired depending on the DOM
 * element being scrolled.
 *
 * - overScrollableDiv
 *    Scrolling on a regular div element, suchas the contents of a popup.
 * - overLayerDiv
 *    Scrolling on a specific layer.
 * - overMapDiv
 *    Scrolling on the base map (this typically triggers zooming).
 */
Drupal.openlayers_cycle.MouseWheelHandler = new OpenLayers.Class(OpenLayers.Handler.MouseWheel, {
  onWheelEvent: function (e) {
    // make sure we have a map and check keyboard modifiers
    if (!this.map || !this.checkModifiers(e)) {
      return;
    }

    // Ride up the element's DOM hierarchy to determine if it or any of 
    //  its ancestors was: 
    //   * specifically marked as scrollable
    //   * one of our layer divs
    //   * the map div
    //
    var overScrollableDiv = false;
    var overLayerDiv = false;
    var overMapDiv = false;

    var elem = OpenLayers.Event.element(e);
    while ((elem !== null) && !overMapDiv && !overScrollableDiv) {

      if (!overScrollableDiv) {
        try {
          var overflow;
          if (elem.currentStyle) {
            overflow = elem.currentStyle.overflow;
          } else {
            var style = context.document.defaultView.getComputedStyle(elem, null);
            overflow = style.getPropertyValue("overflow");
          }
          overScrollableDiv = ( overflow && (overflow == "auto") || (overflow == "scroll") );
        } catch(err) {
          //sometimes when scrolling in a popup, this causes 
          // obscure browser error
        }
      }

      if (!overLayerDiv) {
        for(var i=0, len=this.map.layers.length; i<len; i++) {
          // Are we in the layer div? Note that we have two cases
          // here: one is to catch EventPane layers, which have a 
          // pane above the layer (layer.pane)
          if (elem == this.map.layers[i].div || elem == this.map.layers[i].pane) { 
            overLayerDiv = true;
            break;
          }
        }
      }
      overMapDiv = (elem == this.map.div);

      elem = elem.parentNode;
    }

    // Trigger callbacks.
    if (overScrollableDiv) {
      if (this.callbacks.hasOwnProperty('overScrollableDiv')) {
        this.callbacks.overScrollableDiv(e);
      }
    }

    if (overLayerDiv) {
      if (this.callbacks.hasOwnProperty('overLayerDiv')) {
        this.callbacks.overLayerDiv(e);
      }
    }

    if (overMapDiv) {
      if (this.callbacks.hasOwnProperty('overMapDiv')) {
        this.callbacks.overMapDiv(e);
      }
    }
  }
});

}(window));
