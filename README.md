# AngularJS and Spotify Web API

An [AngularJS](https://angularjs.org/) provider that encapsulates the functionality provided by [Spotify Web API](https://developer.spotify.com/web-api/).

##Getting started

Install the package using [Bower](http://bower.io/).

```
bower install angular-spotify-provider [--save]
```

Include the package as a dependency in your angular module.

```
var app = angular.module('app', ['angular-spotify']);
```

[Register your spotify application](https://developer.spotify.com/my-applications/#!/applications) and get keys for authenticating your requests. Set the configuration for the spotify provider.

```
app.config(['spotifyProvider', function (spotifyProvider) {
  spotifyProvider.setConfig({
    clientId: 'YOUR_CLIENT_ID',
    responseType: 'token',
    redirectUri: 'YOUR_REDIRECT_URI',
    state: true,
    scope: 'SPACE_SEPARATED_SCOPES',
    showDialog: false
  });
}]);
```

**clientId**: *Required*. The client ID provided to you by Spotify when you register your application.

**responseType**: *Required*. Set it to "token".

**redirectUri**: *Required*. The URI to redirect to after the user grants/denies permission. This URI needs to be entered in the URI whitelist that you specify when you register your application.

**state**: *Optional, but strongly recommended*. The state can be useful for correlating requests and responses. Because your `redirect_uri` can be guessed, using a state value can increase your assurance that an incoming connection is the result of an authentication request. If you generate a random string or encode the hash of some client state (e.g., a cookie) in this state variable, you can validate the response to additionally ensure that the request and response originated in the same browser. This provides protection against attacks such as cross-site request forgery. See [RFC-6749](http://tools.ietf.org/html/rfc6749#section-10.12).

**scope**. *Optional*. A space-separated list of scopes: see [Using Scopes](https://developer.spotify.com/spotify-web-api/using-scopes/).

**showDialog**. *Optional*. Whether or not to force the user to approve the app again if they’ve already done so. If `false` (default), a user who has already approved the application may be automatically redirected to the URI specified by `redirect_uri`. If `true`, the user will not be automatically redirected and will have to approve the app again.

Inject the provider into a controller and start using it.

```
app.controller('MainCtrl', ['spotify', function (spotify) {
  /* your code... */
}]);
```

##Usage

The spotify provider is exposing all the required functions to help you communicate with te Spotify Web API. Also, it is exposing a variable to determine the authorization state of the current user and message codes, in order to display useful information to the client.

###Authorization handler

Some requests to the Spotify Web API require authorization; that is, the user must have granted permission for an application to access the requested data. To prove that the user has granted permission, the request header sent by the application must include a valid **access token**.

Implicit Grant is used for the authorization flow. The Implicit Grant flow is carried out client-side and does not involve secret keys. The access tokens that are issued are short-lived and there are no refresh tokens to extend them when they expire.

**Authorize the current user**

```
spotify.auth.login();
```

**Authorization state**

```
spotify.auth.authorized
```

**Authorization message codes**

```
spotify.auth.message
```

**Example:**

```
app.value('messages', {
  'SPOTIFY_AUTH_ERROR': 'There was an error during authorization process.',
  'SPOTIFY_AUTH_REQUIRED': 'You need to authorize the application and receive an access token.'
});

app.controller('MainCtrl', ['$scope', 'spotify', 'messages', function ($scope, spotify, messages) {
  $scope.isAuthorized = spotify.auth.authorized;

  $scope.message = messages[spotify.auth.message];

  $scope.login = function () {
    spotify.auth.login();
  };
}]);
```
