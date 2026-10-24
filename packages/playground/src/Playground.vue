<template>
  <!-- the form and the settings are resizable panels, their sizes are stored in the local storage.
       Small screens can't resize them, so they are stacked and the whole playground scrolls -->
  <UDashboardGroup storage="local" storage-key="former-playground" class="relative flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
    <Former
      v-model:data="data"
      v-model:schema="schema"
      :components="activeComponents"
      :mode
      :show-if
      :validator="validator"
      @valid="isValid = $event"
      @schema-valid="isSchemaValid = $event"
    >
      <UDashboardPanel id="form" resizable :default-size="60" :min-size="30" :max-size="80" :ui="{ root: 'min-h-auto lg:min-h-0' }">
        <main class="flex-1 min-h-0 gap-4 p-8 flex flex-col overflow-y-auto">
          <div class="flex items-center ml-auto space-x-4">
            <Checkbox
              v-model="activateShowIf" label="Activate Show-If"
            />
            <div>
              Validity status:
              <span :class="{ 'text-red-500': !isValid }">Data {{ isValid ? 'valid' : 'invalid' }}</span>,
              <span :class="{ 'text-red-500': !isSchemaValid }">Schema {{ isSchemaValid ? 'valid' : 'invalid' }}</span>
            </div>
            <Select v-model="presetId" :options="presetOptions" />
            <Select v-model="mode" :options />
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
      </UDashboardPanel>

      <UDashboardPanel id="settings" :ui="{ root: 'min-h-auto lg:min-h-0 border-t border-default lg:border-t-0' }">
        <div class="flex-1 min-h-0 flex flex-col p-8 gap-4 overflow-y-auto">
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
              <template #node-actions="{ node, addNode, removeNode }">
                <Button
                  type="button"
                  @click="addNode(node)"
                >
                  Clone
                </Button>
                <Button
                  type="button"
                  @click="removeNode()"
                >
                  Custom remove
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
      </UDashboardPanel>
    </Former>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type {
  FieldData,
  FormData,
  Mode,
  SchemaNode,
} from '@former-ui/former';
import Button from '@/sample/Button.vue';
import Checkbox from '@/sample/Checkbox.vue';
import Select from '@/sample/Select.vue';
import {
  FormAdd,
  FormContent,
  Former,
  FormNodeProps,
} from '@former-ui/former';
import { useStorage } from '@vueuse/core';
import { computed, provide, ref } from 'vue';
import { usePresets } from './presets';
import { hasValueAt, playgroundSchemaKey } from './showIf';

const mode = useStorage<Mode>('former:mode', 'build');
const presets = usePresets();
const presetId = useStorage<string>('former:preset', presets.value[0].id);
const activateShowIf = useStorage<boolean>('former:activateShowIf', false);

const presetOptions = computed(() => presets.value.map(preset => ({ label: preset.label, value: preset.id })));

const options = [
  { label: 'build', value: 'build' },
  { label: 'edit', value: 'edit' },
  { label: 'read', value: 'read' },
];

const isValid = ref(true);
const isSchemaValid = ref(true);

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
      showIf: 'name',
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

provide(playgroundSchemaKey, schema);

const debouncedSchema = (() => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

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

const activeComponents = computed(() => {
  // fall back to the first preset if the stored id doesn't exist (anymore)
  const preset = presets.value.find(preset => preset.id === presetId.value) ?? presets.value[0];
  return preset.components;
});

// shows the node only if the field selected in its show if prop has a value
function showIf(node: SchemaNode, data: FormData): boolean {
  if (!activateShowIf.value) {
    return true;
  }
  const path = node.props?.showIf;
  if (!path)
    return true;
  return hasValueAt(data, path);
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
