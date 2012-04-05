<?php

function story_map_story_form($form, &$form_state, $story, $op = 'edit') {
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
      'exists' => 'story_map_story_machine_name_exists',
    ),
    '#maxlength' => 32,
    '#description' => t('A unique machine-readable name for this story. It must only contain lowercase letters, numbers, and underscores.'),
  );
  if ($op == 'edit') {
    $form['machine_name']['#disabled'] = TRUE;
  }

  $options = array();
  if (module_exists('openlayers')) {
    foreach (openlayers_maps() as $name => $map) {
      if (isset($map->data['behaviors']['openlayers_behavior_story_map'])) {
        $options['openlayers::' . $name] = "OpenLayers: {$map->title}";
      }
    }
  }
  if (module_exists('leaflet')) {
    foreach (leaflet_map_get_info() as $name => $map) {
      $options['leaflet::' . $name] = "Leaflet: {$map['label']}";
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

function story_map_story_form_submit($form, &$form_state) {
  form_state_values_clean($form_state);
  $values = $form_state['values'];

  switch ($form_state['op']) {
    case 'add':
      $definition = array(
        'name' => $values['name'],
        'machine_name' => $values['machine_name'],
        'options' => array(
          'map' => $values['map'],
        ),
      );

      if (!($story = entity_create('story_map_story', $definition))) {
        // TODO: Handle error.
        return;
      }
      $form_state['redirect'] = "story/{$story->identifier()}/edit/sequence";
      break;

    case 'edit':
      $story = $form_state['story_map_story'];
      $story->name = $values['name'];
      $story->options['map'] = $values['map'];
      $form_state['redirect'] = "story/{$story->identifier()}";
      break;
  }

  $story->save();
}

function story_map_story_page_title($story) {
  return $story->name;
}

function story_map_story_page_view($story, $view_mode = 'full') {
  $controller = entity_get_controller('story_map_story');
  $content = $controller->view(array($story->internalIdentifier() => $story));

  return $content;
}

function story_map_story_manage_sequence($story) {
  module_load_include('inc', 'nodequeue', 'includes/nodequeue.admin');
  $queue = nodequeue_load_queue_by_name($story->queue);
  $form = nodequeue_admin_view($queue);
  drupal_set_title(t('Edit sequence of %story', array('%story' => entity_label('story_map_story', $story))), TRUE);
  return $form;
}

function story_map_config_manage_form($form, &$form_state) {
  $defaults = story_map_get_default_geofields();
  $names = node_type_get_names();

  $type_options = array();
  $field_options = story_map_get_all_geofields();
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

function story_map_config_manage_form_submit($form, &$form_state) {
  form_state_values_clean($form_state);
  $values = $form_state['values'];

  $geofields = array();
  foreach ($values['types'] as $type => $enabled) {
    if (!$enabled) continue;
    $geofields[$type] = $values[$type . '_field'];
  }
  variable_set('story_map_geofields', $geofields);
  drupal_set_message('Story map settings saved.', 'status');
}
