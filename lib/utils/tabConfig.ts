import { TabsConfig } from "@/types/tabs";
import tabsConfig from '@/config/tabs.json';

const config = tabsConfig as TabsConfig;

export const getTabConfig = (tabId: string) => {
  const tabConfig = config.tabs.find(tab => tab.id === tabId);
  if (!tabConfig) {
    throw new Error(`Tab configuration not found for id: ${tabId}`);
  }
  return tabConfig;
};

export const getGlobalConfig = () => config;

export default config;
