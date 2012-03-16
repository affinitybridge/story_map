<?php

function openlayers_cycle_story_form($form, &$form_state, $story, $op = 'edit') {
  $form['name'] = array(
    '#type' => 'textfield',
    '#title' => t('Story name'),
    '#default_value' => isset($story->name) ? $story->name : '',
    '#size' => 50,
    '#required' => TRUE,
    '#maxlength' => 64,
    '#description' => t('Enter the name of the story.'),
  );

  $form['machine_name'] = array(
    '#type' => 'machine_name',
    '#default_value' => isset($story->machine_name) ? $story->machine_name : '',
    '#machine_name' => array(
      'exists' => 'openlayers_cycle_story_machine_name_exists',
    ),
    '#maxlength' => 32,
    '#description' => t('A unique machine-readable name for this story. It must only contain lowercase letters, numbers, and underscores.'),
  );

  $options = array();
  $maps = openlayers_maps();
  foreach ($maps as $name => $map) {
    if (isset($map->data['behaviors']['openlayers_cycle'])) {
      $options[$name] = $map->title;
    }
  }
  $form['map'] = array(
    '#type' => 'select',
    '#options' => $options,
    '#default_value' => isset($story->options['map']) ? $story->options['map'] : '',
    '#required' => TRUE,
    '#description' => t('Select a map to tell your story on.'),
  );

  $types = node_type_get_names();
  $form['types'] = array(
    '#type' => 'checkboxes',
    '#options' => $types,
    '#default_value' => isset($story->options['queue']['types']) ? $story->options['queue']['types'] : array(),
    '#required' => TRUE,
    '#description' => t('Select the node types allowed to be in this story.'),
  );

  $form['actions'] = array('#type' => 'actions');
  $form['actions']['submit'] = array(
    '#type' => 'submit',
    '#value' => t('Save'),
  );

  if ($op == 'edit') {
    $form['actions']['delete'] = array(
      '#type' => 'link',
      '#title' => t('Delete'),
      '#href' => "story/{$story->identifier()}/delete",
      '#weight' => 1,
    );
  }

  return $form;
}

function openlayers_cycle_story_form_submit($form, &$form_state) {
  form_state_values_clean($form_state);
  $values = $form_state['values'];

  $definition = array(
    'name' => $values['name'],
    'machine_name' => $values['machine_name'],
    'options' => array(
      'map' => $values['map'],
      'queue' => array(),
    ),
  );
  if (isset($values['types'])) {
    $definition['options']['queue']['types'] = $values['types'];
  }

  if (!($story = entity_create('openlayers_cycle_story', $definition))) {
    // TODO: Handle error.
    return;
  }
  $story->save();

  $form_state['redirect'] = "story/{$story->identifier()}/edit/sequence";
}

function openlayers_cycle_story_page_title($story) {
  return $story->name;
}

function openlayers_cycle_story_page_view($story, $view_mode = 'full') {
  $controller = entity_get_controller('openlayers_cycle_story');
  $content = $controller->view(array($story->internalIdentifier() => $story));

  return $content;
}

function openlayers_cycle_story_manage_sequence($story) {
  module_load_include('inc', 'nodequeue', 'includes/nodequeue.admin');
  $queue = nodequeue_load_queue_by_name($story->queue);
  return nodequeue_admin_view($queue);
}
