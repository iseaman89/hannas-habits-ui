import { useEffect, useState } from "react";
import { applyTheme, getInitialTheme, storeTheme } from "@/shared/lib/theme";

// Legacy hook of the old UI. It now shares storage key and DOM state with the new design
// tokens (shared/lib/theme.ts) so both look the same; each caller still has its own state,
// which F3's shared ThemeContext replaces.
export function useTheme() {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);
        storeTheme(theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === "light" ? "dark" : "light"));
    };

    return { theme, toggleTheme };
}
