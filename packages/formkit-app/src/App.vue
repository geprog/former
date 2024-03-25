<template>
  <div class="flex items-start gap-4 m-4 justify-center">
    <main class="bg-white rounded-xl shadow-xl p-8 max-w-[960px] w-2/3 flex flex-col">
      <img
        src="https://pro.formkit.com/logo.svg"
        alt="FormKit Logo"
        width="244"
        height="50"
        class="mx-auto mb-8 w-48"
      >
      <div ref="el">
        <FormKitSchema :schema :library />
      </div>
      <div  class="mt-4 mx-auto">
        <FormKit
          v-if="schema.length === 1"
          type="button"
          label="Add component"
          :onClick="addComponent"
          />
      </div>
    </main>
    <aside class="flex flex-col gap-4 max-w-[960px] w-1/3">
      <div v-if="editingComponentProps?.type === 'text'" class="bg-white rounded-xl shadow-xl p-8">
        <TextEditForm v-model:properties="editingComponentProps" />
      </div>

      <div class="bg-white rounded-xl shadow-xl p-8">
        <details>
          <summary>Schema</summary>
          <pre class="font-mono text-sm p-4 bg-slate-100 mb-4">{{ schema }}</pre>
        </details>
      </div>
      </aside>
  </div>
</template>

<script setup lang="ts">
import { FormKitSchema } from '@formkit/vue'
import { ref } from 'vue';
import type { FormKitSchemaNode } from '@formkit/core';
import { useSortable } from '@vueuse/integrations/useSortable';
import { markRaw } from 'vue';
import FormKitEdit from './components/FormKitEdit.vue';
import { computed } from 'vue';
import TextEditForm from './components/TextEditForm.vue';

// async function submit() {
//   await new Promise(r => setTimeout(r, 1000))
//   alert('Submitted! 🎉')
// }

const library = markRaw({
  FormKit: FormKitEdit,
})

const editingId = ref<number>();

const editingComponentProps = computed({
  get() {
    return schema.value.find((node) => typeof node === 'object' && node.props?.id === editingId.value).props;
  },
  set(props) {
    const index = schema.value.findIndex((node) => typeof node === 'object' && node.props?.id === editingId.value);
    schema.value[index].props = props;
  }
});

function addComponent(insertId?: number) {
  const id = new Date().getTime();

  const a = typeof insertId === 'number' ? insertId : schema.value.length;
  schema.value.splice(a, 0, {
    $cmp: 'FormKit',
    props: {
      id,
      isEdit: true,
      type: 'text',
      name: 'new_field',
      label: 'New field' + schema.value.length,
      help: 'This is a new field.',
      onDelete: () => {
        console.log('Delete');
        schema.value = schema.value.filter((node) => typeof node !== 'object' || node.props?.id !== id);
      },
      addAfter: () => {
        const index = schema.value.findIndex((node) => typeof node === 'object' && node.props?.id === id);
        addComponent(index + 1);
      },
      edit: () => {
        editingId.value = id;
      },
    },
  });
}

const schema = ref<FormKitSchemaNode[]>([
  {
    $el: 'h1',
    children: 'Register',
    attrs: {
      class: 'text-2xl font-bold mb-4',
    },
  },
  // {
  //   $formkit: 'text',
  //   name: 'email',
  //   label: 'Email',
  //   help: 'This will be used for your account.',
  //   validation: 'required|email',
  // },
  // {
  //   $formkit: 'password',
  //   name: 'password',
  //   label: 'Password',
  //   help: 'Enter your new password.',
  //   validation: 'required|length:5,16',
  // },
  // {
  //   $formkit: 'password',
  //   name: 'password_confirm',
  //   label: 'Confirm password',
  //   help: 'Enter your new password again to confirm it.',
  //   validation: 'required|confirm',
  //   validationLabel: 'password confirmation',
  // },
  // {
  //   $cmp: 'FormKit',
  //   props: {
  //     name: 'eu_citizen',
  //     type: 'checkbox',
  //     id: 'eu',
  //     label: 'Are you a european citizen?',
  //   },
  // },
  // {
  //   $formkit: 'select',
  //   if: '$get(eu).value', // 👀 Oooo, conditionals!
  //   name: 'cookie_notice',
  //   label: 'Cookie notice frequency',
  //   options: {
  //     refresh: 'Every page load',
  //     hourly: 'Ever hour',
  //     daily: 'Every day',
  //   },
  //   help: 'How often should we display a cookie notice?',
  // },
]);

const el = ref<HTMLElement | null>(null)
useSortable(el, schema, {
  handle: '.handle',
  animation: 200,
});
</script>
