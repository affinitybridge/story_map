(function (context) {
"use strict";

// Defining some "global" objects.
var $ = context.jQuery,
    Drupal = context.Drupal,
    setTimeout = context.setTimeout,
    clearTimeout = context.clearTimeout;

Drupal.story_map = Drupal.story_map || {};

Drupal.story_map.Cycle = function (size, options) {
  var p = this,
      _cycle = {};

  p.size = size;
  p.options = options || {};
  p.timer = null;
  p.playing = false;
  p.pos = 0;

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

    p.go(p.pos, p.pos);
    clearTimeout(p.timer);
    p.timer = setTimeout($.proxy(this, 'next'), p.options.duration);

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
      p.timer = setTimeout($.proxy(this, 'next'), p.options.duration);
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
      p.timer = setTimeout($.proxy(this, 'next'), p.options.duration);
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
   * Creating controls.
   */
  _cycle.createControls = function (element) {
    // TODO: Should probably be using Drupal's js theme functions here.
    this.controls = new p.CycleControls(_cycle, p.pos, p.size);
    element.append(this.controls.element);

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
    var success = $(_cycle).triggerHandler({
      type: 'go',
      from: from,
      to: to
    });
    if (success) {
      p.pos = to;
    }
  };

  p.CycleControls = function (cycle, start, total) {
    this._cycle = cycle;
    this.total = total;

    var update_position = function (evt) {
      var from = evt.originalEvent.to,
          position_text = Drupal.theme('story_map_cycle_control_position_text', from, this.total);

      this.position.html(position_text);
    };

    this.button_toggle = Drupal.theme('story_map_cycle_control_toggle', cycle)
      .addClass('toggle')
      .click($.proxy(cycle, 'toggle'));
    this.button_next = Drupal.theme('story_map_cycle_control_next', cycle)
      .addClass('next')
      .click($.proxy(cycle, 'next'));
    this.button_prev = Drupal.theme('story_map_cycle_control_prev', cycle)
      .addClass('prev')
      .click($.proxy(cycle, 'previous'));
    this.position = Drupal.theme('story_map_cycle_control_position', cycle)
      .addClass('position')
      .html(Drupal.theme('story_map_cycle_control_position_text', start, this.total));

    this.element = Drupal.theme('story_map_cycle_controls', this)
      .addClass('cycle-controls');

    $(cycle).bind('play', $.proxy(function () {
      this.element.addClass('playing');
    }, this));
    $(cycle).bind('pause', $.proxy(function () {
      this.element.removeClass('playing');
    }, this));

    $(cycle).bind('go', $.proxy(update_position, this));
  };

  return _cycle;
};


/**
 * Drupal theme functions.
 */
Drupal.theme.prototype.story_map_cycle_control_toggle = function (cycle) {
  var $toggle = $('<a>').html('Play');

  $(cycle).bind('play', function () {
    $toggle.html('Pause');
  });
  $(cycle).bind('pause', function () {
    $toggle.html('Play');
  });

  return $toggle;
};

Drupal.theme.prototype.story_map_cycle_control_next = function (cycle) {
  return $('<a>').html('Next');
};

Drupal.theme.prototype.story_map_cycle_control_prev = function (cycle) {
  return $('<a>').html('Previous');
};

Drupal.theme.prototype.story_map_cycle_control_position = function (cycle) {
  return $('<span>');
};

Drupal.theme.prototype.story_map_cycle_control_position_text = function (index, total) {
  return (index + 1) + ' of ' + total;
};

Drupal.theme.prototype.story_map_cycle_controls = function (controls) {
  var $position_container = $('<span>').addClass('cycle-controls-position')
        .append(controls.button_next)
        .append(controls.position)
        .append(controls.button_prev);

  return $('<div>')
        .append(controls.button_toggle)
        .append($position_container);
};

}(window, jQuery));
