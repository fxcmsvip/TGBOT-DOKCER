// Plugin frontend entry point
// Register modules on the global registry for the host's PluginLoader

// Import your page/settings components here:
// import MyPage from './pages/MyPage';
// import MySettings from './settings/MySettings';

const modules: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  // './pages/Main': async () => ({ default: MyPage }),
  // './settings/MyTab': async () => ({ default: MySettings }),
};

// Register this plugin — the host reads from window.__acp_plugin_{id}
// Replace 'my-plugin' with your actual plugin ID from manifest.json
(window as any)[`__acp_plugin_my-plugin`] = {
  get(moduleName: string) {
    const factory = modules[moduleName];
    if (!factory) {
      throw new Error(`Module ${moduleName} not found in plugin`);
    }
    return factory();
  },
};
