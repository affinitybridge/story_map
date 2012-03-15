<?php

class openlayers_cycle extends openlayers_behavior {
  
  /**
   * Render.
   */
  function render(&$map) {
    if (isset($map['openlayers_cycle_story_features'])) {
      $features = $map['openlayers_cycle_story_features'];
      if (!empty($features)) {
        $map['layers']['openlayers_cycle_story_data']['features'] = $features;
        drupal_add_js(drupal_get_path('module', 'openlayers_cycle') . '/lib/cycle.js');
        drupal_add_js(drupal_get_path('module', 'openlayers_cycle') . '/behaviors/openlayers_cycle.js');
      }
    }

    return $this->options;
  }
}
