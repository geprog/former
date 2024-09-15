<template>
  <div class="flex w-full h-screen bg-gray-100">
    <Former v-model:data="data" v-model:schema="schema" :components :edit :showIf v-slot="{ selectedNode }">
      <main class="gap-4 m-4 max-w-[960px] w-2/3 flex flex-col overflow-y-auto">
        <h1 class="text-4xl font-bold mx-auto">👩🏾‍🌾 Former playground</h1>

        <Button @click="edit = !edit" class="ml-auto bg-red-400">{{
          edit ? 'Currently editing' : 'Currently viewing'
        }}</Button>

        <form @submit.prevent="submit" class="bg-white rounded-xl shadow-xl p-4 flex flex-col gap-4">
          <FormContent />

          <Button type="submit">Submit</Button>
        </form>
      </main>

      <div class="border-l flex flex-col p-4 gap-4 w-1/2 overflow-y-auto">
        <div v-if="edit" class="bg-white rounded-xl shadow-xl p-8 flex flex-col gap-2">
          <template v-if="!selectedNode">
            <span>Add elements by drag and dropping them into the form</span>
            <FormAdd />
          </template>
          <FormNodeProps v-if="selectedNode" />
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

        <div class="bg-white rounded-xl shadow-xl p-8 flex flex-col">
          <span>`group.name` (Nested editing test)</span>
          <TextInput v-model="data.group.name" label="Group Name" />
        </div>
      </div>
    </Former>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, ref } from 'vue';
import Group from '~/sample/Group.vue';
import Repeater from '~/sample/Repeater.vue';
import type { FormFieldType, SchemaNode } from '~/types';
import TextInput from '~/sample/TextInput.vue';
import FormContent from './components/FormContent.vue';
import FormNodeProps from './components/FormNodeProps.vue';
import Former from './components/Former.vue';
import Select from './sample/Select.vue';
import Button from './sample/Button.vue';
import { useStorage } from '@vueuse/core';
import FormAdd from './components/FormAdd.vue';

const edit = useStorage('former:edit', false);

const schema = useStorage<SchemaNode[]>('former:schema', [
  {
    type: 'text',
    name: 'name',
    props: {
      label: 'Name',
      placeholder: 'Enter your name',
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
    showIf: 'hello',
    type: 'select',
    name: 'select',
    props: {
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
    props: {
      itemSchema: [
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

const data = useStorage<Record<string, any>>('former:data', {
  name: 'Anton',
  email: 'anton@example.com',
  password: '12345678',
  confirmPassword: '12345678',
  group: {
    name: 'Wonderful team',
    email: 'group@example.com',
  },
  level1: {
    level2: {
      name: 'Nested group',
    },
  },
  select: 'Option 2',
  repeater: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ],
});

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
        props: {
          label: 'Options',
          itemSchema: [
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
      },
    ],
  },
};

function showIf(node: SchemaNode, nodePath: string[], data: FormData): boolean {
  if (!node.props) return true;
  const condition = node.props.showIf;
  if (!condition || condition === '') return true;
  return condition === 'hello';
}

function submit() {
  console.log('submit', data.value);
  alert('Submitted');
}
</script>
