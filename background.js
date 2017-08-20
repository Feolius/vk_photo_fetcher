"use strict";
const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
const VK_API_URL = "https://api.vk.com/method";
const VK_API_VERSION = "5.68";
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action !== undefined && request.action === "auth") {
        if (request.action === "auth") {
            let registerLink = "https://oauth.vk.com/authorize?client_id=6141259&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=messages&response_type=token&v=5.67&state=123456";
            chrome.tabs.create({url: registerLink, selected: true}, function (tab) {
                chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
                    if (tab.id === tabId && changeInfo.status !== undefined && changeInfo.status === "loading") {
                        let vkAccessToken = "";
                        let urlParamsString = changeInfo.url.substr(changeInfo.url.indexOf("#") + 1);
                        let urlParams = urlParamsString.split("&");
                        for (let i = 0; i < urlParams.length; i++) {
                            let paramKeyValue = urlParams[i].split("=");
                            if (paramKeyValue[0] === "access_token") {
                                vkAccessToken = paramKeyValue[1];
                                break;
                            }
                        }
                        chrome.tabs.remove(tabId, function () {
                            if (vkAccessToken === "") {
                                console.log("VK auth error");
                            } else {
                                chrome.storage.local.set({[VK_ACCESS_TOKEN_STORAGE_KEY]: vkAccessToken});
                            }
                        });
                    }
                });
            });
        }
    }

    if (request.action === "fetchPhotoAttachments") {
        if (request.messageId !== undefined && request.messageId !== "") {
            let peerId = Number.parseInt(request.messageId);
            let firstChar = request.messageId.slice(0, 1);
            if (firstChar === "c") {
                // For group chats need to add 2000000000 in order to get peer id.
                peerId = Number.parseInt(request.messageId.slice(1));
                peerId += 2000000000;
            }
            if (!isNaN(peerId)) {
                chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}}, function (items) {
                    let vkAccessToken = items[VK_ACCESS_TOKEN_STORAGE_KEY];
                    let apiRequestUrl = VK_API_URL + '/messages.getHistoryAttachments?peer_id=' + peerId +
                        '&access_token=' + vkAccessToken + '&media_type=photo&v=' + VK_API_VERSION;
                    let xhr = new XMLHttpRequest();
                    xhr.open('GET', apiRequestUrl, true);
                    xhr.send();
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4) {
                            if (xhr.status === 200) {
                                let response = JSON.parse(xhr.responseText);
                                if(response.error === undefined) {
                                    if(response.response.items !== undefined) {
                                        sendResponse({result: response.response.items});
                                    } else {
                                        sendResponse({error: "VK messages.getHistoryAttachments api call error. Items list is undefined in getHistoryAttachment call."})
                                    }
                                } else {
                                    sendResponse({error: "VK messages.getHistoryAttachments api call error. " + response.error.error_msg});
                                }
                                console.log(response);

                            } else {
                                sendResponse({error: "VK messages.getHistoryAttachments api call error. " + xhr.status + ": " + xhr.statusText});
                            }
                        }
                    };
                });
                return true;
            } else {
                sendResponse({error: "Wrong message id"});
            }
        } else {
            sendResponse({error: "Empty message id"});
        }
    }
});