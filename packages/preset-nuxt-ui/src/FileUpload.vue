<template>
  <UFormField :description="fileName">
    <UFileUpload v-model:model-value="file" size="lg" variant="area" color="neutral" :accept />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { onMounted, ref, watch } from 'vue';

defineProps<{
  accept?: string;
} & FormerProps>();

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

const image = defineModel<string>();
const fileName = ref('');

const file = ref<File | null>(null);

function dataURLtoFile(dataUrl: string, filename: string): File {
  const [metaInformation, content] = dataUrl.split(',');
  const mimeMatch = metaInformation?.match(/:(.*?);/);
  const mime = mimeMatch?.[1];
  const bytes = base64ToBytes(content ?? '');
  return new File([bytes], filename, { type: mime });
}

onMounted(() => {
  if (image.value) {
    file.value = dataURLtoFile(image.value, '');
    if (!fileName.value)
      fileName.value = file.value.name;
  }
});

watch(file, (newFile) => {
  if (!newFile) {
    image.value = '';
    fileName.value = '';
    return;
  }

  const reader = new FileReader();

  reader.onload = (e: ProgressEvent<FileReader>) => {
    image.value = e.target?.result as string;
    fileName.value = newFile.name;
  };

  reader.readAsDataURL(newFile);
});
</script>
