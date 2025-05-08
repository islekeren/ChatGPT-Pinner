export function extractIdFromHref(href) {
  try {
    if (!href) return null;
    const pathSegments = href.split("/");
    if (
      pathSegments.length >= 3 &&
      pathSegments[pathSegments.length - 2] === "c"
    ) {
      const potentialId = pathSegments[pathSegments.length - 1];
      if (potentialId.match(/^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$/i)) {
        return potentialId;
      }
    }
    if (
      pathSegments.length >= 3 &&
      pathSegments[pathSegments.length - 2] === "g"
    ) {
      const potentialId = pathSegments[pathSegments.length - 1];
      if (
        potentialId.match(/^g-[a-zA-Z0-9-]+$/i) ||
        potentialId.match(/^g-p-[a-f0-9]{32}$/i)
      ) {
        return potentialId;
      }
    }
    if (
      pathSegments.length >= 4 &&
      pathSegments[pathSegments.length - 3] === "g" &&
      pathSegments[pathSegments.length - 1] === "project"
    ) {
      const potentialId = pathSegments[pathSegments.length - 2];
      if (potentialId.match(/^g-p-[a-f0-9]{32}$/i)) {
        return potentialId;
      }
    }
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (
      lastSegment.match(/^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$/i) ||
      lastSegment.match(/^g-p-[a-f0-9]{32}$/i) ||
      lastSegment.match(/^g-[a-zA-Z0-9]+$/i)
    ) {
      return lastSegment;
    }
    console.warn("ChatGPT Pinner: Could not match known ID pattern in:", href);
    return null;
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error in extractIdFromHref: ${e.message}`,
      e
    );
    return null;
  }
}

export function extractChatInfo(button) {
  try {
    const listItem = button.closest('li[data-testid^="history-item-"]');
    if (!listItem) {
      const containerDiv = button.closest(
        ".no-draggable.group.rounded-lg.active\\:opacity-90, div[class*='relative flex items-center']"
      );
      if (containerDiv) {
        const linkElement = containerDiv.querySelector("a");
        const nameElement =
          containerDiv.querySelector("div.text-token-text-primary.grow") ||
          containerDiv.querySelector(
            "div.relative.grow.overflow-hidden.whitespace-nowrap[dir='auto'][title]"
          ) ||
          containerDiv.querySelector(
            "div.relative.grow.overflow-hidden.whitespace-nowrap[dir='auto']"
          );

        if (linkElement && nameElement) {
          const href = linkElement.getAttribute("href");
          const chatName =
            nameElement.getAttribute("title") || nameElement.textContent.trim();
          const chatId = extractIdFromHref(href);

          if (!chatId) {
            console.warn(
              "ChatGPT Pinner: Could not extract ID from href (container):",
              href
            );
            return null;
          }
          console.log(
            `ChatGPT Pinner: Extracted (container) Chat/Project ID: ${chatId}, Name: ${chatName}`
          );
          return { chatId, chatName };
        }
      }
      console.error(
        "ChatGPT Pinner: Could not find parent list item or suitable container for button."
      );
      return null;
    }
    const linkElement = listItem.querySelector(
      'a[data-history-item-link="true"]'
    );
    let nameElement = listItem.querySelector("div[title]");
    let chatName = nameElement ? nameElement.getAttribute("title") : null;
    if (!nameElement || !chatName) {
      nameElement = listItem.querySelector(
        "div.relative.grow.overflow-hidden.whitespace-nowrap[dir='auto']"
      );
      if (nameElement) {
        chatName = nameElement.textContent.trim();
      }
    }
    if (linkElement && nameElement && chatName) {
      const href = linkElement.getAttribute("href");
      const chatId = extractIdFromHref(href);
      if (!chatId) {
        console.warn(
          "ChatGPT Pinner: Could not extract ID from href (list item):",
          href
        );
        return null;
      }
      return { chatId, chatName };
    } else {
      console.error(
        "ChatGPT Pinner: Could not find link or name element within list item.",
        listItem
      );
    }
    return null;
  } catch (e) {
    console.error(`ChatGPT Pinner: Error in extractChatInfo: ${e.message}`, e);
    return null;
  }
}

export function createMenuOption(text, svgContent, className) {
  try {
    const element = document.createElement("div");
    element.className = `${className} flex items-center m-1.5 p-2.5 text-sm cursor-pointer focus-visible:outline-0 radix-disabled:pointer-events-none radix-disabled:opacity-50 group relative hover:bg-[#f5f5f5] focus-visible:bg-[#f5f5f5] dark:hover:bg-token-main-surface-secondary dark:focus-visible:bg-token-main-surface-secondary rounded-md my-0 px-3 mx-2 gap-2.5 py-3`;
    element.setAttribute("role", "menuitem");
    element.tabIndex = -1;
    element.setAttribute("data-orientation", "vertical");
    element.setAttribute("data-radix-collection-item", "");
    const iconContainer = document.createElement("div");
    iconContainer.className =
      "flex items-center justify-center text-token-text-secondary h-5 w-5";
    iconContainer.innerHTML = svgContent;
    const textNode = document.createTextNode(text);
    element.appendChild(iconContainer);
    element.appendChild(textNode);
    return element;
  } catch (e) {
    console.error(`ChatGPT Pinner: Error in createMenuOption: ${e.message}`, e);
    const errorElement = document.createElement("div");
    errorElement.textContent = "Error creating option";
    errorElement.style.color = "red";
    return errorElement;
  }
}

export function closeMenu(menuElement) {
  try {
    console.log(
      "[Pinner] Attempting to close menu via Escape key dispatch:",
      menuElement
    );
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true,
      })
    );
  } catch (e) {
    console.error(`ChatGPT Pinner: Error in closeMenu: ${e.message}`, e);
  }
}

export function showNotification(message, type = "success") {
  try {
    const n = document.createElement("div");
    n.textContent = message;
    let bg = "#10a37f";
    if (type === "error") bg = "#e53e3e";
    else if (type === "bookmark") bg = "#1a73e8";
    n.style.cssText = `position: fixed; bottom: 20px; right: 20px; background-color: ${bg}; color: white; padding: 10px 16px; border-radius: 8px; font-size: 14px; font-family: inherit; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); opacity: 0; transform: translateY(10px); transition: opacity 0.3s ease, transform 0.3s ease; pointer-events: none;`;
    document.body.appendChild(n);
    setTimeout(() => {
      n.style.opacity = "1";
      n.style.transform = "translateY(0)";
    }, 10);
    setTimeout(() => {
      n.style.opacity = "0";
      n.style.transform = "translateY(10px)";
      setTimeout(() => {
        if (n.parentNode) n.parentNode.removeChild(n);
      }, 300);
    }, 3000);
  } catch (e) {
    console.error(`ChatGPT Pinner: Error in showNotification: ${e.message}`, e);
    alert(`${type.toUpperCase()}: ${message}`);
  }
}

export function waitForElement(selector, timeout = 7000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error("Timeout waiting for " + selector));
    }, timeout);
  });
}
