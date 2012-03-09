<?php

class openlayers_cycle extends openlayers_behavior {
  
  /**
   * Render.
   */
  function render(&$map) {
    drupal_add_js(drupal_get_path('module', 'openlayers_cycle') . '/behaviors/openlayers_cycle.js');
    return $this->options;
  }
}
