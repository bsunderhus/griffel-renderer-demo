import React, { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { RendererProvider } from "@griffel/react";
import { resolveHostContract } from "./contract.js";
import { createHostRenderer } from "./renderer.js";
import { installHostPolicy } from "./policy.js";

export function createHostModule(HostControls) {
  return {
    mount(container, options) {
      const ownerDocument = container.ownerDocument;
      const contract = resolveHostContract(options, process.env.NODE_ENV);
      let policy;
      function activatePolicy() {
        if (contract.shouldInstall && !policy) {
          policy = installHostPolicy(ownerDocument, contract.effectivePolicy);
        }
      }
      function HostProvider({ children }) {
        useLayoutEffect(() => {
          activatePolicy();
        }, []);
        return (
          <RendererProvider renderer={renderer} targetDocument={ownerDocument}>
            {children}
          </RendererProvider>
        );
      }
      let runtimeCalls = 0;
      const renderer = createHostRenderer(ownerDocument, contract.renderer);
      const insert = renderer.insertCSSRules.bind(renderer);
      renderer.insertCSSRules = (rules) => {
        runtimeCalls++;
        insert(rules);
      };
      const root = createRoot(container);
      try {
        flushSync(() =>
          root.render(
            <HostProvider>
              <HostControls ownerDocument={ownerDocument} />
            </HostProvider>,
          ),
        );
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
        subscribeInsertions: (listener) => {
          if (!policy) {
            throw new Error("Insertion policy is not installed");
          }
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
