# ChatGPT Pinner Extension

ChatGPT Pinner is a browser extension that allows you to pin and bookmark your favorite ChatGPT conversations for quick and easy access. It enhances your ChatGPT experience by keeping important discussions readily available.

## Features

- **Pin Chats**: Mark important conversations to keep them at the top of your list within the extension popup.
- **Bookmark Chats**: Save links to specific ChatGPT conversations.
- **Sidebar Integration**: Optionally display pinned chats directly within the ChatGPT sidebar for seamless access.
- **Easy Management**: Simple interface to view and manage your pinned and bookmarked chats.
- **Theme Adaptive**: The popup adapts to your system's light or dark mode.

## Development

This project uses Vite for building the extension.

### Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm) or [Yarn](https://yarnpkg.com/)

### Building the Extension

1.  **Clone the repository (if you haven't already):**

    ```bash
    git clone https://github.com/islekeren/ChatGPT-Pinner
    cd ChatGPT-Pinner
    ```

2.  **Install dependencies:**
    Using npm:

    ```bash
    npm install
    ```

    Or using Yarn:

    ```bash
    yarn install
    ```

3.  **Build the extension:**
    Using npm:
    ```bash
    npm run build
    ```
    Or using Yarn:
    ```bash
    yarn build
    ```
    This command will compile the source files and output the production-ready extension into the `dist` folder.

## Installation in Google Chrome (from `dist` folder)

Once you have built the extension, you can load it into Google Chrome:

1.  **Open Google Chrome.**
2.  **Navigate to Extensions:**
    - Type `chrome://extensions` in the address bar and press Enter.
    - Alternatively, click on the three vertical dots (menu) in the top-right corner, go to "Extensions," and then "Manage Extensions."
3.  **Enable Developer Mode:**
    - In the top-right corner of the Extensions page, toggle the "Developer mode" switch to the ON position.
4.  **Load Unpacked Extension:**
    - Click on the "Load unpacked" button that appears once Developer mode is enabled.
5.  **Select the `dist` folder:**
    - In the file dialog, navigate to your project directory and select the `dist` folder.
    - Click "Select Folder."

The ChatGPT Pinner extension should now be installed and active in your browser. You'll see its icon in the Chrome toolbar.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is open-source and available under the [MIT License](LICENSE).
