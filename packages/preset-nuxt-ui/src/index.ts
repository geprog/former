import type { FormComponents, SchemaNode } from '@former-ui/former';
import { markRaw } from 'vue';
import Checkbox from './Checkbox.vue';
import Columns from './Columns.vue';
import FileUpload from './FileUpload.vue';
import Group from './Group.vue';
import Image from './Image.vue';
import Number from './Number.vue';
import RadioGroup from './RadioGroup.vue';
import Repeater from './Repeater.vue';
import Select from './Select.vue';
import Text from './Text.vue';
import Textarea from './Textarea.vue';

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
  const { t } = options || { t: (key: string) => key };
  const { name, label, help, required, placeholder } = { ...defaultOptions, ...options };
  const schema: SchemaNode[] = [];
  if (name) {
    schema.push({
      type: 'text',
      name: '$name',
      props: { label: t('technical_name'), required: true, mustBeTechnicalName: true },
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

export function formComponents(options?: { t: (key: string) => string }) {
  const { t } = options || { t: (key: string) => key };
  return {
    text: {
      label: t('text_field'),
      component: markRaw(Text),
      propsSchema: [
        ...commonSchema({ t }),
        { type: 'text', name: 'preset', props: { label: t('preset_text') } },
      ],
    },
    number: {
      label: t('number_field'),
      component: markRaw(Number),
      propsSchema: [
        ...commonSchema({ t }),
        {
          type: 'number',
          name: 'stepSize',
          props: { label: t('step_size'), preset: 1 },
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
    select: {
      label: t('select_field'),
      component: markRaw(Select),
      propsSchema: [
        ...commonSchema({ t }),
        {
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
        },
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
      propsSchema: [
        ...commonSchema({ name: false, required: false, placeholder: false, t }),
        {
          type: 'number',
          name: 'cols',
          props: { label: t('columns'), min: 1, preset: 1, required: true },
        },
        { type: 'checkbox', name: 'border', props: { label: t('show_border') } },
      ],
    },
    checkbox: {
      label: t('checkbox'),
      component: markRaw(Checkbox),
      propsSchema: [
        ...commonSchema({ placeholder: false, t }),
        { type: 'checkbox', name: 'preset', props: { label: t('preset_choice') } },
      ],
    },
    radio_group: {
      label: t('radio_group'),
      component: markRaw(RadioGroup),
      propsSchema: [
        ...commonSchema({ placeholder: false, help: false, t }),
        {
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
        },
      ],
    },
    textarea: {
      label: t('free_text'),
      component: markRaw(Textarea),
      propsSchema: [
        ...commonSchema({ t }),
        { type: 'number', name: 'rows', props: { label: t('rows'), min: 1 } },
      ],
    },
    repeater: {
      label: t('repeater'),
      component: markRaw(Repeater),
      propsSchema: [
        ...commonSchema({ help: false, placeholder: false, t }),
        { type: 'text', name: 'itemLabel', props: { label: t('item_label') } },
      ],
    },
    image: {
      label: t('image'),
      component: markRaw(Image),
      propsSchema: [
        ...commonSchema({ name: false, label: true, t }),
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
      propsSchema: [
        ...commonSchema({ help: false, placeholder: false, t }),
        { type: 'text', name: 'accept', props: { label: t('accept') } },
      ],
    },
  } satisfies FormComponents;
}
