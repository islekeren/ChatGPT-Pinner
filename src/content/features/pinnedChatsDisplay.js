import {
  getPinnedChatsFromStorage,
  getShowPinnedInSidebarSetting,
} from "../storageService.js";
import { unpinChat } from "./pinnedChatsManager.js"; // For the unpin button in the list

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
    link.className = "flex items-center gap-2 p-2 flex-grow overflow-hidden";
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

function createPinnedSectionElement(pinnedChats) {
  try {
    const section = document.createElement("div");
    section.id = "pinned-chats-section";
    section.className = "relative mt-5 first:mt-0 last:mb-5";
    const headDiv = document.createElement("div");
    headDiv.className = "bg-token-sidebar-surface-primary sticky top-0 z-20";
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
      .forEach((chat) => list.appendChild(createPinnedChatItemElement(chat)));
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

export async function displayPinnedChats() {
  try {
    const pinned = await getPinnedChatsFromStorage();
    const show = await getShowPinnedInSidebarSetting();

    const existing = document.getElementById("pinned-chats-section");
    if (existing) existing.remove();

    if (!show || pinned.length === 0) return;

    const sidebar = document.getElementById("sidebar");
    if (!sidebar) {
      setTimeout(displayPinnedChats, 1000); // Retry if sidebar not found
      return;
    }

    const exploreLink = sidebar.querySelector(
      'a[data-testid="explore-gpts-button"]'
    );
    const historyDiv = document.getElementById("history");
    let insertionPoint = null;
    let method = "after";

    if (exploreLink) {
      insertionPoint = exploreLink;
    } else if (historyDiv) {
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
          console.error(
            "ChatGPT Pinner: Cannot find suitable insertion point for pinned chats (fallback)."
          );
          return;
        }
      } else {
        console.error(
          "ChatGPT Pinner: Cannot find suitable insertion point for pinned chats."
        );
        return;
      }
    }

    const section = createPinnedSectionElement(pinned);
    if (insertionPoint && insertionPoint.parentNode) {
      if (method === "after") {
        insertionPoint.parentNode.insertBefore(
          section,
          insertionPoint.nextSibling
        );
      } else {
        insertionPoint.parentNode.insertBefore(section, insertionPoint);
      }
    } else {
      console.error(
        "ChatGPT Pinner: Insertion point error for pinned chats section."
      );
    }
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error in displayPinnedChats: ${e.message}`,
      e
    );
  }
}
