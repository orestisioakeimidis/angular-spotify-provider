(function (window, angular, undefined) {

  'use strict';

  var angularSpotify;

  angularSpotify = angular.module('angular-spotify', ['ngResource', 'angular-data.DSCacheFactory']);

  /**
   * Application configuration
   *
   */
  angularSpotify.config(['DSCacheFactoryProvider', function (DSCacheFactoryProvider) {
    // Configure the cache factory provider
    DSCacheFactoryProvider.setCacheDefaults({
      maxAge: 900000,
      cacheFlushInterval: 3600000,
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    });
  }]);

  /**
   * Initialize constants for spotify api urls and version
   *
   */
  angularSpotify.constant('url', {
    base: 'https://api.spotify.com',
    authorization: 'https://accounts.spotify.com/authorize'
  });

  angularSpotify.constant('version', 'v1');

  /**
   * Cache service
   *
   * @return {object} Instance of DSCache
   */
  angularSpotify.service('Cache', ['DSCacheFactory', function (DSCacheFactory) {
    return DSCacheFactory('spotify');
  }]);

  /**
   * Construct the base url for the provided endpoint.
   *
   * @param endpoint {string} The endpoint type
   *
   * @return {string} The constructed url
   */
  angularSpotify.filter('resourceUrl', ['url', 'version', function (url, version) {
    return function (endpoint) {
      return [url.base, version, endpoint || ''].join('/');
    };
  }]);

  /**
   * Get the parameters from the url hash fragment.
   *
   * @return {object} The parameters
   */
  angularSpotify.filter('hashParams', ['$window', function ($window) {
    return function () {
      var param,
        regexp,
        query,
        hashParams;

      regexp = /([^&;=]+)=?([^&;]*)/g;
      query = $window.location.hash.substring(1);
      hashParams = {};

      while (param = regexp.exec(query)) {
        hashParams[param[1]] = decodeURIComponent(param[2]);
      }

      return hashParams;
    };
  }]);

  /**
   * Generate a random string containing numbers and letters.
   *
   * @param length {number} The length of the string
   *
   * @return {string} The generated string
   */
  angularSpotify.filter('randomString', function () {
    return function (length) {
      var i, len,
        text,
        possible,
        possibleLength;

      len = (length < 1) ? 1 : length;
      text = '';
      possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      possibleLength = possible.length;

      for (i = 0; i < len; i++) {
        text += possible.charAt(Math.floor(Math.random() * possibleLength));
      }

      return text;
    };
  });

  /**
   * The main provider that will be exposed to application.
   *
   */
  angularSpotify.provider('spotify', function () {
    var options;

    options = {
      // The client ID provided by Spotify when registering an application.
      clientId: '',

      // The response type.
      responseType: 'token',

      // The URI to redirect to after the user grants/denies permission.
      // This URI needs to be entered in the URI whitelist that specified when registering the application.
      redirectUri: '',

      // The state can be useful for correlating requests and responses.
      // Because the redirect_uri can be guessed, using a state value
      // can increase the assurance that an incoming connection
      // is the result of an authentication request. With generating a random string
      // or encoding the hash of some client state (e.g., a cookie) in this state variable,
      // you can validate the response to additionally ensure that the request
      // and response originated in the same browser.
      // This provides protection against attacks such as cross-site request forgery.
      state: true,

      // A space-separated list of scopes.
      scope: '',

      // Whether or not to force the user to approve the app again if they’ve already done so.
      // If false (default), a user who has already approved the application
      // may be automatically redirected to the URI specified by redirect_uri.
      // If true, the user will not be automatically redirected and will have to approve the app again.
      showDialog: false
    };

    return {
      setConfig: function (opts) {
        options = angular.extend({}, options, opts || {});
      },

      $get: ['Albums', 'Artists', 'Auth', 'Browse', 'Me', 'Search', 'Tracks', 'Users',
        function (Albums, Artists, Auth, Browse, Me, Search, Tracks, Users) {
          return {
            // Retrieve information about one or more albums.
            albums: Albums,

            // Retrieve information about one or more artists.
            artists: Artists,

            // Instantiate a new Authorization object.
            auth: new Auth(options),

            // Getting playlists and new album releases featured on Spotify’s Browse tab.
            browse: Browse,

            // Get detailed profile information about the current user.
            // Manage the list of artists and users that a logged in user follows.
            // Retrieve information about, and managing, tracks that
            // the current user has saved in their “Your Music” library.
            me: Me,

            // Get Spotify catalog information about artists, albums,
            // tracks or playlists that match a keyword string.
            search: Search,

            // Retrieve information about one or more tracks and
            // manage playlist tracks and tracks saved in the user’s library.
            tracks: Tracks,

            // Get public profile information about a Spotify user.
            // Manage user’s playlists and retrieve information about them.
            users: Users
          };
        }
      ]
    };
  });

  /**
   * Factory to handle the authorization flow.
   *
   */
  angularSpotify.factory('Auth', ['$http', '$window', '$filter', 'url', 'Cache',
    function ($http, $window, $filter, url, Cache) {
      var stateKey;

      stateKey = 'SPOTIFY_AUTH_STATE';

      function Authorize(options) {
        this.options = options;

        checkAuthStatus(options);
      }

      Authorize.prototype = {
        constructor: Authorize,

        // Hold the authorization state of the current user
        authorized: false,

        // The message response code
        message: '',

        // Navigate to authorization url.
        login: function () {
          $window.location.href = authUrl(this.options);
        }
      };

      // Check the authorization status.
      function checkAuthStatus(options) {
        var params,
          accessToken,
          state,
          storedState;

        // Get the hash parameters.
        params = $filter('hashParams')();

        accessToken = params.access_token;
        state = params.state;

        // Get state from the cache
        storedState = Cache.get(stateKey);

        if (accessToken && (options.state && (state == null || state !== storedState))) {
          Authorize.prototype.message = 'SPOTIFY_AUTH_ERROR';
          Authorize.prototype.authorized = false;
        } else {
          // Remove state value from the cache.
          Cache.remove(stateKey);
          if (accessToken) {
            setToken(accessToken);
            Authorize.prototype.authorized = true;
          } else {
            Authorize.prototype.message = 'SPOTIFY_AUTH_REQUIRED';
            Authorize.prototype.authorized = false;
          }
        }
      }

      // Construct the authorization url with the additional url params.
      function authUrl(options) {
        var redirect;

        redirect = url.authorization;

        redirect += '?client_id=' + encodeURIComponent(options.clientId);
        redirect += '&response_type=' + encodeURIComponent(options.responseType);
        redirect += '&redirect_uri=' + encodeURIComponent(options.redirectUri);
        redirect += '&scope=' + encodeURIComponent(options.scope);
        redirect += '&show_dialog=' + encodeURIComponent(options.showDialog);

        if (options.state) {
          redirect += '&state=' + encodeURIComponent(createState());
        }

        return redirect;
      }

      // Create the state variable and store it in the cache.
      function createState() {
        var state;

        state = $filter('randomString')(16);

        Cache.put(stateKey, state);

        return state;
      }

      // Set the authorization header with the token for the http requests.
      function setToken(token) {
        $http.defaults.headers.common.Authorization = 'Bearer ' + token;
      }

      return Authorize;
    }
  ]);

  /**
   * Retrieve information about one or more albums.
   *
   */
  angularSpotify.factory('Albums', ['$resource', '$filter', function ($resource, $filter) {
    var resourceUrl;

    resourceUrl = $filter('resourceUrl')('albums/:id');

    // The action get is used for retrieving information about one or several albums.
    return $resource(resourceUrl, null, {
      // Retrieve information about an album’s tracks.
      tracks: {
        url: resourceUrl + '/tracks'
      }
    });
  }]);

  /**
   * Retrieve information about one or more artists.
   *
   */
  angularSpotify.factory('Artists', ['$resource', '$filter', function ($resource, $filter) {
    var resourceUrl;

    resourceUrl = $filter('resourceUrl')('artists/:id');

    // The action get is used for retrieving information about one or several artists.
    return $resource(resourceUrl, null, {
      // Retrieve information about an artist’s albums.
      albums: {
        url: resourceUrl + '/albums'
      },

      // Retrieve information about an artist’s top tracks by country.
      topTracks: {
        url: resourceUrl + '/top-tracks',
        params: {
          country: 'US'
        }
      },

      // Retrieve information about artists similar to a given artist.
      relatedArtists: {
        url: resourceUrl + '/related-artists'
      }
    });
  }]);

  /**
   * Getting playlists and new album releases featured on Spotify’s Browse tab.
   *
   */
  angularSpotify.factory('Browse', ['$resource', '$filter', function ($resource, $filter) {
    var resourceUrl;

    resourceUrl = $filter('resourceUrl')('browse');

    return $resource('', null, {
      // Get a list of Spotify featured playlists.
      featuredPlaylists: {
        url: resourceUrl + '/featured-playlists'
      },

      // Get a list of new album releases featured in Spotify.
      newReleases: {
        url: resourceUrl + '/new-releases'
      }
    });
  }]);

  /**
   * Get detailed profile information about the current user (including the current user’s username).
   * Manage the list of artists and users that a logged in user follows.
   * Retrieve information about, and managing, tracks that
   * the current user has saved in their “Your Music” library.
   *
   */
  angularSpotify.factory('Me', ['$resource', '$filter', function ($resource, $filter) {
    var resourceUrl;

    resourceUrl = $filter('resourceUrl')('me');

    // The action get is used for getting detailed profile information about the current user.
    return $resource(resourceUrl, null, {
      // Add the current user as a follower of one or more artists or other Spotify users.
      follow: {
        url: resourceUrl + '/following',
        method: 'PUT',
        params: {
          type: '@type',
          ids: '@ids'
        }
      },

      // Remove the current user as a follower of one or more artists or other Spotify users.
      unfollow: {
        url: resourceUrl + '/following',
        method: 'DELETE'
      },

      // Check to see if the current user is following one or more artists or other Spotify users.
      following: {
        url: resourceUrl + '/following/contains',
        isArray: true
      },

      // Save one or more tracks to the current user’s “Your Music” library.
      saveTracks: {
        url: resourceUrl + '/tracks',
        method: 'PUT'
      },

      // Get a list of the songs saved in the current Spotify user’s “Your Music” library.
      tracks: {
        url: resourceUrl + '/tracks'
      },

      // Remove one or more tracks from the current user’s “Your Music” library.
      deleteTracks: {
        url: resourceUrl + '/tracks',
        method: 'DELETE'
      },

      // Check if one or more tracks is already saved in
      // the current Spotify user’s “Your Music” library.
      hasTracks: {
        url: resourceUrl + '/tracks/contains',
        isArray: true
      }
    });
  }]);

  /**
   * Get Spotify catalog information about artists, albums,
   * tracks or playlists that match a keyword string.
   *
   */
  angularSpotify.factory('Search', ['$resource', '$filter', function ($resource, $filter) {
    var resourceUrl;

    resourceUrl = $filter('resourceUrl')('search');

    // The action get is used for retrieving information about
    // artists, albums, tracks or playlists that match a keyword string.
    return $resource(resourceUrl, null, {
      // Search for an album.
      album: {
        params: {
          type: 'album'
        }
      },

      // Search for an artist.
      artist: {
        params: {
          type: 'artist'
        }
      },

      // Search for a playlist.
      playlist: {
        params: {
          type: 'playlist'
        }
      },

      // Search for a track.
      track: {
        params: {
          type: 'track'
        }
      }
    });
  }]);

  /**
   * Retrieve information about one or more tracks and
   * manage playlist tracks and tracks saved in the user’s library.
   *
   */
  angularSpotify.factory('Tracks', ['$resource', '$filter', function ($resource, $filter) {
    var resourceUrl;

    resourceUrl = $filter('resourceUrl')('tracks/:id');

    // The action get is used for retrieving information about one or several tracks.
    return $resource(resourceUrl, null);
  }]);

  /**
   * Get public profile information about a Spotify user.
   * Manage user’s playlists and retrieve information about them.
   *
   */
  angularSpotify.factory('Users', ['$resource', '$filter', function ($resource, $filter) {
    var resourceUrl;

    resourceUrl = $filter('resourceUrl')('users/:user_id');

    // Get public profile information about a Spotify user.
    function Info() {
      return $resource(resourceUrl, null);
    }

    // Manage user’s playlists and retrieve information about them.
    function Playlists() {
      var playlistsUrl;

      // Extend the users resource url with the playlists endpoint.
      playlistsUrl = resourceUrl + '/playlists';

      // The action get is used for retrieving a list of the playlists owned or followed by a Spotify user.
      return $resource(playlistsUrl, null, {
        // Get a playlist owned by a Spotify user.
        single: {
          url: playlistsUrl + '/:playlist_id'
        },

        // Get full details of the tracks of a playlist owned by a Spotify user.
        tracks: {
          url: playlistsUrl + '/:playlist_id/tracks'
        },

        // Create a playlist for a Spotify user.
        // (The playlist will be empty until tracks be added.)
        create: {
          method: 'POST'
        },

        // Change a playlist’s name and public/private state.
        // (The user must, of course, own the playlist.)
        edit: {
          url: playlistsUrl + '/:playlist_id',
          method: 'PUT'
        },

        // Add one or more tracks to a user’s playlist.
        addTracks: {
          url: playlistsUrl + '/:playlist_id/tracks',
          method: 'POST',
          params: {
            user_id: '@user_id',
            playlist_id: '@playlist_id',
            uris: '@uris',
            position: '@position'
          }
        },

        // Remove one or more tracks from a user’s playlist.
        removeTracks: {
          url: playlistsUrl + '/:playlist_id/tracks',
          method: 'DELETE',
          params: {
            user_id: '@user_id',
            playlist_id: '@playlist_id'
          }
        },

        // Replace all the tracks in a playlist, overwriting its existing tracks.
        // This powerful request can be useful for replacing tracks,
        // re-ordering existing tracks, or clearing the playlist.
        replaceTracks: {
          url: playlistsUrl + '/:playlist_id/tracks',
          method: 'PUT',
          params: {
            user_id: '@user_id',
            playlist_id: '@playlist_id',
            uris: '@uris'
          }
        },

        // Add the current user as a follower of a playlist.
        follow: {
          url: playlistsUrl + '/:playlist_id/followers',
          method: 'PUT'
        },

        // Remove the current user as a follower of a playlist.
        unfollow: {
          url: playlistsUrl + '/:playlist_id/followers',
          method: 'DELETE'
        }
      });
    }

    return {
      info: new Info(),

      playlists: new Playlists()
    };
  }]);

})(window, window.angular);
