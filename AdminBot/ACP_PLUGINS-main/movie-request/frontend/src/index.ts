import MovieRequests from './pages/MovieRequests';
import TmdbTab from './settings/TmdbTab';

// Register this plugin's modules on the global registry
// The host's PluginLoader reads from this registry
const modules: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  './pages/Main': async () => ({ default: MovieRequests }),
  './settings/TmdbTab': async () => ({ default: TmdbTab }),
};

(window as any)[`__acp_plugin_movie-request`] = {
  get(moduleName: string) {
    const factory = modules[moduleName];
    if (!factory) {
      throw new Error(`Module ${moduleName} not found in plugin movie-request`);
    }
    return factory();
  },
};
