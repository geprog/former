// Public API von preset-nuxt-ui

export { default as Checkbox } from './components/Checkbox.vue';

export { default as Columns } from './components/Columns.vue';
export { default as ComboBox } from './components/ComboBox.vue';
export { default as Group } from './components/Group.vue';
export { default as Number } from './components/Number.vue';
export { default as RadioGroup } from './components/RadioGroup.vue';
export { default as Repeater } from './components/Repeater.vue';
// 1) die Factory für Former:
export { schemaComponentsNuxt } from './components/schemaComponentsNuxt';
export { default as Select } from './components/Select.vue';
// 2) (optional) einzelne Nuxt-UI-basierten Felder exportieren
export { default as Text } from './components/Text.vue';
export { default as Textarea } from './components/Textarea.vue';

// 3) (optional) Types bequem durchreichen
export type { FormComponents, SchemaNode } from 'former-ui';
