<?php

class OpenlayersCycleStory extends Entity {

  public $id = 0;
  public $name = '';
  public $machine_name = '';
  public $description = '';
  public $options = array();

  public $queue;

  public function __construct(array $values = array(), $entityType = NULL) {
    parent::__construct($values, 'openlayers_cycle_story');
  }

  /**
   * Construct a default URI.
   */
  protected function defaultUri() {
    return array('path' => 'story/' . $this->identifier());
  }

  /**
   * Construct a default label.
   */
  protected function defaultLabel() {
    return $this->name;
  }
}

/**
 * Story UI Controller.
 * Responsible for all UI representations of story entities.
 * Most of the heavy lifting for the admin interface is provided by EntityAPI.
 */
class OpenlayersCycleStoryUIController extends EntityDefaultUIController {
  /**
   * Overridden to provide a page callback for regular story view.
   */
  public function hook_menu() {
    $wildcard = isset($this->entityInfo['admin ui']['menu wildcard']) ? $this->entityInfo['admin ui']['menu wildcard'] : '%entity_object';
    $items = parent::hook_menu();

    $items["story/$wildcard"] = array(
      'title callback' => 'openlayers_cycle_story_page_title',
      'title arguments' => array(1),
      'page callback' => 'openlayers_cycle_story_page_view',
      'page arguments' => array(1),
      'access callback' => 'openlayers_cycle_story_access',
      'access arguments' => array('view', 1),
      'type' => MENU_CALLBACK,
    );

    return $items;
  }
}
