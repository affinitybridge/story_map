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
      }, this));
    }, this));
  }

};


Drupal.story_map = Drupal.story_map || {};

Drupal.story_map.LeafletStory = function (settings, leaflet, div) {
  this.features = settings.features;
  this.leaflet = leaflet;
  this.cycle = new Drupal.openlayers_cycle.Cycle(this.features.length)
              .createControls(div.parent());

  this.bounds = [];
  for (var index in this.features) {
    var feature = this.features[index],
        lMarker = Drupal.story_map.create_point(feature);

    if (feature.popup) {
      lMarker.bindPopup(feature.popup, {
        maxWidth: 500
      });
    }

    feature.lMarker = lMarker;
    // TODO: this.leaflet.lMap may not exist yet.
    this.leaflet.lMap.addLayer(lMarker);
  }

  $(this.cycle).bind('go', $.proxy(this, 'go'));
};

Drupal.story_map.LeafletStory.prototype.go = function (evt) {
  var from = evt.originalEvent.from,
      to = evt.originalEvent.to,
      latlon = new L.LatLng(this.features[to].lat, this.features[to].lon);

  this.leaflet.lMap.panTo(latlon);
  this.features[to].lMarker.openPopup();

  return true;
};


Drupal.story_map.create_point = function (definition) {
  var latlng = new L.LatLng(definition.lat, definition.lon),
      lMarker;

  if (definition.icon) {
    var icon = new L.Icon(definition.icon.iconUrl);

    // override applicable definition defaults
    if (definition.icon.iconSize) {
      icon.iconSize = new L.Point(parseInt(definition.icon.iconSize.x, 10), parseInt(definition.icon.iconSize.y, 10));
    }
    if (definition.icon.iconAnchor) {
      icon.iconAnchor = new L.Point(parseFloat(definition.icon.iconAnchor.x), parseFloat(definition.icon.iconAnchor.y));
    }
    if (definition.icon.popupAnchor) {
      icon.popupAnchor = new L.Point(parseFloat(definition.icon.popupAnchor.x), parseFloat(definition.icon.popupAnchor.y));
    }
    if (definition.icon.shadowUrl !== undefined) {
      icon.shadowUrl = definition.icon.shadowUrl;
    }
    if (definition.icon.shadowSize) {
      icon.shadowSize = new L.Point(parseInt(definition.icon.shadowSize.x, 10), parseInt(definition.icon.shadowSize.y, 10));
    }

    lMarker = new L.Marker(latlng, {icon: icon});
  }
  else {
    lMarker = new L.Marker(latlng);
  }
  return lMarker;
};

}(window));
