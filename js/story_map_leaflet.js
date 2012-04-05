/**
 * @file
 * JS Implementation of OpenLayers behavior.
 */
(function (context) {
"use strict";

// Defining some "global" objects.
var $ = context.jQuery,
    L = context.L,
    Drupal = context.Drupal;

Drupal.behaviors.story_map = {
  stories: [],

  attach: function (context, settings) {
    $(settings.story_map_leaflet).each($.proxy(function (index, value) {
      var map_div = $('#' + settings.leaflet[index].mapId);
      map_div.once($.proxy(function () {
        this.stories.push(new Drupal.story_map.LeafletStory(settings.story_map_leaflet[index], settings.leaflet[index], map_div));

        // Ensure behaviors are applied to contents of popups.
        settings.leaflet[index].lMap.on('popupopen', function () {
          Drupal.attachBehaviors(context, settings);
        });
      }, this));
    }, this));
  }

};


Drupal.story_map = Drupal.story_map || {};

Drupal.story_map.LeafletStory = function (settings, leaflet, div) {
  // Sensible default.
  settings.autoCenter = settings.autoCenter || true;

  this.current = undefined;
  this.features = settings.features;
  this.leaflet = leaflet;
  this.cycle = new Drupal.openlayers_cycle.Cycle(this.features.length)
              .createControls(div.parent());

  this.bounds = [];
  for (var index in this.features) {
    var feature = this.features[index],
        latlng = new L.LatLng(feature.lat, feature.lon),
        icon = feature.icon || undefined,
        lMarker = Drupal.story_map.create_point(latlng, icon);

    if (feature.popup) {
      lMarker.bindPopup(feature.popup, {
        maxWidth: 500
      });
    }

    feature.lMarker = lMarker;
    feature.latlng = latlng;

    if (settings.autoCenter === true) {
      this.bounds.push(latlng);
    }

    this.leaflet.lMap.addLayer(lMarker);
  }

  if (this.bounds.length > 0) {
    this.leaflet.lMap.fitBounds(new L.LatLngBounds(this.bounds));
  }

  $(this.cycle).bind('go', $.proxy(this, 'go'));

  this.bindListeners();
};

Drupal.story_map.LeafletStory.prototype.go = function (evt) {
  var from = evt.originalEvent.from,
      to = evt.originalEvent.to,
      latlon = new L.LatLng(this.features[to].lat, this.features[to].lon);

  this.leaflet.lMap.panTo(latlon);
  this.features[to].lMarker.openPopup();

  return true;
};

Drupal.story_map.LeafletStory.prototype.bindListeners = function () {
  // Defining a bunch of listeners to respond to map events.
  var pause = $.proxy(this.cycle, 'pause');
  this.leaflet.lMap.on('zoomend', pause);
  this.leaflet.lMap.on('mousedown', pause);

  var map_listeners = {
        // Bind/unbind events to popups as they're created and removed.
        togglePopup: $.proxy(function (evt) {
          if (evt.type == 'popupopen') {
            this.current = evt.popup;
            $('.leaflet-popup-content-wrapper')
                .scroll(pause)
                .click(pause);
          }
          else if (evt.type == 'popupclosed') {
            this.current = undefined;
            $('.leaflet-popup-content-wrapper')
                .unbind('scroll', pause)
                .unbind('click', pause);
          }
        }, this),

        // Close & open popup to trigger map redraw and thus re-center map.
        // TODO: Look for a better method of doing this.
        redrawPopup: $.proxy(function () {
          if (typeof this.current !== 'undefined') {
            var popup = this.current;
            this.leaflet.lMap.closePopup();
            this.leaflet.lMap.openPopup(popup);
          }
        }, this)
      };

  this.leaflet.lMap.on('zoomend', map_listeners.redrawPopup);
  this.leaflet.lMap.on('popupopen', map_listeners.togglePopup);
  this.leaflet.lMap.on('popupclose', map_listeners.togglePopup);
};

Drupal.story_map.create_point = function (latlng, icon) {
  var lMarker;
  if (typeof icon !== 'undefined') {
    var lIcon = new L.Icon(icon.iconUrl);

    // override applicable icon defaults
    if (icon.hasOwnProperty('iconSize')) {
      lIcon.iconSize = new L.Point(parseInt(icon.iconSize.x, 10), parseInt(icon.iconSize.y, 10));
    }
    if (icon.hasOwnPropery('iconAnchor')) {
      lIcon.iconAnchor = new L.Point(parseFloat(icon.iconAnchor.x), parseFloat(icon.iconAnchor.y));
    }
    if (icon.hasOwnPropery('popupAnchor')) {
      lIcon.popupAnchor = new L.Point(parseFloat(icon.popupAnchor.x), parseFloat(icon.popupAnchor.y));
    }
    if (icon.hasOwnPropery('shadowUrl')) {
      lIcon.shadowUrl = icon.shadowUrl;
    }
    if (icon.hasOwnPropery('shadowSize')) {
      lIcon.shadowSize = new L.Point(parseInt(icon.shadowSize.x, 10), parseInt(icon.shadowSize.y, 10));
    }

    lMarker = new L.Marker(latlng, {icon: lIcon});
  }
  else {
    lMarker = new L.Marker(latlng);
  }
  return lMarker;
};

}(window));
