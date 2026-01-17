# <img src="public/icons/icon48.png" width="45" align="left"> VK Photo Fetcher

A Chrome extension that provides a convenient way to bulk download photos from VK (VKontakte) dialogs and chats.

## Features

- **Bulk Downloading**: Select multiple photos from a conversation and download them all at once.
- **Smart Organization**:
    - Group photos by date.
    - Customize the download folder name.
- **High Quality**: Automatically fetches the highest resolution available for each photo.
- **Easy Selection**: Visual interface to pick specific photos or select all loaded photos.
- **Context Aware**: Works seamlessly with personal chats and community dialogs.

## Installation

### Chrome Web Store
You can install the extension directly from the Chrome Web Store:
[**VK Photo Fetcher**](https://chromewebstore.google.com/detail/%D1%84%D0%BE%D1%82%D0%BE%D0%B3%D1%80%D0%B0%D1%84%D0%B8%D0%B8-%D0%B8%D0%B7-%D0%B4%D0%B8%D0%B0%D0%BB%D0%BE%D0%B3%D0%BE%D0%B2-vk/jkofhffhhcnikeimpnpfjdhjiebnfcph)

### Manual Installation (for Development)
1. Clone this repository.
2. Run `npm install` to install dependencies.
3. Run `npm run watch` to build the extension and enable tracking file changes.
4. Open Chrome and navigate to `chrome://extensions/`.
5. Enable "Developer mode" in the top right corner.
6. Click "Load unpacked" and select the `build` folder from the project directory.

## Usage

1. Open a dialog or chat on [vk.com](https://vk.com).
2. Click the extension icon in the Chrome toolbar.
3. Click the **"Get photos"** button in the popup.
    - *Note: If you are not authorized, you will be prompted to log in to VK to allow the extension to access your messages.*
4. A new tab will open, loading photos from the conversation.
5. Select the photos you want to download (or use "Select All").
6. Configure download options (Folder name, Group by date).
7. Click **"Download"**.

## Permissions

The extension requires the following permissions to function:
- `tabs`: To detect the current VK chat tab and open the photo selection interface.
- `storage`: To save your authentication token locally.
- `downloads`: To save the selected photos to your computer.
- `webNavigation`: To handle the authentication flow.
- Host permissions for `https://*.vk.com/*`: To interact with the VK API.

## Contribution

Suggestions and pull requests are welcome! Please feel free to submit an issue or a pull request.

---

This project was bootstrapped with [Chrome Extension CLI](https://github.com/dutiyesh/chrome-extension-cli).
