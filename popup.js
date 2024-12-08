(function () {
    "use strict";
    chrome.tabs.query({"active": true, "lastFocusedWindow": true}, (tabs) => {
        const urlParser = new URL(tabs[0].url);
        // We are checking for path urls to match the pattern vk.com/im/convo/{xxxx} where {xxxx} is message id.
        const pathParts = urlParser.pathname.split("/");
        if (urlParser.hostname !== "vk.com" || pathParts.length !== 4 ||
            pathParts[0] !== "" || pathParts[1] !== "im" || pathParts[2] !== "convo") {
            displayErrors([chrome.i18n.getMessage("outOfDialogPageMsg")]);
            return;
        }
        const messageId = pathParts[3];

        const fetchBtnWrapper = document.createElement("div");
        const fetchBtn = document.createElement("button");
        const fetchBtnText = document.createTextNode(chrome.i18n.getMessage("getPhotosBtnTxt"));
        fetchBtn.appendChild(fetchBtnText);
        fetchBtn.classList.add("btn");
        fetchBtn.classList.add("btn-primary");
        fetchBtnWrapper.appendChild(fetchBtn);
        const container = document.getElementsByClassName("container");
        container[0].appendChild(fetchBtnWrapper);
        document.body.appendChild(fetchBtnWrapper);
        fetchBtn.addEventListener("click", () => {
            chrome.tabs.create({url: `fetch.html?messageId=${messageId}`, selected: true}, () => {});
        });
    });

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
