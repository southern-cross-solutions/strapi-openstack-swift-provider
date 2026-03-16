"use strict";

/**
 * Module dependencies
 */

// Public node modules.
const pkgcloud = require("pkgcloud");
const streamifier = require("streamifier");

class Logger {
  log = (message, ...args) => {
    console.log(this.#getTimestamp(), message, ...args);
  };

  error = (message, ...args) => {
    console.error(this.#getTimestamp(), message, ...args);
  };

  #getTimestamp = () => {
    let timestamp = "[" + new Date().toISOString() + "]";
    return timestamp;
  };
}

module.exports = {
  init(config) {
    const logger = new Logger();
    const options = { container: config.container };
    const swiftClient = pkgcloud.storage.createClient({
      provider: "openstack",
      ...config,
    });

    const tempUrlKey = process.env.OPENSTACK_TEMP_URL_KEY;
    const tempUrlTtl = process.env.OPENSTACK_TEMP_URL_TTL != undefined ? parseInt(process.env.OPENSTACK_TEMP_URL_TTL) : 300;
    
    const isPrivate = () => {
      let isPrivate = true;
        
        if (process.env.OPENSTACK_IS_PRIVATE_CONTAINER.toLowerCase() === "false") {
          isPrivate = false;
        } 

        return isPrivate;
    }

    const upload = (file, _customConfig = {}) =>
      new Promise((resolve, reject) => {
        let readStream = streamifier.createReadStream(Buffer.from([]));

        if (file.stream) {
          readStream = file.stream;
        } else if (file.buffer) {
          readStream = streamifier.createReadStream(file.buffer);
        } else {
          let error = new Error("Missing file stream or buffer");
          logger.error(error);
          reject(error);
          return;
        }

        const remoteName = `${file.hash}${file.ext}`;

        let writeStream = {};

        if (file.mime === "application/x-tar") {
          const folderPath = file.name.substring(0, file.name.indexOf(".tar"));

          const extractOptions = {
            ...options,
            remote: remoteName,
            format: "tar",
            headers: {
              "content-type": "", // Empty string will pass content-type detection for each file in the archive to Openstack Swift
              "access-control-allow-origin": `${process.env.OPENSTACK_CDN_ACCESS_CONTROL_HEADER}`,
            },
          };

          if (isPrivate()) {
            Object.assign(file, {
              mime: "application/x-tar",
              url: folderPath,
            });
          } else {
            Object.assign(file, {
              mime: "application/x-tar",
              url: `${process.env.OPENSTACK_CDN_SSL_URI}/${folderPath}`,
            });
          }

          // client.extract(...) will upload a tar file to Openstack Swift and Swift will unpack the tar file in the container.
          writeStream = swiftClient.extract(extractOptions, (err) => {
            if (err) {
              logger.error(err);
              reject(err);
              return;
            }
          });
        } else {
          if (isPrivate()) {
            Object.assign(file, {
              url: remoteName,
            });
          } else {
            Object.assign(file, {
              url: `${process.env.OPENSTACK_CDN_SSL_URI}/${remoteName}`,
            });
          }

          writeStream = swiftClient.upload({
            ...options,
            remote: remoteName,
            contentType: file.mime,
            headers: {
              "access-control-allow-origin": `${process.env.OPENSTACK_CDN_ACCESS_CONTROL_HEADER}`,
            },
          });
        }

        writeStream.on("error", (err) => {
          logger.error(err);
          reject(err);
          return;
        });

        writeStream.on("success", (file) => {
          logger.log("File uploaded successfully: ", file.name);
        });

        readStream.pipe(writeStream);
        resolve();
      });

    const getTempUrl = (filename) => {
      return new Promise((resolve, reject) => {
        swiftClient.generateTempUrl(
          options.container,
          filename,
          "GET",
          tempUrlTtl,
          tempUrlKey,
          (err, swiftUrl) => {
            if (err) {
              logger.error(err);
              reject(err);
              return { url: "" };
            }
            let lastSlashIndex = swiftUrl.split("/").pop();
            let url = process.env.OPENSTACK_CDN_SSL_URI + "/" + lastSlashIndex;
            resolve({ url });
          }
        )
      });
    };

    return {
      uploadStream(file, customParams = {}) {
        return upload(file, customParams);
      },
      upload(file, customParams = {}) {
        return upload(file, customParams);
      },
      delete(file, customParams = {}) {
        return new Promise((resolve, reject) => {
          let filename = file.hash + file.ext;

          swiftClient.removeFile(config.container, filename, (error, result) => {
            if (error) {
              logger.error(error);
              reject(error);
              return;
            }
          });

          logger.log("File deleted successfully: ", filename);

          resolve();
          return;
        });
      },
      isPrivate() {
        return isPrivate();
      },
      async getSignedUrl(file) {
        let filename = file.hash + file.ext;

        return getTempUrl(filename);
      },
    };
  },
};
