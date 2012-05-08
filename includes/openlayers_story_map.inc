<?php

class OpenLayersStoryMap extends AbstractStoryMapDriver {

  function __construct($name) {
    $this->map = openlayers_map_load($name);
  }

  function addFeature($geodata, $content) {
    $this->map->data['openlayers_behavior_story_map_features'][] = array(
      'projection' => '4326',
      'wkt' => 'POINT(' . $geodata['lon'] . ' ' . $geodata['lat'] . ')',
      'attributes' => array(
        'content' => $content,
      ),
    );
  }

  function render() {
    return openlayers_render_map($this->map);
  }
}
