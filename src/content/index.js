import { waitForElement, showNotification } from "./utils.js";
import { displayPinnedChats } from "./features/pinnedChatsDisplay.js";
import { startObserversAndScan } from "./domObserver.js";

function initializePinner() {
  try {
    console.log("ChatGPT Pinner: Initializing...");

    startObserversAndScan();
    displayPinnedChats();

    chrome.storage.onChanged.addListener((changes, namespace) => {
      try {
        if (namespace === "sync") {
          if (changes.pinnedChats || changes.showPinnedInSidebar) {
            console.log(
              "ChatGPT Pinner: Detected change in pinned chats or visibility setting."
            );
            displayPinnedChats();
          }
        }
      } catch (e) {
        console.error(
          `ChatGPT Pinner: Error in storage.onChanged listener: ${e.message}`,
          e
        );
      }
    });

    console.log("ChatGPT Pinner: Modular initialization complete.");
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error during modular initial setup: ${e.message}`,
      e
    );
    showNotification("Error initializing Pinner features on page.", "error");
  }
}

// --- Run Initialization ---
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 10; // Stop after 10 attempts (10 seconds)

function attemptInitialization() {
  try {
    initializationAttempts++;
    // Check for a more generic sidebar element or a key element within the history nav
    if (
      document.querySelector(
        'nav[aria-label*="Chat history"], nav[aria-label*="Sohbet geçmişi"]' // Existing check
      ) ||
      document.getElementById("sidebar") || // General sidebar ID
      document.querySelector('div[class*="shared__Wrapper"] nav') // Another common nav wrapper
    ) {
      console.log(
        "ChatGPT Pinner: Sidebar or history nav detected, proceeding with initialization."
      );
      initializePinner();
    } else {
      if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
        console.log(
          `ChatGPT Pinner: Sidebar/History nav not ready, retrying initialization... (Attempt ${initializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS})`
        );
        setTimeout(attemptInitialization, 1000); // Retry after 1 second
      } else {
        console.error(
          `ChatGPT Pinner: Failed to find sidebar/history nav after ${MAX_INITIALIZATION_ATTEMPTS} attempts. Initialization aborted.`
        );
        showNotification(
          "Pinner could not find the sidebar. Please try refreshing the page.",
          "error"
        );
      }
    }
  } catch (e) {
    console.error(
      `ChatGPT Pinner: Error in attemptInitialization: ${e.message}`,
      e
    );
    // Optionally, stop retrying after a certain number of failures - already handled by MAX_INITIALIZATION_ATTEMPTS
  }
}

// Wait for a reliable element that indicates the main UI is loaded
waitForElement(
  'nav[aria-label*="Chat history"], nav[aria-label*="Sohbet geçmişi"], div[class*="shared__Wrapper"] nav, #sidebar',
  15000
) // Increased timeout for robustness
  .then(() => {
    console.log(
      "ChatGPT Pinner: Core UI element found. Attempting initialization."
    );
    attemptInitialization();
  })
  .catch((err) => {
    console.error(
      "ChatGPT Pinner: Element wait failed, initialization might not run correctly.",
      err
    );
    // Fallback or alternative initialization strategy if needed
    // For now, we'll just log the error. If critical, could try a delayed attemptInitialization.
    console.log(
      "ChatGPT Pinner: Core UI element wait failed. Attempting a delayed initialization as a fallback."
    );
    setTimeout(attemptInitialization, 5000);
    y;
  });
