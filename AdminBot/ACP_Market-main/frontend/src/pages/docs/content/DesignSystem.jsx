import Heading from '../components/Heading';
import Callout from '../components/Callout';
import CodeBlock from '../components/CodeBlock';
import PropsTable from '../components/PropsTable';

export default function DesignSystem() {
  return (
    <div>
      <Heading level={1} id="design-system">ADMINCHAT Panel Design System</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        This guide documents the visual language and component patterns used across the
        ADMINCHAT Panel. All plugins must follow these conventions to provide a consistent
        user experience. The design system is built on CSS custom properties (variables)
        that automatically adapt when the user switches between Dark and Light themes.
      </p>

      <Callout type="warning" title="Use inline styles, not Tailwind className">
        Plugins run outside the host Panel's Tailwind build context.
        Using <span className="font-mono text-xs">className="bg-[var(--color-bg-card)]"</span> will
        NOT render correctly. Always use inline <span className="font-mono text-xs">style={'{{'} background: 'var(--color-bg-card)' {'}}'}</span> for
        CSS variable references. Tailwind utility classes like <span className="font-mono text-xs">rounded-[10px]</span>, <span className="font-mono text-xs">p-5</span>, <span className="font-mono text-xs">gap-4</span> (that don't reference variables) work fine.
      </Callout>

      {/* ── Theme System ─────────────────────────────────────── */}
      <Heading level={2} id="theme-system">Theme System</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The Panel supports <span className="font-medium text-text-primary">Dark</span> (default)
        and <span className="font-medium text-text-primary">Light</span> themes. The active theme
        is set via <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">data-theme</span> attribute
        on the <span className="font-mono text-xs">&lt;html&gt;</span> element. All CSS custom properties
        update automatically — plugins that use <span className="font-mono text-xs">var(--color-*)</span> adapt
        with zero extra work.
      </p>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li>Users toggle themes via the sun/moon button in the sidebar</li>
        <li>Preference is persisted to <span className="font-mono text-xs">localStorage</span> and auto-detects <span className="font-mono text-xs">prefers-color-scheme</span></li>
        <li>Design and test your plugin in <span className="font-medium text-text-primary">dark mode first</span>, then verify light mode</li>
      </ul>

      {/* ── Color Tokens ─────────────────────────────────────── */}
      <Heading level={2} id="color-tokens">Color Tokens</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Colors are defined as CSS custom properties on <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">:root</span>.
        Always use these variables instead of hard-coded hex values. The variable prefix
        is <span className="font-mono text-xs">--color-</span>.
      </p>

      <Heading level={3} id="backgrounds">Backgrounds</Heading>
      <PropsTable
        columns={['CSS Variable', 'Dark', 'Light', 'Usage']}
        rows={[
          ['--color-bg-page', '#0C0C0C', '#F8FAFC', 'Main page background.'],
          ['--color-bg-sidebar', '#080808', '#FFFFFF', 'Sidebar background.'],
          ['--color-bg-card', '#0A0A0A', '#FFFFFF', 'Card and panel surfaces.'],
          ['--color-bg-elevated', '#141414', '#F1F5F9', 'Nested surfaces, input fields, hover rows.'],
        ]}
      />

      <Heading level={3} id="accent-status">Accent &amp; Status Colors</Heading>
      <PropsTable
        columns={['CSS Variable', 'Dark', 'Light', 'Usage']}
        rows={[
          ['--color-accent', '#00D9FF', '#0EA5E9', 'Primary brand accent. Buttons, links, active states.'],
          ['--color-accent-hover', '#00C4E6', '#0284C7', 'Hover state for accent elements.'],
          ['--color-green', '#059669', '#059669', 'Success states, active badges.'],
          ['--color-orange', '#FF8800', '#D97706', 'Warning states, pending badges.'],
          ['--color-red', '#FF4444', '#DC2626', 'Error states, destructive actions.'],
          ['--color-purple', '#8B5CF6', '#7C3AED', 'Role badges, category tags.'],
          ['--color-blue', '#2563EB', '#2563EB', 'Informational highlights.'],
          ['--color-gold', '#FFD700', '#D97706', 'Premium/VIP indicators.'],
        ]}
      />

      <Heading level={3} id="text-colors">Text Colors</Heading>
      <PropsTable
        columns={['CSS Variable', 'Dark', 'Light', 'Usage']}
        rows={[
          ['--color-text-primary', '#FFFFFF', '#0F172A', 'Headings, primary content.'],
          ['--color-text-secondary', '#8a8a8a', '#475569', 'Body text, descriptions.'],
          ['--color-text-muted', '#6a6a6a', '#94A3B8', 'Labels, placeholders, meta info.'],
          ['--color-text-placeholder', '#4a4a4a', '#CBD5E1', 'Input placeholders, disabled text.'],
        ]}
      />

      <Heading level={3} id="borders">Borders</Heading>
      <PropsTable
        columns={['CSS Variable', 'Dark', 'Light', 'Usage']}
        rows={[
          ['--color-border', '#2f2f2f', '#E2E8F0', 'Default borders for cards, inputs, dividers.'],
          ['--color-border-subtle', '#1A1A1A', '#F1F5F9', 'Subtle section separators, row borders.'],
        ]}
      />

      <Heading level={3} id="complete-reference">Complete Variable Reference</Heading>
      <CodeBlock language="css" title="All CSS variables available to plugins">
{`/* Backgrounds */
var(--color-bg-page)         /* Main page background */
var(--color-bg-sidebar)      /* Sidebar background */
var(--color-bg-card)         /* Card surfaces */
var(--color-bg-elevated)     /* Nested/elevated surfaces */

/* Accent & Status */
var(--color-accent)          /* Primary accent (cyan/sky) */
var(--color-accent-hover)    /* Accent hover state */
var(--color-green)           /* Success */
var(--color-orange)          /* Warning */
var(--color-red)             /* Error/destructive */
var(--color-purple)          /* Roles/categories */
var(--color-blue)            /* Informational */
var(--color-gold)            /* Premium/VIP */

/* Text */
var(--color-text-primary)    /* Headings, primary text */
var(--color-text-secondary)  /* Body text */
var(--color-text-muted)      /* Labels, meta */
var(--color-text-placeholder)/* Placeholders, disabled */

/* Borders */
var(--color-border)          /* Default borders */
var(--color-border-subtle)   /* Subtle separators */`}
      </CodeBlock>

      {/* ── Using Variables in Plugins ───────────────────────── */}
      <Heading level={2} id="plugin-usage">Using Variables in Plugins</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Since plugins are built independently from the host's Tailwind config, you must use
        inline <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">style</span> attributes
        for any CSS variable reference. A helper function makes this clean:
      </p>

      <CodeBlock language="tsx" title="Recommended pattern — helper function + inline styles">
{`// Helper to reference CSS variables concisely
const cv = (name: string) => \`var(--color-\${name})\`;

function MyCard({ title, value }) {
  return (
    <div
      className="rounded-[10px] p-5"
      style={{
        background: cv('bg-card'),
        border: \`1px solid \${cv('border')}\`,
      }}
    >
      <h3
        className="text-sm font-medium mb-2"
        style={{ color: cv('text-primary') }}
      >
        {title}
      </h3>
      <span
        className="text-2xl font-bold font-['Space_Grotesk']"
        style={{ color: cv('accent') }}
      >
        {value}
      </span>
    </div>
  );
}`}
      </CodeBlock>

      <Callout type="info" title="When Tailwind classes are safe">
        Tailwind utility classes that don't reference CSS variables work fine in
        plugins: <span className="font-mono text-xs">rounded-[10px]</span>, <span className="font-mono text-xs">p-5</span>, <span className="font-mono text-xs">flex</span>, <span className="font-mono text-xs">gap-4</span>, <span className="font-mono text-xs">grid grid-cols-4</span>, <span className="font-mono text-xs">text-sm</span>, <span className="font-mono text-xs">font-bold</span>, <span className="font-mono text-xs">animate-spin</span>, etc.
        Only color/background/border references need inline styles.
      </Callout>

      <CodeBlock language="tsx" title="Translucent backgrounds with color-mix()">
{`// For badges and hover states, use color-mix for dynamic transparency
function Badge({ label, color }) {
  return (
    <span
      className="text-[10px] font-semibold font-['JetBrains_Mono'] px-2 py-0.5 rounded"
      style={{
        color,
        background: \`color-mix(in srgb, \${color} 10%, transparent)\`,
      }}
    >
      {label}
    </span>
  );
}

// Usage
<Badge label="ACTIVE" color={cv('green')} />
<Badge label="PENDING" color={cv('orange')} />
<Badge label="ERROR" color={cv('red')} />`}
      </CodeBlock>

      <CodeBlock language="tsx" title="Interactive hover states with onMouseEnter/Leave">
{`// Since Tailwind hover: classes can't use CSS vars in plugins,
// use onMouseEnter/Leave for hover effects
<button
  className="p-1.5 rounded-md transition-all"
  style={{ color: cv('text-muted') }}
  onMouseEnter={(e) => {
    e.currentTarget.style.color = cv('green');
    e.currentTarget.style.background =
      \`color-mix(in srgb, \${cv('green')} 10%, transparent)\`;
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.color = cv('text-muted');
    e.currentTarget.style.background = 'transparent';
  }}
>
  <Check size={16} />
</button>`}
      </CodeBlock>

      {/* ── Typography ────────────────────────────────────────── */}
      <Heading level={2} id="typography">Typography</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        The Panel uses three font families, each serving a specific purpose.
      </p>
      <PropsTable
        columns={['Font Family', 'CSS Class', 'Usage']}
        rows={[
          ['Space Grotesk', "font-['Space_Grotesk']", 'Headings, display text, stats numbers, page titles.'],
          ['Inter', "font-['Inter']", 'Body text, descriptions, labels, form inputs, buttons.'],
          ['JetBrains Mono', "font-['JetBrains_Mono']", 'Code, API paths, badges, technical identifiers.'],
        ]}
      />

      <Heading level={3} id="font-sizes">Font Sizes</Heading>
      <PropsTable
        columns={['Class', 'Size', 'Usage']}
        rows={[
          ['text-[10px]', '10px', 'Badges, tiny labels.'],
          ['text-[11px]', '11px', 'Table headers (uppercase, tracking-wider).'],
          ['text-xs', '12px', 'Captions, helper text, meta info.'],
          ['text-sm', '14px', 'Body text, form labels, table cells (default).'],
          ['text-[18px]', '18px', 'Section headings.'],
          ['text-2xl', '24px', 'Stats numbers, card values.'],
          ['text-[28px]', '28px', 'Page titles.'],
          ['text-[32px]', '32px', 'Hero stats (Dashboard).'],
        ]}
      />

      {/* ── Spacing & Layout ──────────────────────────────────── */}
      <Heading level={2} id="spacing">Spacing &amp; Layout</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        All spacing follows a <span className="font-medium text-text-primary">4px base grid</span>.
      </p>
      <PropsTable
        columns={['Value', 'Usage']}
        rows={[
          ['gap-4 (16px)', 'Grid gaps between cards, stat blocks.'],
          ['p-5 (20px)', 'Standard card padding.'],
          ['px-8 (32px)', 'Page horizontal padding.'],
          ['py-6 (24px)', 'Page vertical padding.'],
          ['mb-6 (24px)', 'Major section bottom margin.'],
          ['rounded-[10px]', 'Card border radius.'],
          ['rounded-lg (8px)', 'Input and button border radius.'],
        ]}
      />

      {/* ── Component Patterns ────────────────────────────────── */}
      <Heading level={2} id="component-patterns">Component Patterns</Heading>

      <Heading level={3} id="stats-card">Stats Card</Heading>
      <CodeBlock language="tsx" title="Stats card — colored values matching Dashboard">
{`const cv = (name) => \`var(--color-\${name})\`;

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div
      className="rounded-[10px] p-5"
      style={{ background: cv('bg-card'), border: \`1px solid \${cv('border')}\` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} style={{ color }} />
        <span
          className="text-[13px] font-medium font-['Inter']"
          style={{ color: cv('text-secondary') }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-[32px] font-bold font-['Space_Grotesk'] leading-none"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

// Usage
<StatCard label="Total" value={42} icon={BarChart3} color={cv('accent')} />
<StatCard label="Pending" value={5} icon={Clock} color={cv('orange')} />`}
      </CodeBlock>

      <Heading level={3} id="tab-nav">Tab Navigation</Heading>
      <CodeBlock language="tsx" title="Tabs with active underline">
{`{tabs.map((tab) => (
  <button
    key={tab}
    onClick={() => setActive(tab)}
    className="pb-3 text-sm font-medium relative capitalize"
    style={{ color: active === tab ? cv('accent') : cv('text-muted') }}
  >
    {tab}
    {active === tab && (
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
        style={{ background: cv('accent') }}
      />
    )}
  </button>
))}`}
      </CodeBlock>

      <Heading level={3} id="data-table">Data Table</Heading>
      <CodeBlock language="tsx" title="Table with themed borders and hover rows">
{`<div
  className="rounded-[10px] overflow-hidden"
  style={{ background: cv('bg-card'), border: \`1px solid \${cv('border')}\` }}
>
  <table className="w-full">
    <thead>
      <tr style={{ borderBottom: \`1px solid \${cv('border')}\` }}>
        <th
          className="text-left text-[11px] font-semibold uppercase
                     tracking-[0.5px] font-['JetBrains_Mono'] px-5 py-3"
          style={{ color: cv('text-muted') }}
        >
          Column
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        style={{ borderBottom: \`1px solid \${cv('border-subtle')}\` }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            \`color-mix(in srgb, \${cv('bg-elevated')} 50%, transparent)\`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <td className="px-5 py-3 text-sm" style={{ color: cv('text-primary') }}>
          Cell value
        </td>
      </tr>
    </tbody>
  </table>
</div>`}
      </CodeBlock>

      <Heading level={3} id="form-inputs">Form Inputs</Heading>
      <CodeBlock language="tsx" title="Themed input fields">
{`const inputStyle = {
  width: '100%',
  height: 40,
  padding: '0 14px',
  background: cv('bg-elevated'),
  border: \`1px solid \${cv('border')}\`,
  borderRadius: 8,
  fontSize: 14,
  color: cv('text-primary'),
  outline: 'none',
  fontFamily: "'JetBrains Mono', monospace",
};

<div>
  <label style={{ display: 'block', fontSize: 12, color: cv('text-muted'), marginBottom: 6 }}>
    API Key
  </label>
  <input type="text" placeholder="Enter key" style={inputStyle} />
</div>`}
      </CodeBlock>

      <Heading level={3} id="buttons">Buttons</Heading>
      <CodeBlock language="tsx" title="Primary and secondary buttons">
{`{/* Primary button — accent background */}
<button
  className="inline-flex items-center gap-1.5 px-4 py-1.5
             text-black text-xs font-medium rounded-md
             hover:opacity-90 disabled:opacity-30"
  style={{ background: cv('accent') }}
>
  <Save size={12} /> Save
</button>

{/* Secondary button — outlined */}
<button
  className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
  style={{ color: cv('text-secondary'), border: \`1px solid \${cv('border')}\` }}
>
  Cancel
</button>

{/* Accent ghost button */}
<button
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
             text-xs font-medium transition-colors"
  style={{
    color: cv('accent'),
    background: \`color-mix(in srgb, \${cv('accent')} 10%, transparent)\`,
  }}
>
  <Plus size={14} /> Add Item
</button>`}
      </CodeBlock>

      <Heading level={3} id="status-badges">Status Badges</Heading>
      <CodeBlock language="tsx" title="Badge with color-mix transparency">
{`function Badge({ label, color }) {
  return (
    <span
      className="text-[10px] font-semibold font-['JetBrains_Mono'] px-2 py-0.5 rounded"
      style={{
        color,
        background: \`color-mix(in srgb, \${color} 10%, transparent)\`,
      }}
    >
      {label}
    </span>
  );
}

// Usage
<Badge label="ACTIVE" color="var(--color-green)" />
<Badge label="PENDING" color="var(--color-orange)" />
<Badge label="REJECTED" color="var(--color-red)" />
<Badge label="MOVIE" color="var(--color-purple)" />`}
      </CodeBlock>

      <Heading level={3} id="empty-states">Empty States</Heading>
      <CodeBlock language="tsx" title="Empty state with icon">
{`<div style={cardStyle} className="text-center py-8">
  <Film size={40} className="mx-auto mb-3" style={{ color: cv('text-placeholder') }} />
  <p className="text-sm" style={{ color: cv('text-muted') }}>
    No requests found
  </p>
</div>`}
      </CodeBlock>

      {/* ── Do's and Don'ts ───────────────────────────────────── */}
      <Heading level={2} id="dos-and-donts">{"Do's and Don'ts"}</Heading>

      <Heading level={3} id="dos">Do</Heading>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li><span className="font-medium text-status-success">Do</span> use <span className="font-mono text-xs">var(--color-*)</span> CSS variables for all colors.</li>
        <li><span className="font-medium text-status-success">Do</span> use inline <span className="font-mono text-xs">style={'{{}}'}</span> for CSS variable references, not Tailwind className.</li>
        <li><span className="font-medium text-status-success">Do</span> use <span className="font-mono text-xs">color-mix(in srgb, color 10%, transparent)</span> for translucent badge backgrounds.</li>
        <li><span className="font-medium text-status-success">Do</span> test your plugin in both Dark and Light themes.</li>
        <li><span className="font-medium text-status-success">Do</span> use 10px border radius for cards, 8px for inputs and buttons.</li>
        <li><span className="font-medium text-status-success">Do</span> provide loading spinners and empty states.</li>
        <li><span className="font-medium text-status-success">Do</span> use <span className="font-mono text-xs">onMouseEnter/Leave</span> for hover color effects (since Tailwind hover: can't use CSS vars).</li>
      </ul>

      <Heading level={3} id="donts">{"Don't"}</Heading>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li><span className="font-medium text-status-error">{"Don't"}</span> use hard-coded hex colors. Always reference CSS variables.</li>
        <li><span className="font-medium text-status-error">{"Don't"}</span> use <span className="font-mono text-xs">className="bg-[var(--color-*)]"</span> — it doesn't render correctly in plugins.</li>
        <li><span className="font-medium text-status-error">{"Don't"}</span> use custom fonts outside Space Grotesk, Inter, and JetBrains Mono.</li>
        <li><span className="font-medium text-status-error">{"Don't"}</span> override the Panel's global CSS or inject styles that affect elements outside your plugin.</li>
        <li><span className="font-medium text-status-error">{"Don't"}</span> use <span className="font-mono text-xs">alert()</span> or <span className="font-mono text-xs">confirm()</span> dialogs.</li>
        <li><span className="font-medium text-status-error">{"Don't"}</span> show raw error messages or stack traces to end users.</li>
      </ul>

      {/* ── Theme Notes ────────────────────────────────────────── */}
      <Heading level={2} id="theme-notes">Theme Notes</Heading>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li>
          <span className="font-medium text-text-primary">CSS variables handle theming</span> — All
          tokens switch values automatically. Use them consistently and your plugin themes correctly.
        </li>
        <li>
          <span className="font-medium text-text-primary">Light mode glass morphism</span> — The
          Panel uses <span className="font-mono text-xs">backdrop-blur</span> and <span className="font-mono text-xs">color-mix</span> for
          frosted glass effects in Light mode. Plugins can adopt this style but it's not required.
        </li>
        <li>
          <span className="font-medium text-text-primary">Button text on accent</span> — Use <span className="font-mono text-xs">text-black</span> on
          accent-colored buttons. This provides proper contrast in both themes.
        </li>
        <li>
          <span className="font-medium text-text-primary">Image backgrounds</span> — Avoid images
          with hard white backgrounds. Use PNGs with transparency or SVGs.
        </li>
      </ul>

      <Callout type="warning" title="Hard-coded colors break theming">
        If you hard-code a dark background color like <span className="font-mono text-xs">#0A0A0A</span> instead
        of using <span className="font-mono text-xs">var(--color-bg-card)</span>, your plugin will
        look broken in light mode. Always use the CSS custom properties.
      </Callout>

      <Callout type="info" title="Plugin SDK changelog">
        The design system evolves with the Panel. Check the{' '}
        <a href="https://github.com/fxxkrlab/ACP_PLUGIN_SDK" className="text-accent-primary hover:underline">ACP Plugin SDK</a> changelog
        for updates to design tokens and patterns. Current SDK version: <span className="font-mono text-xs font-medium">v0.2.1</span>.
      </Callout>
    </div>
  );
}
