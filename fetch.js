"use strict";
const VK_ACCESS_TOKEN_STORAGE_KEY = 'pf_vkaccess_token';
$(function () {
    initLayout();
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

    chrome.storage.local.get({[VK_ACCESS_TOKEN_STORAGE_KEY]: {}}, function (items) {
        let imagesContainer = $('.images-container');

        function pushPhotosIntoSelect(photos, select) {
            for (let id in photos) {
                if (photos.hasOwnProperty(id)) {
                    let photo = photos[id];
                    select.append('<option data-img-src="' + photo.photo_604 + '" value="' + id + '">Option' + id + '</option>');
                }
            }
            select.imagepicker();
            let pickerContainer = select.next("ul.thumbnails");
            pickerContainer.imagesLoaded(function () {
                pickerContainer.masonry({
                    itemSelector: "li",
                });
            });
        }

        if (items[VK_ACCESS_TOKEN_STORAGE_KEY].length === undefined) {
            initLayout();
            displayErrors(["Authorisation needed. Click to authorize in VK."]);
            let authBtn = $('<button type="button" class="btn btn-primary vk-auth-btn">VK auth</button>');
            let container = $(".container");
            container.append(authBtn);
            authBtn.click(function () {
                chrome.runtime.sendMessage({action: "auth"}, function (response) {
                    if (response.error !== undefined) {
                        initLayout();
                        displayErrors([response.error]);
                    } else {
                        location.reload(true);
                    }
                });
            });
        } else {
            let selectClass = 'photo-select';
            let selectTag = '<select multiple="multiple" class="image-picker masonry">';
            let select = $(selectTag);
            select.addClass(selectClass);
            imagesContainer.append(select);
            let photoFetcher = new PhotoFetcher();
            photoFetcher.fetchNext(function (photos) {
                pushPhotosIntoSelect(photos, select);
            });
            let btnWrapper = $('.btn-wrapper');
            let moreBtn = $('<button type="button" class="btn btn-primary more-btn">Get more photos</button>');
            btnWrapper.append(moreBtn);
            moreBtn.click(function () {
                let divider = $('<hr />');
                imagesContainer.append(divider);
                let select = $(selectTag);
                select.addClass(selectClass);
                imagesContainer.append(select);
                photoFetcher.fetchNext(function (photos) {
                    pushPhotosIntoSelect(photos, select);
                    $('html, body').animate({
                        scrollTop: divider.offset().top
                    }, 1000);
                });
            });
            let downloadBtn = $('<button type="button" class="btn btn-primary download-btn">Download</button>');
            btnWrapper.append(downloadBtn);
            downloadBtn.click(function () {
                $('.' + selectClass).children('option:selected').each(function (index) {
                    let id = this.value;
                    let photo = photoFetcher.photos[id];
                    let link = getPhotoBestResolutionLink(photo);
                    chrome.downloads.download({
                        url: link
                    });
                });
            });
        }
    });

    function PhotoFetcher() {
        this.photos = [];
        this._nextFrom = "0";
    }

    PhotoFetcher.prototype.fetchNext = function (callback) {
        let self = this;
        chrome.runtime.sendMessage({
            action: "fetchPhotoAttachments",
            messageId: messageId,
            nextFrom: this._nextFrom
        }, function (response) {
            if (response.error !== undefined) {
                if (response.error.error_code !== undefined && response.error.error_code === 5) {
                    chrome.storage.local.remove(VK_ACCESS_TOKEN_STORAGE_KEY, function () {
                        location.reload(true);
                    });
                } else {
                    displayErrors(['Photo fetch error: ' + response.error]);
                }
            } else if (response.result !== undefined) {
                let items = response.result.items;
                // Get rid of duplicates here using photo id.
                let photos = [];
                for (let i = 0, j = items.length; i < j; i++) {
                    let photo = items[i].attachment.photo;
                    self.photos[photo.id] = photo;
                    photos[photo.id] = photo;
                }
                self._nextFrom = response.result.next_from;
                callback.call(self, photos);
            }

        });
    };

    function displayErrors(errors) {
        let errorsContainer = $('.errors-container');
        errorsContainer.empty();
        for (let i = 0, j = errors.length; i < j; i++) {
            errorsContainer.append('<div class="error">' + errors[i] + '</div>');
        }
    }

    function initLayout() {
        let container = $(".container");
        container.empty();
        let errorContainer = $('<div class="errors-container bg-danger"></div>');
        container.append(errorContainer);
        let imagesContainer = $('<div class="images-container"></div>');
        container.append(imagesContainer);
        let btnWrapper = $('<div class="btn-wrapper"></div>');
        container.append(btnWrapper);
    }

    function getPhotoBestResolutionLink(photo) {
        let link = "";
        let sizePriorities = ["2560", "1280", "807", "604", "130", "75"];
        for (let i = 0, j = sizePriorities.length; i < j; i++) {
            if(photo["photo_" + sizePriorities[i]] !== undefined) {
                link = photo["photo_" + sizePriorities[i]];
                break;
            }
        }
        return link;
    }

});