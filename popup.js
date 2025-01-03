(function () {
    "use strict";
    chrome.tabs.query({"active": true, "lastFocusedWindow": true}, (tabs) => {
        const chatId = extractChatId(tabs[0].url);
        if (!chatId) {
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
        fetchBtn.addEventListener("click", () => {
            chrome.tabs.create({url: `fetch.html?chatId=${chatId}`, selected: true}, () => {});
        });
    });

    /**
     * @param {string} url
     * @return {string|null}
     */
    const extractChatId = (url) => {
        const urlParser = new URL(url);
        if (urlParser.hostname !== "vk.com") {
            return null;
        }
        const pathParts = urlParser.pathname.split("/");
        // Checking for path urls to match the pattern vk.com/im/convo/{xxxx} where {xxxx} is message id.
        if (pathParts.length === 4 && pathParts.slice(0, 3).join("/") === "/im/convo") {
            return pathParts[3];
        }
        // Checking for old format vk.com/im?sel={xxxx}, where {xxxx} can be group id starting from "c" or numeric id.
        if (pathParts.length === 2 && urlParser.pathname === "/im") {
            const selParam = urlParser.searchParams.get("sel");
            if (selParam.charAt(0) === "c") {
                const selNumber = Number.parseInt(selParam.slice(1))
                if (!isNaN(selNumber)) {
                    return (2000000000 + selNumber).toString()
                }
            } else {
                return selParam;
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
