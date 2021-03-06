﻿define(['dialogHelper', 'layoutManager', 'globalize', 'emby-button', 'css!./actionsheet', 'html!./../icons/nav.html', 'scrollStyles'], function (dialogHelper, layoutManager, globalize) {

    function parentWithClass(elem, className) {

        while (!elem.classList || !elem.classList.contains(className)) {
            elem = elem.parentNode;

            if (!elem) {
                return null;
            }
        }

        return elem;
    }

    function getOffsets(elems) {

        var doc = document;
        var results = [];

        if (!doc) {
            return results;
        }

        var box;
        var elem;

        for (var i = 0, length = elems.length; i < length; i++) {

            elem = elems[i];
            // Support: BlackBerry 5, iOS 3 (original iPhone)
            // If we don't have gBCR, just use 0,0 rather than error
            if (elem.getBoundingClientRect) {
                box = elem.getBoundingClientRect();
            } else {
                box = { top: 0, left: 0 };
            }

            results[i] = {
                top: box.top,
                left: box.left
            };
        }

        return results;
    }

    function getPosition(options, dlg) {

        var windowHeight = window.innerHeight;

        if (windowHeight < 540) {
            return null;
        }

        var pos = getOffsets([options.positionTo])[0];

        pos.top += options.positionTo.offsetHeight / 2;
        pos.left += options.positionTo.offsetWidth / 2;

        // Account for popup size 
        pos.top -= ((dlg.offsetHeight || 300) / 2);
        pos.left -= ((dlg.offsetWidth || 160) / 2);

        // Avoid showing too close to the bottom
        pos.top = Math.min(pos.top, windowHeight - 300);
        pos.left = Math.min(pos.left, window.innerWidth - 300);

        // Do some boundary checking
        pos.top = Math.max(pos.top, 10);
        pos.left = Math.max(pos.left, 10);

        return pos;
    }

    function addCenterFocus(dlg) {

        require(['scrollHelper'], function (scrollHelper) {
            scrollHelper.centerFocus.on(dlg.querySelector('.actionSheetScroller'), false);
        });
    }

    function show(options) {

        // items
        // positionTo
        // showCancel
        // title
        var dialogOptions = {
            removeOnClose: true,
            enableHistory: options.enableHistory,
            scrollY: false
        };

        var backButton = false;

        if (layoutManager.tv) {
            dialogOptions.size = 'fullscreen';
            backButton = true;
            dialogOptions.autoFocus = true;
        } else {

            dialogOptions.modal = false;
            dialogOptions.entryAnimationDuration = 160;
            dialogOptions.exitAnimationDuration = 200;
            dialogOptions.autoFocus = false;
        }

        var dlg = dialogHelper.createDialog(dialogOptions);

        if (!layoutManager.tv) {
            dlg.classList.add('extraSpacing');
        }

        dlg.classList.add('actionSheet');

        var html = '';
        html += '<div class="actionSheetContent">';

        if (options.title) {

            if (layoutManager.tv) {
                html += '<h1 class="actionSheetTitle">';
                html += options.title;
                html += '</h1>';
            } else {
                html += '<h2 class="actionSheetTitle">';
                html += options.title;
                html += '</h2>';
            }
        }

        html += '<div class="actionSheetScroller hiddenScrollY">';

        var i, length, option;
        var renderIcon = false;
        for (i = 0, length = options.items.length; i < length; i++) {

            option = options.items[i];
            option.ironIcon = option.selected ? 'nav:check' : null;

            if (option.ironIcon) {
                renderIcon = true;
            }
        }

        // If any items have an icon, give them all an icon just to make sure they're all lined up evenly
        var center = options.title && (!renderIcon /*|| itemsWithIcons.length != options.items.length*/);

        if (center) {
            dlg.classList.add('centered');
        }

        var itemTagName = 'button';

        for (i = 0, length = options.items.length; i < length; i++) {

            option = options.items[i];

            var autoFocus = option.selected ? ' autoFocus' : '';
            html += '<' + itemTagName + autoFocus + ' is="emby-button" type="button" class="actionSheetMenuItem" data-id="' + (option.id || option.value) + '">';

            if (option.ironIcon) {
                html += '<iron-icon class="actionSheetItemIcon" icon="' + option.ironIcon + '"></iron-icon>';
            }
            else if (renderIcon && !center) {
                html += '<iron-icon class="actionSheetItemIcon"></iron-icon>';
            }
            html += '<div class="actionSheetItemText">' + (option.name || option.textContent || option.innerText) + '</div>';
            html += '</' + itemTagName + '>';
        }

        if (options.showCancel) {
            html += '<div class="buttons">';
            html += '<button is="emby-button" type="button" class="btnCancel">' + globalize.translate('sharedcomponents#ButtonCancel') + '</button>';
            html += '</div>';
        }
        html += '</div>';

        dlg.innerHTML = html;

        if (layoutManager.tv) {
            addCenterFocus(dlg);
        }

        if (options.showCancel) {
            dlg.querySelector('.btnCancel').addEventListener('click', function () {
                dialogHelper.close(dlg);
            });
        }

        document.body.appendChild(dlg);

        // Seeing an issue in some non-chrome browsers where this is requiring a double click
        //var eventName = browser.firefox ? 'mousedown' : 'click';
        var selectedId;

        dlg.addEventListener('click', function (e) {

            var actionSheetMenuItem = parentWithClass(e.target, 'actionSheetMenuItem');

            if (actionSheetMenuItem) {
                selectedId = actionSheetMenuItem.getAttribute('data-id');
                dialogHelper.close(dlg);
            }

        });

        return new Promise(function (resolve, reject) {

            dlg.addEventListener('close', function () {

                if (selectedId != null) {
                    if (options.callback) {
                        options.callback(selectedId);
                    }

                    resolve(selectedId);
                }
            });

            dialogHelper.open(dlg);

            var pos = options.positionTo ? getPosition(options, dlg) : null;

            if (pos) {
                dlg.style.position = 'fixed';
                dlg.style.margin = 0;
                dlg.style.left = pos.left + 'px';
                dlg.style.top = pos.top + 'px';
            }
        });
    }

    return {
        show: show
    };
});