(function ($) {

Drupal.openlayers_cycle = Drupal.openlayers_cycle || {};

Drupal.openlayers_cycle.Cycle = function (map, size, options) {
  var p = this,
      _cycle = {};

  p.size = size;
  p.options = options || {};
  p.timer = null;
  p.playing = false;
  p.pos = size;

  // Overriding default options.
  p.options = $.extend({
    // Default cycle options.
    duration: 6000
  }, options);

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
        to = (p.pos >= p.size - 1) ? 0 : p.pos + 1;

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
        to = (p.pos <= 0) ? p.size - 1 : p.pos - 1;

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

  _cycle.setPos = function (pos) {
    p.pos = pos;
  };

  /**
   * Creating controls.
   */
  _cycle.createControls = function (element) {
    // TODO: Should probably be using Drupal's js theme functions here.
    var controls = $('<div>')
        .addClass('cycle-controls')
        .append($('<a>').addClass('toggle').html('Pause'))
        .append($('<a>').addClass('next').html('Next'))
        .append($('<a>').addClass('previous').html('Previous'))
        .appendTo(element);

    // Binding events to buttons.
    $('.toggle', controls).click($.proxy(_cycle, 'toggle'));
    $('.previous', controls).click($.proxy(_cycle, 'previous'));
    $('.next', controls).click($.proxy(_cycle, 'next'));

    $(_cycle).bind('play', function () {
      $('.toggle', controls).html('Pause');
    });

    $(_cycle).bind('pause', function () {
      $('.toggle', controls).html('Play');
    });

    return _cycle;
  };

  /**
   * Trigger go event, broadcasting 'from' and 'to' indexes.
   *
   * @param from
   *    Index moving from.
   * @param to
   *    Index moving to.
   */
  p.go = function (from, to) {
    $(_cycle).triggerHandler({
      type: 'go',
      from: from,
      to: to
    });
  };

  return _cycle;
};

}(jQuery));
