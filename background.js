(function () {
    "use strict";
    const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
    const VK_API_URL = "https://api.vk.com/method";
    const VK_API_VERSION = "5.76";
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        request.action = request.action || "";
        if (request.action === "auth") {
            const registerLink = `https://oauth.vk.com/authorize?client_id=6141259&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=messages&response_type=token&v=${VK_API_VERSION}&state=123456`;
            chrome.tabs.create({url: registerLink, selected: true}, (authTab) => {
                function authTabUpdateCb(tabId, changeInfo, tab) {
                    if (authTab.id === tabId && changeInfo.status !== undefined && changeInfo.status === "loading") {
                        let vkAccessToken = fetchParamValueFromUrl(changeInfo.url, "access_token");
                        let response = {result: "Ok"};
                        if (vkAccessToken !== "") {
                            chrome.storage.local.set({pf_vkaccess_token: vkAccessToken}, () => {
                                chrome.tabs.remove(tabId, () => {
                                    chrome.tabs.onUpdated.removeListener(authTabUpdateCb);
                                    sendResponse(response);
                                });
                            });
                        } else {
                            let error = fetchParamValueFromUrl(changeInfo.url, "error_description");
                            if (error === "") {
                                error = "Unknown VK auth error";
                            }
                            response = {error: error};
                            // @TODO and what should we do here?
                        }
                    }
                }

                chrome.tabs.onUpdated.addListener(authTabUpdateCb);
            });
            return true;
        }

        if (request.action === "fetchPhotoAttachments") {
            request.messageId = request.messageId || "";
            if (request.messageId !== "") {
                let peerId = Number.parseInt(request.messageId);
                if (request.messageId.slice(0, 1) === "c") {
                    // For group chats it is needed to add 2000000000 in order to get proper peer id.
                    peerId = Number.parseInt(request.messageId.slice(1));
                    peerId += 2000000000;
                }
                if (!isNaN(peerId)) {
                    chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}}, (items) => {
                        const vkAccessToken = items[VK_ACCESS_TOKEN_STORAGE_KEY];
                        let apiRequestUrl = `${VK_API_URL}/messages.getHistoryAttachments?peer_id=${peerId}&access_token=${vkAccessToken}&media_type=photo&v=${VK_API_VERSION}`;
                        if (request.nextFrom !== undefined && request.nextFrom !== "0") {
                            apiRequestUrl += "&start_from=" + request.nextFrom;
                        }
                        fetch(apiRequestUrl)
                            .then((response) => {
                                if (response.ok) {
                                    return response.json();
                                } else {
                                    throw new Error(`VK messages.getHistoryAttachments api call error. ${response.status}: ${response.statusText}`);
                                }
                            })
                            .then((response) => {
                                if (response.error === undefined) {
                                    sendResponse({result: response.response});
                                } else {
                                    sendResponse({error: response.error});
                                }
                            })
                            .catch((error) => {
                                sendResponse({error: error.message});
                            });
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

    function fetchParamValueFromUrl(url, param) {
        let value = "";
        let urlParamsString = url.substr(url.indexOf("#") + 1);
        let urlParams = urlParamsString.split("&");
        for (let i = 0; i < urlParams.length; i++) {
            let paramKeyValue = urlParams[i].split("=");
            if (paramKeyValue[0] === param) {
                value = paramKeyValue[1];
                break;
            }
        }
        return value;
    }
})();


