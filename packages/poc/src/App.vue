<template>
  <main>
    <FormSchema v-model="data" :schema="schema" :components="components" />

    <pre>{{ data }}</pre>

    <input type="text" v-model="data.group.name" />
  </main>
</template>

<script setup lang="ts">
import { markRaw, ref } from 'vue';
import FormSchema from './components/FormSchema.vue';
import TextInput from './components/TextInput.vue';
import Group from './components/Group.vue';
import type { SchemaNode } from './types';

type SchemaText = SchemaNode<{
  label: string;
  type?: 'text' | 'password' | 'email';
  placeholder?: string;
}>;

type SchemaGroup = SchemaNode<{
  children: SchemaNode[];
}>;

type Schema = (SchemaText | SchemaGroup)[];

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
    name: 'Group Name',
    email: 'group@example.com',
  },
});

const components = markRaw({
  text: TextInput,
  group: Group,
});
</script>
