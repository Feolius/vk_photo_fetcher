"use strict";
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
    chrome.runtime.sendMessage({action: "fetchPhotoAttachments", messageId: messageId}, function (response) {
        if(response.error !== undefined) {
            console.log(response.error);
        } else if(response.result !== undefined) {
            let container = $(".container");
            container.empty();
            container.append('<select multiple="multiple" class="photo-select image-picker masonry">');
            let select = $(".photo-select");
            for (let i = 0; i < response.result.length; i++) {
                let photo = response.result[i].attachment.photo;
                select.append('<option data-img-src="' + photo.photo_604 + '" value="' + photo.id +'">Option' + i + '</option>')
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
    console.log(messageId);
});