import { showNotification } from "./utils.js";

const handleStorageError = (operation, error) => {
  console.error(`ChatGPT Pinner: Storage ${operation} error:`, error.message);
  showNotification(`Error accessing storage for ${operation}`, "error");
};

export async function getStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        handleStorageError("get", chrome.runtime.lastError);
        resolve(keys.reduce((acc, key) => ({ ...acc, [key]: undefined }), {})); // Return default/empty structure on error
      } else {
        resolve(result);
      }
    });
  });
}

export async function setStorageData(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(data, () => {
      if (chrome.runtime.lastError) {
        handleStorageError("set", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function getAllRelevantStorage() {
  return getStorageData([
    "pinnedChats",
    "bookmarkedChats",
    "showPinnedInSidebar",
  ]);
}

export async function getPinnedChatsFromStorage() {
  const { pinnedChats } = await getStorageData(["pinnedChats"]);
  return pinnedChats || [];
}

export async function setPinnedChatsInStorage(pinnedChats) {
  return setStorageData({ pinnedChats });
}

export async function getBookmarkedChatsFromStorage() {
  const { bookmarkedChats } = await getStorageData(["bookmarkedChats"]);
  return bookmarkedChats || [];
}

export async function setBookmarkedChatsInStorage(bookmarkedChats) {
  return setStorageData({ bookmarkedChats });
}

export async function getShowPinnedInSidebarSetting() {
  const { showPinnedInSidebar } = await getStorageData(["showPinnedInSidebar"]);
  return showPinnedInSidebar !== false; // Default to true if undefined
}
