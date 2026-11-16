import type { FormComponents, SchemaNode, ValidationContext } from '@former-ui/former';
import { markRaw } from 'vue';
import { z } from 'zod';
import Alert from './Alert.vue';
import Checkbox from './Checkbox.vue';
import CheckboxGroup from './CheckboxGroup.vue';
import Color from './Color.vue';
import { shownColumnChildren } from './columns';
import Columns from './Columns.vue';
import ComboBox from './ComboBox.vue';
import { toChosen } from './composables/useOptions';
import DateField from './Date.vue';
import FileUpload from './FileUpload.vue';
import Group from './Group.vue';
import Image from './Image.vue';
import NumberField from './Number.vue';
import RadioGroup from './RadioGroup.vue';
import Repeater from './Repeater.vue';
import Select from './Select.vue';
import Separator from './Separator.vue';
import Slider from './Slider.vue';
import Switch from './Switch.vue';
import { shownTabChildren } from './tabs';
import Tabs from './Tabs.vue';
import Tags from './Tags.vue';
import Text from './Text.vue';
import Textarea from './Textarea.vue';
import Time from './Time.vue';

type CommonSchemaOptions = {
  name: boolean;
  label: boolean;
  help: boolean;
  required: boolean;
  placeholder: boolean;
};

const defaultOptions: CommonSchemaOptions = {
  name: true,
  label: true,
  help: true,
  required: true,
  placeholder: true,
};

function commonSchema(options: Partial<CommonSchemaOptions> & { t: (key: string) => string }): SchemaNode[] {
  const { t, name, label, help, required, placeholder } = { ...defaultOptions, ...options };
  const schema: SchemaNode[] = [];
  if (name) {
    schema.push({
      type: 'text',
      name: '$name',
      props: { label: t('technical_name'), required: true },
    });
  }
  if (label) {
    schema.push({ type: 'text', name: 'label', props: { label: t('label') } });
  }
  if (placeholder) {
    schema.push({ type: 'text', name: 'placeholder', props: { label: t('placeholder') } });
  }
  if (help) {
    schema.push({ type: 'text', name: 'help', props: { label: t('help_text') } });
  }
  if (required) {
    schema.push({ type: 'checkbox', name: 'required', props: { label: t('value_is_required') } });
  }
  return schema;
}

function optionsSchema({ t }: { t: (key: string) => string }): SchemaNode {
  return {
    type: 'repeater',
    name: 'options',
    children: [
      {
        type: 'text',
        name: 'value',
        props: {
          label: t('technical_value'),
          help: t('options_technical_value_help'),
          required: true,
        },
      },
      {
        type: 'text',
        name: 'label',
        props: {
          label: t('text'),
          help: t('options_label_help'),
          placeholder: t('optional'),
        },
      },
      {
        type: 'checkbox',
        name: 'preset',
        props: { label: t('preset_choice') },
      },
    ],
    props: {
      label: t('select_options'),
      itemLabel: t('select_option'),
    },
  };
}

// a setting choosing one of the given values, e.g. the type of a text field
function choiceSchema({ t }: { t: (key: string) => string }, name: string, label: string, choices: string[], preset?: string): SchemaNode {
  return {
    type: 'select',
    name,
    props: {
      label: t(label),
      options: choices.map(value => ({ value, label: t(`${name}_${value}`), preset: value === preset })),
    },
  };
}

// the size in bytes of the file stored in a data URL
function fileSize(dataUrl: string): number {
  const content = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = content.endsWith('==') ? 2 : content.endsWith('=') ? 1 : 0;
  return Math.floor(content.length * 3 / 4) - padding;
}

type Translate = (key: string, named?: Record<string, unknown>) => string;

// the validations of the preset don't depend on the context, but take it so a replacing validation can pass it on,
// while their return types are kept as zod schemas to be extended
type ValidationProps = { [key: string]: any };

// the form components of the preset, `t` translates the labels of the components, their settings in the form builder
// and the error messages of their validation
export function createFormComponents(t: Translate) {
  const requiredMessage = t('error_required');
  // fields storing a string are cleared to `null`, so only required ones are validated
  const stringValidation = ({ required }: ValidationProps, _context?: ValidationContext) =>
    (required ? z.string(requiredMessage).min(1, requiredMessage) : undefined);
  // texts are cleared to `null`, so their length and format are only checked if they are filled in
  const textValidation = ({ required, inputType, minLength, maxLength }: ValidationProps, _context?: ValidationContext): z.ZodType<string | null | undefined> => {
    let schema = z.string(requiredMessage);
    if (required) {
      schema = schema.min(1, requiredMessage);
    }
    if (typeof minLength === 'number') {
      schema = schema.refine(value => !value || value.length >= minLength, t('error_min_length', { min: minLength }));
    }
    if (typeof maxLength === 'number') {
      schema = schema.refine(value => !value || value.length <= maxLength, t('error_max_length', { max: maxLength }));
    }
    if (inputType === 'email') {
      schema = schema.refine(value => !value || z.email().safeParse(value).success, t('error_email'));
    }
    if (inputType === 'url') {
      schema = schema.refine(value => !value || z.url().safeParse(value).success, t('error_url'));
    }
    return required ? schema : schema.nullish();
  };
  // files are stored as data URLs (see `FileUpload.vue`), the size of their content is 3/4 of its base64 length
  const fileValidation = ({ required, maxSize }: ValidationProps, _context?: ValidationContext): z.ZodType<string | null | undefined> => {
    let schema = z.string(requiredMessage);
    if (required) {
      schema = schema.min(1, requiredMessage);
    }
    if (typeof maxSize === 'number') {
      schema = schema.refine(value => fileSize(value) <= maxSize * 1024 * 1024, t('error_max_size', { max: maxSize }));
    }
    return required ? schema : schema.nullish();
  };
  const colorValidation = ({ required }: ValidationProps, _context?: ValidationContext): z.ZodType<string | null | undefined> => {
    let schema = z.string(requiredMessage);
    if (required) {
      schema = schema.min(1, requiredMessage);
    }
    schema = schema.refine(value => !value || /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value), t('error_color'));
    return required ? schema : schema.nullish();
  };
  const checkedValidation = ({ required }: ValidationProps, _context?: ValidationContext) =>
    (required ? z.literal(true, requiredMessage) : undefined);
  const numberValidation = ({ required, min, max }: ValidationProps, _context?: ValidationContext) => {
    let schema = z.number(requiredMessage);
    if (typeof min === 'number') {
      schema = schema.min(min, t('error_min_value', { min }));
    }
    if (typeof max === 'number') {
      schema = schema.max(max, t('error_max_value', { max }));
    }
    return required ? schema : schema.nullish();
  };
  // dates and times are ISO strings (YYYY-MM-DD and HH:mm), so they compare like the dates and times they represent
  const isoRangeValidation = (minMessage: string, maxMessage: string) =>
    ({ required, min, max }: ValidationProps, _context?: ValidationContext) => {
      let schema = z.string(requiredMessage).min(1, requiredMessage);
      if (min) {
        schema = schema.refine(value => value >= min, t(minMessage, { min }));
      }
      if (max) {
        schema = schema.refine(value => value <= max, t(maxMessage, { max }));
      }
      return required ? schema : schema.nullish();
    };
  const dateValidation = isoRangeValidation('error_min_date', 'error_max_date');
  const timeValidation = isoRangeValidation('error_min_time', 'error_max_time');
  // like texts, the number of items is only checked if there are any
  const listValidation = ({ required, minItems, maxItems }: ValidationProps, _context?: ValidationContext): z.ZodType<unknown[] | null | undefined> => {
    let schema = z.array(z.unknown(), requiredMessage);
    if (required) {
      schema = schema.min(1, requiredMessage);
    }
    if (typeof minItems === 'number') {
      schema = schema.refine(value => !value.length || value.length >= minItems, t('error_min_items', { min: minItems }));
    }
    if (typeof maxItems === 'number') {
      schema = schema.refine(value => value.length <= maxItems, t('error_max_items', { max: maxItems }));
    }
    return required ? schema : schema.nullish();
  };

  // a select stores a list of values if several can be chosen
  const selectValidation = (props: ValidationProps, context?: ValidationContext) => {
    const schema = props.multiple ? listValidation(props, context) : stringValidation(props, context);
    return schema && z.preprocess(value => toChosen(value, props.multiple), schema);
  };

  return {
    text: {
      label: t('text_field'),
      component: markRaw(Text),
      validation: textValidation,
      propsSchema: [
        ...commonSchema({ t }),
        choiceSchema({ t }, 'inputType', 'input_type', ['text', 'email', 'url', 'tel', 'password'], 'text'),
        { type: 'number', name: 'minLength', props: { label: t('min_length'), min: 0 } },
        { type: 'number', name: 'maxLength', props: { label: t('max_length'), min: 1 } },
        { type: 'text', name: 'preset', props: { label: t('preset_text') } },
      ],
    },
    number: {
      label: t('number_field'),
      component: markRaw(NumberField),
      validation: numberValidation,
      propsSchema: [
        ...commonSchema({ t }),
        {
          type: 'number',
          name: 'stepSize',
          props: { label: t('step_size'), min: 0, preset: 1 },
        },
        {
          type: 'checkbox',
          name: 'stepSnapping',
          props: { label: t('step_snapping'), help: t('step_snapping_help') },
        },
        {
          type: 'number',
          name: 'decimals',
          props: { label: t('decimals'), help: t('decimals_help'), min: 0, max: 20 },
        },
        {
          type: 'number',
          name: 'min',
          props: { label: t('min_value') },
        },
        {
          type: 'number',
          name: 'max',
          props: { label: t('max_value') },
        },
        {
          type: 'number',
          name: 'preset',
          props: { label: t('preset_value') },
        },
      ],
    },
    slider: {
      label: t('slider'),
      component: markRaw(Slider),
      validation: numberValidation,
      propsSchema: [
        ...commonSchema({ placeholder: false, t }),
        { type: 'number', name: 'min', props: { label: t('min_value'), preset: 0 } },
        { type: 'number', name: 'max', props: { label: t('max_value'), preset: 100 } },
        { type: 'number', name: 'stepSize', props: { label: t('step_size'), min: 0, preset: 1 } },
        { type: 'number', name: 'preset', props: { label: t('preset_value') } },
      ],
    },
    select: {
      label: t('select_field'),
      component: markRaw(Select),
      validation: selectValidation,
      propsSchema: [
        ...commonSchema({ t }),
        optionsSchema({ t }),
        { type: 'checkbox', name: 'multiple', props: { label: t('multiple'), help: t('multiple_help') } },
        { type: 'checkbox', name: 'search', props: { label: t('search') } },
      ],
    },
    group: {
      label: t('group'),
      component: markRaw(Group),
      propsSchema: commonSchema({ required: false, placeholder: false, t }),
    },
    columns: {
      label: t('column_layout'),
      component: markRaw(Columns),
      shownChildren: shownColumnChildren,
      propsSchema: [
        ...commonSchema({ name: false, required: false, placeholder: false, t }),
        {
          type: 'number',
          name: 'cols',
          props: { label: t('columns'), min: 1, preset: 2, required: true },
        },
        { type: 'checkbox', name: 'border', props: { label: t('show_border') } },
      ],
    },
    tabs: {
      label: t('tabs'),
      component: markRaw(Tabs),
      shownChildren: shownTabChildren,
      propsSchema: [
        ...commonSchema({ name: false, required: false, placeholder: false, t }),
        {
          type: 'repeater',
          name: 'tabs',
          children: [{ type: 'text', name: 'label', props: { label: t('label') } }],
          props: { label: t('tabs'), itemLabel: t('tab') },
        },
        choiceSchema({ t }, 'variant', 'variant', ['pill', 'link'], 'pill'),
      ],
    },
    checkbox: {
      label: t('checkbox'),
      component: markRaw(Checkbox),
      validation: checkedValidation,
      propsSchema: [
        ...commonSchema({ placeholder: false, t }),
        { type: 'checkbox', name: 'preset', props: { label: t('preset_choice') } },
      ],
    },
    switch: {
      label: t('switch'),
      component: markRaw(Switch),
      validation: checkedValidation,
      propsSchema: [
        ...commonSchema({ placeholder: false, t }),
        { type: 'switch', name: 'preset', props: { label: t('preset_choice') } },
      ],
    },
    date: {
      label: t('date_field'),
      component: markRaw(DateField),
      validation: dateValidation,
      propsSchema: [
        ...commonSchema({ placeholder: false, t }),
        { type: 'date', name: 'min', props: { label: t('min_value') } },
        { type: 'date', name: 'max', props: { label: t('max_value') } },
        { type: 'date', name: 'preset', props: { label: t('preset_value') } },
      ],
    },
    time: {
      label: t('time_field'),
      component: markRaw(Time),
      validation: timeValidation,
      propsSchema: [
        ...commonSchema({ placeholder: false, t }),
        { type: 'time', name: 'min', props: { label: t('min_value') } },
        { type: 'time', name: 'max', props: { label: t('max_value') } },
        { type: 'time', name: 'preset', props: { label: t('preset_value') } },
      ],
    },
    radio_group: {
      label: t('radio_group'),
      component: markRaw(RadioGroup),
      validation: stringValidation,
      propsSchema: [
        ...commonSchema({ placeholder: false, t }),
        optionsSchema({ t }),
        choiceSchema({ t }, 'orientation', 'orientation', ['vertical', 'horizontal'], 'vertical'),
        choiceSchema({ t }, 'variant', 'variant', ['list', 'card', 'table'], 'list'),
      ],
    },
    checkbox_group: {
      label: t('checkbox_group'),
      component: markRaw(CheckboxGroup),
      validation: listValidation,
      propsSchema: [
        ...commonSchema({ placeholder: false, t }),
        optionsSchema({ t }),
        choiceSchema({ t }, 'orientation', 'orientation', ['vertical', 'horizontal'], 'vertical'),
        choiceSchema({ t }, 'variant', 'variant', ['list', 'card', 'table'], 'list'),
      ],
    },
    tags: {
      label: t('tags'),
      component: markRaw(Tags),
      validation: listValidation,
      propsSchema: [
        ...commonSchema({ t }),
        { type: 'number', name: 'minItems', props: { label: t('min_tags'), min: 0 } },
        { type: 'number', name: 'maxItems', props: { label: t('max_tags'), min: 1 } },
      ],
    },
    textarea: {
      label: t('free_text'),
      component: markRaw(Textarea),
      validation: textValidation,
      propsSchema: [
        ...commonSchema({ t }),
        { type: 'number', name: 'rows', props: { label: t('rows'), min: 1 } },
        { type: 'checkbox', name: 'autoresize', props: { label: t('autoresize') } },
        { type: 'number', name: 'minLength', props: { label: t('min_length'), min: 0 } },
        { type: 'number', name: 'maxLength', props: { label: t('max_length'), min: 1 } },
        { type: 'textarea', name: 'preset', props: { label: t('preset_text') } },
      ],
    },
    repeater: {
      label: t('repeater'),
      component: markRaw(Repeater),
      validation: listValidation,
      isList: true,
      propsSchema: [
        ...commonSchema({ placeholder: false, t }),
        { type: 'text', name: 'itemLabel', props: { label: t('item_label') } },
        { type: 'number', name: 'minItems', props: { label: t('min_items'), min: 0 } },
        { type: 'number', name: 'maxItems', props: { label: t('max_items'), min: 1 } },
      ],
    },
    color: {
      label: t('color'),
      component: markRaw(Color),
      validation: colorValidation,
      propsSchema: [
        ...commonSchema({ t }),
        { type: 'color', name: 'preset', props: { label: t('preset_value') } },
      ],
    },
    separator: {
      label: t('separator'),
      component: markRaw(Separator),
      propsSchema: [
        ...commonSchema({ name: false, help: false, required: false, placeholder: false, t }),
        choiceSchema({ t }, 'type', 'line_type', ['solid', 'dashed', 'dotted'], 'solid'),
      ],
    },
    alert: {
      label: t('alert'),
      component: markRaw(Alert),
      propsSchema: [
        { type: 'text', name: 'label', props: { label: t('title') } },
        { type: 'textarea', name: 'text', props: { label: t('text'), autoresize: true } },
        choiceSchema({ t }, 'color', 'alert_color', ['info', 'success', 'warning', 'error', 'neutral'], 'info'),
      ],
    },
    image: {
      label: t('image'),
      component: markRaw(Image),
      propsSchema: [
        ...commonSchema({ name: false, placeholder: false, help: false, required: false, t }),
        {
          type: 'file_upload',
          name: 'image',
          props: {
            label: t('image_source'),
            accept: 'image/*',
          },
        },
      ],
    },
    file_upload: {
      label: t('file_upload'),
      component: markRaw(FileUpload),
      validation: fileValidation,
      propsSchema: [
        ...commonSchema({ placeholder: false, t }),
        { type: 'text', name: 'accept', props: { label: t('accept') } },
        { type: 'number', name: 'maxSize', props: { label: t('max_size'), min: 0 } },
      ],
    },
    combo_box: {
      label: t('combo_box'),
      component: markRaw(ComboBox),
      validation: stringValidation,
      propsSchema: [
        ...commonSchema({ t }),
        optionsSchema({ t }),
        { type: 'checkbox', name: 'disableCustomValue', props: { label: t('disable_custom_value') } },
      ],
    },
  } satisfies FormComponents;
}
