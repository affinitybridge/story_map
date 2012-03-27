<?php

class StoryMapStory extends Entity {

  public $id = 0;
  public $name = '';
  public $machine_name = '';
  public $description = '';
  public $options = array();

  public $queue;

  public function __construct(array $values = array(), $entityType = NULL) {
    parent::__construct($values, 'story_map_story');
  }

  /**
   * Convenience method ensure a story's queue stays up-to-date.
   */
  public function refreshQueue() {
    $this->ensureQueue();
  }

  /**
   * Convenience method to get a story's queue.
   */
  public function getQueue() {
    return $this->ensureQueue();
  }

  /**
   * Get all the nodes from the subqueue of a story's queue.
   */
  public function getQueueNodes() {
    $queue = $this->getQueue();

    // Crazy dance to get the contents of the queue.
    $sqids = nodequeue_load_subqueues_by_queue($queue->qid);
    list($sqid) = array_keys($sqids);
    // Load all the nodes.
    $nodes = nodequeue_load_nodes($sqid, FALSE, 0, FALSE);

    return $nodes;
  }

  /**
   * Ensures there is a queue associated with this story.
   */
  protected function ensureQueue() {
    if (empty($this->queue)) {
      $default_geofields = story_map_get_default_geofields();
      $types = array_keys($default_geofields);
      $queue = $this->createQueue($types);
    }
    else {
      $queue = nodequeue_load_queue_by_name($this->queue);
    }

    $queue->title = $this->name;
    $queue->subqueue_title = $this->name;

    $qid = nodequeue_save($queue);

    return $queue;
  }

  private function createQueue($types = array()) {
    // Nodequeue has 40 char limit on link text, so we need to ensure name has
    // been truncated. Allowing 25chars for the name leaves 15 for other text.
    // TODO: This is stupid.
    $placeholders = array('@story' => truncate_utf8($this->name, 25, TRUE, TRUE));
    $queue = array(
      'name' => $this->identifier(),
      'title' => $this->name,
      'subqueue_title' => $this->name,
      'size' => 0,
      'link' => t('Add to !story.', $placeholders),
      'link_remove' => t('Remove from !story.', $placeholders),
      'owner' => 'nodequeue',
      'show_in_links' => (int) FALSE,
      'show_in_tab' => (int) TRUE,
      'show_in_ui' => (int) FALSE,
      'reverse' => (int) FALSE,
      'reference' => (int) FALSE,
      'i18n' => (int) FALSE,
      'types' => array_combine($types, $types),
      'roles' => array(),
      'add_subqueue' => array(
        $this->name,
      ),
    );
    if (isset($this->options['queue'])) {
      $queue = $this->options['queue'] + $queue;
    }

    $queue = (object) $queue;
    $this->queue = $this->machine_name;

    return $queue;
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
class StoryMapStoryUIController extends EntityDefaultUIController {
  /**
   * Overridden to provide a page callback for regular story view.
   */
  public function hook_menu() {
    $items = array();
    $id_count = count(explode('/', $this->path));
    $wildcard = isset($this->entityInfo['admin ui']['menu wildcard']) ? $this->entityInfo['admin ui']['menu wildcard'] : '%entity_object';
    $plural_label = isset($this->entityInfo['plural label']) ? $this->entityInfo['plural label'] : $this->entityInfo['label'] . 's';

    $items[STORY_MAP_STORY_INDEX_PATH] = array(
      'title' => $plural_label,
      'page callback' => 'drupal_get_form',
      'page arguments' => array($this->entityType . '_overview_form', $this->entityType),
      'description' => 'Manage ' . $plural_label . '.',
      'access callback' => 'entity_access',
      'access arguments' => array('update', $this->entityType),
      'file' => 'includes/entity.ui.inc',
    );

    $items[$this->path . '/add'] = array(
      'title callback' => 'entity_ui_get_action_title',
      'title arguments' => array('add', $this->entityType),
      'page callback' => 'entity_ui_get_form',
      'page arguments' => array($this->entityType, NULL, 'add'),
      'access callback' => 'entity_access',
      'access arguments' => array('create', $this->entityType),
      'type' => MENU_LOCAL_ACTION,
    );

    $items[$this->path . '/' . $wildcard] = array(
      'title callback' => 'story_map_story_page_title',
      'title arguments' => array($id_count),
      'page callback' => 'story_map_story_page_view',
      'page arguments' => array($id_count),
      'access callback' => 'entity_access',
      'access arguments' => array('view', $this->entityType, $id_count),
      'type' => MENU_NORMAL_ITEM,
    );

    $items[$this->path . '/' . $wildcard . '/view'] = array(
      'title' => t('View'),
      'access callback' => 'entity_access',
      'access arguments' => array('view', $this->entityType, $id_count),
      'type' => MENU_DEFAULT_LOCAL_TASK,
    );

    $items[$this->path . '/' . $wildcard . '/edit'] = array(
      'title' => 'Edit',
      'page callback' => 'entity_ui_get_form',
      'page arguments' => array($this->entityType, $id_count),
      'load arguments' => array($this->entityType),
      'access callback' => 'entity_access',
      'access arguments' => array('update', $this->entityType, $id_count),
      'weight' => 1,
      'type' => MENU_LOCAL_TASK,
    );

    $items[$this->path . '/' . $wildcard . '/edit/sequence'] = array(
      'title' => t('Edit story sequence'),
      'page callback' => 'story_map_story_manage_sequence',
      'page arguments' => array($id_count),
      'access callback' => 'entity_access',
      'access arguments' => array('update', $this->entityType, $id_count),
      'type' => MENU_LOCAL_ACTION,
    );

    // Clone form, a special case for the edit form.
    $items[$this->path . '/' . $wildcard . '/clone'] = array(
      'title' => 'Clone',
      'page callback' => 'entity_ui_get_form',
      'page arguments' => array($this->entityType, $id_count, 'clone'),
      'load arguments' => array($this->entityType),
      'access callback' => 'entity_access',
      'access arguments' => array('create', $this->entityType),
      'weight' => 2,
      'type' => MENU_LOCAL_TASK,
    );

    // Menu item for operations like revert and delete.
    $items[$this->path . '/' . $wildcard . '/%'] = array(
      'page callback' => 'drupal_get_form',
      'page arguments' => array($this->entityType . '_operation_form', $this->entityType, $id_count, $id_count + 1),
      'load arguments' => array($this->entityType),
      'access callback' => 'entity_access',
      'access arguments' => array('delete', $this->entityType, $id_count),
      'file' => 'includes/entity.ui.inc',
    );

    // TODO: Importing is broken.
    /*
    if (!empty($this->entityInfo['exportable'])) {
      // Menu item for importing an entity.
      $items[$this->path . '/import'] = array(
        'title callback' => 'entity_ui_get_action_title',
        'title arguments' => array('import', $this->entityType),
        'page callback' => 'drupal_get_form',
        'page arguments' => array($this->entityType . '_operation_form', $this->entityType, NULL, 'import'),
        'access callback' => 'entity_access',
        'access arguments' => array('create', $this->entityType),
        'file' => 'includes/entity.ui.inc',
        'type' => MENU_LOCAL_ACTION,
      );
    }
     */

    if (!empty($this->entityInfo['admin ui']['file'])) {
      // Add in the include file for the entity form.
      foreach (array("/$wildcard", "/$wildcard/edit", "/$wildcard/edit/sequence", "/$wildcard/clone", '/add') as $path_end) {
        $items[$this->path . $path_end]['file'] = $this->entityInfo['admin ui']['file'];
        $items[$this->path . $path_end]['file path'] = isset($this->entityInfo['admin ui']['file path']) ? $this->entityInfo['admin ui']['file path'] : drupal_get_path('module', $this->entityInfo['module']);
      }
    }
    return $items;
  }

  /**
   * Overridden to fix paths.
   *
   * Generates the row for the passed entity and may be overridden in order to
   * customize the rows.
   *
   * @param $additional_cols
   *   Additional columns to be added after the entity label column.
   */
  protected function overviewTableRow($conditions, $id, $entity, $additional_cols = array()) {
    $entity_uri = entity_uri($this->entityType, $entity);

    $row[] = array('data' => array(
      '#theme' => 'entity_ui_overview_item',
      '#label' => entity_label($this->entityType, $entity),
      '#name' => !empty($this->entityInfo['exportable']) ? entity_id($this->entityType, $entity) : FALSE,
      '#url' => $entity_uri ? $entity_uri : FALSE,
      '#entity_type' => $this->entityType),
    );

    // Add in any passed additional cols.
    foreach ($additional_cols as $col) {
      $row[] = $col;
    }

    // Add a row for the exportable status.
    if (!empty($this->entityInfo['exportable'])) {
      $row[] = array('data' => array(
        '#theme' => 'entity_status',
        '#status' => $entity->{$this->statusKey},
      ));
    }
    // In case this is a bundle, we add links to the field ui tabs.
    $field_ui = !empty($this->entityInfo['bundle of']) && module_exists('field_ui');
    // For exportable entities we add an export link.
    $exportable = !empty($this->entityInfo['exportable']);
    $colspan = 3;
    $colspan = $field_ui ? $colspan + 2 : $colspan;
    $colspan = $exportable ? $colspan + 1 : $colspan;

    // Add operations depending on the status.
    if (entity_has_status($this->entityType, $entity, ENTITY_FIXED)) {
      $row[] = array('data' => l(t('clone'), $this->path . '/manage/' . $id . '/clone'), 'colspan' => $colspan);
    }
    else {
      $row[] = l(t('edit'), $this->path . '/' . $id . '/edit');

      if ($field_ui) {
        $row[] = l(t('manage fields'), $this->path . '/manage/' . $id . '/fields');
        $row[] = l(t('manage display'), $this->path . '/manage/' . $id . '/display');
      }

      $row[] = l(t('clone'), $this->path . '/' . $id . '/clone');
      if (entity_access('delete', $this->entityType, $entity)) {
        if (empty($this->entityInfo['exportable']) || !entity_has_status($this->entityType, $entity, ENTITY_IN_CODE)) {
          $row[] = l(t('delete'), $this->path . '/' . $id . '/delete', array('query' => drupal_get_destination()));
        }
        elseif (entity_has_status($this->entityType, $entity, ENTITY_OVERRIDDEN)) {
          $row[] = l(t('revert'), $this->path . '/' . $id . '/revert', array('query' => drupal_get_destination()));
        }
        else {
          $row[] = '';
        }
      }
    }
    if ($exportable) {
      $row[] = l(t('export'), $this->path . '/' . $id . '/export');
    }
    return $row;
  }

  /**
   * Overridden to fix paths.
   */
  public function operationForm($form, &$form_state, $entity, $op) {
    switch ($op) {
      case 'revert':
        $label = entity_label($this->entityType, $entity);
        $confirm_question = t('Are you sure you want to revert the %entity %label?', array('%entity' => $this->entityInfo['label'], '%label' => $label));
        return confirm_form($form, $confirm_question, STORY_MAP_STORY_INDEX_PATH);

      case 'delete':
        $label = entity_label($this->entityType, $entity);
        $confirm_question = t('Are you sure you want to delete the %entity %label?', array('%entity' => $this->entityInfo['label'], '%label' => $label));
        return confirm_form($form, $confirm_question, $this->path);

      default:
        return parent::operationForm($form, $form_state, $entity, $op);
    }
  }
}
