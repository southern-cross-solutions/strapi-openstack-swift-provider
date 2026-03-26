# Strapi Openstack Swift Provider

> The features for private containers on Openstack Swift will only work with [Strapi](https://github.com/strapi/strapi/blob/v4.9.0/packages/core/upload/server/services/file.js) `v4.9.0` or higher.

---

License
-------
Southern Cross Solutions (Pty) Ltd. License (Proprietary)
All Rights Reserved
Copy Right 2019-2026

See LICENSE file

## Installation

Add the following dependency to your `package.json` to pull in the custom Openstack Swift integration

```json
"dependencies": {
  ...
  "strapi-openstack-swift-provider": "git+ssh://git@github.com:southern-cross-solutions/strapi-openstack-swift-provider#v1.0",
},
```

## Configuration

Add the two following configurations to complete the setup of the Openstack Swift integration

### Provider Configuration

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    config: {
      provider: "strapi-openstack-swift-provider",
      providerOptions: {
        username: env('OPENSTACK_USERNAME'),
        password: env('OPENSTACK_PASSWORD'),
        authUrl: env('OPENSTACK_AUTH_URL'),
        region: env('OPENSTACK_REGION'),
        tenantId: env('OPENSTACK_PROJECT_ID'),
        keystoneAuthVersion: env('OPENSTACK_KST_AUTH_VERSION'),
        domainId: env('OPENSTACK_DOMAIN_ID'),
        container: env('OPENSTACK_CONTAINER'),
        cdnSslUri: env("OPENSTACK_CDN_SSL_URI"),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
  // ...
});
```

### Security Middleware Configuration

Due to the default settings in the Strapi Security Middleware you will need to modify the `contentSecurityPolicy` settings to properly see thumbnail previews in the Media Library. You should replace `strapi::security` string with the object below instead as explained in the [middleware configuration](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/required/middlewares.html#loading-order) documentation.

`./config/middlewares.js`

```js
module.exports = [
  // ...
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            `${process.env.OPENSTACK_CDN_SSL_URI}`,
          ],
          "media-src": [
            "'self'",
            "data:",
            "blob:",
            `${process.env.OPENSTACK_CDN_SSL_URI}`,
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  // ...
];
```

### Environment Variables

Environment variables required for the Openstack Swift integration

| **Variable**                        | **Type** | **Default** | **Note**                                                                                                                                                                                |
|-------------------------------------|----------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| OPENSTACK_USERNAME                  | String   | -           |                                                                                                                                                                                         |
| OPENSTACK_PASSWORD                  | String   | -           |                                                                                                                                                                                         |
| OPENSTACK_AUTH_URL                  | String   | -           |                                                                                                                                                                                         |
| OPENSTACK_KST_AUTH_VERSION          | String   | `v3`        |                                                                                                                                                                                         |
| OPENSTACK_REGION                    | String   | -           |                                                                                                                                                                                         |
| OPENSTACK_PROJECT_ID                | String   | -           |                                                                                                                                                                                         |
| OPENSTACK_DOMAIN_ID                 | String   | -           |                                                                                                                                                                                         |
| OPENSTACK_CONTAINER                 | String   | -           |                                                                                                                                                                                         |
| OPENSTACK_CDN_SSL_URI               | String   | -           |             |
| OPENSTACK_CDN_ACCESS_CONTROL_HEADER | String   | -           | Usually assign a value of `*`                                                                                                                                                           |
| OPENSTACK_IS_PRIVATE_CONTAINER      | Boolean  | `true`      |                                                                                                                                                                                         |
| OPENSTACK_TEMP_URL_KEY              | String   | -           | Required if `OPENSTACK_IS_PRIVATE_CONTAINER` is `true`                                                                                                                                  |
| OPENSTACK_TEMP_URL_TTL              | Integer  | `300`       | Time to live of the generated temp URL in seconds                                                                                                                                       |