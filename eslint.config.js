import antfu from '@antfu/eslint-config';

export default antfu({
  vue: true,
  typescript: true,
  formatters: {
    /**
     * Format CSS, LESS, SCSS files, also the `<style>` blocks in Vue
     * By default uses Prettier
     */
    css: true,
    /**
     * Format HTML files
     * By default uses Prettier
     */
    html: true,
    /**
     * Format Markdown files
     * Supports Prettier and dprint
     * By default uses Prettier
     */
    markdown: 'prettier',
  },
  rules: {
    '@typescript-eslint/consistent-type-definitions': 'off', // off for now
    'style/member-delimiter-style': 'off', // off for now
    'style/semi': ['error', 'always'],
    'vue/block-order': ['error', {
      order: [['template', 'script'], 'style'],
    }],
  },
});
