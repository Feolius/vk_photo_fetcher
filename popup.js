(function () {
    "use strict";
    chrome.tabs.query({"active": true, "lastFocusedWindow": true}, (tabs) => {
        const url = tabs[0].url;
        const urlParser = document.createElement('a');
        urlParser.href = url;
        let messageId = "";
        if (urlParser.hostname === "vk.com") {
            // Remove ? symbol.
            const paramsKeysValues = urlParser.search.substring(1).split("&");
            for (let i = 0; i < paramsKeysValues.length; i++) {
                let paramKeyValue = paramsKeysValues[i].split("=");
                if (paramKeyValue[0] === "sel") {
                    messageId = paramKeyValue[1];
                }
            }
        }
        if(messageId !== "") {
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
        } else {
            displayErrors([chrome.i18n.getMessage("outOfDialogPageMsg")]);
        }
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