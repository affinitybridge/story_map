<?php

class OpenLayersBehaviourStoryMap extends openlayers_behavior {
  
  /**
   * Render.
   */
  function render(&$map) {
    if (isset($map['openlayers_behavior_story_map_features'])) {
      $features = $map['openlayers_behavior_story_map_features'];
      if (!empty($features)) {
        $map['layers']['story_map_data']['features'] = $features;
        drupal_add_js(drupal_get_path('module', 'story_map') . '/lib/cycle.js');
        drupal_add_js(drupal_get_path('module', 'story_map') . '/behaviors/openlayers_behavior_story_map.js');

        $this->options['layers']['story_map_data'] = 'story_map_data';
      }
    }

    return $this->options;
  }
}
