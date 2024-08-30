<template>
  <main class="p-4">
    <form @submit.prevent="submit">
      <FormSchema v-model="data" :edit :schema="schema" :components="components" />

      <button type="submit" class="border bg-gray-100 hover:bg-gray-300 py-1 px-2 rounded">Submit</button>
    </form>

    <hr class="border my-4" />

    <pre class="border">{{ data }} - {{ edit }}</pre>

    <input type="checkbox" v-model="edit" />

    <TextInput v-model="data.group.name" label="Group Name" />
  </main>
</template>

<script setup lang="ts">
import { markRaw, ref } from 'vue';
import FormSchema from './components/FormSchema.vue';
import Group from './components/Group.vue';
import type { SchemaNode } from './types';
import TextInput from './components/TextInput.vue';

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
]);

const data = ref<Record<string, any>>({
  name: 'Anton',
  email: 'anton@example.com',
  password: '12345678',
  confirmPassword: '12345678',
  group: {
    name: 'Wonderful',
    email: 'group@example.com',
  },
});

const components = markRaw({
  text: TextInput,
  group: Group,
});

function submit() {
  console.log('submit', data.value);
  alert('Submitted');
}
</script>
