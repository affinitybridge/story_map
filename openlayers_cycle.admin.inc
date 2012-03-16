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
    ),
  );

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

function openlayers_cycle_config_manage_form($form, &$form_state) {
  $defaults = openlayers_cycle_get_default_geofields();
  $names = node_type_get_names();

  $type_options = array();
  $field_options = openlayers_cycle_get_all_geofields();
  foreach ($field_options as $type => $fields) {
    $type_options[$type] = $names[$type];
  }

  $form['types'] = array(
    '#title' => t('Default story node types'),
    '#description' => t('Select the node types you want to use as steps in your stories.'),
    '#type' => 'checkboxes',
    '#options' => $type_options,
    '#default_value' => array_keys($defaults),
  );

  foreach ($field_options as $type => $fields) {
    $tokens = array('%type' => $names[$type]);
    if (count($fields) > 1) {
      $form[$type . '_field'] = array(
        '#title' => t('%type geofield', $tokens),
        '#description' => t('Specify the geofield that should be referenced for a %type step.', $tokens),
        '#type' => 'select',
        '#options' => $field_options[$type],
        '#default_value' => isset($defaults[$type]) ? $defaults[$type] : '',
        '#states' => array(
          'invisible' => array(
            'input[name="types['. $type .']"]' => array('checked' => FALSE),
          ),
        )
      );
    } else {
      $form[$type . '_field'] = array(
        '#type' => 'hidden',
        '#value' => array_pop($fields),
      );
    }
  }

  $form['actions'] = array();
  $form['actions']['submit'] = array(
    '#type' => 'submit',
    '#value' => t('Save'),
  );

  return $form;
}

function openlayers_cycle_config_manage_form_submit($form, &$form_state) {
  form_state_values_clean($form_state);
  $values = $form_state['values'];

  $geofields = array();
  foreach ($values['types'] as $type => $enabled) {
    if (!$enabled) continue;
    $geofields[$type] = $values[$type . '_field'];
  }
  variable_set('openlayers_cycle_geofields', $geofields);
  drupal_set_message('OpenLayers Cycle settings saved.', 'status');
}
