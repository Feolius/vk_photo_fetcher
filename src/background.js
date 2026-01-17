const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
const VK_API_URL = "https://api.vk.com/method";
const VK_API_VERSION = "5.199";
const ITEMS_PER_PAGE = 100;
const VK_APP_ID = "xxxx";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const action = request.action || "";
    (async () => {
        if (action === "auth") {
            const registerLink = `https://oauth.vk.com/authorize?client_id=${VK_APP_ID}&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=messages&response_type=token&v=${VK_API_VERSION}&state=123456`;
            const tab = await chrome.tabs.create({url: registerLink, selected: true});
            chrome.storage.local.set({authTabId: tab.id})
            sendResponse({result: "Ok"});
        }

        if (action === "fetchPhotoAttachments") {
            request.chatId = request.chatId || "";
            if (request.chatId === "") {
                sendResponse({error: {error_msg: "Empty chat id"}});
                return;
            }
            const peerId = Number.parseInt(request.chatId);
            if (isNaN(peerId)) {
                sendResponse({error: {error_msg: "Wrong chat id"}});
                return;
            }
            const items = await chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}});
            const vkAccessToken = items[VK_ACCESS_TOKEN_STORAGE_KEY];
            const apiRequestUrl = new URL(`${VK_API_URL}/messages.getHistoryAttachments`);
            apiRequestUrl.searchParams.set("peer_id", peerId);
            if (request.groupId && !isNaN(Number.parseInt(request.groupId))) {
                apiRequestUrl.searchParams.set("group_id", request.groupId)
            }
            apiRequestUrl.searchParams.set("access_token", vkAccessToken);
            apiRequestUrl.searchParams.set("media_type", "photo");
            apiRequestUrl.searchParams.set("photo_sizes", "1");
            apiRequestUrl.searchParams.set("count", ITEMS_PER_PAGE.toString());
            apiRequestUrl.searchParams.set("v", VK_API_VERSION);
            if (request.nextFrom !== undefined && request.nextFrom !== "0") {
                apiRequestUrl.searchParams.set("start_from", request.nextFrom);
            }
            try {
                const response = await fetch(apiRequestUrl.toString())
                if (!response.ok) {
                    sendResponse({error: {error_msg: `VK messages.getHistoryAttachments api call error. ${response.status}: ${response.statusText}`}})
                    return;
                }
                const responseData = await response.json();
                if (responseData.error) {
                    sendResponse({error: responseData.error});
                    return;
                }
                sendResponse({result: responseData.response});
            } catch (error) {
                sendResponse({error: {error_msg: error.message}});
            }
        }
    })();

    return true;
});

const filter = {
    url: [
        {
            urlMatches: 'https://oauth.vk.com/',
        },
    ],
};

chrome.webNavigation.onCompleted.addListener(async ({tabId, url}) => {
    const { authTabId } = await chrome.storage.local.get(["authTabId"]);
    if (authTabId === tabId && url) {
        const vkAccessToken = fetchParamValueFromUrl(url, "access_token");
        if (vkAccessToken === "") {
            let error = fetchParamValueFromUrl(url, "error_description");
            if (error === "") {
                error = "Unknown VK auth error";
            }
            await chrome.runtime.sendMessage({resultType: "auth", result: "error", msg: error});
            return;
        }
        await chrome.storage.local.set({[VK_ACCESS_TOKEN_STORAGE_KEY]: vkAccessToken});
        await chrome.tabs.remove(tabId);
        await chrome.runtime.sendMessage({resultType: "auth", result: "success"})
    }
}, filter);

const fetchParamValueFromUrl = (url, param) => {
    const urlParamsString = url.substr(url.indexOf("#") + 1);
    const urlParams = urlParamsString.split("&");
    for (let i = 0; i < urlParams.length; i++) {
        const paramKeyValue = urlParams[i].split("=");
        if (paramKeyValue[0] === param) {
            return paramKeyValue[1];
        }
    }
    return "";
}


