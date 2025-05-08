import { showNotification } from "../utils.js";
import {
  getPinnedChatsFromStorage,
  setPinnedChatsInStorage,
  getBookmarkedChatsFromStorage,
  setBookmarkedChatsInStorage,
  getAllRelevantStorage,
  setStorageData,
} from "../storageService.js";
import { displayPinnedChats } from "./pinnedChatsDisplay.js";

export async function savePinnedChat(chatId, chatName) {
  try {
    if (!chatId || !chatName) {
      console.error("ChatGPT Pinner: Invalid chat data for pinning", {
        chatId,
        chatName,
      });
      showNotification("Cannot pin: Invalid chat data.", "error");
      return;
    }

    const { pinnedChats: currentPinned, bookmarkedChats: currentBookmarked } =
      await getAllRelevantStorage();
    let pinned = currentPinned || [];
    let bookmarked = currentBookmarked || [];

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
        console.warn("Unknown ID format for pinning:", chatId);
      }
      pinned.push({
        id: chatId,
        name: chatName,
        url: url,
        pinnedAt: new Date().toISOString(),
      });
      await setStorageData({
        pinnedChats: pinned,
        bookmarkedChats: bookmarked,
      });
      showNotification(`"${chatName}" pinned`);
      displayPinnedChats();
    } else {
      if (isBookmarked) {
        // Was bookmarked, now only pinned
        await setBookmarkedChatsInStorage(bookmarked);
        // displayPinnedChats will be called if pins changed, notification for already pinned
      }
      showNotification(`"${chatName}" is already pinned`);
    }
  } catch (e) {
    console.error(`ChatGPT Pinner: Error in savePinnedChat: ${e.message}`, e);
    showNotification(`Error pinning chat: ${e.message}`, "error");
  }
}

export async function saveBookmarkedChat(chatId, chatName) {
  try {
    if (!chatId || !chatName) {
      console.error("ChatGPT Pinner: Invalid chat data for bookmarking", {
        chatId,
        chatName,
      });
      showNotification("Cannot bookmark: Invalid chat data.", "error");
      return;
    }

    const { pinnedChats: currentPinned, bookmarkedChats: currentBookmarked } =
      await getAllRelevantStorage();
    let pinned = currentPinned || [];
    let bookmarked = currentBookmarked || [];

    const isPinned = pinned.some((c) => c.id === chatId);
    if (isPinned) {
      pinned = pinned.filter((c) => c.id !== chatId);
    }

    const isBookmarked = bookmarked.some((c) => c.id === chatId);
    if (!isBookmarked) {
      const MAX_BOOKMARKS = 50;
      if (bookmarked.length >= MAX_BOOKMARKS) {
        showNotification(`Max ${MAX_BOOKMARKS} bookmarks reached.`, "error");
        return;
      }
      let url = `/c/${chatId}`;
      if (chatId.startsWith("g-p-")) {
        url = `/g/${chatId}/project`;
      } else if (chatId.startsWith("g-")) {
        url = `/g/${chatId}`;
      } else if (!chatId.match(/^[a-f0-9-]{36}$/i)) {
        console.warn("Unknown ID format for bookmarking:", chatId);
      }
      bookmarked.push({
        id: chatId,
        name: chatName,
        url: url,
        bookmarkedAt: new Date().toISOString(),
      });
      await setStorageData({
        pinnedChats: pinned,
        bookmarkedChats: bookmarked,
      });
      showNotification(`"${chatName}" bookmarked`, "bookmark");
      if (isPinned) displayPinnedChats(); // Refresh sidebar if it was unpinned
    } else {
      if (isPinned) {
        // Was pinned, now only bookmarked
        await setPinnedChatsInStorage(pinned);
        displayPinnedChats(); // Refresh sidebar
      }
      showNotification(`"${chatName}" is already bookmarked`);
    }
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error in saveBookmarkedChat: ${e.message}`,
      e
    );
    showNotification(`Error bookmarking chat: ${e.message}`, "error");
  }
}

export async function unpinChat(chatId) {
  try {
    let pinned = await getPinnedChatsFromStorage();
    const updated = pinned.filter((c) => c.id !== chatId);
    await setPinnedChatsInStorage(updated);
    showNotification("Chat unpinned");
    displayPinnedChats();
  } catch (e) {
    console.error(`ChatGPT Pinner: Error in unpinChat: ${e.message}`, e);
    showNotification(`Error unpinning chat: ${e.message}`, "error");
  }
}

export async function removeBookmarkedChat(chatId) {
  try {
    let bookmarked = await getBookmarkedChatsFromStorage();
    const updated = bookmarked.filter((c) => c.id !== chatId);
    await setBookmarkedChatsInStorage(updated);
    showNotification("Bookmark removed");
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error in removeBookmarkedChat: ${e.message}`,
      e
    );
    showNotification(`Error removing bookmark: ${e.message}`, "error");
  }
}
