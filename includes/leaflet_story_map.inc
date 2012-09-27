<?php

class LeafletStoryMap extends AbstractStoryMapDriver {

  protected $features = array();

  protected $overlays = array();

  function __construct($name) {
    $this->map = leaflet_map_get_info($name);

    // TODO: Make this configurable.
    $this->map['settings']['zoom'] = 11;
    $this->map['center'] = array(
      'lon' => -122.69202039112,
      'lat' => 58.806150439576
    );
  }

  function addFeature($geodata, $content, $properties = array()) {
    $feature = $properties;
    $feature['type'] = 'point';
    $feature['lat'] = $geodata['lat'];
    $feature['lon'] = $geodata['lon'];
    $feature['popup'] = $content;
    $this->features[] = $feature;
  }

  function addOverlay($item) {
    $this->overlays[] = $item;
  }

  function render() {
    $element = array();

    if (!empty($this->features)) {
      $settings = array('features' => $this->features);
      $element['#attached'] = array(
        'js' => array(
          array('data' => array('story_map_leaflet' => array($settings)), 'type' => 'setting'),
        ),
        'library' => array(
          array('story_map', 'story-map-leaflet'),
        ),
      );
    }

    $element['#markup'] = leaflet_render_map($this->map, $this->overlays);

    return $element;
  }

}
