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

  function addFeature($geodata, $content) {
    $this->features[] = array(
      'type' => 'point',
      'lat' => $geodata['lat'],
      'lon' => $geodata['lon'],
      'popup' => $content,
    );
  }

  function addOverlay($item) {
    $this->overlays[] = $item;
  }

  function render() {
    $path = drupal_get_path('module', 'story_map');

    if (!empty($this->features)) {
      $settings = array('features' => $this->features);
      drupal_add_js(array('story_map_leaflet' => array($settings)), 'setting');
      drupal_add_js($path . '/lib/cycle.js');
      drupal_add_js($path . '/js/story_map_leaflet.js', array(
        // Ensure this is run after leaflet.drupal.js.
        'weight' => 1
      ));
    }

    drupal_add_css($path . '/css/story_map_leaflet.css');

    return leaflet_render_map($this->map, $this->overlays);
  }

}
