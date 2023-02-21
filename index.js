const axios = require("axios");

module.exports = {
  init(config) {
    const client = axios.create({
      baseURL: `https://api.vimeo.com/`,
      headers: {
        Authorization: `bearer ${config.accessToken}`,
      },
    });

    const startTusUpload = function (file, length) {
      // console.log("startTusUpload", length);

      return new Promise((resolve, reject) => {
        // create a video
        return client({
          method: "POST",
          url: "me/videos",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/vnd.vimeo.*+json;version=3.4",
          },
          data: {
            name: file.hash,
            description: file.caption,
            folder_uri: `/folders/${config.folderId}`,
            upload: {
              approach: "tus",
              size: `${length}`,
            },
          },
        })
          .then(function (response) {
            resolve(response.data);
          })
          .catch(function (error) {
            console.log("error starting upload: " + error?.response?.status + " " + error?.response?.statusText);
            if (error?.response?.data?.error) {
              console.log("error: " + error.response.data.error);
            }
            if (error.response.data.invalid_parameters) {
              console.dir(error.response.data.invalid_parameters);
            } else if (error.response.data) {
              console.dir(error.response.data);
            }
            reject();
          });
      });
    };

    const sendTusData = function (fileUrl, file, offset) {
      if (offset === undefined) offset = "0";

      return new Promise((resolve, reject) => {
        // send data using patch
        client({
          method: "PATCH",
          url: fileUrl,
          headers: {
            "Tus-Resumable": "1.0.0",
            "Upload-Offset": offset,
            "Content-Type": "application/offset+octet-stream",
          },
          data: file.buffer,
        })
          .then(function (response) {
            resolve(response);
          })
          .catch(function (error) {
            console.log("error sending upload: " + error?.response?.status + " " + error?.response?.statusText);
            if (error?.response?.data?.error) {
              console.log("error: " + error.response.data.error);
            }
            if (error.response?.data?.invalid_parameters) {
              console.log("invalid parameters: " + error.response.data.invalid_parameters);
            } else if (error.response?.data) {
              console.dir(error.response.data);
            }
            reject(error);
          });
      });
    };

    const getTranscodedVideo = function (id, maxattempts) {
      return new Promise((resolve, reject) => {
        let frequency = 1000 * 60; // 1 minute

        if (maxattempts <= 0) {
          reject();
          return;
        }

        client({
          method: "GET",
          url: `videos/${id}`,
        })
          .then(function (response) {
            // set return data directly on file
            // console.log("getTranscodedVideo");
            // console.dir(response.data.transcode);

            // unless we start uploading in chunks we always upload in one go,
            // so no need to check progress

            // check transcode status
            let status = response.data.transcode.status;
            if (status == "complete") {
              resolve(response.data);
            } else {
              setTimeout(() => {
                return getTranscodedVideo(id, maxattempts - 1)
                  .then((data) => {
                    resolve(data);
                  })
                  .catch(() => {
                    reject();
                  });
              }, frequency);
            }
          })
          .catch(function (error) {
            console.log("error getting transcoded upload: " + error);
          });
      });
    };

    const idFromUri = function (uri) {
      const uriParts = uri.split("/");
      const id = uriParts[uriParts.length - 1];
      return id;
    };

    const updateFileData = function (file, data) {
      const id = idFromUri(data.uri);

      file.provider_metadata = {
        url: data.link,
        player_embed_url: data.player_embed_url,
        width: data.width,
        height: data.height,
        embed: data.embed.html,
        // pictures: data.pictures,
        id: id,
      };

      file.width = data.width;
      file.height = data.height;

      file.url = data.link;
    };

    return {
      upload(file) {
        return new Promise((resolve, reject) => {
          startTusUpload(file, file.buffer.length)
            .then(function (startData) {
              updateFileData(file, startData);

              sendTusData(startData.upload.upload_link, file)
                .then(function (response) {
                  // set return data directly on file
                  updateFileData(file, response.data);

                  // poll for progress and update fields
                  // can't do this - it takes too long, have to reload
                  // where we are using the videos
                  // getTranscodedVideo(file.provider_metadata.id, 300).then(function() {
                  // }).catch(function (error) {
                  // 	reject();
                  // });

                  // start polling for video to be transcoded so we can update values
                  // getTranscodedVideo(file.provider_metadata.id, 30).then(function(data) {
                  // 	console.log("COMPLETE");

                  // 	// now get them using API
                  // 	client({
                  // 		method: 'GET',
                  // 		url: `videos/${file.provider_metadata.id}/pictures`
                  // 	}).then(function(response) {

                  // 		// set return data directly on file
                  // 		console.log("PICTURES API");
                  // 		if (response?.data?.data && response?.data?.data.length > 0) {
                  // 			console.dir(response?.data?.data[0].sizes);

                  // 			// preview url
                  // 			let previewUrl = null;
                  // 			if (response?.data?.data[0].sizes) {
                  // 				if (response?.data?.data[0].sizes.length > 3) {
                  // 					previewUrl = response.data.data[0].sizes[3].link;
                  // 				} else if (response?.data?.data[0].sizes.length > 0) {
                  // 					previewUrl = response.data.data[0].sizes[response.data.data[0].sizes.length - 1].link;
                  // 				}
                  // 			}
                  // 			if (previewUrl) {
                  // 				console.log("previewUrl");
                  // 				console.log(previewUrl);

                  // 				// any way to update an upload?

                  // 				// but the file doesnt have an id yet so we don't
                  // 				// know what to update anyway!! :-)
                  // 				// console.dir(file);

                  // 				// strapi.entityService.findOne('api::media.media', 1, {
                  // 				// 	fields: ['title', 'description'],
                  // 				// 	populate: { category: true },
                  // 				// }).then((entity) => {

                  // 				// });
                  // 			}
                  // 		}

                  // 	})

                  // 	// updateFileData(file, data, true);
                  // });

                  // immediately return
                  resolve();
                })
                .catch(function (error) {
                  reject();
                });
            })
            .catch(function (error) {
              console.log("ERROR");
              console.dir(error);
              reject();
            });
        });
      },
      uploadStream(file) {
        return new Promise((resolve, reject) => {
          const bytesToSend = file.size * 1000;

          startTusUpload(file, bytesToSend)
            .then(function (startData) {
              updateFileData(file, startData);
              let bytesSent = 0;
              const sendQueue = [];
              let cancelSend = false;

              // actual data sent doesn't match size so also track number of chunks
              let expectedChunks = 0;
              let sentChunks = 0;

              // check if we have data to send
              const checkQueue = async function () {
                // do we have data to send?
                if (sendQueue.length > 0) {
                  let chunk = sendQueue.shift();

                  const currentOffset = bytesSent.toString();

                  const fileWithBuffer = Object.assign(file, { buffer: chunk });
                  try {
                    const response = await sendTusData(startData.upload.upload_link, fileWithBuffer, currentOffset);

                    // bytesSent = bytesSent + chunk.length;
                    // console.log("Uploaded:", response?.headers["upload-offset"]);
                    bytesSent = parseInt(response?.headers["upload-offset"]);
                    sentChunks = sentChunks + 1;
                  } catch (error) {
                    console.dir(error);
                    cancelSend = true;
                    reject();
                  }
                }

                // call again if we have more to send
                if (!cancelSend && bytesSent < bytesToSend && sentChunks < expectedChunks) {
                  setTimeout(() => {
                    checkQueue();
                  }, 1);
                }
              };

              // read chunks from the stream and send each one
              file.stream.on("data", (chunk) => {
                // console.log(`Received ${chunk.length} bytes of data.`);

                // add chunk to the queue
                sendQueue.push(chunk);
                if (expectedChunks == 0) {
                  expectedChunks = 1;
                  checkQueue();
                } else {
                  expectedChunks = expectedChunks + 1;
                }
              });
              file.stream.on("end", () => {
                // console.log('There will be no more data.');
                resolve();
              });
            })
            .catch(function (error) {
              console.log("ERROR");
              console.dir(error);
              reject();
            });
        });
      },
      delete(file) {
        if (file && file.provider_metadata && file.provider_metadata.id) {
          return new Promise((resolve, reject) => {
            // create a video
            return client({
              method: "DELETE",
              url: `videos/${file.provider_metadata.id}`,
            })
              .then(function (response) {
                resolve();
              })
              .catch(function (error) {
                console.log("error deleting upload: " + error.response.data.error);
                if (error.response.data.invalid_parameters) {
                  console.dir(error.response.data.invalid_parameters);
                } else if (error.response.data) {
                  console.dir(error.response.data);
                }
                //reject();
                // on failure allow strapi to delete it
                resolve();
              });
          });
        }
      },
    };
  },
};
