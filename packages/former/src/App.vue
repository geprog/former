<template>
  <div class="flex w-full h-screen bg-gray-100">
    <main class="gap-4 m-4 max-w-[960px] w-2/3 flex flex-col">
      <h1 class="text-4xl font-bold mx-auto">👩🏾‍🌾 Former playground</h1>

      <form @submit.prevent="submit" class="bg-white rounded-xl shadow-xl p-4 flex flex-col gap-4">
        <Former v-model="data" :schema :components :edit />

        <button type="submit" class="border bg-slate-100 hover:bg-slate-300 py-1 px-2 rounded">Submit</button>
      </form>
    </main>

    <div class="border-l flex flex-col p-4 gap-4 w-1/2 overflow-y-auto">
      <div class="bg-white rounded-xl shadow-xl p-8 flex gap-2">
        <input type="checkbox" v-model="edit" />
        <span>Edit: {{ edit }}</span>
      </div>

      <div class="bg-white rounded-xl shadow-xl p-8">
        <details open>
          <summary>Schema</summary>
          <textarea v-model="jsonSchema" rows="20" class="w-full border font-mono text-sm p-4 bg-slate-50 mb-4" />
        </details>

        <details open>
          <summary>Data</summary>
          <pre class="font-mono text-sm p-4 bg-slate-100 mb-4">{{ data }}</pre>
        </details>
      </div>

      <div class="bg-white rounded-xl shadow-xl p-8 flex flex-col">
        <span>`group.name` (Nested editing test)</span>
        <TextInput v-model="data.group.name" label="Group Name" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, ref } from 'vue';
import Group from '~/sample/Group.vue';
import type { FormFieldType, SchemaNode } from '~/types';
import TextInput from '~/sample/TextInput.vue';
import Former from '~/components/Former.vue';

type SchemaText = SchemaNode<{
  label: string;
  type?: 'text' | 'password' | 'email';
  placeholder?: string;
}>;

type SchemaGroup = SchemaNode<{
  children: SchemaNode[];
}>;

type Schema = (SchemaText | SchemaGroup)[];

const edit = ref(false);

const schema = ref<Schema>([
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
]);

const debouncedSchema = (() => {
  let timeout: number | null = null;

  return (_schema: Schema) => {
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

const data = ref<Record<string, any>>({
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
});

const components: { [k: string]: FormFieldType } = {
  text: {
    label: 'Text Input',
    component: markRaw(TextInput),
    propsSchema: [],
  },
  group: {
    label: 'Group',
    component: markRaw(Group),
    propsSchema: [],
  },
};

function submit() {
  console.log('submit', data.value);
  alert('Submitted');
}
</script>
