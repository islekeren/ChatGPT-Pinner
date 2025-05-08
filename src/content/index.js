function initializePinner() {
  try {
    console.log("ChatGPT Pinner: Initializing... with error handling");

    // --- Icon Path Snippets (for identification) ---
    const ICON_PATHS = {
      SHARE: "M11.2929 3.29289C",
      RENAME: "M13.2929 4.29291C",
      ARCHIVE: "M4.82918 4.10557C",
      DELETE: "M10.5555 4C10.099 4",
      // COPY_LINK: '...' // Add if needed
    };

    function extractChatInfo(button) {
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
                nameElement.getAttribute("title") ||
                nameElement.textContent.trim();
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
        console.error(
          `ChatGPT Pinner: Error in extractChatInfo: ${e.message}`,
          e
        );
        return null;
      }
    }

    function extractIdFromHref(href) {
      try {
        if (!href) return null;
        const pathSegments = href.split("/");
        if (
          pathSegments.length >= 3 &&
          pathSegments[pathSegments.length - 2] === "c"
        ) {
          const potentialId = pathSegments[pathSegments.length - 1];
          if (
            potentialId.match(/^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$/i)
          ) {
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
        console.warn(
          "ChatGPT Pinner: Could not match known ID pattern in:",
          href
        );
        return null;
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error in extractIdFromHref: ${e.message}`,
          e
        );
        return null;
      }
    }

    // isMainChatMenu remains the same as V5
    function isMainChatMenu(menuElement) {
      try {
        const menuItems = menuElement.querySelectorAll('div[role="menuitem"]');
        if (menuItems.length < 2) return false;
        let foundIcons = 0;
        const requiredIconPaths = [
          ICON_PATHS.SHARE,
          ICON_PATHS.RENAME,
          ICON_PATHS.DELETE,
          ICON_PATHS.ARCHIVE,
        ];
        menuItems.forEach((item) => {
          const svgPath = item.querySelector("svg path");
          if (svgPath) {
            const dAttr = svgPath.getAttribute("d");
            if (
              dAttr &&
              requiredIconPaths.some((pathStart) => dAttr.startsWith(pathStart))
            ) {
              foundIcons++;
            }
          }
        });
        const hasSeparator =
          menuElement.querySelector('div[role="separator"]') !== null;
        const result = foundIcons >= 2 || (foundIcons >= 1 && hasSeparator);
        return result;
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error in isMainChatMenu: ${e.message}`,
          e
        );
        return false;
      }
    }

    // --- START: Modified injectPinElement (Consistent Share Insertion Point) ---
    function injectPinElement(menuElement, chatId, chatName) {
      try {
        // Remove existing extension buttons first
        const existingButtons = menuElement.querySelectorAll(
          ".chatgpt-pinner-item, .chatgpt-bookmarker-item, .chatgpt-pinner-unpin-item, .chatgpt-bookmark-remove-item, .chatgpt-move-to-bookmarks-item, .chatgpt-move-to-pinned-item"
        );
        existingButtons.forEach((btn) => btn.remove());

        console.log(
          `ChatGPT Pinner: Injecting/Updating options for: ${chatName} (${chatId}) into menu`
        );

        chrome.storage.sync.get(
          ["pinnedChats", "bookmarkedChats"],
          function (result) {
            try {
              if (chrome.runtime.lastError) {
                console.error(
                  "Storage error:",
                  chrome.runtime.lastError.message
                );
                showNotification(
                  `Error accessing storage: ${chrome.runtime.lastError.message}`,
                  "error"
                );
                return;
              }
              const pinnedChats = result.pinnedChats || [];
              const bookmarkedChats = result.bookmarkedChats || [];

              const isPinned = pinnedChats.some((chat) => chat.id === chatId);
              const isBookmarked = bookmarkedChats.some(
                (chat) => chat.id === chatId
              );

              // --- Find insertion point: ALWAYS try to insert *after* Share ---
              let insertionReferenceElement = null;
              const allMenuItems = Array.from(
                menuElement.querySelectorAll('div[role="menuitem"]')
              );

              // 1. Find Share item by icon (Primary)
              insertionReferenceElement = allMenuItems.find((item) =>
                item.querySelector(`svg path[d^="${ICON_PATHS.SHARE}"]`)
              );

              // 2. Fallback: Find Share item by data-testid
              if (!insertionReferenceElement) {
                insertionReferenceElement = menuElement.querySelector(
                  '[data-testid*="share-chat-menu-item"]'
                );
              }

              // 3. Fallback: Find Share item by text (Least reliable)
              if (!insertionReferenceElement) {
                insertionReferenceElement = allMenuItems.find((el) =>
                  el.textContent?.trim().startsWith("Share")
                );
                if (insertionReferenceElement) {
                  console.warn(
                    "ChatGPT Pinner: Found Share item by text content (fallback)."
                  );
                }
              }

              // 4. Final Fallback: If Share not found, use the first menu item as reference
              if (!insertionReferenceElement) {
                insertionReferenceElement = menuElement.querySelector(
                  'div[role="menuitem"]'
                );
                console.warn(
                  "ChatGPT Pinner: Share item not found using icon, testid, or text. Inserting after the first menu item."
                );
              }

              if (!insertionReferenceElement) {
                console.error(
                  "ChatGPT Pinner: Menu seems empty. Cannot inject."
                );
                return; // Stop injection if no reference point identified
              }
              // --- End Find insertion point ---

              // Function to handle insertion logic (always insert AFTER the reference)
              const insertOption = (optionElement) => {
                if (
                  insertionReferenceElement &&
                  insertionReferenceElement.parentNode
                ) {
                  // Always insert after the reference element
                  insertionReferenceElement.parentNode.insertBefore(
                    optionElement,
                    insertionReferenceElement.nextSibling
                  );
                  insertionReferenceElement = optionElement; // Update reference to insert subsequent items after this new one
                } else {
                  // This case should be rare now due to the return above, but keep as safety net
                  console.error(
                    "ChatGPT Pinner: Failed to insert, reference element or parent missing. Appending as last resort."
                  );
                  menuElement.appendChild(optionElement);
                  insertionReferenceElement = optionElement;
                }
              };

              // --- Logic for Pinned/Bookmarked/Neither ---
              if (isPinned) {
                const unpinOption = createMenuOption(
                  "Unpin Conversation",
                  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm shrink-0"><path d="M4 8h8" stroke="currentColor" stroke-width="2"/></svg>`,
                  "chatgpt-pinner-unpin-item"
                );
                unpinOption.addEventListener("click", (event) => {
                  event.stopPropagation();
                  unpinChat(chatId);
                  closeMenu(menuElement);
                });
                insertOption(unpinOption);

                const moveToBookmarksOption = createMenuOption(
                  "Move to Bookmarks",
                  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm shrink-0"><path d="M16.998 8.50199H7.00195M7.00195 8.50199L10.502 5.00195M7.00195 8.50199L10.502 12.002M7.00195 15.502H17.002M17.002 15.502L13.502 19.002M17.002 15.502L13.502 12.002" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
                  "chatgpt-move-to-bookmarks-item"
                );
                moveToBookmarksOption.addEventListener("click", (event) => {
                  event.stopPropagation();
                  unpinChat(chatId);
                  saveBookmarkedChat(chatId, chatName);
                  closeMenu(menuElement);
                });
                insertOption(moveToBookmarksOption);
              } else if (isBookmarked) {
                const removeBookmarkOption = createMenuOption(
                  "Remove Bookmark",
                  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm shrink-0"><path d="M4 8h8" stroke="currentColor" stroke-width="2"/></svg>`,
                  "chatgpt-bookmark-remove-item"
                );
                removeBookmarkOption.addEventListener("click", (event) => {
                  event.stopPropagation();
                  removeBookmarkedChat(chatId);
                  closeMenu(menuElement);
                });
                insertOption(removeBookmarkOption);

                const moveToPinnedOption = createMenuOption(
                  "Move to Pinned",
                  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm shrink-0"><path d="M16.998 8.50199H7.00195M7.00195 8.50199L10.502 5.00195M7.00195 8.50199L10.502 12.002M7.00195 15.502H17.002M17.002 15.502L13.502 19.002M17.002 15.502L13.502 12.002" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
                  "chatgpt-move-to-pinned-item"
                );
                moveToPinnedOption.addEventListener("click", (event) => {
                  event.stopPropagation();
                  removeBookmarkedChat(chatId);
                  savePinnedChat(chatId, chatName);
                  closeMenu(menuElement);
                });
                insertOption(moveToPinnedOption);
              } else {
                const pinElement = createMenuOption(
                  "Pin Conversation",
                  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.5 5.5V2C11.5 1.72386 11.2761 1.5 11 1.5H5C4.72386 1.5 4.5 1.72386 4.5 2V5.5C4.5 6.32843 3.82843 7 3 7C2.72386 7 2.5 7.22386 2.5 7.5C2.5 7.77614 2.72386 8 3 8H7.5V13.5C7.5 13.7761 7.72386 14 8 14C8.27614 14 8.5 13.7761 8.5 13.5V8H13C13.2761 8 13.5 7.77614 13.5 7.5C13.5 7.22386 13.2761 7 13 7C12.1716 7 11.5 6.32843 11.5 5.5Z" fill="currentColor"></path></svg>`,
                  "chatgpt-pinner-item"
                );
                pinElement.addEventListener("click", (event) => {
                  event.stopPropagation();
                  savePinnedChat(chatId, chatName);
                  closeMenu(menuElement);
                });
                insertOption(pinElement);

                const bookmarkElement = createMenuOption(
                  "Bookmark Conversation",
                  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 3.25C3 2.00736 4.00736 1 5.25 1H10.75C11.9926 1 13 2.00736 13 3.25V14.0387C13 14.7926 12.1798 15.2843 11.5094 14.9145L8 12.882L4.49063 14.9145C3.82021 15.2843 3 14.7926 3 14.0387V3.25ZM5.25 2.5C4.83579 2.5 4.5 2.83579 4.5 3.25V13.0387L7.50937 11.3355C7.8094 11.1573 8.1906 11.1573 8.49063 11.3355L11.5 13.0387V3.25C11.5 2.83579 11.1642 2.5 10.75 2.5H5.25Z" fill="currentColor"/></svg>`,
                  "chatgpt-bookmarker-item"
                );
                bookmarkElement.addEventListener("click", (event) => {
                  event.stopPropagation();
                  saveBookmarkedChat(chatId, chatName);
                  closeMenu(menuElement);
                });
                insertOption(bookmarkElement);
              }
              // --- End Logic ---
              console.log(
                "ChatGPT Pinner: Menu options injected/updated successfully."
              );
            } catch (e) {
              console.error(
                `ChatGPT Pinner: Error processing storage data in injectPinElement: ${e.message}`,
                e
              );
              showNotification(
                `Error updating menu options: ${e.message}`,
                "error"
              );
            }
          }
        );
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error in injectPinElement setup: ${e.message}`,
          e
        );
        showNotification(
          `Failed to prepare menu options: ${e.message}`,
          "error"
        );
      }
    }

    function createMenuOption(text, svgContent, className) {
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
        console.error(
          `ChatGPT Pinner: Error in createMenuOption: ${e.message}`,
          e
        );
        const errorElement = document.createElement("div");
        errorElement.textContent = "Error creating option";
        errorElement.style.color = "red";
        return errorElement;
      }
    }

    function closeMenu(menuElement) {
      try {
        console.log(
          "[Pinner] Attempting to close menu via Escape key dispatch:",
          menuElement
        );
        // Dispatch Escape key press on the body
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

    // --- Storage Functions (Keep existing: savePinnedChat, saveBookmarkedChat, unpinChat, removeBookmarkedChat, showNotification) ---
    function savePinnedChat(chatId, chatName) {
      try {
        if (!chatId || !chatName) {
          console.error("ChatGPT Pinner: Invalid chat data", {
            chatId,
            chatName,
          });
          showNotification("Cannot pin: Invalid chat data.", "error");
          return;
        }
        chrome.storage.sync.get(
          ["pinnedChats", "bookmarkedChats"],
          function (result) {
            try {
              if (chrome.runtime.lastError) {
                console.error(
                  "Storage get error:",
                  chrome.runtime.lastError.message
                );
                showNotification("Error accessing storage", "error");
                return;
              }
              let pinned = result.pinnedChats || [];
              let bookmarked = result.bookmarkedChats || [];
              const isBookmarked = bookmarked.some((c) => c.id === chatId);
              if (isBookmarked) {
                bookmarked = bookmarked.filter((c) => c.id !== chatId);
              }
              const isPinned = pinned.some((c) => c.id === chatId);
              if (!isPinned) {
                const MAX_PINS = 10;
                if (pinned.length >= MAX_PINS) {
                  showNotification(`Max ${MAX_PINS} pins reached.`, "error");
                  return;
                }
                let url = `/c/${chatId}`;
                if (chatId.startsWith("g-p-")) {
                  url = `/g/${chatId}/project`;
                } else if (chatId.startsWith("g-")) {
                  url = `/g/${chatId}`;
                } else if (!chatId.match(/^[a-f0-9-]{36}$/i)) {
                  console.warn("Unknown ID format:", chatId);
                }
                pinned.push({
                  id: chatId,
                  name: chatName,
                  url: url,
                  pinnedAt: new Date().toISOString(),
                });
                chrome.storage.sync.set(
                  { pinnedChats: pinned, bookmarkedChats: bookmarked },
                  function () {
                    if (chrome.runtime.lastError) {
                      console.error(
                        "Error saving pin:",
                        chrome.runtime.lastError
                      );
                      showNotification("Error pinning", "error");
                    } else {
                      showNotification(`"${chatName}" pinned`);
                      displayPinnedChats();
                    }
                  }
                );
              } else {
                if (isBookmarked) {
                  chrome.storage.sync.set(
                    { bookmarkedChats: bookmarked },
                    function () {
                      if (chrome.runtime.lastError) {
                        console.error(
                          "Error updating bookmarks:",
                          chrome.runtime.lastError
                        );
                      } else {
                        showNotification(`"${chatName}" is already pinned`);
                      }
                    }
                  );
                } else {
                  showNotification(`"${chatName}" is already pinned`);
                }
              }
            } catch (e) {
              console.error(
                `ChatGPT Pinner: Error processing pin operation: ${e.message}`,
                e
              );
              showNotification(`Error pinning chat: ${e.message}`, "error");
            }
          }
        );
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error initiating savePinnedChat: ${e.message}`,
          e
        );
        showNotification(`Failed to initiate pinning: ${e.message}`, "error");
      }
    }
    function saveBookmarkedChat(chatId, chatName) {
      try {
        if (!chatId || !chatName) {
          console.error("ChatGPT Pinner: Invalid chat data", {
            chatId,
            chatName,
          });
          showNotification("Cannot bookmark: Invalid chat data.", "error");
          return;
        }
        chrome.storage.sync.get(
          ["pinnedChats", "bookmarkedChats"],
          function (result) {
            try {
              if (chrome.runtime.lastError) {
                console.error(
                  "Storage get error:",
                  chrome.runtime.lastError.message
                );
                showNotification("Error accessing storage", "error");
                return;
              }
              let pinned = result.pinnedChats || [];
              let bookmarked = result.bookmarkedChats || [];
              const isPinned = pinned.some((c) => c.id === chatId);
              if (isPinned) {
                pinned = pinned.filter((c) => c.id !== chatId);
                displayPinnedChats();
              }
              const isBookmarked = bookmarked.some((c) => c.id === chatId);
              if (!isBookmarked) {
                const MAX_BOOKMARKS = 50;
                if (bookmarked.length >= MAX_BOOKMARKS) {
                  showNotification(
                    `Max ${MAX_BOOKMARKS} bookmarks reached.`,
                    "error"
                  );
                  return;
                }
                let url = `/c/${chatId}`;
                if (chatId.startsWith("g-p-")) {
                  url = `/g/${chatId}/project`;
                } else if (chatId.startsWith("g-")) {
                  url = `/g/${chatId}`;
                } else if (!chatId.match(/^[a-f0-9-]{36}$/i)) {
                  console.warn("Unknown ID format:", chatId);
                }
                bookmarked.push({
                  id: chatId,
                  name: chatName,
                  url: url,
                  bookmarkedAt: new Date().toISOString(),
                });
                chrome.storage.sync.set(
                  { pinnedChats: pinned, bookmarkedChats: bookmarked },
                  function () {
                    if (chrome.runtime.lastError) {
                      console.error(
                        "Error saving bookmark:",
                        chrome.runtime.lastError
                      );
                      showNotification("Error bookmarking", "error");
                    } else {
                      showNotification(`"${chatName}" bookmarked`, "bookmark");
                    }
                  }
                );
              } else {
                if (isPinned) {
                  chrome.storage.sync.set({ pinnedChats: pinned }, function () {
                    if (chrome.runtime.lastError) {
                      console.error(
                        "Error updating pins:",
                        chrome.runtime.lastError
                      );
                    } else {
                      showNotification(`"${chatName}" is already bookmarked`);
                    }
                  });
                } else {
                  showNotification(`"${chatName}" is already bookmarked`);
                }
              }
            } catch (e) {
              console.error(
                `ChatGPT Pinner: Error processing bookmark operation: ${e.message}`,
                e
              );
              showNotification(`Error bookmarking chat: ${e.message}`, "error");
            }
          }
        );
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error initiating saveBookmarkedChat: ${e.message}`,
          e
        );
        showNotification(
          `Failed to initiate bookmarking: ${e.message}`,
          "error"
        );
      }
    }
    function unpinChat(chatId) {
      try {
        chrome.storage.sync.get(["pinnedChats"], function (result) {
          try {
            if (chrome.runtime.lastError) {
              console.error(
                "Storage get error:",
                chrome.runtime.lastError.message
              );
              showNotification("Error accessing storage", "error");
              return;
            }
            let pinned = result.pinnedChats || [];
            const updated = pinned.filter((c) => c.id !== chatId);
            chrome.storage.sync.set({ pinnedChats: updated }, function () {
              if (chrome.runtime.lastError) {
                console.error("Error unpinning:", chrome.runtime.lastError);
                showNotification("Error unpinning", "error");
              } else {
                showNotification("Chat unpinned");
                displayPinnedChats();
              }
            });
          } catch (e) {
            console.error(
              `ChatGPT Pinner: Error processing unpin operation: ${e.message}`,
              e
            );
            showNotification(`Error unpinning chat: ${e.message}`, "error");
          }
        });
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error initiating unpinChat: ${e.message}`,
          e
        );
        showNotification(`Failed to initiate unpinning: ${e.message}`, "error");
      }
    }
    function removeBookmarkedChat(chatId) {
      try {
        chrome.storage.sync.get(["bookmarkedChats"], function (result) {
          try {
            if (chrome.runtime.lastError) {
              console.error(
                "Storage get error:",
                chrome.runtime.lastError.message
              );
              showNotification("Error accessing storage", "error");
              return;
            }
            let bookmarked = result.bookmarkedChats || [];
            const updated = bookmarked.filter((c) => c.id !== chatId);
            chrome.storage.sync.set({ bookmarkedChats: updated }, function () {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error removing bookmark:",
                  chrome.runtime.lastError
                );
                showNotification("Error removing bookmark", "error");
              } else {
                showNotification("Bookmark removed");
              }
            });
          } catch (e) {
            console.error(
              `ChatGPT Pinner: Error processing remove bookmark operation: ${e.message}`,
              e
            );
            showNotification(`Error removing bookmark: ${e.message}`, "error");
          }
        });
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error initiating removeBookmarkedChat: ${e.message}`,
          e
        );
        showNotification(
          `Failed to initiate bookmark removal: ${e.message}`,
          "error"
        );
      }
    }
    function showNotification(message, type = "success") {
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
        console.error(
          `ChatGPT Pinner: Error in showNotification: ${e.message}`,
          e
        );
        // Fallback to alert if notification system fails
        alert(`${type.toUpperCase()}: ${message}`);
      }
    }

    // --- Functions to display pinned chats (Keep existing: createPinnedChatItemElement, displayPinnedChats, createPinnedSectionElement) ---
    function createPinnedChatItemElement(chat) {
      try {
        const li = document.createElement("li");
        li.className = "relative";
        li.setAttribute("data-pinner-item-id", chat.id);
        const cont = document.createElement("div");
        cont.className =
          "no-draggable group rounded-lg active:opacity-90 bg-[var(--item-background-color)] h-9 text-sm screen-arch:bg-transparent relative flex items-center pr-2";
        cont.style.setProperty(
          "--item-background-color",
          "var(--sidebar-surface-primary)"
        );
        const link = document.createElement("a");
        link.className =
          "flex items-center gap-2 p-2 flex-grow overflow-hidden";
        link.href = chat.url;
        link.setAttribute("data-pinner-link", "true");
        link.style.maskImage = "var(--sidebar-mask)";
        const nameDiv = document.createElement("div");
        nameDiv.className = "relative grow overflow-hidden whitespace-nowrap";
        nameDiv.dir = "auto";
        nameDiv.title = chat.name;
        nameDiv.textContent = chat.name;
        link.appendChild(nameDiv);
        const btn = document.createElement("button");
        btn.className =
          "text-token-text-secondary hover:text-token-text-primary invisible group-hover:visible p-1 rounded";
        btn.setAttribute("aria-label", "Unpin conversation");
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/></svg>`;
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          unpinChat(chat.id);
        };
        cont.appendChild(link);
        cont.appendChild(btn);
        li.appendChild(cont);
        return li;
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error in createPinnedChatItemElement for ${chat.id}: ${e.message}`,
          e
        );
        const errorLi = document.createElement("li");
        errorLi.textContent = `Error displaying pinned item: ${chat.name}`;
        errorLi.style.color = "red";
        return errorLi;
      }
    }
    function displayPinnedChats() {
      try {
        chrome.storage.sync.get(
          ["pinnedChats", "showPinnedInSidebar"],
          function (result) {
            try {
              if (chrome.runtime.lastError) {
                console.error(
                  "Storage get error for displayPinnedChats:",
                  chrome.runtime.lastError.message
                );
                // Potentially show a subtle error in the sidebar or just log
                return;
              }
              const pinned = result.pinnedChats || [];
              const show = result.showPinnedInSidebar !== false;
              const existing = document.getElementById("pinned-chats-section");
              if (existing) existing.remove();
              if (!show || pinned.length === 0) return;
              const sidebar = document.getElementById("sidebar");
              if (!sidebar) {
                setTimeout(displayPinnedChats, 1000);
                return;
              }
              const exploreLink = sidebar.querySelector(
                'a[data-testid="explore-gpts-button"]'
              );
              const historyDiv = document.getElementById("history");
              let insertionPoint = null;
              let method = "after";
              if (exploreLink) insertionPoint = exploreLink;
              else if (historyDiv) {
                insertionPoint = historyDiv;
                method = "before";
              } else {
                const firstHeader = sidebar.querySelector(
                  ".sticky .text-xs.font-semibold"
                );
                if (firstHeader) {
                  insertionPoint = firstHeader.closest(".relative.mt-5");
                  if (insertionPoint) method = "before";
                  else {
                    console.error("Cannot inject pins.");
                    return;
                  }
                } else {
                  console.error("Cannot inject pins.");
                  return;
                }
              }
              const section = createPinnedSectionElement(pinned);
              if (insertionPoint && insertionPoint.parentNode) {
                if (method === "after")
                  insertionPoint.parentNode.insertBefore(
                    section,
                    insertionPoint.nextSibling
                  );
                else
                  insertionPoint.parentNode.insertBefore(
                    section,
                    insertionPoint
                  );
              } else {
                console.error("Insertion point error.");
              }
            } catch (e) {
              console.error(
                `ChatGPT Pinner: Error processing pinned chats for display: ${e.message}`,
                e
              );
            }
          }
        );
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error initiating displayPinnedChats: ${e.message}`,
          e
        );
      }
    }
    function createPinnedSectionElement(pinnedChats) {
      try {
        const section = document.createElement("div");
        section.id = "pinned-chats-section";
        section.className = "relative mt-5 first:mt-0 last:mb-5";
        const headDiv = document.createElement("div");
        headDiv.className =
          "bg-token-sidebar-surface-primary sticky top-0 z-20";
        const headSpan = document.createElement("span");
        headSpan.className = "flex h-9 items-center";
        const h3 = document.createElement("h3");
        h3.className =
          "px-2 text-xs font-semibold text-ellipsis overflow-hidden break-all pt-3 pb-2 text-token-text-primary";
        h3.textContent = "Pinned";
        headSpan.appendChild(h3);
        headDiv.appendChild(headSpan);
        section.appendChild(headDiv);
        const list = document.createElement("ol");
        pinnedChats
          .sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt))
          .forEach((chat) =>
            list.appendChild(createPinnedChatItemElement(chat))
          );
        section.appendChild(list);
        return section;
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error in createPinnedSectionElement: ${e.message}`,
          e
        );
        const errorSection = document.createElement("div");
        errorSection.textContent = "Error creating pinned section.";
        errorSection.style.color = "red";
        return errorSection;
      }
    }

    // --- Event Handling and Observation ---

    function tryImmediateInjection(chatId, chatName) {
      try {
        const menus = document.querySelectorAll(
          '[data-radix-popper-content-wrapper] [role="menu"][data-radix-menu-content][data-state="open"], body > [role="menu"][data-radix-menu-content][data-state="open"]'
        );
        for (const menu of menus) {
          if (
            isMainChatMenu(menu) &&
            !menu.querySelector(".chatgpt-pinner-item")
          ) {
            injectPinElement(menu, chatId, chatName);
            return true;
          }
        }
        return false;
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error in tryImmediateInjection: ${e.message}`,
          e
        );
        return false;
      }
    }
    function handleOptionsButtonClick(event) {
      try {
        const button = event.currentTarget;
        const triggerSpan = button.closest("span[data-state]");
        const listItem = button.closest('li[data-testid^="history-item-"]');
        const projectLink = button.closest('a[href^="/g/"]');
        if (!triggerSpan && !listItem && !projectLink) return;
        setTimeout(() => {
          const chatInfo = extractChatInfo(button);
          if (!chatInfo) return;
          const { chatId, chatName } = chatInfo;
          if (!chatId || !chatName) return;
          const injected = tryImmediateInjection(chatId, chatName);
          if (!injected) observeMenuAddition(chatId, chatName);
        }, 50);
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error in handleOptionsButtonClick: ${e.message}`,
          e
        );
      }
    }
    function observeMenuAddition(chatId, chatName) {
      let obs = null;
      let time = null;
      try {
        const disco = () => {
          if (obs) {
            obs.disconnect();
            obs = null;
          }
          if (time) {
            clearTimeout(time);
            time = null;
          }
        };
        obs = new MutationObserver((muts) => {
          let inj = false;
          for (const mut of muts) {
            if (inj) break;
            if (mut.addedNodes.length) {
              for (const node of mut.addedNodes) {
                if (inj) break;
                if (node.nodeType === 1) {
                  let menu = null;
                  if (
                    node.matches(
                      '[role="menu"][data-radix-menu-content][data-state="open"]'
                    )
                  )
                    menu = node;
                  else if (node.querySelector)
                    menu = node.querySelector(
                      '[role="menu"][data-radix-menu-content][data-state="open"]'
                    );
                  if (menu && isMainChatMenu(menu)) {
                    if (!menu.querySelector(".chatgpt-pinner-item")) {
                      injectPinElement(menu, chatId, chatName);
                      inj = true;
                      disco();
                      break;
                    } else {
                      disco();
                      break;
                    }
                  }
                }
              }
            }
          }
        });
        obs.observe(document.body, { childList: true, subtree: false });
        const pop =
          document.querySelector("[data-radix-popper-content-wrapper]")
            ?.parentNode || document.body;
        if (pop !== document.body)
          obs.observe(pop, { childList: true, subtree: true });
        time = setTimeout(() => {
          if (obs) disco();
        }, 1500);
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error setting up observeMenuAddition: ${e.message}`,
          e
        );
        if (obs) obs.disconnect();
        if (time) clearTimeout(time);
      }
    }

    // --- Main Observer and Initial Scan (Using structural/icon check) ---
    const optionsButtonSelector =
      'li[data-testid^="history-item-"] button, a[href^="/g/"] button';
    const optionsIconPath = "M3 12C3"; // Path data for the '...' icon

    const mainObserver = new MutationObserver((mutations) => {
      try {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const potentialButtons = node.matches(optionsButtonSelector)
                ? [node]
                : node.querySelectorAll?.(optionsButtonSelector);
              if (potentialButtons && potentialButtons.length > 0) {
                potentialButtons.forEach((button) => {
                  const isOptionsButton =
                    button.querySelector(`svg path[d^="${optionsIconPath}"]`) ||
                    button.closest("span[data-state]");
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
          `ChatGPT Pinner: Error in mainObserver callback: ${e.message}`,
          e
        );
        // Consider disconnecting observer if it repeatedly errors, or add a counter
      }
    });
    try {
      mainObserver.observe(document.body, { childList: true, subtree: true });
    } catch (e) {
      console.error(
        `ChatGPT Pinner: Failed to start mainObserver: ${e.message}`,
        e
      );
    }

    function initialScan() {
      try {
        console.log(
          "ChatGPT Pinner: Performing initial scan for options buttons."
        );
        document.querySelectorAll(optionsButtonSelector).forEach((button) => {
          const isOptionsButton =
            button.querySelector(`svg path[d^="${optionsIconPath}"]`) ||
            button.closest("span[data-state]");
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
          `ChatGPT Pinner: Error during initialScan: ${e.message}`,
          e
        );
      }
    }
    // --- END: Main Observer and Initial Scan ---

    // --- Initial Setup ---
    try {
      initialScan();
      displayPinnedChats();

      chrome.storage.onChanged.addListener((changes, namespace) => {
        try {
          if (namespace === "sync" && changes.pinnedChats) {
            console.log(
              "ChatGPT Pinner: Detected change in pinned chats storage."
            );
            displayPinnedChats();
          }
        } catch (e) {
          console.error(
            `ChatGPT Pinner: Error in storage.onChanged listener: ${e.message}`,
            e
          );
        }
      });

      console.log(
        "ChatGPT Pinner: Initialization complete (V6 with error handling)."
      );
    } catch (e) {
      console.error(
        `ChatGPT Pinner: Error during initial setup: ${e.message}`,
        e
      );
      showNotification("Error initializing Pinner features on page.", "error");
    }
  } catch (e) {
    // Catch errors from the main initializePinner scope
    console.error(
      "ChatGPT Pinner: CRITICAL ERROR during initialization phase.",
      e
    );
    // Attempt to show a notification even if parts of showNotification might be uninitialized
    try {
      const n = document.createElement("div");
      n.textContent =
        "Critical Pinner Error. Some features may not work. Check console.";
      n.style.cssText = `position: fixed; bottom: 20px; right: 20px; background-color: #e53e3e; color: white; padding: 10px 16px; border-radius: 8px; font-size: 14px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);`;
      document.body.appendChild(n);
      setTimeout(() => {
        if (n.parentNode) n.parentNode.removeChild(n);
      }, 5000);
    } catch (se) {
      alert("Critical Pinner Error. Check console.");
    }
  }
}

// --- Run Initialization --- (Using the robust retry logic from V5)
function attemptInitialization() {
  try {
    if (
      document.querySelector(
        'nav[aria-label*="Chat history"], nav[aria-label*="Sohbet geçmişi"]'
      ) ||
      document.getElementById("sidebar")
    ) {
      console.log(
        "ChatGPT Pinner: Sidebar or history nav detected, proceeding with initialization."
      );
      initializePinner();
    } else {
      console.log(
        "ChatGPT Pinner: Sidebar/History nav not ready, retrying initialization..."
      );
      setTimeout(attemptInitialization, 1000); // Retry after 1 second
    }
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error in attemptInitialization: ${e.message}`,
      e
    );
    // Optionally, stop retrying after a certain number of failures
  }
}

waitForElement(
  'li[data-testid^="history-item-"] > div > a[data-history-item-link="true"]'
)
  .then(() => {
    attemptInitialization();
  })
  .catch((err) => {
    console.error("ChatGPT Pinner: Element wait failed", err);
  });

function waitForElement(selector, timeout = 7000) {
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
