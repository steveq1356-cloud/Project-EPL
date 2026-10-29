import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/index.js';

const DataContext = createContext(null);

// App-wide data: the project list (for the sidebar, quick add and search) and a
// version counter that pages watch so they refetch after any change anywhere.
export function DataProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [version, setVersion] = useState(0);

  const refreshProjects = useCallback(() => api.projects.list().then(setProjects).catch(() => {}), []);
  const changed = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    refreshProjects();
  }, [version, refreshProjects]);

  return <DataContext.Provider value={{ projects, version, changed, refreshProjects }}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
