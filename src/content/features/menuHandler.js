import { createMenuOption, closeMenu, showNotification } from "../utils.js";
import { getAllRelevantStorage } from "../storageService.js";
import {
  savePinnedChat,
  unpinChat,
  saveBookmarkedChat,
  removeBookmarkedChat,
} from "./pinnedChatsManager.js";

export const ICON_PATHS = {
  SHARE: "M11.2929 3.29289C",
  RENAME: "M13.2929 4.29291C",
  ARCHIVE: "M4.82918 4.10557C",
  DELETE: "M10.5555 4C10.099 4",
  // COPY_LINK: '...' // Add if needed
};

export function isMainChatMenu(menuElement) {
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
    console.error(`ChatGPT Pinner: Error in isMainChatMenu: ${e.message}`, e);
    return false;
  }
}

export async function injectPinElement(menuElement, chatId, chatName) {
  try {
    const existingButtons = menuElement.querySelectorAll(
      ".chatgpt-pinner-item, .chatgpt-bookmarker-item, .chatgpt-pinner-unpin-item, .chatgpt-bookmark-remove-item, .chatgpt-move-to-bookmarks-item, .chatgpt-move-to-pinned-item"
    );
    existingButtons.forEach((btn) => btn.remove());

    console.log(
      `ChatGPT Pinner: Injecting/Updating options for: ${chatName} (${chatId}) into menu`
    );

    const { pinnedChats, bookmarkedChats } = await getAllRelevantStorage();
    const currentPinnedChats = pinnedChats || [];
    const currentBookmarkedChats = bookmarkedChats || [];

    const isPinned = currentPinnedChats.some((chat) => chat.id === chatId);
    const isBookmarked = currentBookmarkedChats.some(
      (chat) => chat.id === chatId
    );

    let insertionReferenceElement = null;
    const allMenuItems = Array.from(
      menuElement.querySelectorAll('div[role="menuitem"]')
    );

    insertionReferenceElement = allMenuItems.find((item) =>
      item.querySelector(`svg path[d^="${ICON_PATHS.SHARE}"]`)
    );

    if (!insertionReferenceElement) {
      insertionReferenceElement = menuElement.querySelector(
        '[data-testid*="share-chat-menu-item"]'
      );
    }

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

    if (!insertionReferenceElement) {
      insertionReferenceElement = menuElement.querySelector(
        'div[role="menuitem"]'
      );
      console.warn(
        "ChatGPT Pinner: Share item not found. Inserting after the first menu item."
      );
    }

    if (!insertionReferenceElement) {
      console.error("ChatGPT Pinner: Menu seems empty. Cannot inject.");
      return;
    }

    const insertOption = (optionElement) => {
      if (insertionReferenceElement && insertionReferenceElement.parentNode) {
        insertionReferenceElement.parentNode.insertBefore(
          optionElement,
          insertionReferenceElement.nextSibling
        );
        insertionReferenceElement = optionElement;
      } else {
        console.error(
          "ChatGPT Pinner: Failed to insert, reference element or parent missing. Appending as last resort."
        );
        menuElement.appendChild(optionElement);
        insertionReferenceElement = optionElement;
      }
    };

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
      moveToBookmarksOption.addEventListener("click", async (event) => {
        event.stopPropagation();
        await unpinChat(chatId); // Ensure unpin completes before bookmarking
        await saveBookmarkedChat(chatId, chatName);
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
      moveToPinnedOption.addEventListener("click", async (event) => {
        event.stopPropagation();
        await removeBookmarkedChat(chatId); // Ensure removal before pinning
        await savePinnedChat(chatId, chatName);
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
    console.log("ChatGPT Pinner: Menu options injected/updated successfully.");
  } catch (e) {
    console.error(`ChatGPT Pinner: Error in injectPinElement: ${e.message}`, e);
    showNotification(`Failed to update menu options: ${e.message}`, "error");
  }
}
