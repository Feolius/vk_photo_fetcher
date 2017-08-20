"use strict";
const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}}, function (items) {
    if (items[VK_ACCESS_TOKEN_STORAGE_KEY].length === undefined) {
        // We need to insert button for VK auth.
        let authBtnWrapper = document.createElement("div");
        let authBtn = document.createElement("button");
        let authBtnText = document.createTextNode("Auth");
        authBtn.appendChild(authBtnText);
        authBtnWrapper.appendChild(authBtn);
        document.body.appendChild(authBtnWrapper);
        authBtn.addEventListener("click", function () {
            chrome.runtime.sendMessage({action: "auth"});
        });
    } else {
        chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
            let url = tabs[0].url;
            let urlParser = document.createElement('a');
            urlParser.href = url;
            let messageId = "";
            if (urlParser.hostname === "vk.com") {
                // Remove ? symbol.
                let paramsKeysValues = urlParser.search.substring(1).split("&");
                for (let i = 0; i < paramsKeysValues.length; i++) {
                    let paramKeyValue = paramsKeysValues[i].split("=");
                    if (paramKeyValue[0] === "sel")
                        messageId = paramKeyValue[1];
                }
            }
            if(messageId !== "") {
                let fetchBtnWrapper = document.createElement("div");
                let fetchBtn = document.createElement("button");
                let fetchBtnText = document.createTextNode("Fetch");
                fetchBtn.appendChild(fetchBtnText);
                fetchBtnWrapper.appendChild(fetchBtn);
                document.body.appendChild(fetchBtnWrapper);
                fetchBtn.addEventListener("click", function () {
                    chrome.tabs.create({url: "fetch.html?messageId=" + messageId, selected: true}, function (tab) {

                    });

                });
            } else {
                showErrors(["In order to fetch photos you need to be on a message page."])
            }


        });
    }
});

function showErrors(errors) {
    let errorsContainer = document.getElementById("errors-container");
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