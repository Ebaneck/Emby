﻿define(['jQuery'], function ($) {

    var currentType;

    function loadTabs(page, tabs) {

        var html = '';

        for (var i = 0, length = tabs.length; i < length; i++) {

            var tab = tabs[i];

            var isChecked = i == 0 ? ' selected="selected"' : '';

            html += '<option value="' + tab.type + '"' + isChecked + '>' + Globalize.translate(tab.name) + '</option>';
        }

        $('#selectItemType', page).html(html).trigger('change');

        Dashboard.hideLoadingMsg();
    }

    function loadType(page, type) {

        Dashboard.showLoadingMsg();

        currentType = type;

        var promise1 = ApiClient.getServerConfiguration();
        var promise2 = ApiClient.getJSON(ApiClient.getUrl("System/Configuration/MetadataPlugins"));

        Promise.all([promise1, promise2]).then(function (responses) {

            var config = responses[0];
            var metadataPlugins = responses[1];

            config = config.MetadataOptions.filter(function (c) {
                return c.ItemType == type;
            })[0];

            if (config) {

                renderType(page, type, config, metadataPlugins);

                Dashboard.hideLoadingMsg();

            } else {

                ApiClient.getJSON(ApiClient.getUrl("System/Configuration/MetadataOptions/Default")).then(function (defaultConfig) {


                    config = defaultConfig;

                    renderType(page, type, config, metadataPlugins);

                    Dashboard.hideLoadingMsg();
                });

            }

        });

    }

    function setVisibilityOfBackdrops(elem, visible) {

        if (visible) {
            elem.show();

            $('input', elem).attr('required', 'required');

        } else {
            elem.hide();

            $('input', elem).attr('required', '').removeAttr('required');
        }
    }

    function renderType(page, type, config, metadataPlugins) {

        var metadataInfo = metadataPlugins.filter(function (f) {

            return type == f.ItemType;
        })[0];

        setVisibilityOfBackdrops($('.backdropFields', page), metadataInfo.SupportedImageTypes.indexOf('Backdrop') != -1);
        setVisibilityOfBackdrops($('.screenshotFields', page), metadataInfo.SupportedImageTypes.indexOf('Screenshot') != -1);

        $('.imageType', page).each(function () {

            var imageType = this.getAttribute('data-imagetype');

            if (metadataInfo.SupportedImageTypes.indexOf(imageType) == -1) {
                this.classList.add('hide');
            } else {
                this.classList.remove('hide');
            }

            if (getImageConfig(config, imageType).Limit) {

                this.checked = true;

            } else {
                this.checked = false;
            }
        });

        var backdropConfig = getImageConfig(config, 'Backdrop');

        $('#txtMaxBackdrops', page).val(backdropConfig.Limit);
        $('#txtMinBackdropDownloadWidth', page).val(backdropConfig.MinWidth);

        var screenshotConfig = getImageConfig(config, 'Screenshot');

        $('#txtMaxScreenshots', page).val(screenshotConfig.Limit);
        $('#txtMinScreenshotDownloadWidth', page).val(screenshotConfig.MinWidth);

        renderMetadataLocals(page, type, config, metadataInfo);
        renderMetadataFetchers(page, type, config, metadataInfo);
        renderMetadataSavers(page, type, config, metadataInfo);
        renderImageFetchers(page, type, config, metadataInfo);
    }

    function getImageConfig(config, type) {

        return config.ImageOptions.filter(function (i) {

            return i.Type == type;

        })[0] || {

            Type: type,
            MinWidth: type == 'Backdrop' ? 1280 : 0,
            Limit: type == 'Backdrop' ? 3 : 1
        };
    }

    function renderImageFetchers(page, type, config, metadataInfo) {

        var plugins = metadataInfo.Plugins.filter(function (p) {
            return p.Type == 'ImageFetcher';
        });

        var html = '';

        if (!plugins.length) {
            $('.imageFetchers', page).html(html).hide();
            return;
        }

        var i, length, plugin, id;

        html += '<div class="paperListLabel">' + Globalize.translate('LabelImageFetchers') + '</div>';
        html += '<div class="paperList">';

        for (i = 0, length = plugins.length; i < length; i++) {

            plugin = plugins[i];

            var isChecked = config.DisabledImageFetchers.indexOf(plugin.Name) == -1 ? ' checked="checked"' : '';

            html += '<paper-icon-item class="imageFetcherItem" data-pluginname="' + plugin.Name + '">';

            html += '<paper-checkbox class="chkImageFetcher" data-pluginname="' + plugin.Name + '" item-icon' + isChecked + '></paper-checkbox>';

            html += '<paper-item-body>';

            html += '<div>';
            html += plugin.Name;
            html += '</div>';

            html += '</paper-item-body>';

            html += '<button type="button" is="paper-icon-button-light" title="' + Globalize.translate('ButtonUp') + '" class="btnUp" style="padding:3px 8px;"><iron-icon icon="keyboard-arrow-up"></iron-icon></button>';
            html += '<button type="button" is="paper-icon-button-light" title="' + Globalize.translate('ButtonDown') + '" class="btnDown" style="padding:3px 8px;"><iron-icon icon="keyboard-arrow-down"></iron-icon></button>';

            html += '</paper-icon-item>';
        }

        html += '</div>';
        html += '<div class="fieldDescription">' + Globalize.translate('LabelImageFetchersHelp') + '</div>';

        var elem = $('.imageFetchers', page).html(html).show();

        $('.btnDown', elem).on('click', function () {

            var elemToMove = $(this).parents('.imageFetcherItem')[0];

            var insertAfter = $(elemToMove).next('.imageFetcherItem')[0];

            if (insertAfter) {
                elemToMove.parentNode.removeChild(elemToMove);
                $(elemToMove).insertAfter(insertAfter);
            }
        });

        $('.btnUp', elem).on('click', function () {

            var elemToMove = $(this).parents('.imageFetcherItem')[0];

            var insertBefore = $(elemToMove).prev('.imageFetcherItem')[0];

            if (insertBefore) {
                elemToMove.parentNode.removeChild(elemToMove);
                $(elemToMove).insertBefore(insertBefore);
            }
        });
    }

    function renderMetadataSavers(page, type, config, metadataInfo) {

        var plugins = metadataInfo.Plugins.filter(function (p) {
            return p.Type == 'MetadataSaver';
        });

        var html = '';

        if (!plugins.length) {
            $('.metadataSavers', page).html(html).hide();
            return;
        }

        html += '<div class="paperListLabel">' + Globalize.translate('LabelMetadataSavers') + '</div>';
        html += '<div class="paperCheckboxList paperList">';

        for (var i = 0, length = plugins.length; i < length; i++) {

            var plugin = plugins[i];

            var isChecked = config.DisabledMetadataSavers.indexOf(plugin.Name) == -1 ? ' checked="checked"' : '';

            html += '<paper-checkbox class="chkMetadataSaver"' + isChecked + ' data-pluginname="' + plugin.Name + '">' + plugin.Name + '</paper-checkbox>';
        }

        html += '</div>';
        html += '<div class="fieldDescription" style="margin-top:.25em;">' + Globalize.translate('LabelMetadataSaversHelp') + '</div>';

        page.querySelector('.metadataSavers').innerHTML = html;
    }

    function renderMetadataFetchers(page, type, config, metadataInfo) {

        var plugins = metadataInfo.Plugins.filter(function (p) {
            return p.Type == 'MetadataFetcher';
        });

        var html = '';

        if (!plugins.length) {
            $('.metadataFetchers', page).html(html).hide();
            return;
        }

        var i, length, plugin;

        html += '<div class="paperListLabel">' + Globalize.translate('LabelMetadataDownloaders') + '</div>';
        html += '<div class="paperList">';

        for (i = 0, length = plugins.length; i < length; i++) {

            plugin = plugins[i];

            var isChecked = config.DisabledMetadataFetchers.indexOf(plugin.Name) == -1 ? ' checked="checked"' : '';

            html += '<paper-icon-item class="metadataFetcherItem" data-pluginname="' + plugin.Name + '">';

            html += '<paper-checkbox class="chkMetadataFetcher" data-pluginname="' + plugin.Name + '" item-icon' + isChecked + '></paper-checkbox>';

            html += '<paper-item-body>';

            html += '<div>';
            html += plugin.Name;
            html += '</div>';

            html += '</paper-item-body>';

            html += '<button type="button" is="paper-icon-button-light" title="' + Globalize.translate('ButtonUp') + '" class="btnUp" style="padding:3px 8px;"><iron-icon icon="keyboard-arrow-up"></iron-icon></button>';
            html += '<button type="button" is="paper-icon-button-light" title="' + Globalize.translate('ButtonDown') + '" class="btnDown" style="padding:3px 8px;"><iron-icon icon="keyboard-arrow-down"></iron-icon></button>';

            html += '</paper-icon-item>';
        }

        html += '</div>';
        html += '<div class="fieldDescription">' + Globalize.translate('LabelMetadataDownloadersHelp') + '</div>';

        var elem = $('.metadataFetchers', page).html(html).show();

        $('.btnDown', elem).on('click', function () {

            var elemToMove = $(this).parents('.metadataFetcherItem')[0];

            var insertAfter = $(elemToMove).next('.metadataFetcherItem')[0];

            if (insertAfter) {
                elemToMove.parentNode.removeChild(elemToMove);
                $(elemToMove).insertAfter(insertAfter);
            }
        });

        $('.btnUp', elem).on('click', function () {

            var elemToMove = $(this).parents('.metadataFetcherItem')[0];

            var insertBefore = $(elemToMove).prev('.metadataFetcherItem')[0];

            if (insertBefore) {
                elemToMove.parentNode.removeChild(elemToMove);
                $(elemToMove).insertBefore(insertBefore);
            }
        });
    }

    function renderMetadataLocals(page, type, config, metadataInfo) {

        var plugins = metadataInfo.Plugins.filter(function (p) {
            return p.Type == 'LocalMetadataProvider';
        });

        var html = '';

        if (plugins.length < 2) {
            $('.metadataReaders', page).html(html).hide();
            return;
        }

        html += '<div class="paperListLabel">' + Globalize.translate('LabelMetadataReaders') + '</div>';
        html += '<div class="paperList">';

        for (var i = 0, length = plugins.length; i < length; i++) {

            var plugin = plugins[i];

            html += '<paper-icon-item class="localReaderOption" data-pluginname="' + plugin.Name + '">';

            html += '<paper-fab mini style="background:#52B54B;" icon="live-tv" item-icon></paper-fab>';

            html += '<paper-item-body>';

            html += '<div>';
            html += plugin.Name;
            html += '</div>';

            html += '</paper-item-body>';

            if (i > 0) {
                html += '<button type="button" is="paper-icon-button-light" title="' + Globalize.translate('ButtonUp') + '" class="btnLocalReaderUp btnLocalReaderMove" data-pluginindex="' + i + '"><iron-icon icon="keyboard-arrow-up"></iron-icon></button>';
            }
            else if (plugins.length > 1) {

                html += '<button type="button" is="paper-icon-button-light" title="' + Globalize.translate('ButtonDown') + '" class="btnLocalReaderDown btnLocalReaderMove" data-pluginindex="' + i + '"><iron-icon icon="keyboard-arrow-down"></iron-icon></button>';
            }

            html += '</paper-icon-item>';
        }

        html += '</div>';
        html += '<div class="fieldDescription">' + Globalize.translate('LabelMetadataReadersHelp') + '</div>';

        $('.metadataReaders', page).html(html).show();
    }

    function loadPage(page) {

        loadTabs(page, [

            { name: 'OptionMovies', type: 'Movie' },
            //{ name: 'Trailers', type: 'Trailer' },
            { name: 'OptionCollections', type: 'BoxSet' },
            { name: 'OptionSeries', type: 'Series' },
            { name: 'OptionSeasons', type: 'Season' },
            { name: 'OptionEpisodes', type: 'Episode' },
            { name: 'OptionGames', type: 'Game' },
            { name: 'OptionGameSystems', type: 'GameSystem' },
            //{ name: 'Game Genres', type: 'GameGenre' },
            { name: 'OptionMusicArtists', type: 'MusicArtist' },
            { name: 'OptionMusicAlbums', type: 'MusicAlbum' },
            { name: 'OptionMusicVideos', type: 'MusicVideo' },
            //{ name: 'Music Genres', type: 'MusicGenre' },
            { name: 'OptionSongs', type: 'Audio' },
            { name: 'OptionHomeVideos', type: 'Video' },
            { name: 'OptionBooks', type: 'Book' },
            { name: 'OptionPeople', type: 'Person' }
            //{ name: 'Genres', type: 'Genre' },
            //{ name: 'Studios', type: 'Studio' }
        ]);
    }

    function saveSettingsIntoConfig(form, config) {

        config.DisabledMetadataSavers = $('.chkMetadataSaver', form).get().filter(function (c) {

            return !c.checked;

        }).map(function (c) {

            return c.getAttribute('data-pluginname');

        });

        config.LocalMetadataReaderOrder = $('.localReaderOption', form).get().map(function (c) {

            return c.getAttribute('data-pluginname');

        });

        config.DisabledMetadataFetchers = $('.chkMetadataFetcher', form).get().filter(function (c) {
            return !c.checked;
        }).map(function (c) {

            return c.getAttribute('data-pluginname');

        });

        config.MetadataFetcherOrder = $('.chkMetadataFetcher', form).get().map(function (c) {

            return c.getAttribute('data-pluginname');

        });

        config.DisabledImageFetchers = $('.chkImageFetcher', form).get().filter(function (c) {
            return !c.checked;
        }).map(function (c) {

            return c.getAttribute('data-pluginname');

        });

        config.ImageFetcherOrder = $('.chkImageFetcher', form).get().map(function (c) {

            return c.getAttribute('data-pluginname');

        });

        config.ImageOptions = $('.imageType:not(.hide)', form).get().map(function (c) {


            return {
                Type: c.getAttribute('data-imagetype'),
                Limit: c.checked ? 1 : 0,
                MinWidth: 0
            };

        });

        config.ImageOptions.push({
            Type: 'Backdrop',
            Limit: $('#txtMaxBackdrops', form).val(),
            MinWidth: $('#txtMinBackdropDownloadWidth', form).val()
        });

        config.ImageOptions.push({
            Type: 'Screenshot',
            Limit: $('#txtMaxScreenshots', form).val(),
            MinWidth: $('#txtMinScreenshotDownloadWidth', form).val()
        });
    }

    function onSubmit() {

        var form = this;

        Dashboard.showLoadingMsg();

        ApiClient.getServerConfiguration().then(function (config) {

            var type = currentType;

            var metadataOptions = config.MetadataOptions.filter(function (c) {
                return c.ItemType == type;
            })[0];

            if (metadataOptions) {

                saveSettingsIntoConfig(form, metadataOptions);
                ApiClient.updateServerConfiguration(config).then(Dashboard.processServerConfigurationUpdateResult);

            } else {

                ApiClient.getJSON(ApiClient.getUrl("System/Configuration/MetadataOptions/Default")).then(function (defaultOptions) {

                    defaultOptions.ItemType = type;
                    config.MetadataOptions.push(defaultOptions);
                    saveSettingsIntoConfig(form, defaultOptions);
                    ApiClient.updateServerConfiguration(config).then(Dashboard.processServerConfigurationUpdateResult);

                });
            }
        });

        // Disable default form submission
        return false;
    }

    function getTabs() {
        return [
        {
            href: 'metadata.html',
            name: Globalize.translate('TabSettings')
        },
         {
             href: 'metadataimages.html',
             name: Globalize.translate('TabServices')
         },
         {
             href: 'metadatanfo.html',
             name: Globalize.translate('TabNfoSettings')
         }];
    }

    $(document).on('pageinit', "#metadataImagesConfigurationPage", function () {

        var page = this;

        $('.metadataReaders', page).on('click', '.btnLocalReaderMove', function () {

            var li = $(this).parents('.localReaderOption');
            var list = li.parents('.paperList');

            if ($(this).hasClass('btnLocalReaderDown')) {

                var next = li.next();

                li.remove().insertAfter(next);

            } else {

                var prev = li.prev();

                li.remove().insertBefore(prev);
            }

            $('.localReaderOption', list).each(function () {

                if ($(this).prev('.localReaderOption').length) {
                    $('.btnLocalReaderMove', this).addClass('btnLocalReaderUp').removeClass('btnLocalReaderDown').attr('icon', 'keyboard-arrow-up');
                } else {
                    $('.btnLocalReaderMove', this).addClass('btnLocalReaderDown').removeClass('btnLocalReaderUp').attr('icon', 'keyboard-arrow-down');
                }

            });
        });

        $('#selectItemType', page).on('change', function () {

            loadType(page, this.value);
        });

        $('.metadataImagesConfigurationForm').off('submit', onSubmit).on('submit', onSubmit);

    }).on('pageshow', "#metadataImagesConfigurationPage", function () {

        LibraryMenu.setTabs('metadata', 1, getTabs);
        Dashboard.showLoadingMsg();

        var page = this;

        loadPage(page);
    });

});