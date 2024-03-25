<template>
  <div class="flex">
    <div class="bg-white rounded-xl shadow-xl p-8 mx-auto my-16 max-w-[960px]">
      <img
        src="https://pro.formkit.com/logo.svg"
        alt="FormKit Logo"
        width="244"
        height="50"
        class="mx-auto mb-8 w-48"
      >
      <FormKitSchema :schema :library />
      <!-- <FormKit
        type="form"
        #default="{ value }"
        @submit="submit"
      >
        <FormKit
          type="text"
          name="name"
          label="Name"
          help="What do people call you?"
        />
        <FormKit
          type="checkbox"
          name="flavors"
          label="Favorite ice cream flavors"
          :options="{
            'vanilla': 'Vanilla',
            'chocolate': 'Chocolate',
            'strawberry': 'Strawberry',
            'mint-chocolate-chip': 'Mint Chocolate Chip',
            'rocky-road': 'Rocky Road',
            'cookie-dough': 'Cookie Dough',
            'pistachio': 'Pistachio',
          }"
          validation="required|min:2"
        />
        
        <FormKit
          type="checkbox"
          name="agree"
          label="I agree FormKit is the best form authoring framework."
        />
        <pre class="font-mono text-sm p-4 bg-slate-100 mb-4">{{ value }}</pre>
      </FormKit> -->
      <!-- <div>
        <pre class="font-mono text-sm p-4 bg-slate-100 mb-4">{{ schema }}</pre>
      </div> -->
    </div>
    <div class="bg-white rounded-xl shadow-xl p-8 mx-auto my-16 max-w-[960px]" v-if="editingId">
      <TextEditForm v-if="editingComponentProps?.type === 'text'" v-model:properties="editingComponentProps" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormKitSchema } from '@formkit/vue'
import { ref } from 'vue';
import type { FormKitSchemaNode } from '@formkit/core';
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
    console.log('get', editingId.value, schema.value);
    
    return schema.value.find((node) => typeof node === 'object' && node.props?.id === editingId.value).props;
  },
  set(props) {
    const index = schema.value.findIndex((node) => typeof node === 'object' && node.props?.id === editingId.value);
    schema.value[index].props = props;
  }
});

function addComponent(insertId?: number) {
  const id = new Date().getTime();
  // schema.value.push({

  schema.value.splice(insertId || schema.value.length, 0, {
    
    // $formkit: 'text',
    // name: 'new_field',
    // label: 'New field',
    // help: 'This is a new field.',
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
  {
    $cmp: 'FormKit',
    props: {
      type: 'button',
      label: 'Add component',
      onClick: () => addComponent(),
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
</script>
