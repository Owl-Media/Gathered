import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";

/**
 * The VitePress default theme, restyled with Gathered's own design tokens.
 *
 * `palette.css` holds the tokens, copied from the application's
 * `src/app/globals.css`. `custom.css` maps them onto VitePress's variables.
 * No components are replaced.
 */
import "./palette.css";
import "./custom.css";

export default DefaultTheme satisfies Theme;
