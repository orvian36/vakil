export interface TabConfig {
  id: string;
  label: string;
  icon: string;
  apiEndpoint: string;
  generateEndpoint: string;
  exportFunction: string;
  title: string;
  promptFile: string;
}

export interface TabsConfig {
  tabs: TabConfig[];
  defaultTab: string;
  regenerateEndpoint: string;
}
