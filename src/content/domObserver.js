import { extractChatInfo } from "./utils.js";
import { isMainChatMenu, injectPinElement } from "./features/menuHandler.js";

const OPTIONS_BUTTON_SELECTOR =
  'li[data-testid^="history-item-"] button, a[href^="/g/"] button';
const OPTIONS_ICON_PATH_START = "M3 12C3"; // Path data for the '...' icon

let menuObserver = null;
let menuObserverTimeout = null;

function tryImmediateInjection(chatId, chatName) {
  try {
    const menus = document.querySelectorAll(
      '[data-radix-popper-content-wrapper] [role="menu"][data-radix-menu-content][data-state="open"], body > [role="menu"][data-radix-menu-content][data-state="open"]'
    );
    for (const menu of menus) {
      if (
        isMainChatMenu(menu) &&
        !menu.querySelector(".chatgpt-pinner-item") // Check if not already injected
      ) {
        injectPinElement(menu, chatId, chatName);
        return true; // Injected
      }
    }
    return false; // Not injected
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error in tryImmediateInjection: ${e.message}`,
      e
    );
    return false;
  }
}

function observeMenuAddition(chatId, chatName) {
  const disconnectMenuObserver = () => {
    if (menuObserver) {
      menuObserver.disconnect();
      menuObserver = null;
    }
    if (menuObserverTimeout) {
      clearTimeout(menuObserverTimeout);
      menuObserverTimeout = null;
    }
  };

  try {
    menuObserver = new MutationObserver((mutationsList) => {
      let injected = false;
      for (const mutation of mutationsList) {
        if (injected) break;
        if (mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (injected) break;
            if (node.nodeType === Node.ELEMENT_NODE) {
              let menuElement = null;
              if (
                node.matches(
                  '[role="menu"][data-radix-menu-content][data-state="open"]'
                )
              ) {
                menuElement = node;
              } else if (node.querySelector) {
                menuElement = node.querySelector(
                  '[role="menu"][data-radix-menu-content][data-state="open"]'
                );
              }

              if (menuElement && isMainChatMenu(menuElement)) {
                if (!menuElement.querySelector(".chatgpt-pinner-item")) {
                  // Check before injecting
                  injectPinElement(menuElement, chatId, chatName);
                  injected = true;
                }
                disconnectMenuObserver(); // Disconnect after finding and processing the menu
                break;
              }
            }
          }
        }
      }
    });

    // Observe the body and the popper wrapper if it exists for broader menu detection
    menuObserver.observe(document.body, { childList: true, subtree: false }); // Observe direct children of body
    const popperWrapperParent = document.querySelector(
      "[data-radix-popper-content-wrapper]"
    )?.parentNode;
    if (popperWrapperParent && popperWrapperParent !== document.body) {
      menuObserver.observe(popperWrapperParent, {
        childList: true,
        subtree: true,
      });
    }

    menuObserverTimeout = setTimeout(() => {
      console.log("ChatGPT Pinner: Menu observation timed out.");
      disconnectMenuObserver();
    }, 1500); // Timeout for observing the menu
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error setting up observeMenuAddition: ${e.message}`,
      e
    );
    disconnectMenuObserver();
  }
}

function handleOptionsButtonClick(event) {
  try {
    const button = event.currentTarget;
    // Check if the click is on a valid options button context
    const triggerSpan = button.closest("span[data-state]"); // Common pattern for radix UI triggers
    const listItem = button.closest('li[data-testid^="history-item-"]');
    const projectLink = button.closest('a[href^="/g/"]'); // For project pages

    if (!triggerSpan && !listItem && !projectLink) {
      // console.log("ChatGPT Pinner: Click not on a recognized options button context.", button);
      return;
    }

    setTimeout(() => {
      // Delay to allow menu to render
      const chatInfo = extractChatInfo(button);
      if (!chatInfo || !chatInfo.chatId || !chatInfo.chatName) {
        console.warn(
          "ChatGPT Pinner: Could not extract chat info from button.",
          button
        );
        return;
      }
      const { chatId, chatName } = chatInfo;

      if (!tryImmediateInjection(chatId, chatName)) {
        observeMenuAddition(chatId, chatName);
      }
    }, 50); // 50ms delay, adjust if necessary
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error in handleOptionsButtonClick: ${e.message}`,
      e
    );
  }
}

function initialScanForOptionsButtons() {
  try {
    console.log("ChatGPT Pinner: Performing initial scan for options buttons.");
    document.querySelectorAll(OPTIONS_BUTTON_SELECTOR).forEach((button) => {
      const isOptionsButton =
        button.querySelector(`svg path[d^="${OPTIONS_ICON_PATH_START}"]`) ||
        button.closest("span[data-state]"); // Check for icon or Radix state attribute

      if (
        isOptionsButton &&
        !button.hasAttribute("data-pinner-listener-added")
      ) {
        button.addEventListener("click", handleOptionsButtonClick);
        button.setAttribute("data-pinner-listener-added", "true");
      }
    });
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error during initialScanForOptionsButtons: ${e.message}`,
      e
    );
  }
}

const mainPageObserver = new MutationObserver((mutations) => {
  try {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node itself is an options button
          if (node.matches(OPTIONS_BUTTON_SELECTOR)) {
            const isOptionsButton =
              node.querySelector(`svg path[d^="${OPTIONS_ICON_PATH_START}"]`) ||
              node.closest("span[data-state]");
            if (
              isOptionsButton &&
              !node.hasAttribute("data-pinner-listener-added")
            ) {
              node.addEventListener("click", handleOptionsButtonClick);
              node.setAttribute("data-pinner-listener-added", "true");
            }
          }
          // Check for options buttons within the added node
          const potentialButtons = node.querySelectorAll?.(
            OPTIONS_BUTTON_SELECTOR
          );
          if (potentialButtons && potentialButtons.length > 0) {
            potentialButtons.forEach((button) => {
              const isOptionsButton =
                button.querySelector(
                  `svg path[d^="${OPTIONS_ICON_PATH_START}"]`
                ) || button.closest("span[data-state]");
              if (
                isOptionsButton &&
                !button.hasAttribute("data-pinner-listener-added")
              ) {
                button.addEventListener("click", handleOptionsButtonClick);
                button.setAttribute("data-pinner-listener-added", "true");
              }
            });
          }
        }
      });
    });
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error in mainPageObserver callback: ${e.message}`,
      e
    );
  }
});

export function startObserversAndScan() {
  try {
    initialScanForOptionsButtons();
    mainPageObserver.observe(document.body, { childList: true, subtree: true });
    console.log(
      "ChatGPT Pinner: Main observer started and initial scan complete."
    );
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Failed to start mainPageObserver or initial scan: ${e.message}`,
      e
    );
  }
}
