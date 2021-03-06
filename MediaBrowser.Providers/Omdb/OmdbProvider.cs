﻿using CommonIO;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Net;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.Serialization;
using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace MediaBrowser.Providers.Omdb
{
    public class OmdbProvider
    {
        internal static readonly SemaphoreSlim ResourcePool = new SemaphoreSlim(1, 1);
        private readonly IJsonSerializer _jsonSerializer;
        private readonly IFileSystem _fileSystem;
        private readonly IServerConfigurationManager _configurationManager;
        private readonly IHttpClient _httpClient;
        private readonly CultureInfo _usCulture = new CultureInfo("en-US");

        public OmdbProvider(IJsonSerializer jsonSerializer, IHttpClient httpClient, IFileSystem fileSystem, IServerConfigurationManager configurationManager)
        {
            _jsonSerializer = jsonSerializer;
            _httpClient = httpClient;
            _fileSystem = fileSystem;
            _configurationManager = configurationManager;
        }

        public async Task Fetch(BaseItem item, string imdbId, string language, string country, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(imdbId))
            {
                throw new ArgumentNullException("imdbId");
            }

            var result = await GetRootObject(imdbId, cancellationToken);

                // Only take the name and rating if the user's language is set to english, since Omdb has no localization
                if (string.Equals(language, "en", StringComparison.OrdinalIgnoreCase))
                {
                    item.Name = result.Title;

                    if (string.Equals(country, "us", StringComparison.OrdinalIgnoreCase))
                    {
                        item.OfficialRating = result.Rated;
                    }
                }

                int year;

                if (!string.IsNullOrEmpty(result.Year)
                    && int.TryParse(result.Year, NumberStyles.Number, _usCulture, out year)
                    && year >= 0)
                {
                    item.ProductionYear = year;
                }

                var hasCriticRating = item as IHasCriticRating;
                if (hasCriticRating != null)
                {
                    // Seeing some bogus RT data on omdb for series, so filter it out here
                    // RT doesn't even have tv series
                    int tomatoMeter;

                    if (!string.IsNullOrEmpty(result.tomatoMeter)
                        && int.TryParse(result.tomatoMeter, NumberStyles.Integer, _usCulture, out tomatoMeter)
                        && tomatoMeter >= 0)
                    {
                        hasCriticRating.CriticRating = tomatoMeter;
                    }

                    if (!string.IsNullOrEmpty(result.tomatoConsensus)
                        && !string.Equals(result.tomatoConsensus, "No consensus yet.", StringComparison.OrdinalIgnoreCase))
                    {
                        hasCriticRating.CriticRatingSummary = WebUtility.HtmlDecode(result.tomatoConsensus);
                    }
                }

                int voteCount;

                if (!string.IsNullOrEmpty(result.imdbVotes)
                    && int.TryParse(result.imdbVotes, NumberStyles.Number, _usCulture, out voteCount)
                    && voteCount >= 0)
                {
                    item.VoteCount = voteCount;
                }

                float imdbRating;

                if (!string.IsNullOrEmpty(result.imdbRating)
                    && float.TryParse(result.imdbRating, NumberStyles.Any, _usCulture, out imdbRating)
                    && imdbRating >= 0)
                {
                    item.CommunityRating = imdbRating;
                }

                if (!string.IsNullOrEmpty(result.Website))
                {
                    item.HomePageUrl = result.Website;
                }

                if (!string.IsNullOrWhiteSpace(result.imdbID))
                {
                    item.SetProviderId(MetadataProviders.Imdb, result.imdbID);
                }

                ParseAdditionalMetadata(item, result);
        }

        internal async Task<RootObject> GetRootObject(string imdbId, CancellationToken cancellationToken)
        {
            var path = await EnsureItemInfo(imdbId, cancellationToken);

            string resultString;

            using (Stream stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 131072))
            {
                using (var reader = new StreamReader(stream, new UTF8Encoding(false)))
                {
                    resultString = reader.ReadToEnd();
                    resultString = resultString.Replace("\"N/A\"", "\"\"");
                }
            }

            var result = _jsonSerializer.DeserializeFromString<RootObject>(resultString);
            return result;
        }

        private async Task<string> EnsureItemInfo(string imdbId, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(imdbId))
            {
                throw new ArgumentNullException("imdbId");
            }

            var imdbParam = imdbId.StartsWith("tt", StringComparison.OrdinalIgnoreCase) ? imdbId : "tt" + imdbId;

            var path = GetDataFilePath(imdbParam);

            var fileInfo = _fileSystem.GetFileSystemInfo(path);

            if (fileInfo.Exists)
            {
                // If it's recent or automatic updates are enabled, don't re-download
                if ((DateTime.UtcNow - _fileSystem.GetLastWriteTimeUtc(fileInfo)).TotalDays <= 3)
                {
                    return path;
                }
            }

            var url = string.Format("https://www.omdbapi.com/?i={0}&tomatoes=true", imdbParam);

            using (var stream = await _httpClient.Get(new HttpRequestOptions
            {
                Url = url,
                ResourcePool = ResourcePool,
                CancellationToken = cancellationToken

            }).ConfigureAwait(false))
            {
                var rootObject = _jsonSerializer.DeserializeFromStream<RootObject>(stream);
                _fileSystem.CreateDirectory(Path.GetDirectoryName(path));
                _jsonSerializer.SerializeToFile(rootObject, path);
            }

            return path;
        }

        internal string GetDataFilePath(string imdbId)
        {
            if (string.IsNullOrEmpty(imdbId))
            {
                throw new ArgumentNullException("imdbId");
            }

            var dataPath = Path.Combine(_configurationManager.ApplicationPaths.CachePath, "omdb");

            var filename = string.Format("{0}.json", imdbId);

            return Path.Combine(dataPath, filename);
        }

        private void ParseAdditionalMetadata(BaseItem item, RootObject result)
        {
            // Grab series genres because imdb data is better than tvdb. Leave movies alone
            // But only do it if english is the preferred language because this data will not be localized
            if (ShouldFetchGenres(item) &&
                !string.IsNullOrWhiteSpace(result.Genre))
            {
                item.Genres.Clear();

                foreach (var genre in result.Genre
                    .Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(i => i.Trim())
                    .Where(i => !string.IsNullOrWhiteSpace(i)))
                {
                    item.AddGenre(genre);
                }
            }

            var hasMetascore = item as IHasMetascore;
            if (hasMetascore != null)
            {
                float metascore;

                if (!string.IsNullOrEmpty(result.Metascore) && float.TryParse(result.Metascore, NumberStyles.Any, _usCulture, out metascore) && metascore >= 0)
                {
                    hasMetascore.Metascore = metascore;
                }
            }

            var hasAwards = item as IHasAwards;
            if (hasAwards != null && !string.IsNullOrEmpty(result.Awards))
            {
                hasAwards.AwardSummary = WebUtility.HtmlDecode(result.Awards);
            }

            var hasShortOverview = item as IHasShortOverview;
            if (hasShortOverview != null)
            {
                // Imdb plots are usually pretty short
                hasShortOverview.ShortOverview = result.Plot;
            }
        }

        private bool ShouldFetchGenres(BaseItem item)
        {
            var lang = item.GetPreferredMetadataLanguage();

            // The data isn't localized and so can only be used for english users
            return string.Equals(lang, "en", StringComparison.OrdinalIgnoreCase);
        }

        internal class RootObject
        {
            public string Title { get; set; }
            public string Year { get; set; }
            public string Rated { get; set; }
            public string Released { get; set; }
            public string Runtime { get; set; }
            public string Genre { get; set; }
            public string Director { get; set; }
            public string Writer { get; set; }
            public string Actors { get; set; }
            public string Plot { get; set; }
            public string Poster { get; set; }
            public string imdbRating { get; set; }
            public string imdbVotes { get; set; }
            public string imdbID { get; set; }
            public string Type { get; set; }
            public string tomatoMeter { get; set; }
            public string tomatoImage { get; set; }
            public string tomatoRating { get; set; }
            public string tomatoReviews { get; set; }
            public string tomatoFresh { get; set; }
            public string tomatoRotten { get; set; }
            public string tomatoConsensus { get; set; }
            public string tomatoUserMeter { get; set; }
            public string tomatoUserRating { get; set; }
            public string tomatoUserReviews { get; set; }
            public string DVD { get; set; }
            public string BoxOffice { get; set; }
            public string Production { get; set; }
            public string Website { get; set; }
            public string Response { get; set; }

            public string Language { get; set; }
            public string Country { get; set; }
            public string Awards { get; set; }
            public string Metascore { get; set; }
        }

    }
}
