<template>
  <div class="flex items-start gap-4 m-4 justify-center">
    <FormBuilder v-model:schema="schema" :mode="mode" v-model:data="data" v-model:form-field-types="formFieldTypes">
      <main class="bg-white rounded-xl shadow-xl gap-4 p-8 max-w-[960px] w-2/3 flex flex-col">
        <h1 class="text-4xl font-bold mx-auto">👩🏾‍🌾 Former playground</h1>
        <div class="flex self-center gap-4">
          <FormKit
            type="button"
            :label="mode === 'preview' ? 'Edit' : 'Preview'"
            :onClick="() => (mode = mode === 'edit' ? 'preview' : 'edit')"
          />
          <FormKit
            type="button"
            :label="selectedSchema === 'empty' ? 'Change to complex schema' : 'Change to empty schema'"
            :onClick="() => (selectedSchema = selectedSchema === 'empty' ? 'complex' : 'empty')"
          />
        </div>
        <FormContent />
      </main>
      <aside class="flex flex-col gap-4 max-w-[960px] w-1/3">
        <div class="bg-white rounded-xl shadow-xl p-8">
          <FormFieldOptions />
        </div>

        <div class="bg-white rounded-xl shadow-xl p-8">
          <details open>
            <summary>Schema</summary>
            <pre class="font-mono text-sm p-4 bg-slate-100 mb-4">{{ schema }}</pre>
          </details>

          <details open>
            <summary>Data</summary>
            <pre class="font-mono text-sm p-4 bg-slate-100 mb-4">{{ data }}</pre>
          </details>
        </div>
      </aside>
    </FormBuilder>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { FormKitSchemaNode } from '@formkit/core';
// import { markRaw } from 'vue';
import { FormBuilder, FormContent, FormFieldOptions, type FormFieldType, formFieldBaseOptions } from 'former-ui';
import { computed } from 'vue';

const mode = ref<'edit' | 'preview'>('edit');

// const library = markRaw({
//   // TODO: provide some custom components here
// });

const formFieldTypes = ref<Record<string, FormFieldType>>({
  text: {
    label: 'Custom Field Type (Text)',
    schema: [
      ...formFieldBaseOptions,
      {
        $formkit: 'text',
        label: 'Custom placeholder',
        name: 'placeholder',
      },
    ],
  },
});

const data = ref<Record<string, any>>({});

const selectedSchema = ref<'empty' | 'complex'>('empty');

const schema = computed({
  get() {
    switch (selectedSchema.value) {
      case 'empty':
        return emptySchema.value;
      case 'complex':
        return complexSchema.value;
      default:
        return emptySchema.value;
    }
  },
  set(value) {
    switch (selectedSchema.value) {
      case 'empty':
        emptySchema.value = value;
        break;
      case 'complex':
        complexSchema.value = value;
        break;
    }
  },
});

const emptySchema = ref<FormKitSchemaNode[]>([]);
const complexSchema = ref<FormKitSchemaNode[]>([
  {
    $el: 'h1',
    children: 'Register',
    attrs: {
      class: 'text-2xl font-bold mb-4',
    },
  },
  {
    $formkit: 'text',
    name: 'new_field',
    label: 'New field1',
    help: 'This is a new field.',
    prefixIcon: 'arcticons:4g',
  },
  {
    $formkit: 'text',
    name: 'new_field_2',
    label: 'New field2',
    help: 'This is a new field.',
  },
  {
    $formkit: 'group',
    name: 'categoryAndZip',
    children: [
      {
        $formkit: 'text',
        label: 'Zip Code',
        placeholder: '90210',
        name: 'zip_code',
        validation: 'required|matches:/^[0-9]{5}$/',
      },
      {
        $formkit: 'select',
        placeholder: 'Please Select',
        validation: 'required',
        validationMessages: {
          required: 'Field is required',
        },
        label: 'Category',
        name: 'category',
        options: ['Fruits', 'Vegetables'],
      },
    ],
  },
  {
    $el: 'h1',
    children: 'Register',
    attrs: {
      class: 'text-2xl font-bold mb-4',
    },
  },
  {
    $formkit: 'text',
    name: 'email',
    label: 'Email',
    help: 'This will be used for your account.',
    validation: 'required|email',
  },
  {
    $formkit: 'password',
    name: 'password',
    label: 'Password',
    help: 'Enter your new password.',
    validation: 'required|length:5,16',
  },
  {
    $formkit: 'password',
    name: 'password_confirm',
    label: 'Confirm password',
    help: 'Enter your new password again to confirm it.',
    validation: 'required|confirm',
    validationLabel: 'password confirmation',
  },
  {
    $cmp: 'FormKit',
    props: {
      name: 'eu_citizen',
      type: 'checkbox',
      id: 'eu',
      label: 'Are you a european citizen?',
    },
  },
  {
    $formkit: 'select',
    if: '$get(eu).value', // 👀 Oooo, conditionals!
    name: 'cookie_notice',
    label: 'Cookie notice frequency',
    options: {
      refresh: 'Every page load',
      hourly: 'Ever hour',
      daily: 'Every day',
    },
    help: 'How often should we display a cookie notice?',
  },
  {
    $formkit: 'number',
    name: 'price',
    label: 'Primary price',
  },
  {
    $formkit: 'list',
    name: 'prices',
    children: [
      {
        $formkit: 'number',
        label: 'List-nested price',
      },
    ],
  },
  {
    $formkit: 'group',
    name: 'cart',
    key: 'cart',
    children: [
      {
        $formkit: 'number',
        name: 'price',
        label: 'Group-nested price',
      },
      {
        $formkit: 'text',
        name: 'name',
        label: 'Product name',
      },
    ],
  },

  {
    $formkit: 'form',
    submitLabel: 'Proceed to checkout',
    onSubmit: '$formSubmitHandler',
    submitAttrs: {
      prefixIcon: 'dollar',
      suffixIcon: 'submit',
    },
    children: [
      {
        $formkit: 'radio',
        value: '2',
        label: 'Choose your ticket',
        validation: 'required',
        validationLabel: 'Ticket',
        help: "Don't be afraid to invest in yourself",
        options: [
          {
            label: 'Quartz: $0',
            value: '1',
            help: 'Watch remotely and miss out on all the fun.',
          },
          {
            label: 'Bronze: $299',
            value: '2',
            help: "Nose-bleed seats but at least you're attending in person.",
          },
          {
            label: 'Silver: $399',
            value: '3',
            help: 'The every-day conference experience.',
          },
          {
            label: 'Gold: $599',
            value: '4',
            help: 'SOLD OUT: VIP seating, personalized swag, and complimentary food and drink.',
            attrs: {
              disabled: true,
            },
          },
          {
            label: 'Platinum: $20,000',
            value: '5',
            help: 'You get to be a speaker. 🤫',
          },
        ],
      },
    ],
  },
  {
    $formkit: 'textarea',
    label: 'Special instructions / comments',
    placeholder: 'Let us know if you need anything!',
    help: 'FormConf aspires to provide a welcoming environment for all.',
  },
]);
</script>
