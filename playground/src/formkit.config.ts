import { genesisIcons } from '@formkit/icons';
import { rootClasses } from './formkit.theme';
import type { DefaultConfigOptions } from '@formkit/vue';

const config: DefaultConfigOptions = {
  icons: { ...genesisIcons },
  config: { rootClasses },
};

export default config;
