﻿define(['libraryBrowser', 'appSettings', 'scrollStyles', 'emby-button', 'paper-icon-button-light'], function (LibraryBrowser, appSettings) {

    function getUserViews(userId) {

        return ApiClient.getUserViews({}, userId).then(function (result) {

            var items = result.Items;

            var list = [];

            for (var i = 0, length = items.length; i < length; i++) {

                var view = items[i];

                if (AppInfo.isNativeApp && browserInfo.safari && view.CollectionType == 'livetv') {
                    continue;
                }

                list.push(view);
            }

            return list;
        });
    }

    function enableScrollX() {

        return browserInfo.mobile && AppInfo.enableAppLayouts;
    }

    function getThumbShape() {
        return enableScrollX() ? 'overflowBackdrop' : 'backdrop';
    }

    function getPortraitShape() {
        return enableScrollX() ? 'overflowPortrait' : 'portrait';
    }

    function getLibraryButtonsHtml(items) {

        var html = "";

        // "My Library" backgrounds
        for (var i = 0, length = items.length; i < length; i++) {

            var item = items[i];

            var icon;
            var backgroundColor = 'rgba(82, 181, 75, 0.9)';

            switch (item.CollectionType) {
                case "movies":
                    icon = "local-movies";
                    backgroundColor = 'rgba(176, 94, 81, 0.9)';
                    break;
                case "music":
                    icon = "library-music";
                    backgroundColor = 'rgba(217, 145, 67, 0.9)';
                    break;
                case "photos":
                    icon = "photo";
                    backgroundColor = 'rgba(127, 0, 0, 0.9)';
                    break;
                case "livetv":
                    icon = "live-tv";
                    backgroundColor = 'rgba(217, 145, 67, 0.9)';
                    break;
                case "tvshows":
                    icon = "live-tv";
                    backgroundColor = 'rgba(77, 88, 164, 0.9)';
                    break;
                case "games":
                    icon = "folder";
                    backgroundColor = 'rgba(183, 202, 72, 0.9)';
                    break;
                case "trailers":
                    icon = "local-movies";
                    backgroundColor = 'rgba(176, 94, 81, 0.9)';
                    break;
                case "homevideos":
                    icon = "video-library";
                    backgroundColor = 'rgba(110, 52, 32, 0.9)';
                    break;
                case "musicvideos":
                    icon = "video-library";
                    backgroundColor = 'rgba(143, 54, 168, 0.9)';
                    break;
                case "books":
                    icon = "folder";
                    break;
                case "channels":
                    icon = "folder";
                    backgroundColor = 'rgba(51, 136, 204, 0.9)';
                    break;
                case "playlists":
                    icon = "folder";
                    break;
                default:
                    icon = "folder";
                    break;
            }

            var cssClass = 'card smallBackdropCard buttonCard';

            if (item.CollectionType) {
                cssClass += ' ' + item.CollectionType + 'buttonCard';
            }

            var href = item.url || LibraryBrowser.getHref(item);
            var onclick = item.onclick ? ' onclick="' + item.onclick + '"' : '';

            icon = item.icon || icon;

            html += '<a' + onclick + ' data-itemid="' + item.Id + '" class="' + cssClass + '" href="' + href + '">';
            html += '<div class="cardBox" style="background-color:' + backgroundColor + ';margin:4px;border-radius:4px;">';

            html += "<div class='cardText' style='padding:8px 10px;color:#fff;'>";
            html += '<iron-icon icon="' + icon + '"></iron-icon>';
            html += '<span style="margin-left:.7em;">' + item.Name + '</span>';
            html += "</div>";

            html += "</div>";

            html += "</a>";
        }

        return html;
    }

    function loadlibraryButtons(elem, userId, index) {

        return getUserViews(userId).then(function (items) {

            var html = '<br/>';

            if (index) {
                html += '<h1 class="listHeader">' + Globalize.translate('HeaderMyMedia') + '</h1>';
            }
            html += '<div>';
            html += getLibraryButtonsHtml(items);
            html += '</div>';

            return getAppInfo().then(function (infoHtml) {

                elem.innerHTML = html + infoHtml;
            });
        });
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive)
     * Using Math.round() will give you a non-uniform distribution!
     */
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getAppInfo() {

        var frequency = 86400000;

        if (AppInfo.isNativeApp) {
            frequency = 172800000;
        }

        var cacheKey = 'lastappinfopresent5';
        var lastDatePresented = parseInt(appSettings.get(cacheKey) || '0');

        // Don't show the first time, right after installation
        if (!lastDatePresented) {
            appSettings.set(cacheKey, new Date().getTime());
            return Promise.resolve('');
        }

        if ((new Date().getTime() - lastDatePresented) < frequency) {
            return Promise.resolve('');
        }

        return Dashboard.getPluginSecurityInfo().then(function (pluginSecurityInfo) {

            appSettings.set(cacheKey, new Date().getTime());

            if (pluginSecurityInfo.IsMBSupporter) {
                return '';
            }

            var infos = [getPremiereInfo];

            if (!browserInfo.safari || !AppInfo.isNativeApp) {
                infos.push(getTheaterInfo);
            }

            appSettings.set(cacheKey, new Date().getTime());

            return infos[getRandomInt(0, 1)]();
        });
    }

    function getCard(img, target) {

        return '<div class="card backdropCard"><div class="cardBox"><div class="cardScalable"><div class="cardPadder"></div><a class="cardContent" href="' + target + '" target="_blank"><div class="cardImage lazy" data-src="' + img + '"></div></a></div></div></div>';
    }

    function getTheaterInfo() {

        var html = '';
        html += '<div>';
        html += '<h1>Try Emby Theater<button is="paper-icon-button-light" style="margin-left:1em;" onclick="jQuery(this.parentNode.parentNode).remove();"><iron-icon icon="close"></iron-icon></button></h1>';

        var nameText = AppInfo.isNativeApp ? 'Emby Theater' : '<a href="https://emby.media/download" target="_blank">Emby Theater</a>';
        html += '<p>A beautiful app for your TV and large screen tablet. ' + nameText + ' runs on Windows, Xbox One, Google Chrome, FireFox, Microsoft Edge and Opera.</p>';
        html += '<div class="itemsContainer">';
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater1.png', 'https://emby.media/download');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater2.png', 'https://emby.media/download');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater3.png', 'https://emby.media/download');
        html += '</div>';
        html += '<br/>';
        html += '</div>';
        return html;
    }

    function getPremiereInfo() {

        var html = '';
        html += '<div>';
        html += '<h1>Try Emby Premiere<button is="paper-icon-button-light" style="margin-left:1em;" onclick="jQuery(this.parentNode.parentNode).remove();"><iron-icon icon="close"></iron-icon></button></h1>';

        var learnMoreText = AppInfo.isNativeApp ? '' : '<a href="https://emby.media/premiere" target="_blank">Learn more</a>';

        html += '<p>Design beautiful Cover Art, enjoy free access to Emby apps, and more. ' + learnMoreText + '</p>';
        html += '<div class="itemsContainer">';
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater1.png', 'https://emby.media/premiere');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater2.png', 'https://emby.media/premiere');
        html += getCard('https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/apps/theater3.png', 'https://emby.media/premiere');
        html += '</div>';
        html += '<br/>';
        html += '</div>';
        return html;
    }

    function loadRecentlyAdded(elem, user) {

        var options = {

            Limit: 20,
            Fields: "PrimaryImageAspectRatio,SyncInfo",
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Thumb"
        };

        return ApiClient.getJSON(ApiClient.getUrl('Users/' + user.Id + '/Items/Latest', options)).then(function (items) {

            var html = '';

            var cardLayout = false;

            if (items.length) {
                html += '<div>';
                html += '<h1 class="listHeader">' + Globalize.translate('HeaderLatestMedia') + '</h1>';

                html += '</div>';

                html += '<div class="itemsContainer">';

                html += LibraryBrowser.getPosterViewHtml({
                    items: items,
                    preferThumb: true,
                    shape: 'backdrop',
                    showUnplayedIndicator: false,
                    showChildCountIndicator: true,
                    lazy: true,
                    cardLayout: cardLayout,
                    showTitle: cardLayout,
                    showYear: cardLayout,
                    showDetailsMenu: true,
                    context: 'home'
                });
                html += '</div>';
            }

            elem.innerHTML = html;
            ImageLoader.lazyChildren(elem);

            LibraryBrowser.createCardMenus(elem);
        });
    }

    function loadLatestMovies(elem, user) {

        var options = {

            Limit: 12,
            Fields: "PrimaryImageAspectRatio,SyncInfo",
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Thumb",
            IncludeItemTypes: "Movie"
        };

        return ApiClient.getJSON(ApiClient.getUrl('Users/' + user.Id + '/Items/Latest', options)).then(function (items) {

            var html = '';

            var scrollX = enableScrollX();

            if (items.length) {
                html += '<h1 class="listHeader">' + Globalize.translate('HeaderLatestMovies') + '</h1>';
                if (scrollX) {
                    html += '<div class="hiddenScrollX itemsContainer">';
                } else {
                    html += '<div class="itemsContainer">';
                }
                html += LibraryBrowser.getPosterViewHtml({
                    items: items,
                    shape: getPortraitShape(),
                    showUnplayedIndicator: false,
                    showChildCountIndicator: true,
                    lazy: true,
                    context: 'home',
                    centerText: true,
                    overlayPlayButton: true
                });
                html += '</div>';
            }

            elem.innerHTML = html;
            ImageLoader.lazyChildren(elem);

            LibraryBrowser.createCardMenus(elem);
        });
    }

    function loadLatestEpisodes(elem, user) {

        var options = {

            Limit: 12,
            Fields: "PrimaryImageAspectRatio,SyncInfo",
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Thumb",
            IncludeItemTypes: "Episode"
        };

        return ApiClient.getJSON(ApiClient.getUrl('Users/' + user.Id + '/Items/Latest', options)).then(function (items) {

            var html = '';

            var scrollX = enableScrollX();

            if (items.length) {
                html += '<h1 class="listHeader">' + Globalize.translate('HeaderLatestEpisodes') + '</h1>';
                if (scrollX) {
                    html += '<div class="hiddenScrollX itemsContainer">';
                } else {
                    html += '<div class="itemsContainer">';
                }

                html += LibraryBrowser.getPosterViewHtml({
                    items: items,
                    preferThumb: true,
                    shape: getThumbShape(),
                    showUnplayedIndicator: false,
                    showChildCountIndicator: true,
                    lazy: true,
                    context: 'home',
                    overlayPlayButton: true
                });
                html += '</div>';
            }

            elem.innerHTML = html;
            ImageLoader.lazyChildren(elem);

            LibraryBrowser.createCardMenus(elem);
        });
    }

    function loadLatestChannelMedia(elem, userId) {

        var screenWidth = window.innerWidth;

        var options = {

            Limit: screenWidth >= 2400 ? 10 : (screenWidth >= 1600 ? 10 : (screenWidth >= 1440 ? 8 : (screenWidth >= 800 ? 7 : 6))),
            Fields: "PrimaryImageAspectRatio,SyncInfo",
            Filters: "IsUnplayed",
            UserId: userId
        };

        return ApiClient.getJSON(ApiClient.getUrl("Channels/Items/Latest", options)).then(function (result) {

            var html = '';

            if (result.Items.length) {
                html += '<h1 class="listHeader">' + Globalize.translate('HeaderLatestChannelMedia') + '</h1>';
                html += '<div class="itemsContainer">';
                html += LibraryBrowser.getPosterViewHtml({
                    items: result.Items,
                    shape: 'auto',
                    showTitle: true,
                    centerText: true,
                    lazy: true,
                    showDetailsMenu: true,
                    overlayPlayButton: true
                });
                html += '</div>';
            }

            elem.innerHTML = html;
            ImageLoader.lazyChildren(elem);

            LibraryBrowser.createCardMenus(elem);
        });
    }

    function loadLibraryTiles(elem, user, shape, index, autoHideOnMobile, showTitles) {

        return getUserViews(user.Id).then(function (items) {

            var html = '';

            if (autoHideOnMobile) {
                html += '<div class="hiddenSectionOnMobile">';
            } else {
                html += '<div>';
            }

            if (items.length) {

                var screenWidth = window.innerWidth;

                html += '<div>';
                html += '<h1 class="listHeader">' + Globalize.translate('HeaderMyMedia') + '</h1>';

                html += '</div>';

                var scrollX = enableScrollX() && browserInfo.safari && screenWidth > 800;

                if (scrollX) {
                    html += '<div class="hiddenScrollX itemsContainer homeTopViews">';
                } else {
                    html += '<div class="itemsContainer homeTopViews">';
                }
                html += LibraryBrowser.getPosterViewHtml({
                    items: items,
                    shape: scrollX ? 'overflowBackdrop' : shape,
                    showTitle: showTitles,
                    centerText: true,
                    lazy: true,
                    autoThumb: true,
                    transition: false
                });
                html += '</div>';
            }

            html += '</div>';

            if (autoHideOnMobile) {
                html += '<div class="hiddenSectionOnNonMobile" style="margin-top:1em;">';
                html += getLibraryButtonsHtml(items);
                html += '</div>';
            }

            return getAppInfo().then(function (infoHtml) {

                elem.innerHTML = html + infoHtml;
                ImageLoader.lazyChildren(elem);

                LibraryBrowser.createCardMenus(elem, { showDetailsMenu: false });
            });
        });
    }

    function loadResume(elem, userId) {

        var screenWidth = window.innerWidth;

        var options = {

            SortBy: "DatePlayed",
            SortOrder: "Descending",
            MediaTypes: "Video",
            Filters: "IsResumable",
            Limit: screenWidth >= 1920 ? 8 : (screenWidth >= 1600 ? 8 : (screenWidth >= 1200 ? 9 : 6)),
            Recursive: true,
            Fields: "PrimaryImageAspectRatio,SyncInfo",
            CollapseBoxSetItems: false,
            ExcludeLocationTypes: "Virtual",
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Banner,Thumb",
            EnableTotalRecordCount: false
        };

        return ApiClient.getItems(userId, options).then(function (result) {

            var html = '';

            if (result.Items.length) {
                html += '<h1 class="listHeader">' + Globalize.translate('HeaderResume') + '</h1>';
                if (enableScrollX()) {
                    html += '<div class="hiddenScrollX itemsContainer">';
                } else {
                    html += '<div class="itemsContainer">';
                }
                html += LibraryBrowser.getPosterViewHtml({
                    items: result.Items,
                    preferThumb: true,
                    shape: getThumbShape(),
                    overlayText: false,
                    showTitle: true,
                    showParentTitle: true,
                    lazy: true,
                    showDetailsMenu: true,
                    overlayPlayButton: true,
                    context: 'home',
                    centerText: true
                });
                html += '</div>';
            }

            elem.innerHTML = html;

            ImageLoader.lazyChildren(elem);
            LibraryBrowser.createCardMenus(elem);
        });
    }

    function loadNextUp(elem, userId) {

        var query = {

            Limit: 20,
            Fields: "PrimaryImageAspectRatio,SeriesInfo,DateCreated,SyncInfo",
            UserId: userId,
            ImageTypeLimit: 1,
            EnableImageTypes: "Primary,Backdrop,Banner,Thumb"
        };

        ApiClient.getNextUpEpisodes(query).then(function (result) {

            var html = '';

            if (result.Items.length) {
                html += '<h1 class="listHeader">' + Globalize.translate('HeaderNextUp') + '</h1>';
                if (enableScrollX()) {
                    html += '<div class="hiddenScrollX itemsContainer">';
                } else {
                    html += '<div class="itemsContainer">';
                }
                html += LibraryBrowser.getPosterViewHtml({
                    items: result.Items,
                    preferThumb: true,
                    shape: getThumbShape(),
                    overlayText: false,
                    showTitle: true,
                    showParentTitle: true,
                    lazy: true,
                    overlayPlayButton: true,
                    context: 'home',
                    centerText: true
                });
                html += '</div>';
            }

            elem.innerHTML = html;

            ImageLoader.lazyChildren(elem);
            LibraryBrowser.createCardMenus(elem);
        });
    }

    function loadLatestChannelItems(elem, userId, options) {

        options = Object.assign(options || {}, {

            UserId: userId,
            SupportsLatestItems: true
        });

        return ApiClient.getJSON(ApiClient.getUrl("Channels", options)).then(function (result) {

            var channels = result.Items;

            var channelsHtml = channels.map(function (c) {

                return '<div id="channel' + c.Id + '"></div>';

            }).join('');

            elem.innerHTML = channelsHtml;

            for (var i = 0, length = channels.length; i < length; i++) {

                var channel = channels[i];

                loadLatestChannelItemsFromChannel(elem, channel, i);
            }

        });
    }

    function loadLatestChannelItemsFromChannel(page, channel, index) {

        var screenWidth = window.innerWidth;

        var options = {

            Limit: screenWidth >= 1600 ? 10 : (screenWidth >= 1440 ? 5 : (screenWidth >= 800 ? 6 : 6)),
            Fields: "PrimaryImageAspectRatio,SyncInfo",
            Filters: "IsUnplayed",
            UserId: Dashboard.getCurrentUserId(),
            ChannelIds: channel.Id
        };

        ApiClient.getJSON(ApiClient.getUrl("Channels/Items/Latest", options)).then(function (result) {

            var html = '';

            if (result.Items.length) {

                html += '<div class="homePageSection">';

                html += '<div>';
                var text = Globalize.translate('HeaderLatestFromChannel').replace('{0}', channel.Name);
                html += '<h1 style="display:inline-block; vertical-align:middle;" class="listHeader">' + text + '</h1>';
                html += '<a href="channelitems.html?id=' + channel.Id + '" class="clearLink" style="margin-left:2em;"><button is="emby-button" type="button" class="raised more mini"><span>' + Globalize.translate('ButtonMore') + '</span></button></a>';
                html += '</div>';

                html += '<div class="itemsContainer">';
                html += LibraryBrowser.getPosterViewHtml({
                    items: result.Items,
                    shape: 'autohome',
                    defaultShape: 'square',
                    showTitle: true,
                    centerText: true,
                    lazy: true,
                    showDetailsMenu: true,
                    overlayPlayButton: true
                });
                html += '</div>';
                html += '</div>';
            }

            var elem = page.querySelector('#channel' + channel.Id + '');
            elem.innerHTML = html;
            ImageLoader.lazyChildren(elem);

            LibraryBrowser.createCardMenus(elem);
        });
    }

    function loadLatestLiveTvRecordings(elem, userId, index) {

        return ApiClient.getLiveTvRecordings({

            userId: userId,
            limit: 5,
            Fields: "PrimaryImageAspectRatio,SyncInfo",
            IsInProgress: false

        }).then(function (result) {

            var html = '';

            if (result.Items.length) {

                var cssClass = index !== 0 ? 'listHeader' : 'listHeader';

                html += '<div>';
                html += '<h1 style="display:inline-block; vertical-align:middle;" class="' + cssClass + '">' + Globalize.translate('HeaderLatestTvRecordings') + '</h1>';
                html += '<a href="livetv.html?tab=3" onclick="LibraryBrowser.showTab(\'livetv.html\',3);" class="clearLink" style="margin-left:2em;"><button is="emby-button" type="button" class="raised more mini"><span>' + Globalize.translate('ButtonMore') + '</span></button></a>';
                html += '</div>';
            }

            if (enableScrollX()) {
                html += '<div class="hiddenScrollX itemsContainer">';
            } else {
                html += '<div class="itemsContainer">';
            }
            html += LibraryBrowser.getPosterViewHtml({
                items: result.Items,
                shape: enableScrollX() ? 'autooverflow' : 'auto',
                showTitle: true,
                showParentTitle: true,
                coverImage: true,
                lazy: true,
                showDetailsMenu: true,
                centerText: true,
                overlayPlayButton: true
            });
            html += '</div>';

            elem.innerHTML = html;
            ImageLoader.lazyChildren(elem);
            LibraryBrowser.createCardMenus(elem);
        });
    }

    window.Sections = {
        loadRecentlyAdded: loadRecentlyAdded,
        loadLatestChannelMedia: loadLatestChannelMedia,
        loadLibraryTiles: loadLibraryTiles,
        loadResume: loadResume,
        loadNextUp: loadNextUp,
        loadLatestChannelItems: loadLatestChannelItems,
        loadLatestLiveTvRecordings: loadLatestLiveTvRecordings,
        loadlibraryButtons: loadlibraryButtons,
        loadLatestMovies: loadLatestMovies,
        loadLatestEpisodes: loadLatestEpisodes
    };

    return window.Sections;
});