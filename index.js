const axios = require("axios");

module.exports = {
	init(config) {

		const client = axios.create({
			baseURL: `https://api.vimeo.com/`,
			headers: {
				'Authorization': `bearer ${config.accessToken}`
			}
		});

		const startTusUpload = function(file) {

			return new Promise((resolve, reject) => {

				// create a video
				return client({
					method: 'POST',
					url: 'me/videos',
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/vnd.vimeo.*+json;version=3.4'
					},
					data: {
						'name': file.hash,
						'description': file.caption,
						'folder_uri': `/folders/${config.folderId}`,
						'upload': {
							'approach': 'tus',
							'size': `${file.buffer.length}`
						}
					}
				}).then(function(response) {

					resolve(response.data);

				}).catch(function (error) {
					console.log("error starting upload: "+error.response.data.error);
					if (error.response.data.invalid_parameters) {
						console.dir(error.response.data.invalid_parameters);
					} else if (error.response.data) {
						console.dir(error.response.data);
					}
					reject();
				});

			});
		}

		const sendTusData = function(fileUrl, file) {

			return new Promise((resolve, reject) => {

				// send data using patch
				client({
					method: 'PATCH',
					url: fileUrl,
					headers: {
						'Tus-Resumable': '1.0.0',
						'Upload-Offset': '0',
						'Content-Type': 'application/offset+octet-stream'
					},
					data: file.buffer
				}).then(function(response) {

					// set return data directly on file
					file

					resolve();

				}).catch(function (error) {
					console.log("error sending upload: "+error.response.data.error);
					if (error.response.data.invalid_parameters) {
						console.dir(error.response.data.invalid_parameters);
					} else if (error.response.data) {
						console.dir(error.response.data);
					}
					reject();
				});
			});
		}

		const getTranscodedVideo = function(id, maxattempts) {

			console.log("getTranscodedVideo:"+id);

			return new Promise((resolve, reject) => {

				if (maxattempts <= 0) {
					reject();
					return;
				}

				client({
					method: 'GET',
					url: `videos/${id}`
				}).then(function(response) {

					// set return data directly on file
					// console.log("getTranscodedVideo");
					// console.dir(response.data.transcode);

					// unless we start uploading in chunks we always upload in one go,
					// so no need to check progress

					// check transcode status
					let status = response.data.transcode.status;
					console.log("status:"+status+"   ("+maxattempts+")");
					if (status == "available") {
						resolve(response.data);
					} else {
						setTimeout(() => {
							return getTranscodedVideo(id, maxattempts - 1);
						}, 1000);
					}

				}).catch(function (error) {
					console.log("error getting transcoded upload: "+error);
				});

			});
		}

		const idFromUri = function(uri) {

			const uriParts = uri.split('/');
			const id = uriParts[uriParts.length - 1];
			return id;
		}

		const updateFileData = function(file, data) {

			const id = idFromUri(data.uri);

			file.provider_metadata = {
				url: data.link,
				player_embed_url: data.player_embed_url,
				width: data.width,
				height: data.height,
				embed: data.embed.html,
				// pictures: data.pictures,
				id: id
			};

			file.width = data.width;
			file.height = data.height;

			// preview url
			// if (data.pictures.sizes.length > 3) {
			// 	file.previewUrl = data.pictures.sizes[3].link;
			// } else if (startData.pictures.sizes.length > 0) {
			// 	file.previewUrl = data.pictures.sizes[data.pictures.sizes.length - 1].link;
			// }

			file.url = data.link;
		}

		return {
			upload(file) {

				return new Promise((resolve, reject) => {

					startTusUpload(file).then(function(startData) {

						updateFileData(file, startData);

						sendTusData(startData.upload.upload_link, file).then(function() {

							// poll for progress and update fields
							// can't do this - it takes too long, have to reload
							// where we are using the videos
							// getTranscodedVideo(file.provider_metadata.id, 300).then(function() {
								resolve();
							// }).catch(function (error) {
							// 	reject();
							// });

						}).catch(function (error) {
							console.log("ERROR");
							console.dir(error);
							reject();
						});
					}).catch(function (error) {
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
							method: 'DELETE',
							url: `videos/${file.provider_metadata.id}`
						}).then(function(response) {

							resolve();

						}).catch(function (error) {
							console.log("error deleting upload: "+error.response.data.error);
							if (error.response.data.invalid_parameters) {
								console.dir(error.response.data.invalid_parameters);
							} else if (error.response.data) {
								console.dir(error.response.data);
							}
							reject();
						});

					});
				}
			},
		};
	},
};
