<template>
  <div class="flex w-full h-screen dark:bg-zinc-900 bg-gray-100 dark:text-zinc-100" :class="{ dark: activateDarkMode }">
    <Former
      v-model:data="data"
      v-model:schema="schema"
      :components="builderComponents"
      :mode="mode"
      :show-if="showIf"
      :validator="validator"
      @valid="isValid = $event"
      @schema-valid="isSchemaValid = $event"
    >
      <main class="gap-4 m-4 mx-auto max-w-7xl px-4 py-4 w-2/3 flex flex-col overflow-y-auto">
        <h1 class="text-4xl font-bold w-full text-center">
          👩🏾‍🌾 Former playground
        </h1>

        <div class="flex items-center ml-auto space-x-4">
          <Checkbox
            v-model="activateDarkMode" label="Activate dark mode"
          />
          <Checkbox
            v-model="activateShowIf" label="Activate Show-If"
          />
          <div>
            Validity status:
            <span :class="{ 'text-red-500': !isValid }">Data {{ isValid ? 'valid' : 'invalid' }}</span>,
            <span :class="{ 'text-red-500': !isSchemaValid }">Schema {{ isSchemaValid ? 'valid' : 'invalid' }}</span>
          </div>
          <Select v-model="preset" :options="presetOptions" />
          <Select v-model="mode" :options="options" />
        </div>

        <form class="dark:bg-zinc-800 bg-white rounded-xl shadow-xl p-4 flex flex-col gap-4" @submit.prevent="submit">
          <FormContent />

          <Button type="submit">
            Submit
          </Button>

          <Button @click.prevent="data = {}">
            Reset data
          </Button>

          <Button @click.prevent="clearPlayground">
            Clear playground
          </Button>
        </form>
      </main>

      <div class="border-l dark:border-zinc-400 flex flex-col p-4 gap-4 w-1/2 overflow-y-auto">
        <div v-if="mode === 'build'" class="dark:bg-zinc-800 bg-white rounded-xl shadow-xl p-8 flex flex-col gap-2">
          <FormNodeProps>
            <template #unselect-button="unselectButtonProps">
              <Button @click="unselectButtonProps.unselect">
                &#10060;
              </Button>
            </template>
            <template #delete-button="deleteButtonProps">
              <Button @click="deleteButtonProps.delete">
                &#128465;
              </Button>
            </template>
            <template #nothing-selected>
              Click on an element for being able to adjust the props
            </template>
          </FormNodeProps>
        </div>

        <div v-if="mode === 'build'" class="dark:bg-zinc-800 bg-white rounded-xl shadow-xl p-8 flex flex-col gap-2">
          <span>Add elements by drag and dropping them into the form</span>
          <FormAdd />
        </div>

        <div class="dark:bg-zinc-800 bg-white rounded-xl shadow-xl p-8">
          <details open>
            <summary>
              Schema
            </summary>
            <textarea v-model="jsonSchema" rows="20" class="w-full border dark:border-zinc-400 font-mono text-sm p-4 dark:bg-zinc-800 mb-4" />
          </details>

          <details open>
            <summary>
              Data
            </summary>
            <pre class="font-mono text-sm p-4 mb-4">{{ data }}</pre>
          </details>
        </div>
      </div>
    </Former>
  </div>
</template>

<script setup lang="ts">
import type {
  FieldData,
  FormComponents,
  FormData,
  Mode,
  SchemaNode,
} from 'former-ui';
import Button from '@/sample/Button.vue';
import Checkbox from '@/sample/Checkbox.vue';
import { schemaComponents as schemaComponentsSample } from '@/sample/schemaComponents';
import Select from '@/sample/Select.vue';
import { useStorage } from '@vueuse/core';
import {
  FormAdd,
  FormContent,
  Former,
  FormNodeProps,
} from 'former-ui';

import { schemaComponents as schemaComponentsNuxt } from 'preset-nuxt-ui';
import { computed, nextTick, ref, watch } from 'vue';
import type { PresetStyleConfig } from 'preset-nuxt-ui';

const defaultStyles: PresetStyleConfig = {
  text: {
    class: 'w-full border border-zinc-300 dark:border-zinc-600 rounded-md focus:outline-none px-2.5 py-1.5 text-sm gap-1.5 text-highlighted bg-default',
  },
  number: {
    class: 'w-full border border-zinc-300 dark:border-zinc-600 rounded-md focus:outline-none px-2.5 py-1.5 text-sm gap-1.5 text-highlighted bg-default',
  },
  textarea: {
    class: 'w-full border border-zinc-300 dark:border-zinc-600 rounded-md focus:outline-none px-2.5 py-1.5 text-sm gap-1.5 text-highlighted bg-default',
  },

  select: {
    ui: {
      content: 'bg-default',
    },
    class: 'w-full border border-zinc-300 dark:border-zinc-600 rounded-md focus:outline-none px-2.5 py-1.5 text-sm gap-1.5 text-highlighted bg-default',
  },
  combo_box: {
    class: 'w-full border border-zinc-300 dark:border-zinc-600 rounded-md focus:outline-none px-2.5 py-1.5 text-sm gap-1.5 text-highlighted bg-default',
  },

  checkbox: {
    ui: {
      base:  'border border-zinc-400 rounded bg-white dark:bg-zinc-900',
      label: 'ml-2',
      icon:  'text-zinc-800 dark:text-zinc-100',
    },
  },

  radio_group: {
    class: "w-full rounded-lg border border-zinc-300 dark:border-zinc-600 px-2.5 py-1.5 text-sm gap-1.5 text-highlighted",
    ui: {
      item: 'rounded-lg border border-zinc-300 dark:border-zinc-600 bg-default',
    }
  },

  group: {
    class: 'w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-2.5 py-1.5 text-sm gap-1.5 text-highlighted bg-transparent',
  },
  columns: {
    class: 'w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-2.5 py-1.5 text-sm gap-1.5 text-highlighted bg-transparent',
  },

  repeater: {
    class: 'flex flex-col gap-4',
    ui: {
      item: 'rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-4',
    },
  },
}

const builderComponents = computed<FormComponents>(() =>
  preset.value === 'nuxt'
    ? schemaComponentsNuxt(defaultStyles)  
    : schemaComponentsSample()             
);

const mode = useStorage<Mode>('former:mode', 'build');
const activateShowIf = useStorage<boolean>('former:activateShowIf', false);
const activateDarkMode = useStorage<boolean>('former:darkMode', false);

const options = [
  { label: 'build', value: 'build' },
  { label: 'edit', value: 'edit' },
  { label: 'read', value: 'read' },
];
type PresetKey = 'nuxt' | 'sample';
const preset = useStorage<PresetKey>('former:preset', 'nuxt');

const presetOptions = [
  { label: 'Nuxt UI', value: 'nuxt' },
  { label: 'Sample', value: 'sample' },
];

const isValid = ref(true);
const isSchemaValid = ref(true);


const DEFAULT_SCHEMA: SchemaNode[] = [
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
];

const schema = useStorage<SchemaNode[]>('former:schema', structuredClone(DEFAULT_SCHEMA));

watch(preset, async () => {
  clearPlayground();                 
  await nextTick();
  schema.value = structuredClone(DEFAULT_SCHEMA);
  data.value = {};
  await nextTick();
  location.reload();
});

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

function showIf(node: SchemaNode, _data: FormData): boolean {
  if (!activateShowIf.value) {
    return true;
  }
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
