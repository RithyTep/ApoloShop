"use client";

import { ComponentType, lazy, LazyExoticComponent } from "react";

// ============================================
// TYPES
// ============================================

/**
 * Base props that all registered components should accept
 */
export interface BaseComponentProps {
  language: "EN" | "KH";
  currency?: "USD" | "KHR";
}

/**
 * Component registration entry
 */
export interface ComponentRegistration<P extends BaseComponentProps = BaseComponentProps> {
  /** Unique identifier for the component */
  id: string;
  /** Human-readable name for display in admin UI */
  name: string;
  /** The component itself (can be lazy-loaded) */
  component: ComponentType<P> | LazyExoticComponent<ComponentType<P>>;
  /** Whether this component is enabled by default for new clients */
  defaultEnabled: boolean;
  /** Optional category for grouping in admin UI */
  category?: "layout" | "content" | "commerce" | "social" | "utility";
  /** Optional description for admin UI */
  description?: string;
}

/**
 * Component state for a specific shop/client
 */
export interface ComponentState {
  /** Component ID */
  id: string;
  /** Whether this component is enabled for the client */
  enabled: boolean;
  /** Optional order for rendering (lower = earlier) */
  order?: number;
  /** Optional component-specific config */
  config?: Record<string, unknown>;
}

/**
 * Registry configuration that can be stored per client
 */
export interface ComponentRegistryConfig {
  /** Map of component ID to enabled state and config */
  components: Record<string, ComponentState>;
  /** Version for migration purposes */
  version: number;
}

// ============================================
// REGISTRY
// ============================================

// Internal storage for registered components
const registry = new Map<string, ComponentRegistration>();

/**
 * Register a component with the registry
 * @param registration Component registration details
 * @throws Error if component with same ID already exists
 */
export function registerComponent<P extends BaseComponentProps>(
  registration: ComponentRegistration<P>
): void {
  if (registry.has(registration.id)) {
    console.warn(
      `[ComponentRegistry] Component with id "${registration.id}" is already registered. Skipping duplicate registration.`
    );
    return;
  }
  registry.set(registration.id, registration as ComponentRegistration);
}

/**
 * Get a registered component by ID
 * @param id Component identifier
 * @returns Component registration or undefined if not found
 */
export function getComponent(id: string): ComponentRegistration | undefined {
  return registry.get(id);
}

/**
 * Get all registered components
 * @returns Array of all component registrations
 */
export function getAllComponents(): ComponentRegistration[] {
  return Array.from(registry.values());
}

/**
 * Get all components in a specific category
 * @param category Component category
 * @returns Array of component registrations in the category
 */
export function getComponentsByCategory(
  category: ComponentRegistration["category"]
): ComponentRegistration[] {
  return getAllComponents().filter((c) => c.category === category);
}

/**
 * Check if a component is registered
 * @param id Component identifier
 * @returns true if component exists
 */
export function hasComponent(id: string): boolean {
  return registry.has(id);
}

/**
 * Unregister a component (useful for testing)
 * @param id Component identifier
 * @returns true if component was removed
 */
export function unregisterComponent(id: string): boolean {
  return registry.delete(id);
}

/**
 * Clear all registered components (useful for testing)
 */
export function clearRegistry(): void {
  registry.clear();
}

// ============================================
// LAZY LOADING HELPERS
// ============================================

/**
 * Create a lazy-loaded component registration
 * @param id Component identifier
 * @param name Display name
 * @param loader Dynamic import function
 * @param options Additional registration options
 */
export function registerLazyComponent<P extends BaseComponentProps>(
  id: string,
  name: string,
  loader: () => Promise<{ default: ComponentType<P> }>,
  options: Omit<ComponentRegistration<P>, "id" | "name" | "component"> = { defaultEnabled: true }
): void {
  const LazyComponent = lazy(loader);
  registerComponent({
    id,
    name,
    component: LazyComponent,
    ...options,
  });
}

// ============================================
// CONFIG HELPERS
// ============================================

/**
 * Get default configuration for all registered components
 * @returns Default component registry config
 */
export function getDefaultConfig(): ComponentRegistryConfig {
  const components: Record<string, ComponentState> = {};
  let order = 0;

  for (const registration of registry.values()) {
    components[registration.id] = {
      id: registration.id,
      enabled: registration.defaultEnabled,
      order: order++,
    };
  }

  return {
    components,
    version: 1,
  };
}

/**
 * Get enabled components based on a configuration
 * @param config Component registry config
 * @returns Array of enabled component registrations sorted by order
 */
export function getEnabledComponents(
  config: ComponentRegistryConfig
): ComponentRegistration[] {
  const enabled: { registration: ComponentRegistration; order: number }[] = [];

  for (const [id, state] of Object.entries(config.components)) {
    if (state.enabled) {
      const registration = registry.get(id);
      if (registration) {
        enabled.push({
          registration,
          order: state.order ?? Infinity,
        });
      }
    }
  }

  return enabled
    .sort((a, b) => a.order - b.order)
    .map((e) => e.registration);
}

/**
 * Merge saved config with registered components to handle new components
 * @param savedConfig Previously saved configuration
 * @returns Merged configuration with any new components added
 */
export function mergeWithDefaults(
  savedConfig: Partial<ComponentRegistryConfig>
): ComponentRegistryConfig {
  const defaultConfig = getDefaultConfig();

  return {
    version: savedConfig.version ?? defaultConfig.version,
    components: {
      ...defaultConfig.components,
      ...savedConfig.components,
    },
  };
}
