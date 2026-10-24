<template>
  <UFormField :label :required :description="file?.name" :error class="w-full">
    <UFileUpload
      :model-value="file"
      size="lg"
      variant="area"
      color="neutral"
      :accept
      :disabled="mode === 'read'"
      @update:model-value="onSelect"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

defineProps<
  {
    label?: string;
    required?: boolean;
    accept?: string;
  } & FormerProps
>();

// the file is stored as data URL, its name is kept as `name` parameter: `data:image/png;name=plan.png;base64,...`
const modelValue = defineModel<string | null>();

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function dataUrlToFile(dataUrl: string): File {
  const [metaInformation = '', content = ''] = dataUrl.split(',');
  const [mime, ...parameters] = metaInformation.replace(/^data:/, '').split(';');
  const nameParameter = parameters.find(parameter => parameter.startsWith('name='));
  const name = nameParameter ? decodeURIComponent(nameParameter.slice('name='.length)) : '';
  return new File([base64ToBytes(content)], name, { type: mime });
}

function addFileName(dataUrl: string, name: string): string {
  const index = dataUrl.indexOf(';base64,');
  if (index === -1) {
    return dataUrl;
  }
  return `${dataUrl.slice(0, index)};name=${encodeURIComponent(name)}${dataUrl.slice(index)}`;
}

const file = computed(() => (modelValue.value ? dataUrlToFile(modelValue.value) : null));

// only the latest selection is stored, so a slow read of a previously selected file can't overwrite it
let currentReader: FileReader | null = null;

function onSelect(newFile: File | null | undefined) {
  currentReader?.abort();
  currentReader = null;

  if (!newFile) {
    modelValue.value = null;
    return;
  }

  const reader = new FileReader();
  currentReader = reader;
  reader.onload = () => {
    if (reader !== currentReader) {
      return;
    }
    currentReader = null;
    modelValue.value = addFileName(reader.result as string, newFile.name);
  };
  reader.readAsDataURL(newFile);
}
</script>
