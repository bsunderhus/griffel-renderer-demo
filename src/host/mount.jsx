import React, { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { makeResetStyles, makeStyles, mergeClasses, RendererProvider } from "@griffel/react";
import { resolveHostContract } from "./contract.js";
import { createHostRenderer } from "./renderer.js";
import { installHostPolicy } from "./policy.js";

const useBase = makeResetStyles({ backgroundColor: "#e8a33d" });
const useOverrides = makeStyles({ root: { backgroundColor: "#b7e4c7" } });

export function createHostModule(HostControls) {
  function Host({ ownerDocument }) {
    const base = useBase();
    const overrides = useOverrides();
    return <HostControls avatarClassName={mergeClasses(base, overrides.root)} ownerDocument={ownerDocument} />;
  }

  return {
    mount(container, options) {
      const ownerDocument = container.ownerDocument;
      const settings = typeof options === "boolean" ? { extracted: options } : options;
      const contract = resolveHostContract(settings, process.env.NODE_ENV);
      let policy;
      function activatePolicy() {
        if (contract.shouldInstall && !policy) {
          policy = installHostPolicy(ownerDocument, contract.effectivePolicy);
        }
      }
      function HostProvider({ children }) {
        useLayoutEffect(() => {
          if (contract.contract === "production-extraction") activatePolicy();
        }, []);
        return <RendererProvider renderer={renderer} targetDocument={ownerDocument}>{children}</RendererProvider>;
      }
      let runtimeCalls = 0;
      const renderer = createHostRenderer(ownerDocument, contract.renderer);
      const insert = renderer.insertCSSRules.bind(renderer);
      renderer.insertCSSRules = rules => {
        runtimeCalls++;
        if (settings.extracted && contract.contract === "diagnostic") {
          throw new Error("Extracted host unexpectedly attempted runtime insertion");
        }
        insert(rules);
      };
      const root = createRoot(container);
      try {
        flushSync(() => root.render(<HostProvider><Host ownerDocument={ownerDocument} /></HostProvider>));
      } catch (error) {
        policy?.();
        flushSync(() => root.unmount());
        throw error;
      }
      let unmounted = false;
      const unmount = () => {
        if (!unmounted) {
          unmounted = true;
          flushSync(() => root.unmount());
        }
      };
      return {
        renderer,
        contract,
        policyState: () => ({ ...contract, installed: Boolean(policy) }),
        beginIntegrations: activatePolicy,
        subscribeInsertions: listener => {
          if (!policy) throw new Error("Insertion policy is not installed");
          return policy.subscribe(listener);
        },
        runtimeCalls: () => runtimeCalls,
        unmount,
        dispose: () => {
          policy?.();
          policy = undefined;
          unmount();
        },
      };
    },
  };
}
