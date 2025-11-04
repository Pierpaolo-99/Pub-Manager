import { createContext } from 'react';

const GlobalContext = createContext({
  isLoading: false,
  setIsLoading: () => {}
});

export default GlobalContext;