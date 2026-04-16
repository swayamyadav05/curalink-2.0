import { createContext, useContext } from "react";

export type Theme = "light" | "dark";

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<
  ThemeContextType | undefined
>(undefined);

export const useTheme = () => {
  const contextValue = useContext(ThemeContext);

  if (!contextValue) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return contextValue;
};
