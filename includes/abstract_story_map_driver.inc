<?php

abstract class AbstractStoryMapDriver {

  protected $map;

  function getMap() {
    return $this->map;
  }

  abstract function addFeature($geodata, $content, $properties = array());

  abstract function render();
}
