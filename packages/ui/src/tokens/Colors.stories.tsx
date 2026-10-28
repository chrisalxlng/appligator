import type { Meta, StoryObj } from "@storybook/react-vite";
import styles from "./Colors.module.css";

const palettes = {
  "Deep Teal": ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "Teal Gray": ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "Burgundy Red": ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "Ochre Yellow": ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "Forest Green": ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "Navy Blue": ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "Royal Purple": ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
};

const semanticTokens = [
  "background",
  "background-accent",
  "surface",
  "surface-hover",
  "surface-press",
  "fill",
  "fill-hover",
  "fill-press",
  "separator",
  "text-primary",
  "text-secondary",
  "interactive-fill",
  "interactive-fill-hover",
  "interactive-fill-press",
  "interactive-text-primary",
  "active-surface",
  "active-surface-hover",
  "active-surface-press",
  "active-separator",
  "active-text-primary",
  "active-text-secondary",
  "highlight-surface",
  "highlight-separator",
  "highlight-text-primary",
  "highlight-text-secondary",
  "highlight-fill",
  "highlight-fill-hover",
  "highlight-fill-press",
  "destructive-fill",
  "destructive-fill-hover",
  "destructive-fill-press",
  "destructive-text-primary",
  "destructive-text",
  "destructive-surface",
  "destructive-surface-fill",
  "destructive-surface-fill-hover",
  "destructive-surface-fill-press",
  "destructive-surface-text-primary",
  "destructive-surface-text-secondary",
  "backdrop",
  "selection",
  "svg-fill",
  "svg-fill-light",
  "svg-separator",
];

function toVariableName(palette: string, shade: string) {
  return `--color-${palette.toLowerCase().replace(" ", "-")}-${shade}`;
}

function Swatch({ variable, label }: { variable: string; label: string }) {
  return (
    <div className={styles.swatch}>
      <div className={styles.color} style={{ background: `var(${variable})` }} />
      <span className={styles.label}>{label}</span>
      <code className={styles.variable}>{variable}</code>
    </div>
  );
}

function Palette() {
  return (
    <div className={styles.columns}>
      {Object.entries(palettes).map(([palette, shades]) => (
        <section key={palette} className={styles.column}>
          <h2 className={styles.heading}>{palette}</h2>
          {shades.map((shade) => (
            <Swatch key={shade} variable={toVariableName(palette, shade)} label={shade} />
          ))}
        </section>
      ))}
    </div>
  );
}

function SemanticColors() {
  return (
    <div className={styles.grid}>
      {semanticTokens.map((token) => (
        <Swatch key={token} variable={`--${token}`} label={token} />
      ))}
    </div>
  );
}

const meta = {
  title: "Tokens/Colors",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;

export const PaletteColors: StoryObj = {
  name: "Palette",
  render: () => <Palette />,
};

export const Semantic: StoryObj = {
  render: () => <SemanticColors />,
};
