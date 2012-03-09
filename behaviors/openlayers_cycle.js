/**
 * @file
 * JS Implementation of OpenLayers behavior.
 */
(function ($) {

/**
 * OpenLayers cycle behavior
 */
Drupal.openlayers.addBehavior('openlayers_cycle', function (data, options) {
  console.log(options);

  var layer = data.map.behaviors.openlayers_cycle.step_layer = 'industry_cycle_openlayers_1';
  if (data.map.layers.hasOwnProperty(layer)) {
    var features =  data.map.layers[layer].features,
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

    $(cycle).bind('moved', function (evt) {
      var from = evt.originalEvent.from,
          to = evt.originalEvent.from;
      if (typeof from != 'undefined') {
        //Drupal.openlayers.popup.popupSelect.unselect(from);
      }
      //Drupal.openlayers.popup.popupSelect.select(to);
    });

    cycle.play();
  }
});

var Cycle = function (map, items, options) {
  var _cycle = {},
      _items = items,
      _map = map,
      _options = options || {},
      _timer,
      _playing = false,
      _pos = _items.length;

  // Overriding default options.
  _options = $.extend({
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
  _map.setOptions(_options.map);

  _cycle.play = function () {
    _playing = true;
    this.next();

    $(this).triggerHandler('play');
  };

  _cycle.pause = function () {
    clearTimeout(_timer);
    _playing = false;

    $(this).triggerHandler('pause');
  };

  _cycle.next = function () {
    _pos = (_pos >= _items.length - 1) ? 0 : _pos + 1;
    this.go();

    if (_playing) {
      clearTimeout(_timer);
      _timer = window.setTimeout($.proxy(this, 'next'), _options.duration);
    }
  };

  _cycle.previous = function () {
    _pos = (_pos <= 0) ? _items.length - 1 : _pos - 1;
    this.go();

    if (_playing) {
      clearTimeout(_timer);
      _timer = window.setTimeout($.proxy(this, 'next'), _options.duration);
    }
  };

  _cycle.toggle = function () {
    if (_playing) {
      this.pause();
    }
    else {
      this.play();
    }
  };

  _cycle.go = function () {
    var point = Drupal.openlayers.objectFromFeature(_items[_pos]).geometry,
        lonlat = new OpenLayers.LonLat(point.x, point.y).transform(
          new OpenLayers.Projection('EPSG:4326'),
          new OpenLayers.Projection('EPSG:900913')
        );

    _map.panTo(lonlat);

    $(this).triggerHandler({
      type: 'moved',
      from: _items[_pos - 1],
      to: _items[_pos]
    });
  };

  return _cycle;
};

}(jQuery));
