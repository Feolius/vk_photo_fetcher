"use strict";
const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
$(function() {
    let currentUrl = window.location.href;
    let urlParser = document.createElement('a');
    urlParser.href = currentUrl;
    let paramsKeysValues = urlParser.search.substring(1).split("&");
    let messageId = "";
    for (let i = 0; i < paramsKeysValues.length; i++) {
        let paramKeyValue = paramsKeysValues[i].split("=");
        if (paramKeyValue[0] === "messageId") {
            messageId = paramKeyValue[1];
        }
    }
    let container = $(".container");
    chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}}, function (items) {
        if (items[VK_ACCESS_TOKEN_STORAGE_KEY].length === undefined) {
            container.empty();
            let errorContainer = $('<div class="errors-container bg-danger"></div>');
            container.append(errorContainer);
            container.append('<div class="text-primary">Authorization needed. Click to authorize in VK.</div>');
            let authBtn = $('<button type="button" class="btn btn-primary vk-auth-btn">VK auth</button>');
            container.append(authBtn);
            authBtn.click(function () {
                chrome.runtime.sendMessage({action: "auth"}, function (response) {
                    if(response.error !== undefined) {
                        errorContainer.html(response.error);
                    } else {
                        location.reload(true);
                    }
                });
            });
        } else {
            chrome.runtime.sendMessage({action: "fetchPhotoAttachments", messageId: messageId}, function (response) {
                if(response.error !== undefined) {
                    if(response.error.error_code !== undefined && response.error.error_code === 5) {
                        chrome.storage.local.remove(VK_ACCESS_TOKEN_STORAGE_KEY, function () {
                            location.reload(true);
                        });
                    } else {
                        container.empty();
                        container.append('<div class="bg-danger">Photo fetch error: ' + response.error + '</div>');
                    }
                } else if(response.result !== undefined) {
                    let items = response.result.items;
                    container.empty();
                    container.append('<select multiple="multiple" class="photo-select image-picker masonry">');
                    let select = $(".photo-select");
                    let photos = [];
                    // Get rid of duplicates here using photo id.
                    for (let i = 0; i < items.length; i++) {
                        let photo = items[i].attachment.photo;
                        photos[photo.id] = photo;
                    }
                    for (let id in photos) {
                        let photo = photos[id];
                        select.append('<option data-img-src="' + photo.photo_604 + '" value="' + id +'">Option' + id + '</option>');
                    }
                    select.imagepicker();
                    let pickerContainer = select.next("ul.thumbnails");
                    pickerContainer.imagesLoaded(function(){
                        pickerContainer.masonry({
                            itemSelector:   "li",
                        });
                    });

                    console.log(response.result);
                }

            });
        }
    });

});