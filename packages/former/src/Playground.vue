<template>
  <div class="flex w-full h-screen bg-gray-100">
    <Former
      v-slot="{ selectedNode }"
      v-model:data="data"
      v-model:schema="schema"
      :components
      :mode
      :show-if
      :validator="validator"
    >
      <main class="gap-4 m-4 max-w-[960px] w-2/3 flex flex-col overflow-y-auto">
        <h1 class="text-4xl font-bold mx-auto">
          👩🏾‍🌾 Former playground
        </h1>

        <div class="flex items-center ml-auto space-x-4">
          <div :class="{ 'text-red-500': !isValid }">
            Validity status: {{ isValid ? 'valid' : 'invalid' }}
          </div>
          <Select v-model="mode" :options />
        </div>

        <form class="bg-white rounded-xl shadow-xl p-4 flex flex-col gap-4" @submit.prevent="submit">
          <FormContent @valid="isValid = $event" />

          <Button type="submit">
            Submit
          </Button>

          <Button @click="clearPlayground">
            Clear playground
          </Button>
        </form>
      </main>

      <div class="border-l flex flex-col p-4 gap-4 w-1/2 overflow-y-auto">
        <div v-if="mode === 'build'" class="bg-white rounded-xl shadow-xl p-8 flex flex-col gap-2">
          <FormNodeProps v-if="selectedNode" />
          <div v-else>
            Click on an element for being able to adjust the props
          </div>
        </div>

        <div v-if="mode === 'build'" class="bg-white rounded-xl shadow-xl p-8 flex flex-col gap-2">
          <span>Add elements by drag and dropping them into the form</span>
          <FormAdd />
        </div>

        <div class="bg-white rounded-xl shadow-xl p-8">
          <details open>
            <summary>Schema</summary>
            <textarea v-model="jsonSchema" rows="20" class="w-full border font-mono text-sm p-4 bg-zinc-50 mb-4" />
          </details>

          <details open>
            <summary>Data</summary>
            <pre class="font-mono text-sm p-4 bg-zinc-100 mb-4">{{ data }}</pre>
          </details>
        </div>
      </div>
    </Former>
  </div>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import { computed, markRaw, ref } from 'vue';
import Group from '~/sample/Group.vue';
import Repeater from '~/sample/Repeater.vue';
import TextInput from '~/sample/TextInput.vue';
import type { FieldData, FormData, FormFieldType, Mode, SchemaNode } from '~/types';
import FormAdd from './components/FormAdd.vue';
import FormContent from './components/FormContent.vue';
import Former from './components/Former.vue';
import FormNodeProps from './components/FormNodeProps.vue';
import Button from './sample/Button.vue';
import Checkbox from './sample/Checkbox.vue';
import Select from './sample/Select.vue';

const mode = useStorage<Mode>('former:mode', 'edit');

const options = [
  { label: 'edit', value: 'edit' },
  { label: 'read', value: 'read' },
  { label: 'build', value: 'build' },
];

const isValid = ref(true);

const schema = useStorage<SchemaNode[]>('former:schema', [
  {
    type: 'text',
    name: 'name',
    props: {
      label: 'Name',
      placeholder: 'Enter your name',
      required: true,
    },
  },
  {
    type: 'text',
    name: 'email',
    props: {
      type: 'email',
      label: 'Email',
      placeholder: 'Enter your email',
    },
  },
  {
    type: 'text',
    name: 'password',
    props: {
      type: 'password',
      label: 'Password',
      placeholder: 'Enter your password',
    },
  },
  {
    type: 'text',
    name: 'confirmPassword',
    props: {
      type: 'password',
      label: 'Confirm Password',
      placeholder: 'Confirm your password',
    },
  },
  {
    type: 'group',
    name: 'group',
    children: [
      {
        type: 'text',
        name: 'name',
        props: {
          type: 'text',
          label: 'Group Name',
          placeholder: 'Enter group name',
        },
      },
      {
        type: 'text',
        name: 'email',
        props: {
          type: 'email',
          label: 'Group Email',
          placeholder: 'Enter group email',
        },
      },
    ],
  },
  {
    type: 'group',
    name: 'level1',
    children: [
      {
        type: 'group',
        name: 'level2',
        children: [
          {
            type: 'text',
            name: 'name',
            props: {
              type: 'text',
              label: 'Group Name',
              placeholder: 'two levels deep',
            },
          },
        ],
      },
    ],
  },
  {
    type: 'select',
    name: 'select',
    props: {
      showIf: 'hallo',
      label: 'Select',
      options: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option3' },
      ],
    },
  },
  {
    type: 'repeater',
    name: 'repeater',
    children: [
      {
        type: 'text',
        name: 'label',
        props: {
          type: 'text',
          label: 'Label',
          placeholder: 'Enter a label',
        },
      },
      {
        type: 'text',
        name: 'value',
        props: {
          type: 'text',
          label: 'Value',
          placeholder: 'Enter a value',
        },
      },
    ],
  },
]);

const debouncedSchema = (() => {
  let timeout: number | null = null;

  return (_schema: SchemaNode[]) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      schema.value = _schema;
    }, 500);
  };
})();

const jsonSchema = computed<string>({
  get() {
    return JSON.stringify(schema.value, null, 2);
  },
  set(_schema: string) {
    debouncedSchema(JSON.parse(_schema));
  },
});

const data = useStorage<FormData>('former:data', {});

const components: { [k: string]: FormFieldType } = {
  text: {
    label: 'Text',
    component: markRaw(TextInput),
    propsSchema: [
      {
        type: 'text',
        name: '$name',
        props: {
          label: 'Name',
          placeholder: 'Enter the name of the data field',
        },
      },

      {
        type: 'text',
        name: 'label',
        props: {
          label: 'Label',
          placeholder: 'Enter a label',
        },
      },
      {
        type: 'text',
        name: 'placeholder',
        props: {
          label: 'Placeholder',
          placeholder: 'Enter a placeholder',
        },
      },
      {
        type: 'checkbox',
        name: 'required',
        props: {
          label: 'Is field required?',
        },
      },
    ],
  },
  group: {
    label: 'Group',
    component: markRaw(Group),
    propsSchema: [
      {
        type: 'text',
        name: '$name',
        props: {
          label: 'Name',
          placeholder: 'Enter the name of the data field',
        },
      },
    ],
  },
  repeater: {
    label: 'Repeater',
    component: markRaw(Repeater),
    propsSchema: [
      {
        type: 'text',
        name: '$name',
        props: {
          label: 'Name',
          placeholder: 'Enter the name of the data field',
        },
      },
      {
        type: 'text',
        name: 'label',
        props: {
          label: 'Label',
          placeholder: 'Enter a label',
        },
      },
    ],
  },
  select: {
    label: 'Select',
    component: markRaw(Select),
    propsSchema: [
      {
        type: 'text',
        name: '$name',
        props: {
          label: 'Name',
          placeholder: 'Enter the name of the data field',
        },
      },
      {
        type: 'text',
        name: 'label',
        props: {
          label: 'Label',
          placeholder: 'Enter a label',
        },
      },
      {
        type: 'repeater',
        name: 'options',
        children: [
          {
            type: 'text',
            name: 'label',
            props: {
              type: 'text',
              label: 'Label',
              placeholder: 'Enter a label',
            },
          },
          {
            type: 'text',
            name: 'value',
            props: {
              type: 'text',
              label: 'Value',
              placeholder: 'Enter a value',
            },
          },
        ],
        props: {
          label: 'Options',
        },
      },
    ],
  },
  checkbox: {
    label: 'Checkbox',
    component: markRaw(Checkbox),
    propsSchema: [
      {
        type: 'text',
        name: '$name',
        props: {
          label: 'Name',
          placeholder: 'Enter the name of the data field',
        },
      },

      {
        type: 'text',
        name: 'label',
        props: {
          label: 'Label',
          placeholder: 'Enter a label',
        },
      },
    ],
  },
};

function showIf(node: SchemaNode, _data: FormData): boolean {
  if (!node.props)
    return true;
  const condition = node.props.showIf;
  if (!condition)
    return true;
  return condition === 'hello';
}

function validator(node: SchemaNode, data: FieldData | FormData): string | true {
  if (!node.props)
    return true;
  const requiredFlag = node.props.required;
  if (requiredFlag === true && !data) {
    return 'Value is required';
  }
  return true;
}

function submit() {
  // eslint-disable-next-line no-console
  console.log('submit', data.value);
  // eslint-disable-next-line no-alert
  alert(`Submitted:
  
  ${JSON.stringify(data.value, undefined, 4)}`);
}

function clearPlayground() {
  schema.value = [];
  data.value = {};
}
</script>
