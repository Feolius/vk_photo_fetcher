chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action !== undefined && request.action === "auth") {
        let registerLink = "https://oauth.vk.com/authorize?client_id=6141259&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=messages&response_type=token&v=5.67&state=123456";
        chrome.tabs.create({url: registerLink, selected: true}, function (tab) {
            chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
                if (tab.id === tabId) {
                    if (changeInfo.status !== undefined && changeInfo.status === "loading") {
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
                        chrome.runtime.onMessage.removeListener(arguments.callee);
                        chrome.tabs.remove(tabId, function () {
                            if (vkAccessToken === "") {
                                sendResponse({error: "VK app auth error"});
                            } else {
                                sendResponse({token: vkAccessToken});
                            }
                        });
                    }
                }


            });
        });
    }

});