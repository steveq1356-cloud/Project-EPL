import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/index.js';

const DataContext = createContext(null);

// App-wide data: the project list (sidebar, quick add, search), app settings, and a
// version counter that pages watch so they refetch after any change anywhere.
export function DataProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [settings, setSettings] = useState({});
  const [version, setVersion] = useState(0);

  const refreshProjects = useCallback(() => api.projects.list().then(setProjects).catch(() => {}), []);
  const changed = useCallback(() => setVersion((v) => v + 1), []);
  const updateSettings = useCallback(async (values) => {
    setSettings((s) => ({ ...s, ...values }));
    setSettings(await api.settings.update(values));
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [version, refreshProjects]);

  useEffect(() => {
    api.settings.get().then(setSettings).catch(() => {});
  }, []);

  return (
    <DataContext.Provider value={{ projects, settings, updateSettings, version, changed, refreshProjects }}>{children}</DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
