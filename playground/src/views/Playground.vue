<template>
  <div class="flex items-start gap-4 m-4 justify-center">
    <FormBuilder v-model:schema="schema">
      <main class="bg-white rounded-xl shadow-xl p-8 max-w-[960px] w-2/3 flex flex-col">
        <img
          src="https://pro.formkit.com/logo.svg"
          alt="FormKit Logo"
          width="244"
          height="50"
          class="mx-auto mb-8 w-48"
        />
        <FormContent />
      </main>
      <aside class="flex flex-col gap-4 max-w-[960px] w-1/3">
        <div class="bg-white rounded-xl shadow-xl p-8">
          <FormFieldOptions />
        </div>

        <div class="bg-white rounded-xl shadow-xl p-8">
          <details>
            <summary>Schema</summary>
            <pre class="font-mono text-sm p-4 bg-slate-100 mb-4">{{ schema }}</pre>
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
import { FormBuilder, FormContent, FormFieldOptions } from 'former-ui';

// const library = markRaw({
//   // TODO: provide some custom components here
// });

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
</script>
