const expect_bool = function(value, name, defaultValue) {
  switch (typeof value) {
    case 'undefined':
      if (typeof defaultValue !== 'undefined')
        return defaultValue;
      else
        throw name + ' not defined';
    case 'boolean':
      return value;
    case 'string':
      return (value.toLowerCase().trim() === 'true');
    default:
      throw name + ' is ' + (typeof value) + ' not boolean';
  }
};

const allow_string = function(value, name) {
  switch (typeof value) {
    case 'undefined':
      return undefined;
    case 'integer':
      return value.toString();
    case 'string':
      return value;
    case 'object':
      if (value === null)
        return '';
    default:
      throw name + ' is ' + (typeof value) + ' not string';
  }
};
const expect_string = function(value, name, defaultValue) {
  switch (typeof value) {
    case 'undefined':
      if (typeof defaultValue !== 'undefined')
        return defaultValue;
      else
        throw name + ' not defined';
    default:
      return allow_string(value, name);
  }
};
const expect_string__lower_trim = function(value, name, defaultValue) {
  var value = expect_string(value, name, defaultValue);
  return value.toLowerCase().trim();
};


const CleanLayout = function(layout) {
  if (!Array.isArray(layout))
    throw 'Layout is not an array';

  var cleanLayout = [];
  for (var itemIndex = 0; itemIndex < layout.length; itemIndex++) {
    var item = layout[itemIndex];

    if (typeof item !== 'object')
      throw 'Layout not an object (dictionary)';
    if (item === null)
      throw 'Layout is null';

    var cleanItem = {};
    cleanItem.type = expect_string__lower_trim(item.type, 'Layout item "type"');
    switch (cleanItem.type) {
      case 'group':
        cleanItem.contents = CleanLayout(item.contents);
        cleanItem.class = allow_string(item.class, 'Field layout group item "class"');
        break;

      case 'field':
        cleanItem.field = expect_string__lower_trim(item.field, 'Field layout item "field"');
        cleanItem.class = allow_string(item.class, 'Field layout field item "class"');
        break;

      case 'text':
        cleanItem.text = expect_string(item.text, 'Field layout text item "text"');
        cleanItem.class = allow_string(item.class, 'Field layout text item "class"');
        break;

      case 'markdown':
        cleanItem.text = expect_string(item.text, 'Field layout text item "markdown"');
        cleanItem.class = allow_string(item.class, 'Field layout text item "class"');
        break;

      default:
        throw 'Layout item type "' + cleanItem.type + '" unknown';
    }
    cleanLayout.push(cleanItem);
  }
  return cleanLayout;
};
const CleanConfig = function(config) {
  var cleanConfig = {};
  cleanConfig.fields = [];

  try {
    if (!config)
      throw 'No config';
    if (typeof config.fields !== 'object')
      throw 'Fields not an object (dictionary)';

    for (var fieldKey in config.fields) {
      var field = config.fields[fieldKey];

      if (typeof field !== 'object')
        throw fieldKey + ' config not an object (dictionary)';
      if (field === null)
        throw fieldKey + ' is null';

      var cleanField = {};
      cleanField.key = expect_string__lower_trim(fieldKey);

      for (var cleanFieldIndex = 0; cleanFieldIndex < cleanConfig.fields.length; cleanFieldIndex++) {
        var existingCleanField = cleanConfig.fields[cleanFieldIndex];
        if (cleanField.key == existingCleanField.key)
          throw fieldKey + ' has non-unique key of ' + cleanField.key;
      }

      cleanField.type = expect_string__lower_trim(field.type, fieldKey + ' type', 'text');

      switch (cleanField.type) {
        case 'text':
        case 'textarea':
          cleanField.initial = expect_string(field.initial, fieldKey + ' initial', '');
          cleanField.placeholder = allow_string(field.placeholder, fieldKey + ' placeholder', '');
          cleanField.label = allow_string(field.label, fieldKey + ' label', '');
          break;

        case 'select':
          if (!Array.isArray(field.options) || !field.options.length)
            throw fieldKey + ' is a select but has no options';
          var cleanedOptions = [];
          for (var optionIndex = 0; optionIndex < field.options.length; optionIndex++) {
            var option = field.options[optionIndex];
            var cleanedOption = {
              value: expect_string__lower_trim(option.value, fieldKey + ' option ' + (optionIndex + 1) + ' value'),
              label: expect_string(option.label, fieldKey + ' option ' + (optionIndex + 1) + ' label'),
            };
            for (var existingOptionIndex = 0; existingOptionIndex < cleanedOptions.length; existingOptionIndex++) {
              var existingOption = cleanedOptions[existingOptionIndex];
              if (cleanedOption.value == existingOption.value)
                throw fieldKey + ' option ' + (optionIndex + 1) + ' has non-unique value of ' + cleanedOption.value;
            }
            cleanedOptions.push(cleanedOption);
          }
          cleanField.options = cleanedOptions;

          var initialOption = expect_string(field.initial, fieldKey + ' initial', cleanedOptions[0].value);
          var initialFound = false;
          for (var optionIndex = 0; optionIndex < field.options.length; optionIndex++) {
            var option = cleanedOptions[optionIndex];
            if (option.value == initialOption)
              initialFound = true;
          }
          if (!initialFound)
            throw fieldKey + ' initial option was not found';
          cleanField.initial = initialOption;

          if (field.label)
            cleanField.label = expect_string(field.label, fieldKey + ' label', '');
          break;

        case 'multiselect':
        /* Pass through. "break" intentionally omitted */
        case 'checkboxgroup':
          var cleanedOptions = [];

          if (!Array.isArray(field.options)) {
            throw `Field "${fieldKey}"" options given as "${typeof field.options}" and not array`;
          }
          field.options.forEach((option, optionIndex) => {
            if (option === null) {
              throw `Field "${fieldKey}" option ${optionIndex + 1} is null`;
            }
            const value = expect_string__lower_trim(option.value, `Field "${fieldKey}" option ${optionIndex + 1} value`);
            var cleanedOption = {
              value,
              label: expect_string(option.label, `Field "${fieldKey}" option ${optionIndex + 1} label`, value)
            };
            const checkUnique = existingOption => {
              if (cleanedOption.value == existingOption.value)
                  throw fieldKey + ' option ' + (optionIndex + 1) + ' has non-unique value of ' + cleanedOption.value;
            };
            cleanedOptions.forEach(checkUnique);
            cleanedOptions.push(cleanedOption);
          });
          cleanField.options = cleanedOptions;
          cleanField.placeholder = allow_string(field.placeholder, `Field "${fieldKey}" placeholder`);

          const initial = (typeof field.initial === 'string') ? [field.initial] : field.initial || [];

          // check that all the initial values exist
          initial.forEach((initialKey) => {
            const found = !!cleanField.options.find(cleanOption => cleanOption.value === initialKey);
            if (!found) throw `${fieldKey} initial option "${initialKey}" not found`;
          });

          if (field.label) cleanField.label = expect_string(field.label, fieldKey + ' label', '');
          cleanField.initial = initial;
          cleanField.label = allow_string(field.label, fieldKey + ' label', '');
          cleanField.heading = allow_string(field.heading, fieldKey + ' heading', '');
          break;

        case 'checkbox':
          cleanField.initial = expect_bool(field.initial, fieldKey + ' initial', false);
          cleanField.label = allow_string(field.label, fieldKey + ' label', '');
          cleanField.heading = allow_string(field.heading, fieldKey + ' heading', '');
          break;

        case 'pass-fail-na':
          cleanField.label = allow_string(field.label, fieldKey + ' label', '');
          cleanField.heading = allow_string(field.heading, fieldKey + ' heading', '');
          break;

        case 'message':
          if (field.content)
            cleanField.content = expect_string(field.content, fieldKey + ' content', false);
          if (field.heading)
            cleanField.heading = expect_string(field.heading, fieldKey + ' heading', '');
          break;

        default:
          throw fieldKey + ' type is not valid';
      }

      cleanConfig.fields.push(cleanField);
    }

    if ('layout' in config)
      cleanConfig.layout = CleanLayout(config.layout);
  }
  catch (exception) {
    if (typeof exception === 'string')
      return exception;
    return exception.message;
  }

  return cleanConfig;
};

export default CleanConfig
