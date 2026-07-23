import Heading from '../components/Heading';
import Callout from '../components/Callout';
import CodeBlock from '../components/CodeBlock';

export default function GettingStarted() {
  return (
    <div>
      <Heading level={1} id="welcome">Welcome to ACP Market</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        ACP Market is the official plugin marketplace for the ADMINCHAT Panel ecosystem. It provides
        a centralized hub where administrators can discover, install, and manage plugins that extend
        the capabilities of their ADMINCHAT Panel deployment. Whether you need advanced bot handlers,
        custom API integrations, frontend pages, or scheduled tasks, ACP Market makes it easy to
        find and deploy community-built and officially verified solutions.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        For plugin developers, ACP Market offers a streamlined publishing pipeline with automated
        validation, version management, and distribution to thousands of ADMINCHAT Panel installations
        worldwide.
      </p>

      <Heading level={2} id="browse-install">Browse &amp; Install Plugins</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Finding the right plugin is straightforward. ACP Market provides several ways to discover
        plugins that suit your needs:
      </p>

      <Heading level={3} id="searching">Searching the Marketplace</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Use the search bar on the marketplace homepage to find plugins by name, description, or
        keyword. You can refine results with the following filters:
      </p>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li><span className="font-medium text-text-primary">Category</span> — Filter by plugin type such as Bot Handlers, API Extensions, Frontend Pages, Utilities, and more.</li>
        <li><span className="font-medium text-text-primary">Pricing</span> — Choose between free and paid plugins to match your budget.</li>
        <li><span className="font-medium text-text-primary">Sort Order</span> — Sort results by newest, most downloaded, highest rated, or recently updated.</li>
        <li><span className="font-medium text-text-primary">Panel Compatibility</span> — Automatically filter plugins compatible with your installed ADMINCHAT Panel version.</li>
      </ul>

      <Heading level={3} id="plugin-details">Viewing Plugin Details</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Click on any plugin card to view its detail page. Here you will find:
      </p>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li>A full description with feature highlights and screenshots</li>
        <li>Version history and changelogs</li>
        <li>Required permissions and capabilities</li>
        <li>Compatibility information (minimum Panel version)</li>
        <li>Author details and support links</li>
        <li>Download count and community ratings</li>
      </ul>

      <Heading level={3} id="installing">Installing a Plugin</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        To install a plugin from ACP Market:
      </p>
      <ol className="text-sm text-text-secondary leading-relaxed mb-4 list-decimal list-inside space-y-1.5 ml-2">
        <li>Navigate to the plugin detail page.</li>
        <li>Review the required permissions and capabilities listed on the page.</li>
        <li>Click the <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">Install</span> button.</li>
        <li>If prompted, approve the requested permissions in the confirmation dialog.</li>
        <li>The plugin will be downloaded and installed automatically. You will see a success notification once installation is complete.</li>
      </ol>

      <Callout type="info" title="Paid Plugins">
        For paid plugins, you will be prompted to complete a purchase or activate a license key
        before the download begins. Your license is tied to your account and can be managed in
        the Account Settings page.
      </Callout>

      <Heading level={2} id="managing-plugins">Managing Installed Plugins</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Once you have plugins installed, managing them is done through the ADMINCHAT Panel
        admin dashboard. ACP Market integrates directly with your Panel to provide a seamless
        management experience.
      </p>

      <Heading level={3} id="updates">Checking for Updates</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        ACP Market periodically checks for plugin updates. When a new version is available,
        you will see a notification badge on the plugin card. You can also manually trigger
        an update check from the installed plugins view.
      </p>
      <CodeBlock language="bash" title="CLI update check">
        {`# Check for updates to all installed plugins\nacp plugins check-updates\n\n# Update a specific plugin\nacp plugins update hello-world\n\n# Update all plugins\nacp plugins update --all`}
      </CodeBlock>

      <Heading level={3} id="enable-disable">Enabling and Disabling Plugins</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        You can temporarily disable a plugin without uninstalling it. This is useful for
        troubleshooting or when you want to reduce resource usage. A disabled plugin retains
        its configuration and data, but its handlers, routes, and scheduled tasks will not run.
      </p>

      <Heading level={3} id="uninstalling">Uninstalling Plugins</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        To remove a plugin completely, navigate to the installed plugins view in your Panel
        dashboard and click the <span className="font-mono text-xs bg-bg-gray px-1.5 py-0.5 rounded">Uninstall</span> button.
        This will remove the plugin files, configuration, and optionally its stored data.
      </p>
      <Callout type="warning" title="Data Retention">
        By default, uninstalling a plugin will prompt you to choose whether to keep or
        delete its stored data. If you plan to reinstall the plugin later, keeping the data
        allows you to pick up where you left off.
      </Callout>

      <Heading level={2} id="for-developers">For Developers</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Interested in building plugins for the ADMINCHAT Panel ecosystem? ACP Market provides
        a complete developer toolkit including the ACP CLI, plugin SDK, and publishing pipeline.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        Head over to the <a href="#/docs/quick-start" className="text-primary hover:underline font-medium">Quick Start Guide</a> to
        scaffold your first plugin in under five minutes. You can also explore the{' '}
        <a href="#/docs/plugin-manifest" className="text-primary hover:underline font-medium">Plugin Manifest Reference</a> for
        a deep dive into the manifest.json specification, and the{' '}
        <a href="#/docs/api-reference" className="text-primary hover:underline font-medium">API Reference</a> to
        understand how your plugin can interact with the marketplace programmatically.
      </p>
      <CodeBlock language="bash" title="Scaffold a new plugin in seconds">
        {`npm install -g @acp/cli\nacp create-plugin my-awesome-plugin\ncd my-awesome-plugin\nacp dev`}
      </CodeBlock>

      <Heading level={2} id="support-community">Support &amp; Community</Heading>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        If you run into issues or have questions, the ACP community is here to help:
      </p>
      <ul className="text-sm text-text-secondary leading-relaxed mb-4 list-disc list-inside space-y-1.5 ml-2">
        <li><span className="font-medium text-text-primary">GitHub Issues</span> — Report bugs or request features on the ACP Market GitHub repository.</li>
        <li><span className="font-medium text-text-primary">Community Discord</span> — Join the ADMINCHAT community Discord server for real-time help and discussions with other users and developers.</li>
        <li><span className="font-medium text-text-primary">Documentation</span> — This docs site is continuously updated with guides, references, and tutorials.</li>
        <li><span className="font-medium text-text-primary">Email Support</span> — For account or billing issues, reach out to support@adminchat.dev.</li>
      </ul>
      <Callout type="info" title="Contributing">
        ACP Market is open source. Contributions to the marketplace itself, the documentation,
        and the plugin SDK are welcome. Check the contributing guide on GitHub to get started.
      </Callout>
    </div>
  );
}
