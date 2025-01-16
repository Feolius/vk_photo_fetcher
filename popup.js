(function () {
    "use strict";
    /**
     * @typedef {Object} ChatContext
     * @property {string} chatId
     * @property {string|null} groupId
     */

    chrome.tabs.query({"active": true, "lastFocusedWindow": true}, (tabs) => {
        const chatCtx = extractChatId(tabs[0].url);
        if (!chatCtx) {
            displayErrors([chrome.i18n.getMessage("outOfDialogPageMsg")]);
            return;
        }

        const fetchBtnWrapper = document.createElement("div");
        const fetchBtn = document.createElement("button");
        const fetchBtnText = document.createTextNode(chrome.i18n.getMessage("getPhotosBtnTxt"));
        fetchBtn.appendChild(fetchBtnText);
        fetchBtn.classList.add("btn");
        fetchBtn.classList.add("btn-primary");
        fetchBtnWrapper.appendChild(fetchBtn);
        const container = document.getElementsByClassName("container");
        container[0].appendChild(fetchBtnWrapper);
        let tabUrl = `fetch.html?chatId=${chatCtx.chatId}`;
        if (chatCtx.groupId) {
            tabUrl += `&groupId=${chatCtx.groupId}`;
        }
        fetchBtn.addEventListener("click", () => {
            chrome.tabs.create({url: tabUrl, selected: true}, () => {});
        });
    });

    /**
     * @param {string} url
     * @returns {ChatContext|null}
     */
    const extractChatId = (url) => {
        const urlParser = new URL(url);
        if (urlParser.hostname !== "vk.com") {
            return null;
        }
        const pathParts = urlParser.pathname.split("/");
        // Checking for path urls to match the pattern vk.com/im/convo/{xxxx} where {xxxx} is chat id.
        if (pathParts.length === 4 && pathParts.slice(0, 3).join("/") === "/im/convo") {
            return {chatId: pathParts[3], groupId: null};
        }
        // Checking for old format vk.com/im?sel={xxxx} and for vk.com/gim12345?sel={xxxx}, where {xxxx} is a chat id.
        // Chat id may start from "c" for the first link type, in this case it must be increased by 2000000000.
        // In case of second link, it is a group (community) related id, and 12345 is a group id.
        if (pathParts.length === 2) {
            const selParam = urlParser.searchParams.get("sel");
            if (selParam === null) {
                return null;
            }
            if (urlParser.pathname !== "/im" && !urlParser.pathname.startsWith("/gim")) {
                return null;
            }
            const groupId = urlParser.pathname.startsWith("/gim") ? urlParser.pathname.slice(4) : null;
            if (selParam.charAt(0) === "c") {
                const selNumber = Number.parseInt(selParam.slice(1));
                if (!isNaN(selNumber)) {
                    return {chatId: (2000000000 + selNumber).toString(), groupId}
                }
            } else {
                return {chatId: selParam, groupId};
            }
        }
        return null;
    }

    function displayErrors(errors) {
        const errorsContainer = document.getElementById("errors-container");
        while (errorsContainer.firstChild !== null) {
            errorsContainer.removeChild(errorsContainer.firstChild);
        }
        for (let i = 0; i < errors.length; i++) {
            let errorText = document.createTextNode(errors[i]);
            let errorElement = document.createElement("div");
            errorElement.className = "error";
            errorElement.appendChild(errorText);
            errorsContainer.appendChild(errorElement);
        }
    }
})();
