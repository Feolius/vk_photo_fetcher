"use strict";
const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}}, function (items) {
    let needAuth = false;
    let vkAccessToken = items[VK_ACCESS_TOKEN_STORAGE_KEY];
    if(vkAccessToken.length !== undefined) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://api.vk.com/method/secure.checkToken?token=' + vkAccessToken + '&v=5.67', true);
        xhr.send();
        xhr.onreadystatechange = function () {
            if(xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log(xhr.responseText);
                } else {
                    console.log(xhr.status + ": " + xhr.statusText);
                }
            }
        };
    }
    if (needAuth) {
        // We need to insert button for VK auth.
        let authBtnWrapper = document.createElement("div");
        let authBtn = document.createElement("button");
        let authBtnText = document.createTextNode("Auth");
        authBtn.appendChild(authBtnText);
        authBtnWrapper.appendChild(authBtn);
        document.body.appendChild(authBtnWrapper);
        authBtn.addEventListener("click", function () {
            chrome.runtime.sendMessage({action: "auth"}, function (response) {

            });

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
                console.log(paramsKeysValues);
                for (let i = 0; i < paramsKeysValues.length; i++) {
                    let paramKeyValue = paramsKeysValues[i].split("=");
                    console.log(paramKeyValue);
                    if (paramKeyValue[0] === "sel")
                        messageId = paramKeyValue[1];
                }
            }
            console.log(messageId);
            if(messageId !== "") {
                let xhr = new XMLHttpRequest();
                xhr.open('GET', 'https://api.vk.com/method/users.get?user_id=210700286&v=5.52', true);
                xhr.send();
                xhr.onreadystatechange = function () {
                    if(xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            console.log(xhr.responseText);
                        } else {
                            console.log(xhr.status + ": " + xhr.statusText);
                        }
                    }
                };

            }


        });
    }
});

function showErrors(errors) {
    let errorsContainer = document.getElementById("errors-container");
    while (errorsContainer.firstChild) {
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