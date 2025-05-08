import "./popup.css";
document.addEventListener("DOMContentLoaded", () => {
  try {
    const pinnedChatsContainer = document.getElementById("pinnedChats");
    const bookmarkedChatsContainer = document.getElementById("bookmarkedChats");
    const emptyPinnedState = document.getElementById("emptyPinnedState");
    const emptyBookmarkState = document.getElementById("emptyBookmarkState");
    const chatsTab = document.getElementById("chatsTab");
    const bookmarksTab = document.getElementById("bookmarksTab");
    const chatsPage = document.getElementById("chatsPage");
    const bookmarksPage = document.getElementById("bookmarksPage");
    const settingsPage = document.getElementById("settingsPage");
    const settingsButton = document.getElementById("settingsButton");
    const showSidebarCheckbox = document.getElementById("showSidebar");
    const errorDisplay = document.getElementById("errorDisplay"); // Assuming you add an error display element in popup.html

    const gearIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
    const closeIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    // Function to apply theme to the popup body
    function applyTheme(theme) {
      document.body.dataset.theme = theme;
    }

    // Function to get theme from content script
    function getAndApplyTheme() {
      chrome.tabs.query({ active: true, url: "*://chatgpt.com/*" }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "Error querying tabs for theme:",
            chrome.runtime.lastError.message
          );
          applyTheme("light"); // Default to light theme on error
          return;
        }
        if (tabs && tabs.length > 0) {
          const activeTab = tabs[0];
          chrome.scripting.executeScript(
            {
              target: { tabId: activeTab.id },
              func: () => {
                return document.documentElement.classList.contains("dark")
                  ? "dark"
                  : "light";
              },
            },
            (injectionResults) => {
              if (chrome.runtime.lastError) {
                console.warn(
                  "Error executing script for theme detection:",
                  chrome.runtime.lastError.message
                );
                applyTheme("light"); // Default to light theme on error
                return;
              }
              if (
                injectionResults &&
                injectionResults[0] &&
                injectionResults[0].result
              ) {
                applyTheme(injectionResults[0].result);
              } else {
                applyTheme("light"); // Default if result is unexpected
              }
            }
          );
        } else {
          // Not on a ChatGPT page, or no active tab. Default to light.
          // Or, could try to get from storage if content script saves it there.
          applyTheme("light");
        }
      });
    }

    // Apply theme as soon as possible
    getAndApplyTheme();

    // Function to display errors in the popup
    function displayError(message) {
      console.error("Popup Error:", message);
      // You could implement a more user-friendly error display in the popup UI
      // For now, we'll just log it and potentially show an alert.
      // If errorDisplay element exists:
      // if (errorDisplay) {
      //   errorDisplay.textContent = `Error: ${message}. Please try again or report the issue.`;
      //   errorDisplay.style.display = 'block';
      // } else {
      alert(`An error occurred: ${message}`);
      // }
    }

    // Constants for limits
    const MAX_PINS = 10;
    const MAX_BOOKMARKS = 50;

    // Tab switching logic
    chatsTab.addEventListener("click", () => {
      try {
        setActiveTab("chats");
      } catch (e) {
        displayError(`Error switching to chats tab: ${e.message}`);
      }
    });

    bookmarksTab.addEventListener("click", () => {
      try {
        setActiveTab("bookmarks");
      } catch (e) {
        displayError(`Error switching to bookmarks tab: ${e.message}`);
      }
    });

    // Settings button logic
    settingsButton.addEventListener("click", () => {
      try {
        if (settingsPage.classList.contains("active")) {
          // If settings page is active, close it and go to last tab
          const lastActiveTab =
            localStorage.getItem("lastActiveTab") || "bookmarks";
          setActiveTab(lastActiveTab);
        } else {
          // Otherwise, open settings
          setActiveTab("settings");
        }
      } catch (e) {
        displayError(`Error toggling settings: ${e.message}`);
      }
    });

    function setActiveTab(tabName) {
      // Store current tab if not switching to settings, or if switching away from settings
      if (tabName !== "settings") {
        localStorage.setItem("lastActiveTab", tabName);
      }

      // Update tab buttons
      chatsTab.classList.toggle("active", tabName === "chats");
      bookmarksTab.classList.toggle("active", tabName === "bookmarks");

      // Update tab pages
      chatsPage.classList.toggle("active", tabName === "chats");
      bookmarksPage.classList.toggle("active", tabName === "bookmarks");
      settingsPage.classList.toggle("active", tabName === "settings");

      // Update settings button icon and title
      if (tabName === "settings") {
        settingsButton.innerHTML = closeIconSVG;
        settingsButton.title = "Close Settings";
      } else {
        settingsButton.innerHTML = gearIconSVG;
        settingsButton.title = "Settings";
      }
    }

    // Initialize settings
    chrome.storage.sync.get(["showPinnedInSidebar"], (result) => {
      try {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }
        showSidebarCheckbox.checked = result.showPinnedInSidebar !== false; // Default to true if not set
      } catch (e) {
        displayError(`Error initializing settings: ${e.message}`);
      }
    });

    // Save settings when changed
    showSidebarCheckbox.addEventListener("change", () => {
      try {
        chrome.storage.sync.set(
          {
            showPinnedInSidebar: showSidebarCheckbox.checked,
          },
          () => {
            if (chrome.runtime.lastError) {
              displayError(
                `Error saving settings: ${chrome.runtime.lastError.message}`
              );
              return;
            }
            // Send message to content script to update sidebar immediately without refresh
            chrome.tabs.query({ url: "*://chatgpt.com/*" }, (tabs) => {
              if (chrome.runtime.lastError) {
                displayError(
                  `Error querying tabs: ${chrome.runtime.lastError.message}`
                );
                return;
              }
              tabs.forEach((tab) => {
                chrome.scripting.executeScript(
                  {
                    target: { tabId: tab.id },
                    func: () => window.location.reload(),
                  },
                  () => {
                    if (chrome.runtime.lastError) {
                      // Log this error, but it's less critical for the popup user
                      console.warn(
                        `Error reloading tab ${tab.id}: ${chrome.runtime.lastError.message}`
                      );
                    }
                  }
                );
              });
            });
          }
        );
      } catch (e) {
        displayError(`Error handling sidebar setting change: ${e.message}`);
      }
    });

    // Load pinned and bookmarked chats
    loadChats();

    // Listen for theme changes from background or content script (if implemented)
    // This is a more robust way if the theme can change while popup is open,
    // or if content script proactively sends theme updates.
    // For now, we only check on popup open.
    // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    //   if (message.action === "themeChanged" && message.theme) {
    //     applyTheme(message.theme);
    //   }
    // });

    function loadChats() {
      try {
        // Load pinned chats and bookmarked chats
        chrome.storage.sync.get(
          ["pinnedChats", "bookmarkedChats"],
          (result) => {
            try {
              if (chrome.runtime.lastError) {
                throw new Error(chrome.runtime.lastError.message);
              }
              const pinnedChats = result.pinnedChats || [];
              const bookmarkedChats = result.bookmarkedChats || [];

              // Update tab counter badges
              const pinnedCount =
                pinnedChats.length > 0 ? ` (${pinnedChats.length})` : "";
              const bookmarkedCount =
                bookmarkedChats.length > 0
                  ? ` (${bookmarkedChats.length})`
                  : "";

              chatsTab.innerHTML = `Pinned${pinnedCount}`;
              bookmarksTab.innerHTML = `Bookmarks${bookmarkedCount}`;

              // Handle bookmarked chats display
              if (bookmarkedChats.length > 0) {
                emptyBookmarkState.style.display = "none";
                bookmarkedChatsContainer.style.display = "flex";

                // Sort bookmarks by time (newest first)
                bookmarkedChats.sort(
                  (a, b) => new Date(b.bookmarkedAt) - new Date(a.bookmarkedAt)
                );

                // Clear existing content
                bookmarkedChatsContainer.innerHTML = "";

                // Add limit notice if approaching limit
                if (bookmarkedChats.length >= MAX_BOOKMARKS - 5) {
                  const limitNotice = document.createElement("div");
                  limitNotice.className = "limit-notice";
                  limitNotice.textContent = `${bookmarkedChats.length}/${MAX_BOOKMARKS} bookmarks used`;
                  bookmarkedChatsContainer.appendChild(limitNotice);
                }

                // Create and append bookmarked items
                bookmarkedChats.forEach((chat) => {
                  console.log(chat);

                  const chatItem = createChatItem(chat, "bookmarked");
                  bookmarkedChatsContainer.appendChild(chatItem);
                });
              } else {
                // Show empty state if no bookmarked chats
                emptyBookmarkState.style.display = "block";
                bookmarkedChatsContainer.style.display = "none";
              }
            } catch (e) {
              displayError(`Error processing bookmarked chats: ${e.message}`);
              emptyBookmarkState.style.display = "block";
              bookmarkedChatsContainer.style.display = "none";
            }

            try {
              const pinnedChats = (result && result.pinnedChats) || []; // Re-access safely
              // Handle pinned chats display
              if (pinnedChats.length > 0) {
                emptyPinnedState.style.display = "none";
                pinnedChatsContainer.style.display = "flex";

                // Sort chats by pinned time (newest first)
                pinnedChats.sort(
                  (a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt)
                );

                // Clear existing content
                pinnedChatsContainer.innerHTML = "";

                // Add limit notice if approaching limit
                if (pinnedChats.length >= MAX_PINS - 2) {
                  const limitNotice = document.createElement("div");
                  limitNotice.className = "limit-notice";
                  limitNotice.textContent = `${pinnedChats.length}/${MAX_PINS} pins used`;
                  pinnedChatsContainer.appendChild(limitNotice);
                }

                // Create and append chat items
                pinnedChats.forEach((chat) => {
                  const chatItem = createChatItem(chat, "pinned");
                  pinnedChatsContainer.appendChild(chatItem);
                });
              } else {
                // Show empty state if no pinned chats
                emptyPinnedState.style.display = "block";
                pinnedChatsContainer.style.display = "none";
              }
            } catch (e) {
              displayError(`Error processing pinned chats: ${e.message}`);
              emptyPinnedState.style.display = "block";
              pinnedChatsContainer.style.display = "none";
            }
          }
        );
      } catch (e) {
        displayError(`Error loading chats: ${e.message}`);
      }
    }

    // Function to create a chat item element
    function createChatItem(chat, type) {
      try {
        const chatItem = document.createElement("div");
        chatItem.className = "chat-item";
        chatItem.dataset.chatId = chat.id;

        // Create link to the chat
        const chatLink = document.createElement("a");
        chatLink.className = "chat-link";
        chatLink.href = `https://chatgpt.com/c/${chat.id}`;
        chatLink.textContent = chat.name;
        chatLink.title = chat.name;
        chatLink.target = "_blank"; // Open in new tab

        // Create container for buttons
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "button-container";

        // Create action button (move to other list)
        const actionButton = document.createElement("button");
        actionButton.className = "action-button"; // Generic class, specific type class added below

        if (type === "pinned") {
          actionButton.classList.add("bookmark");
          actionButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
          actionButton.title = "Move to bookmarks";

          actionButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            moveToBookmarks(chat.id);
          });
        } else {
          actionButton.classList.add("pin");
          actionButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"></path></svg>`;
          actionButton.title = "Move to pinned";

          actionButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            moveToPinned(chat.id);
          });
        }

        // Create remove/unpin button
        const removeButton = document.createElement("button");
        removeButton.className = "unpin-button";
        removeButton.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.29289 6.29289C6.68342 5.90237 7.31658 5.90237 7.70711 6.29289L12 10.5858L16.2929 6.29289C16.6834 5.90237 17.3166 5.90237 17.7071 6.29289C18.0976 6.68342 18.0976 7.31658 17.7071 7.70711L13.4142 12L17.7071 16.2929C18.0976 16.6834 18.0976 17.3166 17.7071 17.7071C17.3166 18.0976 16.6834 18.0976 16.2929 17.7071L12 13.4142L7.70711 17.7071C7.31658 18.0976 6.68342 18.0976 6.29289 17.7071C5.90237 17.3166 5.90237 16.6834 6.29289 16.2929L10.5858 12L6.29289 7.70711C5.90237 7.31658 5.90237 6.68342 6.29289 6.29289Z" fill="currentColor"/></svg>';
        removeButton.title =
          type === "pinned" ? "Unpin chat" : "Remove bookmark";

        // Add click handler for remove button
        removeButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (type === "pinned") {
            unpinChat(chat.id);
          } else {
            removeBookmark(chat.id);
          }
        });

        // Assemble button container
        buttonContainer.appendChild(actionButton);
        buttonContainer.appendChild(removeButton);

        // Assemble chat item
        chatItem.appendChild(chatLink);
        chatItem.appendChild(buttonContainer);

        return chatItem;
      } catch (e) {
        displayError(`Error creating chat item for ${chat.name}: ${e.message}`);
        // Return a placeholder or null to prevent further errors
        const errorItem = document.createElement("div");
        errorItem.className = "chat-item";
        errorItem.textContent = "Error displaying this item.";
        return errorItem;
      }
    }

    // Function to unpin a chat
    function unpinChat(chatId) {
      try {
        chrome.storage.sync.get(["pinnedChats"], (result) => {
          try {
            if (chrome.runtime.lastError) {
              throw new Error(chrome.runtime.lastError.message);
            }
            let pinnedChats = result.pinnedChats || [];

            // Remove chat with matching id
            pinnedChats = pinnedChats.filter((chat) => chat.id !== chatId);

            // Save updated list back to storage
            chrome.storage.sync.set({ pinnedChats }, () => {
              if (chrome.runtime.lastError) {
                displayError(
                  `Error saving unpinned chat: ${chrome.runtime.lastError.message}`
                );
                return;
              }
              // Reload the chats to refresh the UI
              loadChats();
            });
          } catch (e) {
            displayError(`Error processing unpin operation: ${e.message}`);
          }
        });
      } catch (e) {
        displayError(`Error initiating unpin chat: ${e.message}`);
      }
    }

    // Function to remove a bookmark
    function removeBookmark(chatId) {
      try {
        chrome.storage.sync.get(["bookmarkedChats"], (result) => {
          try {
            if (chrome.runtime.lastError) {
              throw new Error(chrome.runtime.lastError.message);
            }
            let bookmarkedChats = result.bookmarkedChats || [];

            // Remove chat with matching id
            bookmarkedChats = bookmarkedChats.filter(
              (chat) => chat.id !== chatId
            );

            // Save updated list back to storage
            chrome.storage.sync.set({ bookmarkedChats }, () => {
              if (chrome.runtime.lastError) {
                displayError(
                  `Error saving removed bookmark: ${chrome.runtime.lastError.message}`
                );
                return;
              }
              // Reload the chats to refresh the UI
              loadChats();
            });
          } catch (e) {
            displayError(
              `Error processing remove bookmark operation: ${e.message}`
            );
          }
        });
      } catch (e) {
        displayError(`Error initiating remove bookmark: ${e.message}`);
      }
    }

    // Function to move a chat from pinned to bookmarks
    function moveToBookmarks(chatId) {
      try {
        chrome.storage.sync.get(
          ["pinnedChats", "bookmarkedChats"],
          (result) => {
            try {
              if (chrome.runtime.lastError) {
                throw new Error(chrome.runtime.lastError.message);
              }
              let pinnedChats = result.pinnedChats || [];
              let bookmarkedChats = result.bookmarkedChats || [];

              // Check if already at max bookmarks
              if (bookmarkedChats.length >= MAX_BOOKMARKS) {
                alert(
                  `You've reached the maximum limit of ${MAX_BOOKMARKS} bookmarks. Please remove some before adding more.`
                );
                return;
              }

              // Find the chat in pinned list
              const chatToMove = pinnedChats.find((chat) => chat.id === chatId);
              if (!chatToMove) return;

              // Remove from pinned list
              pinnedChats = pinnedChats.filter((chat) => chat.id !== chatId);

              // Add to bookmarked list with current timestamp
              bookmarkedChats.push({
                ...chatToMove,
                bookmarkedAt: new Date().toISOString(),
              });

              // Save both lists
              chrome.storage.sync.set(
                {
                  pinnedChats,
                  bookmarkedChats,
                },
                () => {
                  if (chrome.runtime.lastError) {
                    displayError(
                      `Error saving after moving to bookmarks: ${chrome.runtime.lastError.message}`
                    );
                    return;
                  }
                  // Reload chats to refresh UI
                  loadChats();
                }
              );
            } catch (e) {
              displayError(`Error processing move to bookmarks: ${e.message}`);
            }
          }
        );
      } catch (e) {
        displayError(`Error initiating move to bookmarks: ${e.message}`);
      }
    }

    // Function to move a chat from bookmarks to pinned
    function moveToPinned(chatId) {
      try {
        chrome.storage.sync.get(
          ["pinnedChats", "bookmarkedChats"],
          (result) => {
            try {
              if (chrome.runtime.lastError) {
                throw new Error(chrome.runtime.lastError.message);
              }
              let pinnedChats = result.pinnedChats || [];
              let bookmarkedChats = result.bookmarkedChats || [];

              // Check if already at max pins
              if (pinnedChats.length >= MAX_PINS) {
                alert(
                  `You've reached the maximum limit of ${MAX_PINS} pins. Please remove some before adding more.`
                );
                return;
              }

              // Find the chat in bookmarked list
              const chatToMove = bookmarkedChats.find(
                (chat) => chat.id === chatId
              );
              if (!chatToMove) return;

              // Remove from bookmarked list
              bookmarkedChats = bookmarkedChats.filter(
                (chat) => chat.id !== chatId
              );

              // Add to pinned list with current timestamp
              pinnedChats.push({
                ...chatToMove,
                pinnedAt: new Date().toISOString(),
              });

              // Save both lists
              chrome.storage.sync.set(
                {
                  pinnedChats,
                  bookmarkedChats,
                },
                () => {
                  if (chrome.runtime.lastError) {
                    displayError(
                      `Error saving after moving to pinned: ${chrome.runtime.lastError.message}`
                    );
                    return;
                  }
                  // Reload chats to refresh UI
                  loadChats();
                }
              );
            } catch (e) {
              displayError(`Error processing move to pinned: ${e.message}`);
            }
          }
        );
      } catch (e) {
        displayError(`Error initiating move to pinned: ${e.message}`);
      }
    }
  } catch (e) {
    // Catch errors from the initial setup of DOMContentLoaded
    console.error("Fatal Popup Error:", e);
    alert(
      `A critical error occurred in the extension popup: ${e.message}. Please try reloading the popup or the page.`
    );
    // Optionally, display this in a dedicated error div in popup.html
    // const errorDisplay = document.getElementById("errorDisplay");
    // if (errorDisplay) {
    //   errorDisplay.textContent = `Critical Error: ${e.message}. Please reload.`;
    //   errorDisplay.style.display = 'block';
    // }
  }
});
