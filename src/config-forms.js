import React from 'react'
import Yaml from 'js-yaml'
import Moment from 'moment'
import StringTemplate from 'string-template'

import Config from './config.js'

class ConfigForm extends React.Component {
  constructor(props) {
    super(props)

    this.handleValueChange = ::this.handleValueChange

    // create context
    let context = {
      now_date: Moment().format('DD/MM/YYYY'),
      now_hm: Moment().format('hh:mm'),
      ...this.props.context,
    }
    // parse initial config
    let parsedConfig = this.parseConfig(this.props.config || '')
    // if no result set, load initial values
    let values = this.props.result
    if (!values) {
      if (parsedConfig.config && Array.isArray(parsedConfig.fields)) {
        parsedConfig.fields.map((field) => {
          if (typeof values[field.key] === 'undefined') {
            if (Array.isArray(field.initial)) {
              values[field.key] = field.initial
            }
            else if (typeof field['initial'] === 'string') {
              values[field.key] = StringTemplate(field.initial, context)
            }
          }
        })
      }
      else {
        values = {}
      }
    }
    this.state = {
      ...this.state,
      style: '',
      values: values,
      context: context,
      ...parsedConfig,
    };
  }

  parseConfig(config) {
    let result = {
      config: {},
      parseError: null,
      formatError: null,
    }

    try {
      result.config = Yaml.safeLoad(config)
      var cleanedConfig = Config(result.config)
      if (typeof cleanedConfig === 'string') {
        result.config = null
        result.formatError = cleanedConfig
      }
      else {
        result.config = cleanedConfig
      }
    }
    catch (e) {
      result.parseError = e.message
    }
    return result;
  }
  setConfig(config) {
    this.setState(this.parseConfig(config))
  }


  handleValueChange(key, value) {
    if (this.props.readOnly) {
      console.warn('Trying to change uneditable form')
      return
    }
    this.setState((state) => {
      state.values = {
        ...state.values,
      }
      state.values[key] = value
      return state
    }, () => {
      if (this.props.onChange) {
        this.props.onChange(this.state.values);
      }
    });
  }

  renderField(field, key, layoutSettings) {
    let renderer = this.props.renderer[field.type]
    if (!renderer) {
      console.error(`Unknown field type specified: ${field.type}`)
      return null
    }

    let fieldProps = {
      ...field,
      key: key,
      fieldKey: field.key,
      value: this.state.values[field.key],
      onChange: this.handleValueChange,
    }
    return React.createElement(renderer, fieldProps)
  }
  renderContents(contents, includes) {
    const { renderer } = this.props
    let renderedContents = []
    contents.forEach((item, itemIndex) => {
      switch (item.type) {
        case 'group':
          const result = this.renderContents(item.contents, includes)
          renderedContents.push(
            <renderer.group key={`item-${itemIndex}`}>
              {result.render}
            </renderer.group>
          )
          includes = {
            ...includes,
            ...result.includes,
          }
          break

        case 'field':
          const { fields } = this.state.config;
          const isItemField = field => (field.key === item.field);
          const checkIncluded = field => !(field.key in includes)
          fields
            .filter(isItemField)
            .filter(checkIncluded)
            .forEach((field, idx) => {
              renderedContents.push(this.renderField(field, `item-${itemIndex}`, item));
              includes[field.key] = true;
            })
          break

        case 'text':
          const text = item.text ? StringTemplate(item.text, this.state.context) : ''
          const textElement = (
            <renderer.textDisplay key={`item-${itemIndex}`} text={text} />
          )
          renderedContents.push(textElement)
          break
      }
    })
    return {
      render: renderedContents,
      includes: includes,
    }
  }
  render() {
    const { renderer } = this.props
    if (!renderer) {
      console.error('No renderer set for config form.')
      return null
    }

    if (this.state.parseError) {
      return (
        <renderer.parseError
          error={this.state.parseError}
        />
      )
    }
    if (this.state.formatError) {
      return (
        <renderer.formatError
          error={this.state.formatError}
        />
      )
    }

    let renderedFields = [];
    let result;
    // render layout as described
    const { layout, fields } = this.state.config
    if (layout) {
      result = this.renderContents(layout, {})
      renderedFields = result.render
    }
    // and catch any missing fields,
    // or render fields in order if no layout specified
    fields.forEach((field) => {
      if (!(layout && field.key in result.includes)) {
        renderedFields.push(this.renderField(field, field.key, {}));
      }
    })
    // return render
    return (
      <renderer.container>
        {renderedFields}
      </renderer.container>
    )
  }
}
ConfigForm.defaultProps = {
}

export default ConfigForm
